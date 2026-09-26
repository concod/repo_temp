import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

import {
    DC_DATA,
    STORE_DATA,
    STORE_GROUP_DATA,
    CREATE_SUPPLY_ROUTE_COLUMN_CONFIG,
    SUPPLY_ROUTE_COLUMN_CONFIG,
    STORE_LIST_FROM_STORE_GROUP,
    CREATE_SUPPLY_ROUTE_SAVE,
    SUPPLY_ROUTE_TABLE_DATA,
    DELETE_SUPPLY_ROUTE,
    EDIT_SUPPLY_ROUTE_NAME,
    MAP_SUPPLY_ROUTE_PRODUCT_GROUP_COLUMN_CONFIG,
    GET_PRODUCT_GROUPS,
    GET_PRODUCT_GROUP,
    MAPPED_SUPPLY_ROUTE_TABLE_CONFIG,
    GET_SUPPLY_ROUTE_FROM_PRODUCT_GROUP,
    FETCH_TABLE_CONFIG,
    GET_DC,
    MANAGE_PRIORITY_TABLE_COLUMN_CONFIG,
    MANAGE_PRIORITY_TABLE_DATA,
    DELETE_MAPPED_SUPPLY_ROUTE,
    CREATE_PRODUCT_GROUP,
    PRODUCT_GROUP_IN_SUPPLY_ROUTE_TABLE_CONFIG,
    PRODUCT_GROUP_IN_SR,
    PRODUCT_GROUP_MAPPING_TABLE_COLUMN_CONFIG,
    SAVE_SUPPLY_ROUTE_PRIORITY
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const supplyRouteService = createSlice({
  name: "supplyRouteService",
  initialState: {
    supplyRouteTableConfigLoader: false,
    supplyRouteTableDataLoader: false,
    mappedSupplyRouteProductGroupVendorToDcTableData:[],
    mappedSupplyRouteProductGroupDcToDcTableData:[],
    mappedSupplyRouteProductGrouDcToStoreTableData:[],
    mappedSupplyRouteProductGroupStoreToStoreTableData:[],
    payloadForSetAllProductGroupMapping:[]

  },
  reducers: {
    setSupplyRouteTableDataLoader: (state, action) => {
      state.supplyRouteTableDataLoader = action.payload;
    },
    setSupplyRouteTableConfigLoader: (state, action) => {
      state.supplyRouteTableConfigLoader = action.payload;
    },
    setMappedSupplyRouteProductGroupVendorToDcTableData:(state, action)=>{
      state.mappedSupplyRouteProductGroupVendorToDcTableData = action.payload;
    },
    setMappedSupplyRouteProductGroupDcToDcTableData:(state, action)=>{
      state.mappedSupplyRouteProductGroupDcToDcTableData = action.payload;
    },
    setMappedSupplyRouteProductGroupDcToStoreTableData:(state, action)=>{
      state.mappedSupplyRouteProductGrouDcToStoreTableData = action.payload;
    },
    setMappedSupplyRouteProductGroupStoreToStoreTableData:(state, action)=>{
      state.mappedSupplyRouteProductGroupStoreToStoreTableData = action.payload;
    },
    setPayloadForSetAllProductGroupMapping:(state,action)=>{
      console.log('ss123',action)
      state.payloadForSetAllProductGroupMapping = action.payload
    },
    resetSupplyRouteState: (state) => {
      state.supplyRouteTableConfigLoader = false;
      state.supplyRouteTableDataLoader = false;
      state.mappedSupplyRouteProductGroupVendorToDcTableData=[];
      state.mappedSupplyRouteProductGroupDcToDcTableData=[];
      state.mappedSupplyRouteProductGrouDcToStoreTableData=[];
      state.mappedSupplyRouteProductGroupStoreToStoreTableData=[];
      state.payloadForSetAllProductGroupMapping=[]
    },
  },
});

export const {
    setSupplyRouteTableConfigLoader,
    setSupplyRouteTableDataLoader,
    setMappedSupplyRouteProductGroupVendorToDcTableData,
    setMappedSupplyRouteProductGroupDcToDcTableData,
    setMappedSupplyRouteProductGroupDcToStoreTableData,
    setMappedSupplyRouteProductGroupStoreToStoreTableData,
    setPayloadForSetAllProductGroupMapping,
    resetSupplyRouteState,
} = supplyRouteService.actions;

export const getDc = () => () => {
  return axiosInstance({
    url: DC_DATA,
    method: "GET",
  });
};

export const getStore = (postBody) => () => {
  return axiosInstance({
    url: `${STORE_DATA}?page=1&page_size=100000`,
    method: "POST",
    data: postBody
  });
};

export const getStoreGroup = () => () => {
  return axiosInstance({
    url: `${STORE_GROUP_DATA}?page=1&page_size=10000`,
    method: "POST",
    data: {filters:[],meta:{search:[],range:[],sort:[]}}
  });
};

export const getCreateSupplyRouteTableConfig = () => () => {
    return axiosInstance({
      url: CREATE_SUPPLY_ROUTE_COLUMN_CONFIG,
      method: "GET",
    });
  };

export const getSupplyRouteTableConfig = (type) => () => {
    return axiosInstance({
      url: SUPPLY_ROUTE_COLUMN_CONFIG + type,
      method: "GET",
    });
  };

export const getStoreListFromStoreGroup = (postBody) => () => {
    return axiosInstance({
      url: STORE_LIST_FROM_STORE_GROUP,
      method: "POST",
      data: postBody,
    });
  };

export const saveSupplyRoute = (postBody) => () => {
    return axiosInstance({
      url: CREATE_SUPPLY_ROUTE_SAVE,
      method: "POST",
      data: postBody,
    });
  };  

export const getSupplyRouteData = (postBody) => () => {
    return axiosInstance({
      url: SUPPLY_ROUTE_TABLE_DATA,
      method: "POST",
      data: postBody,
    });
  };   
   
export const deleteSupplyRoute = (postBody) => () => {
    return axiosInstance({
      url: DELETE_SUPPLY_ROUTE,
      method: "POST",
      data: postBody,
    });
  }; 

export const editSupplyRouteName = (postBody) => () => {
    return axiosInstance({
      url: EDIT_SUPPLY_ROUTE_NAME,
      method: "POST",
      data: postBody,
    });
  }; 

//Map Product to Supply Route API's

export const getMapSupplyRouteProductGroupTableConfig = (type) => () => {
  return axiosInstance({
    url: MAP_SUPPLY_ROUTE_PRODUCT_GROUP_COLUMN_CONFIG + "_" + type,
    method: "GET",
  });
};

export const getMapSupplyRouteProductGroupData = (postBody) => () => {
  return axiosInstance({
    url: GET_PRODUCT_GROUPS,
    method: "POST",
    data: postBody,
  });
};   

export const getProductGroup = (postBody) => () => {
  return axiosInstance({
    url: GET_PRODUCT_GROUP,
    method: "POST",
    data: postBody
  });
};

export const getMappedSupplyRouteTableColumnConfig = () => () => {
  return axiosInstance({
    url: MAPPED_SUPPLY_ROUTE_TABLE_CONFIG ,
    method: "GET",
  });
};

export const getSupplyRouteFromProductGroup = (postBody) => () => {
  return axiosInstance({
    url: GET_SUPPLY_ROUTE_FROM_PRODUCT_GROUP,
    method: "POST",
    data: postBody,
  });
}; 

export const getTableConfig =(postBody)=>()=>{
  return axiosInstance({
    url: `${FETCH_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
}

export const getDCData = (postBody) => () => {
  return axiosInstance({
    url: GET_DC,
    method: "POST",
    data: postBody,
  });
}; 
export const getManagePriorityTableConfig =(postBody)=>()=>{
  return axiosInstance({
    url: MANAGE_PRIORITY_TABLE_COLUMN_CONFIG,
    method: "GET",
  });
}

export const getManagePriorityData = (postBody) => () => {
  return axiosInstance({
    url: MANAGE_PRIORITY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
}; 

export const deleteMappedSupplyRoute = (postBody) => () => {
  return axiosInstance({
    url: DELETE_MAPPED_SUPPLY_ROUTE,
    method: "POST",
    data: postBody,
  });
}; 

export const createProductGroup = (postBody) => () => {
  return axiosInstance({
    url: CREATE_PRODUCT_GROUP,
    method: "POST",
    data: postBody,
  });
}; 

export const getProductGroupInSRTableConfig =()=>()=>{
  return axiosInstance({
    url: PRODUCT_GROUP_IN_SUPPLY_ROUTE_TABLE_CONFIG,
    method: "GET",
  });
}

export const getProductGroupInSupplyRoute = (postBody) => () => {
  return axiosInstance({
    url: PRODUCT_GROUP_IN_SR,
    method: "POST",
    data: postBody,
  });
};

export const getProductGroupMappingTableConfig =()=>()=>{
  return axiosInstance({
    url: PRODUCT_GROUP_MAPPING_TABLE_COLUMN_CONFIG,
    method: "GET",
  });
}

export const setSupplyRoutePriority = (postBody) => () => {
  return axiosInstance({
    url: SAVE_SUPPLY_ROUTE_PRIORITY,
    method: "POST",
    data: postBody,
  });
};






  
export default supplyRouteService.reducer;
