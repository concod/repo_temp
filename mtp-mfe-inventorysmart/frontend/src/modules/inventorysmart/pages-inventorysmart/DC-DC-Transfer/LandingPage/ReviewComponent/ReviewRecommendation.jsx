import React, { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  setDcTransferReviewData,
  getDcToDcReviewData,
  setDcTransferReviewDataLoader,
  saveAsDraftOrApproveDcTransfer,
  saveDcTransfer,
  moveToReviewed,
  updateRecomendationDataByKey,
  updateRecomendationData,
  resetReviewData,
  downloadReviews
} from "modules/inventorysmart/services-inventorysmart/DC-TO-DC/dc-to-dc-landing-page-service.js";
import { cloneDeep, isEmpty, isNull, isUndefined, isEqual } from "lodash";
import { displaySnackMessages, isActionAllowedOnSubModule, handleErrorMessage } from "../../../inventorysmart-utility";
import {
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Grid } from "@mui/material";
import { Button, Select } from "impact-ui-v3"
import { addSnack } from "core/actions/snackbarActions";
import { response, newRowTemplate, meta } from "./template.js"
import { getNearestMultiple } from "../../../../utils-inventorysmart/utilityFunctions";


const ReviewRecommendationsComponent = (props) => {
  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const hasEditAccess = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_TO_DC_TRANSFER,
      "edit"
    );
    return editEnabled;
  };
  const globalClasses = globalStyles();
  const classes = useStyles();
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const tabArticleReference = useRef({});
  const reviewDataReference = useRef({});
  const addingHiddenRef = useRef({});
  const currentNodeRef = useRef(null)

  const onAddRow = (action) => {
    addingHiddenRef.current = { is_added: true }
    agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
  }
  const onDeleteRow = () => {
    addingHiddenRef.current = { is_added: false }
    agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
  }

  useEffect(() => {
    window.scrollTo({
      left: 0,
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  })

  useEffect(() => {
    reviewDataReference.current = props?.reviewData
  }, [props?.reviewData]);

  useEffect(() => {
    if (!isEmpty(props?.selectedTab) && !isEmpty(props?.selectedArticle)) {
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      tabArticleReference.current = {
        selectedTab: props?.selectedTab,
        selectedArticle: props?.selectedArticle
      };
      agGridInstance?.current?.api?.refreshCells()
      addingHiddenRef.current = {}
    }
  }, [props?.selectedTab, props?.selectedArticle]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      filterDependencies.current = props.selectedFilters;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    } else {
      // setting ref to empty
      filterDependencies.current = {};
    }
  }, [props.selectedFilters]);


  // Get the ticket type column name from configuration or use default if not available
  const getParentLevelDropdownColumnName = () => {
    return props?.inventorysmartScreenConfig?.dc_to_dc_transfer?.selectDropdownColumnName;
  };

  const parentLevelDropdownColumnName = getParentLevelDropdownColumnName();

  const onCellValueChanged = (params) => {
    const uniqueKeyName = params.node.parent?.data?.key
    const parentRowNode = params.node.parent;
    const selectedArticle = parentRowNode?.data?.article
    const { source_dc, destination_dc, sourceoptions, destinationoptions, key, size, source_dc_oh_initial } = params?.data
    let value = params?.newValue
    let dataKey = `${selectedArticle}-${size}-${source_dc}-${destination_dc}`;
    let size_dc_source_data = props?.reviewData['review_recommendation']['data'][selectedArticle]?.find((thisData) => {
      return !thisData.is_visible
    })
    size_dc_source_data = size_dc_source_data?.data?.find((thisData) => {
      return thisData?.key === dataKey
    })
    const { column } = params
    const { colId } = column
    let currentNode = params.node
    
    if (colId === parentLevelDropdownColumnName) {
      // Handle ticket type dropdown which is only at parent level (node.parent level = 0)
      if (params.node.level === 0) {
        let ticketTypeValue = [];
        if (Array.isArray(value) && value.length > 0) {
          ticketTypeValue = value.map(item => ({
            ...item,
            label: item.label || "",
            value: item.value || ""
          }));
        }
        try {
          props?.updateRecomendationDataByKey({ 
            colId, 
            value: ticketTypeValue, 
            selectedArticle: params?.node?.data?.article, 
            uniqueKeyName: params?.node?.data?.key, 
            key,
            isParentLevel: true,
            parentLevelColumn: colId 
          });
          
          if (agGridInstance.current && agGridInstance.current.api) {
            agGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false
            });
          }

        } catch (error) {
          console.error(`Error updating ticket type`, error);
        }
        return;
      }
    }
    if (colId === "transfer_units") {
      if (value > source_dc_oh_initial) {
        value = source_dc_oh_initial
        const updated_data = {
          ...params?.data,
          transfer_units: value
        };
        currentNode.setData(updated_data);
      }
      currentNodeRef.current = {
        currentNode, selectedArticle, key, uniqueKeyName
      }
      value = Number(value)
      props?.updateRecomendationDataByKey({ colId, value, selectedArticle, uniqueKeyName, key })
      return
    }
    if (colId === "source_dc" || colId === "destination_dc") {
      props?.updateRecomendationDataByKey({ colId, value, selectedArticle, uniqueKeyName, key })
      if (!isNull(source_dc) && !isNull(destination_dc)) {
        if (source_dc === destination_dc) {
          return
        }
        if (isUndefined(size_dc_source_data)) {
          displaySnackMessages(`No Data found for ${size} and ${source_dc}-${destination_dc} DC`, "error", props);
          size_dc_source_data = { ...newRowTemplate, size, destinationoptions, sourceoptions }
        }
        let newRowWithData = []
        const parentData = cloneDeep(parentRowNode?.data)
        parentData?.data.forEach((thisData) => {
          if (thisData?.key === key) {
            newRowWithData.push({ ...size_dc_source_data, is_added: true, key })
          }
          else {
            newRowWithData.push({ ...thisData })
          }
        })
        const updated_data = {
          ...parentRowNode.data,
          data: newRowWithData
        };
        parentRowNode.setData(updated_data);
        parentRowNode.group = updated_data;
        parentRowNode.setExpanded(false);
        agGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [parentRowNode],
        });
        agGridInstance.current.api.flashCells({ rowNodes: [parentRowNode] });
        if (updated_data.data) parentRowNode.setExpanded(true);
        props?.updateRecomendationData({ size_dc_source_data, selectedArticle, uniqueKeyName, key })
      }
    }
  };

  const onBlurChangeHandler = (_e, data, column, isChanged) => {
    const colId = column?.colId
    if (colId === "transfer_units" && isChanged) {
      if (!isEmpty(currentNodeRef?.current)) {
        const user_transfer_units = Number(data?.transfer_units)
        const source_dc_oh_initial = Number(data?.source_dc_oh_initial)
        const inner_pack_units  = Number(data?.inner_pack_units)
        const corrected_transfer_units = getNearestMultiple(user_transfer_units,inner_pack_units,source_dc_oh_initial)
        if (corrected_transfer_units !== user_transfer_units) {
          currentNodeRef?.current?.currentNode?.setDataValue('transfer_units', corrected_transfer_units);
          agGridInstance?.current?.api.refreshCells({ columns: ["transfer_units",], force: true, });
          const { colId, selectedArticle, uniqueKeyName, key } = currentNodeRef?.current
          props?.updateRecomendationDataByKey({ colId, corrected_transfer_units, selectedArticle, uniqueKeyName, key })
        }
      }
    };
  }

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const onSave = async () => {
    const selectedArticle = props?.selectedArticle?.value
    const data = props?.reviewData['review_recommendation']['data'][selectedArticle]
    if (data) {
      let currentReviewedTransfers = getCurrentReviewedArticles(data)
      try {
        let savePayload =
        {
          "reviewed_articles": [...currentReviewedTransfers],
          "dc_transfer_code": props?.dc_transfer_code
        }
        props.setDcTransferReviewDataLoader(true);
        let response = await props?.saveDcTransfer(savePayload)
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        else {
          if (response?.status && response?.message) {
            displaySnackMessages(response?.message, "success", props);
          }
        }
        // Invalidate Cache for the reviewed article.
        let clonedRef = cloneDeep(reviewDataReference.current)
        delete clonedRef['review_recommendation']['data'][selectedArticle];
        reviewDataReference.current = clonedRef
        agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
        props?.moveToReviewed({ selectedArticle, currentReviewedTransfers })
      }
      catch (error) {
        handleErrorMessage(error, props);
      }
      finally {
        props.setDcTransferReviewDataLoader(false);
      }
    }
  }

  const getCurrentReviewedArticles = (data) => {
    let currentReviewedTransfers = []
      let isValidTransfer = true
      const l0_name = props.selectedFilters.find(filter => filter.attribute_name === "l0_name")?.values?.[0];

      const firstVisibleRowIndex = data.findIndex(row => row.is_visible === true && row[parentLevelDropdownColumnName] !== null);
      let dropdownValueTicketType = null;

      if (firstVisibleRowIndex !== -1) {
        dropdownValueTicketType = data[firstVisibleRowIndex][parentLevelDropdownColumnName][0]?.value;
      }

      data.forEach((thisRecommendation) => {
        if (thisRecommendation?.is_visible) {
          // ia recommended transfer where we are only savig transfer units.
          const { article, source_dc, source_dc_code, destination_dc_code, destination_dc } = thisRecommendation
          let temp = thisRecommendation?.data.map((thisSubRow) => {
            const { transfer_units, product_code, source_dc_oh_initial, source_dc_wos_after, destination_dc_wos_after} = thisSubRow
            if (transfer_units > source_dc_oh_initial) {
              isValidTransfer = false
            }
            return {
              article, source_dc, source_dc_code, destination_dc_code, destination_dc, transfer_units, product_code, source_dc_oh_initial, source_dc_wos_after, destination_dc_wos_after,l0_name
            }
          })
          const tempMap = temp.map((item) => {
            const newItem = {...item};
            if (dropdownValueTicketType) {
              newItem.attributes = {
                [parentLevelDropdownColumnName]: dropdownValueTicketType
              };
            }
            return newItem;
          });
          currentReviewedTransfers = [...currentReviewedTransfers, ...tempMap]
        }
        else {
          // For user defined transfers
          const { article } = thisRecommendation
          let temp = []
          thisRecommendation?.data.forEach((thisSubRow) => {
            if (!isUndefined(thisSubRow?.is_added)) {
              // For newly added transfers
              const { transfer_units, product_code, source_dc, source_dc_code, destination_dc_code, destination_dc, source_dc_oh_initial , source_dc_wos_after, destination_dc_wos_after} = thisSubRow
              if (!isNull(source_dc) && !isNull(destination_dc) && !isNull(transfer_units)) {
                // source, destination and transfer should not be null for a valid transfer
                if (transfer_units > source_dc_oh_initial) {
                  isValidTransfer = false
                }
                temp.push({
                  article, source_dc, source_dc_code, destination_dc_code, destination_dc, transfer_units, product_code, source_dc_oh_initial, source_dc_wos_after, destination_dc_wos_after,l0_name
                })
              }
            }
          })
          // Use the configuration-based ticket type column name
          
          //map the parent level dropdown to add to all the size level dropdowns
          const tempMap = temp.map((item) => {
            const newItem = {...item};
            if (dropdownValueTicketType) {
              newItem.attributes = {
                [parentLevelDropdownColumnName]: dropdownValueTicketType
              }
            }
            return newItem;
          });
          currentReviewedTransfers = [...currentReviewedTransfers, ...tempMap]
        }
      })
      if (!isValidTransfer) {
        displaySnackMessages("Transfer quantity cannot be greater than the available source DC on-hand.", "error", props);
        return
      }
      return currentReviewedTransfers
  }

  const onApprove = async () => {
    const selectedArticle = props?.selectedArticle?.value
    const data = props?.reviewData['review_recommendation']['data'][selectedArticle]
    let currentReviewedTransfers = getCurrentReviewedArticles(data)
    const payload = {
      "non_reviewed_articles": props?.unReviewedArticles,
      "reviewed_articles": [...currentReviewedTransfers],
      "status_code": 3,
      meta,
      filters: props?.selectedFilters,
      "dc_transfer_code": props?.dc_transfer_code
    }
    try {
      props.setDcTransferReviewDataLoader(true);
      let response = await props?.saveAsDraftOrApproveDcTransfer(payload)
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      else {
        if (response?.status && response?.message) {
          displaySnackMessages(response?.message, "success", props);
        }
      }
      props?.setShowReview(false)
      props?.resetReviewData()
      props?.dcTransferTableInstance?.current?.api?.refreshServerSideStore({ purge: true });
    }
    catch (error) {
      handleErrorMessage(error, props);
    }
    finally {
      props.setDcTransferReviewDataLoader(false);
    }
  }
  const onSaveAsDraft = async () => {
    const payload = {
      "non_reviewed_articles": props?.unReviewedArticles,
      "reviewed_articles": props?.reviewedArticles,
      "status_code": 2,
      meta,
      filters: props?.selectedFilters,
    }

    try {
      props.setDcTransferReviewDataLoader(true);
      let response = await props?.saveAsDraftOrApproveDcTransfer(payload)
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      else {
        if (response?.status && response?.message) {
          displaySnackMessages(response?.message, "success", props);
        }
      }
    }
    catch (error) {
      handleErrorMessage(error, props);
    }
    finally {
      props.setDcTransferReviewDataLoader(false);
    }
  }

  const manualCallFetchRecommendations = async ( manualBody,
    pageIndex,
    params, 
    props) => {
    props.setDcTransferReviewDataLoader(true);
    let selectedTab = tabArticleReference?.current?.selectedTab
    let selectedArticle = tabArticleReference?.current?.selectedArticle
    let body = {
      meta: {
        ...manualBody,
        limit: { limit: props?.pageSize || 10, page: pageIndex + 1 },
      },
      filters: props?.selectedFilters,
      selectedTab,
      selectedArticle,
    };

    try {
      const isDataPresentForTabStyle = reviewDataReference?.current[selectedTab?.id]['data'][selectedArticle?.value]
      if (isUndefined(isDataPresentForTabStyle)) {
        let response = await props?.getDcToDcReviewData(body);
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        props.setDcTransferReviewDataLoader(false);
        if (!response.data?.data?.length) {
          return {
            data: [],
            totalCount: 0,
          };
        } else {
          props?.setDcTransferReviewData({ selectedTab, selectedArticle, data: response?.data?.data })
          let filterdData = response?.data?.data.filter((thisObj) => {
            return thisObj.is_visible // Display only ia recommended by default.
          })
          return {
            data: cloneDeep(filterdData),
            totalCount: filterdData.length,
          };
        }
      } else {
        // Read from cache !
        props.setDcTransferReviewDataLoader(false);
        if (isEmpty(addingHiddenRef?.current)) {
          let filterdData = isDataPresentForTabStyle.filter((thisObj) => {
            return thisObj.is_visible // Display only ia recommended by default.
          })
          return {
            data: cloneDeep(filterdData),
            totalCount: filterdData.length,
          };
        }
        let filteredData = isDataPresentForTabStyle
        let ia_recommended_transfers = []
        let user_added_transfers = []
        isDataPresentForTabStyle.forEach((thisObj) => {
          thisObj.is_visible ? ia_recommended_transfers.push(thisObj) : user_added_transfers.push(thisObj)
        })
        let seenSet = new Set()
        let dummyTransfer = {}
        if (addingHiddenRef?.current.is_added) {
          // When user defined transfer is being added.
          if (user_added_transfers.length > 0) {
            dummyTransfer = cloneDeep(user_added_transfers[0])
            dummyTransfer['data'] = []
            dummyTransfer['is_visible'] = false
            dummyTransfer['is_added'] = true
            user_added_transfers[0]?.data?.forEach((thisData) => {
              if (!(seenSet.has(thisData.size))) {
                seenSet.add(thisData.size)
                const { sourceoptions, destinationoptions, size, source_dc, destination_dc, key } = thisData
                dummyTransfer['data'].push({
                  key: `${size}-is_added`,
                  ...newRowTemplate,
                  sourceoptions, destinationoptions, size,
                })
              }
            })
            filteredData = !isEmpty(dummyTransfer) ? [...ia_recommended_transfers, dummyTransfer] : [...ia_recommended_transfers]
            let clonedCachedData = cloneDeep(isDataPresentForTabStyle)
            let notAddedAlready = !clonedCachedData[clonedCachedData.length - 1]?.is_added
            if (notAddedAlready) {
              // If not already added
              clonedCachedData[clonedCachedData.length - 1].data = [
                ...clonedCachedData[clonedCachedData.length - 1].data,
                ...dummyTransfer?.data
              ]
              clonedCachedData[clonedCachedData.length - 1]['is_added'] = true
            }
            props?.setDcTransferReviewData({ selectedTab, selectedArticle, data: clonedCachedData })
          }
        }
        if (!addingHiddenRef?.current.is_added) {
          // When user defined transfer is being deleted.
          filteredData = [...ia_recommended_transfers]
          let clonedCachedData = cloneDeep(isDataPresentForTabStyle)
          clonedCachedData[clonedCachedData.length - 1]['is_added'] = false
          clonedCachedData[clonedCachedData.length - 1].data = clonedCachedData[clonedCachedData.length - 1].data.filter((thisObj) => {
            return !thisObj.is_added
          })
          props?.setDcTransferReviewData({ selectedTab, selectedArticle, data: clonedCachedData })
        }
        return {
          data: cloneDeep(filteredData),
          totalCount: filteredData?.length,
        }
      }
    } catch (e) {
      props.setDcTransferReviewDataLoader(false);
      handleErrorMessage(e, props);
      return {
        data: 0,
        totalCount: 0,
      };
    }
  };

  const handleDownload = async () => {
    const article = props?.selectedArticle?.value
    let downloadPayload = {
      meta,
      filters: props?.selectedFilters,
      article,
    }
    try {
      let response = await props.downloadReviews(downloadPayload);
      displaySnackMessages(response?.data?.data?.message, "success", props);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  const getTopRightOptions = () => {
    return [
      <Button
        id="create-product-profile"
        onClick={() => onSave()}
        variant="secondary"
        size="large"
        disabled={!hasEditAccess()}
      >
        Save
      </Button>,
      <Button
        id="create-product-profile"
        onClick={() => onApprove()}
        variant="primary"
        size="large"
        disabled={!hasEditAccess()}
      >
        Approve
      </Button>,
      <Select
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isWithSearch={true}
        label={"Choice"}
        isClearable={false}
        isMulti={false}
        setCurrentOptions={setCurrentOptions}
        currentOptions={currentOptions}
        selectedOptions={selectedOptions}
        initialOptions={currentOptions}
        setSelectedOptions={setSelectedOptions}
        handleChange={(option) => { props?.onArticleChange(option) }}
        labelOrientation="left"
      />,
      , <Button
        variant="tertiary"
        id="detailssDownloadBtn"
        onClick={onAddRow}
        title={"Add"}
        size = "large"
      >
        <AddIcon />
      </Button>,
      <Button
        variant="tertiary"
        id="detailssDownloadBtn"
        onClick={onDeleteRow}
        title={"Delete"}
        size = "large"
      >
        <DeleteIcon />
      </Button>
    ]
  }

  const [currentOptions, setCurrentOptions] = useState(props?.options || [])
  const [selectedOptions, setSelectedOptions] = useState(props?.selectedArticle)
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Grid>
      <Loader loader={props.dcTransferReviewDataLoader} minHeight={"350px"}>
        <AgGridComponent
          showDownloadButton = {true}
          onDownloadButtonClick = {() => handleDownload()}
          topRightOptions={getTopRightOptions()}
          childKey={"data"}
          hideSelectAllRecords={false}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          selectAllHeaderComponent={false}
          treeData={true}
          cacheBlockSize={20}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex, params) =>
            manualCallFetchRecommendations(body, pageIndex, params, props)
          }
          onCellValueChanged={(params) => {
            onCellValueChanged(params);
          }}
          skipAutoSizeColumn={true}
          groupDisplayType={"custom"}
          onGridChanged
          onRowSelected
          uniqueRowId={"key"}
          hideChildSelection={true}
          purgeClosedRowNodes={true}
          suppressAggFuncInHeader={true}
          suppressClickEdit={true}
          paginationPageSize={20}
          columns={props?.columns}
          onBlur={onBlurChangeHandler}
        />
      </Loader>
    </Grid>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    dcTransferReviewDataLoader:
      inventorysmartReducer?.inventorySmartDcTransferService
        ?.dcTransferReviewDataLoader,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    reviewData:
      inventorysmartReducer.inventorySmartDcTransferService
        .reviewData,
    unReviewedArticles:
      inventorysmartReducer.inventorySmartDcTransferService
        .unReviewedArticles,
    reviewedArticles:
      inventorysmartReducer.inventorySmartDcTransferService
        .reviewedArticles,
    dc_transfer_code:
    inventorysmartReducer.inventorySmartDcTransferService
      .dc_transfer_code,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    getDcToDcReviewData: (body) =>
      dispatch(getDcToDcReviewData(body)),
    setDcTransferReviewDataLoader: (body) =>
      dispatch(setDcTransferReviewDataLoader(body)),
    setDcTransferReviewData: (body) =>
      dispatch(setDcTransferReviewData(body)),
    saveAsDraftOrApproveDcTransfer: (body) =>
      dispatch(saveAsDraftOrApproveDcTransfer(body)),
    saveDcTransfer: (body) =>
      dispatch(saveDcTransfer(body)),
    moveToReviewed: (body) =>
      dispatch(moveToReviewed(body)),
    updateRecomendationDataByKey: (body) =>
      dispatch(updateRecomendationDataByKey(body)),
    updateRecomendationData: (body) =>
      dispatch(updateRecomendationData(body)),
    resetReviewData: () =>
      dispatch(resetReviewData()),
    downloadReviews: (body) => dispatch(downloadReviews(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewRecommendationsComponent);
