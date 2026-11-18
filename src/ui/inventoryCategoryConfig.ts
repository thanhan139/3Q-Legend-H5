import assets from '../data/inventoryCategoryAssets.json';
export const INVENTORY_CATEGORY_CONFIG=assets.map(category=>{
 const scene=category.id==='dao_cu'?'Inventory':category.id==='trang_bi'?'Equipment':category.id==='trang_suc'?'Jewelry':undefined;
 return{...category,textureKey:'inventory.category.'+category.id,featureState:scene?'available':'development',destination:scene};
});
