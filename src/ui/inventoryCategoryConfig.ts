import assets from '../data/inventoryCategoryAssets.json';
import { COLLECTION_INFO, isCollectionId } from './inventoryCollections';
export const INVENTORY_CATEGORY_CONFIG=assets.map(category=>{
 const metadata = isCollectionId(category.id) ? COLLECTION_INFO[category.id] : undefined;
 return {...category, textureKey:'inventory.category.'+category.id,
   featureState: metadata?.state === 'planned' ? 'development' : 'available',
   destination:'Inventory', collection:category.id};
});
