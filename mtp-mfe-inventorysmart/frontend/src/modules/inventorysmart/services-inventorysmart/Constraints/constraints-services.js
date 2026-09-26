import { createSlice } from "@reduxjs/toolkit";
import { set } from "lodash";
import axiosInstance from "../../../../core/Utils/axios/index";

import {
  DOWNLOAD_CHECK_FOR_USER_RESERVE,
  GET_STORE_LEVEL_TABLE_DATA,
  // POST_STORE_LEVEL_TABLE_DATA,
  // GET_STORE_GRADE_LEVEL_TABLE_DATA,
  // GET_STORE_GROUP_LEVEL_TABLE_DATA,
  // GET_STORE_MODAL_TABLE_DATA,
  // SET_ALL_TABLE_DATA,
  // GET_STORE_GROUP_AGGREGATE,
  // GET_STORE_GRADE_AGGREGATE,
  USER_RESERVE_INV_LIST,
  USER_RESERVE_INV_UPDATE,
  USER_RESERVE_SET_ALL_UPDATE,
  USER_RESERVE_SET_ALL_FIELDS,
  STORE_USER_RESERVE_INV_LIST,
  DC_USER_RESERVE_INV_LIST,

  // SMA_VIEW_TABLE,
  // SMA_TABLE_ROW_UPDATE,
  // SMA_TABLE_SET_ALL_UPDATE,
  // DOWNLOAD_STORE_CONSTRAINTS_DATA,
  // DOWNLOAD_STORE_GRADE_CONSTRAINTS_DATA,
  // DOWNLOAD_STORE_GROUP_CONSTRAINTS_DATA,
  // FETCH_SKU_COUNT_AND_JOB_ID,
  // UPDATE_CONSTRAINTS_SET_ALL_WITH_JOBID,
  // CONSTRAINTS_CHECK_DOWNLOAD_REQUEST,
  // UPLOAD_FILE,
  // POST_STORE_LEVEL_TIME_BASED_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

// To Uncomment later
export const inventorySmartConstraintsService = createSlice({
  name: "inventorySmartConstraintsService",
  initialState: {
    constraintsLoader: false,

    constraintsTableConfigLoader: false,

    constraintsTableConfig: [],
    constraintsTableData: [],

    selectedConstraintArticles: [],
    selectedStoreCodes: [],
    selectedFilters: [],

    constraintsEditSuccess: false,
    constraintsEditFailed: false,
    constraintsSetAllSuccess: false,
    constraintsSetAllFailed: false,

    selectedRules: [],
    constraintsUserReserveFilterConfig: [],
    constraintsUserReserveLoader: false,
    constraintsSMALoader: false,
    constraintsSMAFilterConfig: [],
    popUpLinkFromDashbaord: null,
    constraintsUserReserveSetAllForm: [],
    storeUserReserveLoader: false,
    storeUserReserveFilterConfig: [],
    dcUserReserveLoader: false,
    dcUserReserveFilterConfig: [],
    constraintsConfigs:{},
    userReserveConfigs:{},
    showNewConstraintFlow: false,
  },
  reducers: {
    setConstraintsLoader: (state, action) => {
      state.constraintsLoader = action.payload;
    },

    setConstraintsTableConfigLoader: (state, action) => {
      state.constraintsTableConfigLoader = action.payload;
    },

    setConstraintsArticles: (state, action) => {
      state.selectedConstraintArticles = action.payload;
    },
    setConstraintsStoreCodes: (state, action) => {
      state.selectedStoreCodes = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },

    setOMSSelectedRulesList: (state, action) => {
      state.selectedRules = action.payload;
    },
    setConstraintsUserReserveFilterConfig: (state, action) => {
      state.constraintsUserReserveFilterConfig = action.payload;
    },
    setConstraintsUserReserveLoader: (state, action) => {
      state.constraintsUserReserveLoader = action.payload;
    },
    setConstraintsSMAFilterConfig: (state, action) => {
      state.constraintsSMAFilterConfig = action.payload;
    },
    setConstraintsSMALoader: (state, action) => {
      state.constraintsSMALoader = action.payload;
    },
    setPopUpLinkFromDashbaord: (state, action) => {
      state.popUpLinkFromDashbaord = action.payload;
    },
    setConstraintsUserReserveSetAllForm: (state, action) => {
      state.constraintsUserReserveSetAllForm = action.payload;
    },
    setStoreUserReserveLoader: (state, action) => {
      state.storeUserReserveLoader = action.payload;
    },
    setStoreUserReserveFilterConfig: (state, action) => {
      state.storeUserReserveFilterConfig = action.payload;
    },
    setDcUserReserveLoader: (state, action) => {
      state.dcUserReserveLoader = action.payload;
    },
    setDcUserReserveFilterConfig: (state, action) => {
      state.dcUserReserveFilterConfig = action.payload;
    },

    resetConstraintsStoreState: (state) => {
      state.constraintsLoader = false;

      state.constraintsTableConfigLoader = false;

      state.constraintsTableConfig = [];
      state.constraintsTableData = [];
      state.selectedConstraintArticles = [];
      state.selectedStoreCodes = [];
      state.selectedFilters = [];

      state.constraintsEditFailed = false;
      state.constraintsEditSuccess = false;
      state.constraintsSetAllFailed = false;
      state.constraintsSetAllSuccess = false;
      state.selectedRules = [];
      state.constraintsUserReserveFilterConfig = [];
      state.constraintsUserReserveLoader = false;
      state.constraintsSMALoader = false;
      state.constraintsSMAFilterConfig = [];
      state.popUpLinkFromDashbaord = null;
      state.constraintsUserReserveSetAllForm = [];
      state.storeUserReserveLoader = false;
      state.storeUserReserveFilterConfig = [];
    },
    setConstraintsConfigs: (state, action) => {
      state.constraintsConfigs = action.payload;
    },
    setUserReserveConfigs:(state,action) => {
      state.userReserveConfigs = action.payload;
    },
    setShowNewConstraintFlow: (state, action) => {
      state.showNewConstraintFlow = action.payload;
    },
  },
});

export const {
  setConstraintsLoader,
  setConstraintsTableConfigLoader,
  setConstraintsArticles,
  setConstraintsStoreCodes,
  setSelectedFilters,
  resetConstraintsStoreState,
  setConstraintsEditFailed,
  setConstraintsEditSuccess,
  setConstraintsSetAllFailed,
  setConstraintsSetAllSuccess,
  setOMSSelectedRulesList,
  setConstraintsUserReserveFilterConfig,
  setConstraintsUserReserveLoader,
  setConstraintsSMALoader,
  setConstraintsSMAFilterConfig,
  setPopUpLinkFromDashbaord,
  setConstraintsUserReserveSetAllForm,
  setStoreUserReserveLoader,
  setStoreUserReserveFilterConfig,
  setDcUserReserveFilterConfig,
  setDcUserReserveLoader,
  setConstraintsConfigs,
  setUserReserveConfigs,
  setShowNewConstraintFlow,
} = inventorySmartConstraintsService.actions;

export const getStoreTableData = (dimension, postBody) => () => {
  return axiosInstance({
    url: `${GET_STORE_LEVEL_TABLE_DATA}`, ///${dimension}
    method: "POST",
    data: postBody,
  });
};
// export const getStoreGradeTableData = (postBody) => () => {
//   return axiosInstance({
//     url: GET_STORE_GRADE_LEVEL_TABLE_DATA,
//     method: "POST",
//     data: postBody,
//   });
// };

// export const getStoreGroupTableData = (postBody) => () => {
//   return axiosInstance({
//     url: GET_STORE_GROUP_LEVEL_TABLE_DATA,
//     method: "POST",
//     data: postBody,
//   });
// };
// export const getStoreGroupAggregateData = (postBody) => () => {
//   return axiosInstance({
//     url: GET_STORE_GROUP_AGGREGATE,
//     method: "POST",
//     data: postBody,
//   });
// };
// export const getStoreGradeAggregateData = (postBody) => () => {
//   return axiosInstance({
//     url: GET_STORE_GRADE_AGGREGATE,
//     method: "POST",
//     data: postBody,
//   });
// };

// export const getStoreModalTableData = (postBody) => () => {
//   return axiosInstance({
//     url: GET_STORE_MODAL_TABLE_DATA,
//     method: "POST",
//     data: postBody,
//   });
// };

// export const saveStoreTableData = (postBody, timebased = false) => () => {
//   return axiosInstance({
//     url: timebased
//       ? POST_STORE_LEVEL_TIME_BASED_TABLE_DATA
//       : POST_STORE_LEVEL_TABLE_DATA,
//     method: "POST",
//     data: postBody,
//   });
// };

// export const setAllTableData = (postBody, screen = "constraint") => () => {
//   return axiosInstance({
//     url: postBody.jobIdCheck
//       ? `${UPDATE_CONSTRAINTS_SET_ALL_WITH_JOBID}/job-id/${postBody.jobIdCheck}/view-type/${screen}`
//       : SET_ALL_TABLE_DATA,
//     method: "POST",
//     data: postBody.body,
//   });
// };

export const getUserReserveInvData = (postBody) => () => {
  return axiosInstance({
    url: USER_RESERVE_INV_LIST,
    method: "POST",
    data: postBody,
  });
};

export const updateUserReserve = (postBody) => () => {
  return axiosInstance({
    url: USER_RESERVE_INV_UPDATE,
    method: "POST",
    data: postBody,
  });
};

export const fetchUserReserveSetAllFields = () => () => {
  return axiosInstance({
    url: USER_RESERVE_SET_ALL_FIELDS,
    method: "GET",
  });
};

export const updateSetAllUserReserve = (postBody) => () => {
  return axiosInstance({
    url: USER_RESERVE_SET_ALL_UPDATE,
    method: "POST",
    data: postBody,
  });
};

// export const getSMAInvData = (postBody) => () => {
//   return axiosInstance({
//     url: SMA_VIEW_TABLE,
//     method: "POST",
//     data: postBody,
//   });
// };

// export const saveSMAEdits = (postBody) => () => {
//   return axiosInstance({
//     url: SMA_TABLE_ROW_UPDATE,
//     method: "POST",
//     data: postBody,
//   });
// };

// export const saveSMASetAllEdits = (postBody) => () => {
//   return axiosInstance({
//     url: SMA_TABLE_SET_ALL_UPDATE,
//     method: "POST",
//     data: postBody,
//   });
// };

// export const downloadStoreConstraintsData = (postbody) => () => {
//   return axiosInstance({
//     url: `${DOWNLOAD_STORE_CONSTRAINTS_DATA}`,
//     method: "POST",
//     data: postbody,
//   });
// };

// export const downloadStoreGradeConstraintsData = (postbody) => () => {
//   return axiosInstance({
//     url: `${DOWNLOAD_STORE_GRADE_CONSTRAINTS_DATA}`,
//     method: "POST",
//     data: postbody,
//   });
// };

// export const downloadStoreGroupConstraintsData = (postbody) => () => {
//   return axiosInstance({
//     url: `${DOWNLOAD_STORE_GROUP_CONSTRAINTS_DATA}`,
//     method: "POST",
//     data: postbody,
//   });
// };

// export const fetchSetAllSKUCount = (postbody, screen = "constraint") => () => {
//   return axiosInstance({
//     url: `${FETCH_SKU_COUNT_AND_JOB_ID}/${screen}`,
//     method: "POST",
//     data: postbody,
//   });
// };

// export const constraintsCheckDownload = (postbody) => () => {
//   return axiosInstance({
//     url: `${CONSTRAINTS_CHECK_DOWNLOAD_REQUEST}`,
//     method: "POST",
//     data: postbody,
//   });
// };

// export const uploadConstraintsFile = (postbody) => () => {
//   return axiosInstance({
//     url: `${UPLOAD_FILE}/constraint`,
//     method: "POST",
//     data: postbody,
//   });
// };

// export const uploadBackDoorAllocationFile = (postbody) => () => {
//   return axiosInstance({
//     url: `/inventory-smart/simulation/upload-allocation`,
//     method: "POST",
//     data: postbody,
//   });
// };

// export const productStoreGroupMappingFile = (postbody) => () => {
//   return axiosInstance({
//     url: `${UPLOAD_FILE}/productrule`,
//     method: "POST",
//     data: postbody,
//   });
// };
export const userReserveCheckDownload = (postbody) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_CHECK_FOR_USER_RESERVE}`,
    method: "POST",
    data: postbody,
  });
};

export const getStoreReserveInvHold = (postBody) => () => {
  return axiosInstance({
    url: STORE_USER_RESERVE_INV_LIST,
    method: "POST",
    data: postBody,
  });
};

export const getDcUserReserveInvHold = (postBody) => () => {
  return axiosInstance({
    url: DC_USER_RESERVE_INV_LIST,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartConstraintsService.reducer;
