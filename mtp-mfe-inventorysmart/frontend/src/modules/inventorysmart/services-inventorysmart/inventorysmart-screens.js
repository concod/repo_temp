import productMappingReducerService from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/services-product-mapping/productMappingService";
import storeMappingReducerService from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/services/storeMappingService";
import dcMappingReducerService from "modules/inventorysmart/pages-inventorysmart/DC-Mapping/services-dc-mapping/dc-mapping-service";

export const inventorysmartScreens = async (containerStore) => {
  await containerStore.injectReducer("productMappingReducerService", productMappingReducerService);
  await containerStore.injectReducer("storeMappingReducerService", storeMappingReducerService);
  await containerStore.injectReducer("dcMappingReducerService", dcMappingReducerService);
};
