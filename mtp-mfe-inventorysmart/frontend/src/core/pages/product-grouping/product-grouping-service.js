import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { uniqBy } from "lodash";

export const productGroupingService = createSlice({
  name: "productGroupingService",
  initialState: {
    productGrpDefinitions: [],
    productGrpDefinitionsCount: 0,
    productGroups: [],
    productGroupsCount: 0,
    selectedGroupType: "manual",
    selectedManualFilterType: "product_hierarchy",
    manualGroupDfnFilters: [],
    productGroupFilters: [],
    manualFilteredProducts: [],
    manualFilteredProductsCount: 0,
    manualFilteredProdsCols: [],
    isLoading: false,
    mappedDefns: [],
    selectedProducts: [],
    isDataChanged: false,
    dataChangeType: "",
    groupsTableCols: [],
    selectedGroupProds: [],
    selectedGroupProdsCount: 0,
    manualselectedGroups: [],
    deletedProdsInEdit: [],
    addedProdsInEdit: [],
    exisitingProdsInEdit: [],
    deleteProdsInDefn: [],
    isDefnBasedDisabled: false,
    newProdsInEdit: [],
    viewGrpFilterValues: [],
    newGrpsInEdit: [],
    deletedGrpsInEdit: [],
    viewDefnTableCols: [],
    defnMapTableCols: [],
    styleLevelTableCols: [],
    styleLevelTableData: [],
    styleLevelTableCount: 0,
    selectedStyles: [],
    deletedDefnStyles: [],
    selectedObjectiveMetric: "",
    selectedObjectiveTimeFormat: "",
    requestTableCols: [],
    initialProdMetricFilters: [],
    metricStartDate: null,
    metricEndDate: null,
    resetTable: false,
    selectedCluster: {},
    selectedGroupToEdit: "",
    handleGoBack: false,
  },
  reducers: {
    setViewGrpFilterValues: (state, action) => {
      state.viewGrpFilterValues = action.payload;
    },
    setDefinitions: (state, action) => {
      let count = action.payload.count
        ? action.payload.count
        : state.productGrpDefinitionsCount;
      if (action.payload.status === "deleted") {
        count--;
      }

      state.productGrpDefinitions = action.payload.definitions;
      state.productGrpDefinitionsCount = count;
    },
    setProductGroups: (state, action) => {
      state.productGroups = [...action.payload.groups];
      state.productGroupsCount = action.payload.count;
    },
    setSelectedProductGrpType: (state, action) => {
      state.selectedGroupType = action.payload;
    },
    setFilterFields: (state, action) => {
      state.productGroupFilters = [...action.payload];
    },
    setProdGroupFilteredProds: (state, action) => {
      state.manualFilteredProducts = [...action.payload.data];
      state.manualFilteredProductsCount = action.payload.count;
    },
    setProdGrpFilteredCols: (state, action) => {
      state.manualFilteredProdsCols = [...action.payload];
    },
    setManualGrpFilterType: (state, action) => {
      state.selectedManualFilterType = action.payload.type;
      state.isDefnBasedDisabled = action.payload.isDisabled
        ? action.payload.isDisabled
        : state.isDefnBasedDisabled;
    },
    setManualGrpDefns: (state, action) => {
      state.manualGroupDfnFilters = action.payload;
    },
    ToggleLoader: (state, action) => {
      state.isLoading = action.payload;
    },
    setMappedDefns: (state, action) => {
      state.mappedDefns = action.payload;
    },
    setSelectedProducts: (state, action) => {
      state.selectedProducts = uniqBy(action.payload, "product_code");
    },
    addSelectedGroups: (state, action) => {
      state.manualselectedGroups = uniqBy(action.payload, "pg_code");
    },
    setDataChangeStatus: (state, action) => {
      state.isDataChanged = action.payload.status;
      state.dataChangeType = action.payload.dataType;
    },
    resetFilterProds: (state, action) => {
      state.manualFilteredProducts = [];
      state.manualFilteredProductsCount = 0;
      state.selectedProducts = [];
      state.selectedManualFilterType =
        action.payload === true
          ? state.selectedManualFilterType
          : "product_hierarchy";
      state.manualGroupDfnFilters = [];
      state.deleteProdsInDefn = [];
      state.deletedProdsInEdit = [];
      state.exisitingProdsInEdit = [];
      state.newProdsInEdit = [];
      state.newGrpsInEdit = [];
      state.deletedGrpsInEdit = [];
      state.selectedStyles = [];
      state.deletedDefnStyles = [];
      state.selectedObjectiveMetric = "";
      state.selectedObjectiveTimeFormat = "";
      state.initialProdMetricFilters = [];
      state.metricStartDate = null;
      state.metricEndDate = null;
      state.selectedCluster = {};
      state.styleLevelTableData = [];
      state.styleLevelTableCount = 0;
      state.manualselectedGroups = [];
    },
    setGroupsCols: (state, action) => {
      state.groupsTableCols = [...action.payload];
    },
    setDeletedProdsInDefn: (state, action) => {
      state.deleteProdsInDefn = uniqBy(action.payload, "product_code");
    },
    setDeletedStylesInDefn: (state, action) => {
      state.deletedDefnStyles = uniqBy(action.payload, "style");
    },
    deletedRowsInEdit: (state, action) => {
      state.deletedProdsInEdit = uniqBy(action.payload, "product_code");
    },
    addToExistingProds: (state, action) => {
      state.exisitingProdsInEdit = uniqBy(action.payload, "product_code");
    },
    newRowsInEdit: (state, action) => {
      state.newProdsInEdit = uniqBy(action.payload, "product_code");
    },
    newGrpsInEdit: (state, action) => {
      state.newGrpsInEdit = uniqBy(action.payload, "pg_code");
    },
    deletedGrpsInEdit: (state, action) => {
      state.deletedGrpsInEdit = uniqBy(action.payload, "pg_code");
    },
    setViewDefnTableCols: (state, action) => {
      state.viewDefnTableCols = action.payload;
    },
    setDefnMapTablecols: (state, action) => {
      state.defnMapTableCols = action.payload;
    },
    setStyleTableCols: (state, action) => {
      state.styleLevelTableCols = action.payload;
    },
    setStyleTableData: (state, action) => {
      state.styleLevelTableData = action.payload.data;
      state.styleLevelTableCount = action.payload.count;
    },
    setSelectedManualStyles: (state, action) => {
      state.selectedStyles = uniqBy(action.payload, "style");
    },
    setSelectedObjectiveTimeFormat: (state, action) => {
      state.selectedObjectiveTimeFormat = action.payload;
    },
    setSelectedObjectiveMetric: (state, action) => {
      state.selectedObjectiveMetric = action.payload;
    },
    setRequestTableColumns: (state, action) => {
      state.requestTableCols = action.payload;
    },
    setInitialMetricFilters: (state, action) => {
      state.initialProdMetricFilters = action.payload;
    },
    setMetricStartDate: (state, action) => {
      state.metricStartDate = action.payload;
    },
    setMetricEndDate: (state, action) => {
      state.metricEndDate = action.payload;
    },
    setResetFilterTable: (state, action) => {
      state.resetTable = action.payload;
    },
    setSelectedCluster: (state, action) => {
      state.selectedCluster = action.payload;
    },
    setSelectedGroupToEdit: (state, action) => {
      state.selectedGroupToEdit = action.payload;
    },
    setHandleGoBack: (state, action) => {
      state.handleGoBack = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setViewGrpFilterValues,
  setDefinitions,
  setProductGroups,
  setSelectedProductGrpType,
  setFilterFields,
  setProdGroupFilteredProds,
  setProdGrpFilteredCols,
  setManualGrpFilterType,
  setManualGrpDefns,
  ToggleLoader,
  setMappedDefns,
  setSelectedProducts,
  addSelectedGroups,
  setDataChangeStatus,
  resetFilterProds,
  setGroupsCols,
  setDeletedProdsInDefn,
  setDeletedStylesInDefn,
  deletedRowsInEdit,
  addToExistingProds,
  newRowsInEdit,
  newGrpsInEdit,
  deletedGrpsInEdit,
  setViewDefnTableCols,
  setDefnMapTablecols,
  setStyleTableCols,
  setStyleTableData,
  setSelectedManualStyles,
  setSelectedObjectiveTimeFormat,
  setSelectedObjectiveMetric,
  setRequestTableColumns,
  setInitialMetricFilters,
  setMetricStartDate,
  setMetricEndDate,
  setResetFilterTable,
  setSelectedCluster,
  setSelectedGroupToEdit,
  setHandleGoBack,
} = productGroupingService.actions;

export const fetchDefinitions = async (body, pageSize = 10, pageIndex = 0) => (
  dispatch
) => {
  dispatch(ToggleLoader(true));
  axiosInstance({
    url: `/core/group/definitions/filter?page=${
      pageIndex + 1
    }&page_size=${pageSize}`,
    method: "POST",
    data: body,
  })
    .then((res) => {
      dispatch(
        setDefinitions({ definitions: res.data.data, count: res.data.total })
      );
      dispatch(ToggleLoader(false));
    })
    .catch((error) => {
      dispatch(ToggleLoader(false));
    });
};

// API calls
export const fetchFilterAttributes = (dimension) => (dispatch) => {
  return axiosInstance({
    url: "/core/group/rules/attributes?dimension=" + dimension,
    method: "GET",
  });
};

export const fetchFilterAttributeValues = (attribute) => (dispatch) => {
  const reqbody = {
    filter_type: "cascaded",
    attribute_name: attribute,
    filters: [
      {
        filter_type: "cascaded",
        attribute_name: attribute,
        values: [attribute],
        operator: "=",
      },
    ],
  };
  return axiosInstance({
    url: "/core/attribute-filter/product",
    method: "POST",
    data: reqbody,
  });
};

export const saveDefinition = (definition) => (dispatch) => {
  return axiosInstance({
    url: "/core/group/definitions",
    method: "POST",
    data: definition,
  });
};

export const getDefinitions = (body, pageSize = 10, pageIndex = 0) => (
  dispatch
) => {
  return axiosInstance({
    url: `/core/group/definitions/filter?page=${
      pageIndex + 1
    }&page_size=${pageSize}`,
    method: "POST",
    data: body,
  });
};

export const deleteDefinition = (pgd_code) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/definitions/${pgd_code}`,
    method: "DELETE",
  });
};

export const fetchGroupDefinitionById = (id) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/definitions/${id}`,
    method: "GET",
  });
};

export const updateDefinition = (defId, definition) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/definitions/${defId}`,
    method: "PATCH",
    data: definition,
  });
};

export const fetchProductGroups = (body, grpId = "", pageNum = 1, level) => (
  dispatch
) => {
  let params = [];
  if (grpId !== "") {
    params.push(`group_id=${grpId}`);
  }
  if (level) {
    params.push(`level=${level}`);
  }
  const queryStr = params.length > 0 ? `?${params.join("&")}` : "";
  return axiosInstance({
    url: `/core/group/product${queryStr}`,
    method: "POST",
    data: body,
  });
};

/**
 * @func
 * @desc Fetch All products Groups with pg_code and name
 * @param {Object} body
 * @returns {Promise}
 */
export const fetchAllProducteGroups = (body) => {
  return axiosInstance({
    url: `/core/group/product/filter-list`,
    method: "POST",
    data: body,
  });
};

export const fetchProdGrpFilteredProducts = (body, grpId = "", pageNum = 1) => (
  dispatch
) => {
  let queryStr = `page=${pageNum}`;
  if (grpId !== "") {
    queryStr = queryStr + `&group_id=${grpId}`;
  }
  return axiosInstance({
    url: `/core/group/product/filter?${queryStr}`,
    method: "POST",
    data: body,
  });
};

export const EditGroup = (grpData, grpId, query = "") => (dispatch) => {
  return axiosInstance({
    url: `/core/group/product/${grpId}${query}`,
    method: "PUT",
    data: grpData,
  });
};

export const deleteGrp = (grpId) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/product/${grpId}`,
    method: "DELETE",
  });
};

export const updateGrp = (grpId, body, isAggregated = false, action = "") => (
  dispatch
) => {
  let queryParams = ``;
  if (isAggregated) {
    queryParams += `?level=aggregate`;
  }

  if (action !== "") {
    queryParams += `${queryParams !== "" ? "&" : "?"}action=${action}`;
  }
  return axiosInstance({
    url: `/core/group/product/${grpId}${queryParams}`,
    method: "PUT",
    data: body,
  });
};

export const checkSubRuleStatus = (rulebody) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/rules/verify`,
    method: "POST",
    data: rulebody,
  });
};

export const createNewGroup = (groupBody, isAggregated = false) => (
  dispatch
) => {
  let queryParams = ``;
  if (isAggregated) {
    queryParams += `?level=aggregate`;
  }
  return axiosInstance({
    url: `/core/group/product/new${queryParams}`,
    method: "POST",
    data: groupBody,
  });
};

export const fetchIndividualGroup = (grpId, body) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/product/${grpId}/definitions`,
    method: "POST",
    data: body,
  });
};

export const getGroupInfo = (grpId) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/product/info/${grpId}`,
    method: "POST",
    data: {},
  });
};

export const fetchGroupProducts = (
  grpId,
  body,
  level,
  pageIndex = 1,
  pageSize = 10
) => (dispatch) => {
  let queryStr = `${level ? "level=" + level : ""}`;
  return axiosInstance({
    url: `/core/group/product/${grpId}/products?${queryStr}`,
    method: "POST",
    data: body,
  });
};

/**
 * @func
 * @desc Fetch all Products which corresponds to the given Product Group Id.
 * @param {Integer} grpId
 * @param {Object} body
 * @returns
 */
export const fetchAllProductCodes = (grpId, body) => {
  return axiosInstance({
    url: `/core/group/product/${grpId}/products?page_size=-1`,
    method: "POST",
    data: body,
  });
};

export const fetchStyleLevelData = (
  body,
  grpId,
  pageIndex = 1,
  pageSize = 10,
  level
) => (dispatch) => {
  let haslevel = `${level ? "&level=" + level : ""}`;
  let queryStr = `page=${pageIndex}&page_size=${pageSize}${haslevel}`;
  if (grpId && grpId !== "") {
    queryStr = queryStr + `&group_id=${grpId}`;
  }
  return axiosInstance({
    url: `/core/group/product/filter/hierarchy?${queryStr}`,
    method: "POST",
    data: body,
  });
};

//Objective based Actions
export const getMetrics = (metric_type) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/product/cluster/${metric_type}`,
    method: "GET",
  });
};

export const submitClusterJob = (body) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/product/cluster`,
    method: "POST",
    data: body,
  });
};

export const bulkAddStores = (body, level) => (dispatch) => {
  let haslevel = `${level ? "level=" + level : ""}`;
  return axiosInstance({
    url: `/core/group/bulk/product?${haslevel}`,
    method: "PUT",
    data: body,
  });
};

export const fetchRequestInfo = (reqId) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/product/cluster/job/${reqId}`,
    method: "GET",
  });
};

export const fetchMappedProducts = (body, level) => (dispatch) => {
  let haslevel = `${level ? "level=" + level : ""}`;
  return axiosInstance({
    url: `/core/group/product/list?${haslevel}`,
    method: "POST",
    data: body,
  });
};

export const bulkDeleteProducts = (body, level) => (dispatch) => {
  let haslevel = `${level ? "level=" + level : ""}`;

  return axiosInstance({
    url: `/core/group/bulk/product?${haslevel}`,
    method: "DELETE",
    data: body,
  });
};

export default productGroupingService.reducer;
