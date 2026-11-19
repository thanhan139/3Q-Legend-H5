import assets from '../data/inventoryCategoryAssets.json';

export type InventoryCategoryRoute =
 | {scene:'Inventory';data?:undefined}
 | {scene:'Equipment'|'Jewelry';data:{bag:true}}
 | {scene:'Heroes';data:{tab:'signature'}};

const routes: Partial<Record<string,InventoryCategoryRoute>> = {
 dao_cu:{scene:'Inventory'}, trang_bi:{scene:'Equipment',data:{bag:true}},
 trang_suc:{scene:'Jewelry',data:{bag:true}}, than_binh:{scene:'Heroes',data:{tab:'signature'}},
};
export const INVENTORY_CATEGORY_CONFIG=assets.map(category=>{
 const route=routes[category.id];
 return{...category,textureKey:'inventory.category.'+category.id,featureState:route?'available':'development',
  destination:route?.scene,sceneData:route?.data};
});
