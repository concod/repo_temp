import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { cloneDeep } from "lodash";
import {
  DC_TO_DC_TRANSFER_DATA, DC_TO_DC_REVIEW_SIZE_DATA, DC_TO_DC_RECOMMENDATION_SIZE_DATA, SAVE_AS_DRAFT_OR_APPROVE_DC_TRANSFER, SAVE_DC_TRANSFER,
  DOWNLOAD_DC_TRANSFERS,
  DOWNLOAD_DC_REVIEWS,
  DOWNLOAD_DC_SIZES,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const inventorySmartDcTransferService = createSlice({
  name: "inventorySmartDcTransferService",
  initialState: {
    dcTransferFilterConfigs: [],
    dcTransferTableDataLoader: false,
    dcTransferReviewDataLoader: false,
    reviewData: {
      review_recommendation: {
        columns: null,
        data: {},
      },
      review_sizes: {
        columns: null,
        data: {},
      }
    },
    unReviewedArticles: [],
    reviewedArticles: [],
    dc_transfer_code: false
  },
  reducers: {
    setDcTransferFilterConfig: (state, action) => {
      state.dcTransferFilterConfigs = action.payload;
    },
    setDcTransferDataLoader: (state, action) => {
      state.dcTransferTableDataLoader = action.payload;
    },
    setDcTransferReviewDataLoader: (state, action) => {
      state.dcTransferReviewDataLoader = action.payload;
    },
    setDcTransferReviewData: (state, action) => {
      const { selectedTab, selectedArticle, data } = action.payload
      const tableType = selectedTab?.id
      const article = selectedArticle?.value;
      state.reviewData = {
        ...state.reviewData,
        [tableType]: {
          ...state.reviewData[tableType],
          data: {
            ...state.reviewData[tableType]['data'],
            [article]: data
          }
        }
      }
    },
    updateRecomendationDataByKey: (state, action) => {
      // Get key to be updated with value.
      const { colId, value, selectedArticle, uniqueKeyName, key, isParentLevel ,parentLevelColumn} = action.payload
      let articlesData = cloneDeep(state.reviewData['review_recommendation']['data'][selectedArticle])
      const rowIndex = articlesData.findIndex((thisRow) => {
        return thisRow['key'] === uniqueKeyName
      })     
      if (isParentLevel) {
        // Handle parent level changes
        articlesData[rowIndex][colId] = value  
        if (colId === parentLevelColumn && articlesData[rowIndex].data) {
          articlesData[rowIndex].data.forEach(subRow => {
            subRow[colId] = value;
          });
        }
      } else {
        // Handle subrow level changes (original logic)
        const subRowIndex = articlesData[rowIndex].data.findIndex((thisSubRow) => {
          return thisSubRow['key'] === key
        })
        articlesData[rowIndex].data[subRowIndex][colId] = value
        articlesData[rowIndex].data[subRowIndex]['is_edited'] = true
      }
      
      state.reviewData = {
        ...state.reviewData,
        ['review_recommendation']: {
          ...state.reviewData['review_recommendation'],
          data: {
            ...state.reviewData['review_recommendation']['data'],
            [selectedArticle]: [...articlesData]
          }
        }
      }
    },
    updateRecomendationData: (state, action) => {
      // Get key to be updated with value.
      const { size_dc_source_data, selectedArticle, uniqueKeyName, key } = action.payload
      let articlesData = cloneDeep(state.reviewData['review_recommendation']['data'][selectedArticle])
      const rowIndex = articlesData.findIndex((thisRow) => {
        return thisRow['key'] === uniqueKeyName
      })
      const subRowIndex = articlesData[rowIndex].data.findIndex((thisSubRow) => {
        return thisSubRow['key'] === key
      })
      articlesData[rowIndex].data[subRowIndex] = { ...size_dc_source_data, key, is_added: true, is_visible: false, is_edited: true }
      state.reviewData = {
        ...state.reviewData,
        ['review_recommendation']: {
          ...state.reviewData['review_recommendation'],
          data: {
            ...state.reviewData['review_recommendation']['data'],
            [selectedArticle]: [...articlesData]
          }
        }
      }
    },
    setDcTransferReviewColumns: (state, action) => {
      const { selectedTab, columns } = action.payload
      const tableType = selectedTab?.id
      state.reviewData = {
        ...state.reviewData,
        [tableType]: {
          ...state.reviewData[tableType],
          columns
        }
      }
    },
    setUnReviewedArticles: (state, action) => {
      state.unReviewedArticles = action.payload;
    },
    moveToReviewed: (state, action) => {
      const { selectedArticle, currentReviewedTransfers } = action.payload;
      let article = selectedArticle
      let newUnReviewed = state.unReviewedArticles.filter((a) => {
        return a !== article
      })
      // Delete older revied transfers for the article
      let filteredReviewedArticles = []
      state.reviewedArticles.forEach((thisArticle) => {
        if (thisArticle?.article !== article) {
          filteredReviewedArticles.push({ ...thisArticle })
        }
      })
      state.unReviewedArticles = newUnReviewed;
      state.reviewedArticles = [...filteredReviewedArticles, ...currentReviewedTransfers]
    },
    setDcTransferCode: (state, action) => {
      state.dc_transfer_code = action.payload;
    },
    resetReviewData: (state, action) => {
      state.reviewData = {
        review_recommendation: {
          columns: null,
          data: {},
        },
        review_sizes: {
          columns: null,
          data: {},
        }
      }
      state.unReviewedArticles = [],
        state.reviewedArticles = [],
        state.dc_transfer_code = false
    },
  },
});

export const getDcToDcTrasferData = (postBody) => () => {
  return axiosInstance({
    url: DC_TO_DC_TRANSFER_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getDcToDcReviewData = (postBody) => (dispatch, getstate) => {
  const redux = getstate();
  const dc_transfer_code = redux?.inventorysmartReducer?.inventorySmartDcTransferService.dc_transfer_code;
  // const dc_transfer_code = '2bb33a26-d18c-48e9-9d21-0483885292c7'
  const { selectedArticle, selectedTab } = postBody
  const article = selectedArticle?.value
  let url = DC_TO_DC_RECOMMENDATION_SIZE_DATA
  if (selectedTab?.id === "review_sizes") {
    url = `${DC_TO_DC_REVIEW_SIZE_DATA}/${article}`
  }
  else {
    postBody['article'] = article
  }
  delete postBody["selectedArticle"];
  delete postBody["selectedTab"];
  return axiosInstance({
    url,
    method: "POST",
    data: { ...postBody, dc_transfer_code },
  });
};



export const saveAsDraftOrApproveDcTransfer = (postBody) => async (dispatch, getstate) => {
  const redux = getstate();
  const dc_transfer_code = redux?.inventorysmartReducer?.inventorySmartDcTransferService.dc_transfer_code;
  const { data } = await axiosInstance({
    url: SAVE_AS_DRAFT_OR_APPROVE_DC_TRANSFER,
    method: "POST",
    data: { ...postBody, dc_transfer_code },
  });
  return data;
};

export const saveDcTransfer = (postBody) => async (dispatch, getstate) => {
  const redux = getstate();
  const dc_transfer_code = redux?.inventorysmartReducer?.inventorySmartDcTransferService.dc_transfer_code;
  const { data } = await axiosInstance({
    url: SAVE_DC_TRANSFER,
    method: "POST",
    data: { ...postBody, dc_transfer_code },
  });
  return data;
};

export const downloadDcransfers = (postBody) => async () => {
  return axiosInstance({
    url: DOWNLOAD_DC_TRANSFERS,
    method: "POST",
    data: postBody,
  });
}

export const downloadReviews  = (postBody) => async (dispatch, getstate) => {
  const redux = getstate();
  const dc_transfer_code = redux?.inventorysmartReducer?.inventorySmartDcTransferService.dc_transfer_code;
  return axiosInstance({
    url: DOWNLOAD_DC_REVIEWS,
    method: "POST",
    data: {...postBody, dc_transfer_code},
  });
}

export const downloadSizes  = (postBody) => async (dispatch, getstate) => {
  const redux = getstate();
  const dc_transfer_code = redux?.inventorysmartReducer?.inventorySmartDcTransferService.dc_transfer_code;
  let {article} = postBody
  let url = `${DC_TO_DC_REVIEW_SIZE_DATA}/${article}/download`
  delete postBody["article"];
  return axiosInstance({
    url,
    method: "POST",
    data: {...postBody, dc_transfer_code},
  });
}

export const {
  setDcTransferFilterConfig,
  setDcTransferDataLoader,
  setDcTransferReviewData,
  setDcTransferReviewDataLoader,
  setDcTransferReviewColumns,
  setUnReviewedArticles,
  moveToReviewed,
  setDcTransferCode,
  updateRecomendationDataByKey,
  updateRecomendationData,
  resetReviewData,
} = inventorySmartDcTransferService.actions;

export default inventorySmartDcTransferService.reducer;
