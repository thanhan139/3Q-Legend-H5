import { describe, expect, it } from 'vitest';
import { canClaimMail, hasAttachments, parseMailRequest, type MailRow } from '../src/cloud/mailProtocol';

const id = '10000000-0000-4000-8000-000000000001';
const requestId = '10000000-0000-4000-8000-000000000002';
const gift: MailRow = { id,category:'system',sender:'QA',subject:'Thư',body:'Nội dung',created_at:'2026-11-19T00:00:00Z',
  expires_at:null,read_at:null,claimed_at:null,expired:false,rewards:{golden_key:1} };

describe('Mail request and presentation contract', () => {
  it('drops client-supplied owner, rewards, receipt and save data', () => {
    expect(parseMailRequest({action:'claim',mailId:id,requestId,uid:id,rewards:{coins:1000},revision:0}))
      .toEqual({action:'claim',mailId:id,requestId});
    expect(parseMailRequest({action:'send',mailId:id})).toBeUndefined();
    expect(parseMailRequest({action:'claimAll',requestId:'not a uuid'})).toBeUndefined();
  });

  it('limits pagination and rejects unknown categories', () => {
    expect(parseMailRequest({action:'list',category:'event',page:4})).toEqual({action:'list',category:'event',page:4});
    for (const page of [-1,5,1.1,'1']) expect(parseMailRequest({action:'list',category:'all',page})).toBeUndefined();
    expect(parseMailRequest({action:'list',category:'another-user',page:0})).toBeUndefined();
  });

  it('keeps read state independent of eligibility and respects expiry and prior claims', () => {
    expect(canClaimMail(gift)).toBe(true);
    expect(canClaimMail({...gift,read_at:gift.created_at})).toBe(true);
    expect(canClaimMail({...gift,expired:true})).toBe(false);
    expect(canClaimMail({...gift,claimed_at:gift.created_at})).toBe(false);
    expect(hasAttachments({...gift,rewards:{}})).toBe(false);
  });
});
