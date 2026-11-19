import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameCommand, GameIntent } from '../src/cloud/gameProtocol';
import { SHOP_OFFERS, applyShopPurchase, shopCatalog, shopDayStart, shopPeriod, type ShopQuote } from '../src/domain/shop';
import type { SaveV2 } from '../src/domain/types';
import { baseSave, GameStore, normalizeSave } from '../src/domain/store';
import { inventoryQuantity } from '../src/domain/resources';
import { handleGameRequest, type GameBackend, type SaveRow } from '../supabase/functions/game-command/handler';
import { legacyTutorial, newTutorial } from '../src/domain/tutorial';
import { hasStagingCheckoutGrant, STAGING_SUPABASE_URL } from '../src/config/staging';

const sunday = Date.parse('2026-11-22T16:59:59Z');
const monday = sunday + 1000;
const purchase = (quote: ShopQuote) => ({
  action: 'command', revision: quote.revision, requestId: quote.requestId,
  command: {type:'shopBuy',offerId:quote.offerId,quantity:quote.quantity},
} as const);

function fixture(start = { ...baseSave(), coins: 100_000, gems: 10_000 }, legacy = new Map<string, number>(), shopIsStaging = true) {
  const rows = new Map<string,SaveRow>(['alice','bob','viewer'].map(id => [id,{state:structuredClone(start),revision:0}]));
  const ledger = new Map<string,{command:GameCommand;receipt:unknown}>();
  const encoder = new TextEncoder();
  const key = crypto.subtle.importKey('raw',encoder.encode('fixture-key'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const backend: GameBackend = {
    shopIsStaging,
    shopTestEnabled: async uid => uid !== 'viewer',
    legacyShopEssenceUnits: async (uid, dayStart) => legacy.get(`${uid}:${dayStart}`) ?? 0,
    user: async uid => rows.has(uid) ? {id:uid,email_confirmed_at:'yes'} : null,
    read: async uid => structuredClone(rows.get(uid) ?? null),
    create: async () => ({}),
    sign: async message => Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',await key,encoder.encode(message))),
      byte => byte.toString(16).padStart(2,'0')).join(''),
    verify: async () => false,
    receipt: async (uid,id) => ledger.has(uid+id),
    commit: async (uid,id,revision,command,state,receipt) => {
      const row = rows.get(uid)!;
      const prior = ledger.get(uid+id);
      if (prior) return JSON.stringify(prior.command) === JSON.stringify(command)
        ? {status:'ok',save:row.state,revision:String(row.revision),receipt:prior.receipt} : {status:'reused'};
      if (String(row.revision) !== revision) return {status:'conflict'};
      rows.set(uid,{state,revision:row.revision+1});
      ledger.set(uid+id,{command,receipt});
      return {status:'ok',save:state,revision:String(row.revision+1),receipt};
    },
  };
  const send = (intent: GameIntent, uid='alice') => handleGameRequest(intent,uid,backend);
  const quote = async (offerId = 'golden-key', quantity=1): Promise<ShopQuote> => {
    const response = await send({action:'shopQuote',offerId,quantity});
    if (!('quote' in response) || !response.quote) throw Error('Expected a quote');
    return response.quote as ShopQuote;
  };
  return { rows, ledger, send, quote };
}

afterEach(() => vi.useRealTimers());
describe('Vạn Bảo Các shop', () => {
  it('resets daily and weekly caps on local midnight and Monday, using server time', () => {
    for (const period of ['daily','weekly'] as const) {
      expect(shopPeriod(period,sunday).resetAt).toBe(monday);
      expect(shopPeriod(period,sunday).key).not.toBe(shopPeriod(period,monday).key);
    }
    expect(shopPeriod('weekly',monday).resetAt).toBe(monday + 7*86_400_000);
    expect(shopPeriod('permanent',monday)).toEqual({key:'permanent'});
    const result = applyShopPurchase({...baseSave(),coins:16_000},SHOP_OFFERS[0],4,sunday)!;
    expect(shopCatalog(result.state,sunday,true).listings[0].max).toBe(0);
    expect(shopCatalog(result.state,monday,true).listings[0].max).toBe(4);
  });

  it('gates checkout and rejects unauthorized, invalid, too large and unaffordable quotes', async () => {
    const { send, quote } = fixture({...baseSave(),coins:2100,gems:10_000,copper:10_000});
    for (const quantity of [0,-1,1.5,1000,Number.MAX_SAFE_INTEGER])
      expect(await send({action:'shopQuote',offerId:'golden-key',quantity})).toMatchObject({status:'invalid'});
    expect(await send({action:'shopQuote',offerId:'golden-key',quantity:2})).toMatchObject({status:'shopLimit'});
    expect(await fixture().send({action:'shopQuote',offerId:'golden-key',quantity:5})).toMatchObject({status:'shopLimit'});
    expect(await send({action:'shopCatalog'},'viewer')).toMatchObject({catalog:{checkoutEnabled:false,checkoutBlocked:'shopQaAccessRequired'}});
    expect(await send({action:'shopCatalog'},'outsider')).toMatchObject({status:'unauthorized'});
    expect(await send(purchase(await quote()),'viewer')).toMatchObject({status:'shopQaAccessRequired'});
  });

  it('distinguishes a revoked staging grant, incomplete tutorial, and non-staging deployment',async()=>{
    const {send,quote,rows,ledger}=fixture();
    const order=purchase(await quote());
    rows.get('alice')!.tutorial=newTutorial();
    expect(await send({action:'shopCatalog'})).toMatchObject({catalog:{checkoutEnabled:false,checkoutBlocked:'shopTutorialRequired'}});
    expect(await send(order)).toMatchObject({status:'shopTutorialRequired'});
    expect(await send({action:'shopQuote',offerId:'golden-key',quantity:1})).toMatchObject({status:'shopTutorialRequired'});
    expect(ledger.size).toBe(0);
    rows.get('alice')!.tutorial=legacyTutorial();
    expect(await send({action:'shopCatalog'})).toMatchObject({catalog:{checkoutEnabled:true}});
    const other=fixture(undefined,undefined,false);
    expect(await other.send(order)).toMatchObject({status:'shopUnavailable'});
    expect(await other.send({action:'shopCatalog'})).toMatchObject({catalog:{checkoutEnabled:false,checkoutBlocked:'shopUnavailable'}});
  });

  it('combines independent staging grants with the existing list and skips all grants outside staging',async()=>{
    const stored=vi.fn(async (uid:string)=>uid==='newQA');
    await expect(hasStagingCheckoutGrant('https://production.invalid','legacyQA','legacyQA',stored)).resolves.toBe(false);
    await expect(hasStagingCheckoutGrant(`${STAGING_SUPABASE_URL}/`,' firstQA, legacyQA ','legacyQA',stored)).resolves.toBe(true);
    expect(stored).not.toHaveBeenCalled();
    await expect(hasStagingCheckoutGrant(STAGING_SUPABASE_URL,'legacyQA','newQA',stored)).resolves.toBe(true);
    await expect(hasStagingCheckoutGrant(STAGING_SUPABASE_URL,'legacyQA','notQA',stored)).resolves.toBe(false);
    expect(stored.mock.calls).toEqual([['newQA'],['notQA']]);
  });

  it('settles all five catalog offers through the same quote, commit and replay boundary',async()=>{
    const {send,quote,rows,ledger}=fixture();
    const original=structuredClone(rows.get('alice')!.state);
    for(const offer of SHOP_OFFERS){
      const order=purchase(await quote(offer.id));
      const result=await send(order);
      expect(result).toMatchObject({status:'ok',receipt:{offerId:offer.id,grant:offer.amount,currency:'coins',total:offer.price}});
      expect(await send(order)).toEqual(result);
    }
    const settled=rows.get('alice')!.state;
    expect(settled.coins).toBe(original.coins-SHOP_OFFERS.reduce((total,offer)=>total+offer.price,0));
    for(const offer of SHOP_OFFERS){
      expect(inventoryQuantity(settled,offer.item)).toBe(inventoryQuantity(original,offer.item)+offer.amount);
      expect(settled.shopPurchases?.[offer.id].bought).toBe(1);
    }
    expect(ledger.size).toBe(5);
    expect(rows.get('bob')!.state).toEqual(original);
    expect(settled.gems).toBe(original.gems);
  });

  it('uses only Gold, preserves former Gem receipts and keeps old caps and wallet balances', async () => {
    const { send, quote, ledger } = fixture({...baseSave(),coins:20_000,copper:4_000,gems:800});
    const old = { action:'command', revision:'0',requestId:crypto.randomUUID(),
      command:{type:'shopBuy',offerId:'forge-shard',quantity:1} } as const;
    const receipt = {kind:'shopPurchase',offerId:'forge-shard',quantity:1,total:125,currency:'gems',item:'forge_shard',grant:3};
    ledger.set(`alice${old.requestId}`,{command:old.command,receipt});
    expect(await send(old)).toMatchObject({status:'ok',receipt,save:{coins:20_000,copper:4_000,gems:800}});
    expect(await send({action:'shopCatalog'})).toMatchObject({catalog:{balances:{copper:4_000,coins:20_000}}});
    expect(SHOP_OFFERS.every(offer => offer.currency === 'coins' && offer.testOnly)).toBe(true);
    expect(await send(purchase(await quote('golden-key')))).toMatchObject({status:'ok',receipt:{total:2000,currency:'coins'},
      save:{coins:18_000,copper:4_000,gems:800}});
    expect(await send(purchase(await quote('forge-shard')))).toMatchObject({status:'ok',receipt:{total:2400,currency:'coins',grant:3},
      save:{coins:15_600,copper:4_000,gems:800}});
  });

  it.each([1,10,100,999])('quotes, grants and charges exactly %i essence units', async quantity => {
    const { send, quote, rows } = fixture();
    const offer = await quote('jewelry-essence', quantity);
    expect(offer).toMatchObject({currency:'coins',total:100*quantity,grant:quantity});
    const result = await send(purchase(offer));
    expect(result).toMatchObject({status:'ok',receipt:{total:100*quantity,grant:quantity},
      save:{coins:100_000-100*quantity,jewelryEssence:quantity,shopPurchases:{'jewelry-essence':{bought:quantity}}}});
    expect(await send(purchase(offer))).toEqual(result);
    expect(rows.get('bob')?.state.jewelryEssence ?? 0).toBe(0);
    if (quantity === 999) expect(await send({action:'shopQuote',offerId:'jewelry-essence',quantity:1})).toMatchObject({status:'shopLimit'});
  });

  it('carries today’s legacy grants into the new quota without counting previous days or counting twice', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(sunday);
    const start = {...baseSave(),coins:100_000,shopPurchases:{'jewelry-essence':{period:shopPeriod('weekly',sunday).key,bought:3}}};
    const {send,quote,rows} = fixture(start,new Map([[`alice:${shopDayStart(sunday)}`,40]]));
    const usage = (used:number,max:number) => ({catalog:{listings:expect.arrayContaining([
      expect.objectContaining({offer:expect.objectContaining({id:'jewelry-essence',priceVersion:2}),used,max}),
    ])}});
    expect(await send({action:'shopCatalog'})).toMatchObject(usage(40,959));
    expect(await send({action:'shopCatalog'},'bob')).toMatchObject(usage(0,999));
    const a = purchase(await quote('jewelry-essence',959));
    const b = purchase(await quote('jewelry-essence',958));
    const results = await Promise.all([send(a),send(b)]);
    expect(results.map(r => (r as {status:string}).status).sort()).toEqual(['conflict','ok']);
    const bought = rows.get('alice')!.state.shopPurchases!['jewelry-essence'].bought;
    if (bought === 958) expect(await send(purchase(await quote('jewelry-essence',1)))).toMatchObject({status:'ok'});
    expect(await send({action:'shopCatalog'})).toMatchObject(usage(999,0));
    expect(await send({action:'shopQuote',offerId:'jewelry-essence',quantity:1})).toMatchObject({status:'shopLimit'});
    vi.setSystemTime(monday);
    expect(await send({action:'shopCatalog'})).toMatchObject(usage(0,41));
  });

  it('rejects a forged price, a different UID, and a quote after a price or period change', async () => {
    const { send, quote, ledger } = fixture();
    vi.useFakeTimers();
    vi.setSystemTime(sunday);
    const first = purchase(await quote());
    const tampered = {...first,command:{...first.command,price:1}};
    expect(await send(tampered)).toMatchObject({status:'invalid'});
    expect(await send(first,'bob')).toMatchObject({status:'staleOffer'});
    const offer = SHOP_OFFERS[0] as {price:number};
    const prior = offer.price;
    try {
      offer.price++;
      expect(await send(first)).toMatchObject({status:'staleOffer',catalog:{listings:[expect.objectContaining({
        offer:expect.objectContaining({price:prior+1}),
      }),...SHOP_OFFERS.slice(1).map(() => expect.anything())]}});
    } finally { offer.price = prior; }
    vi.setSystemTime(monday);
    expect(await send(first)).toMatchObject({status:'staleOffer'});
    expect(ledger.size).toBe(0);
    expect(await send(purchase(await quote()))).toMatchObject({status:'ok'});
  });

  it('commits one receipt for simultaneous requests and replays the confirmed purchase after a lost response', async () => {
    const { rows, ledger, send, quote } = fixture({...baseSave(),coins:4000,gems:200});
    const a = purchase(await quote('golden-key',1));
    const b = purchase(await quote('golden-key',2));
    const responses = await Promise.all([send(a),send(b)]);
    expect(responses.map(r => (r as {status:string}).status).sort()).toEqual(['conflict','ok']);
    const succeeded = (responses[0] as {status:string}).status === 'ok' ? a : b;
    const result = (responses[0] as {status:string}).status === 'ok' ? responses[0] : responses[1];
    expect(await send(succeeded)).toEqual(result);
    expect(await send({...succeeded,command:{type:'shopBuy',offerId:'golden-key',quantity:3}})).toMatchObject({status:'reused'});
    expect(ledger.size).toBe(1);
    expect(rows.get('bob')?.state.gems).toBe(200);
    expect(rows.get('bob')?.state.coins).toBe(4000);
    const loaded = normalizeSave(JSON.parse(JSON.stringify(rows.get('alice')!.state)));
    expect(loaded.shopPurchases?.['golden-key'].bought).toBe(succeeded.command.type === 'shopBuy' && succeeded.command.quantity);
    expect(loaded.coins).toBeGreaterThanOrEqual(0);
    expect(loaded.gems).toBe(200);
    const doubleClick = fixture();
    const same = purchase(await doubleClick.quote());
    const [firstClick, secondClick] = await Promise.all([doubleClick.send(same), doubleClick.send(same)]);
    expect(firstClick).toEqual(secondClick);
    expect(doubleClick.ledger.size).toBe(1);
  });

  it('grants all five existing inventory resources and keeps counters through save reload', () => {
    const base = baseSave();
    const save: SaveV2 = {...base, coins:10_000, gems:10000, copper:5000, goldKeys:0, clearedStages:['1-1','1-2','1-3'],
      forge:{...base.forge!,shards:47}, equipment:[{uid:'qa-gear',itemId:'dragonBlade',level:1}],
      jewelry:[{uid:'00000000-0000-4000-8000-000000000001',itemId:'ring_r_blue',level:0}]};
    const purchased = SHOP_OFFERS.reduce<SaveV2>((state,offer) => applyShopPurchase(state,offer,1,monday)!.state,save);
    const reloaded = normalizeSave(JSON.parse(JSON.stringify(purchased)));
    for (const offer of SHOP_OFFERS) {
      expect(inventoryQuantity(reloaded,offer.item)).toBe(inventoryQuantity(save,offer.item)+offer.amount);
      expect(reloaded.shopPurchases?.[offer.id]?.bought).toBe(1);
    }
    const store = new GameStore({read:()=>null,write:()=>{}},reloaded);
    expect(store.upgradeHero('zhang-fei')).toBe(true);
    expect(store.snapshot.trainingExp).toBe(0);
    expect(store.summon(1,() => .5).ok).toBe(true);
    expect(store.snapshot.goldKeys).toBe(0);
    expect(store.enhanceGear('qa-gear',true)).toBe(true);
    expect(store.snapshot.forge?.stones).toBe(0);
    expect(store.forgeWeapon('dragonBlade',0)).toBe(true);
    expect(store.snapshot.forge?.shards).toBe(0);
    expect(store.enhanceJewel(save.jewelry![0].uid,0)).toMatchObject({success:true,essenceSpent:1});
    expect(store.snapshot.jewelryEssence).toBe(0);
    expect(normalizeSave(baseSave())).not.toHaveProperty('shopPurchases');
  });
});
