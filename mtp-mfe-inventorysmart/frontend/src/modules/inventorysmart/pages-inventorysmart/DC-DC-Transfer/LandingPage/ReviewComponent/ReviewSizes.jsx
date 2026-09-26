import React, { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import { Select, Switch, Button } from "impact-ui-v3";
import DownloadIcon from "@mui/icons-material/Download";
import {
  setDcTransferReviewData,
  getDcToDcReviewData,
  setDcTransferReviewDataLoader,
  downloadSizes
} from "modules/inventorysmart/services-inventorysmart/DC-TO-DC/dc-to-dc-landing-page-service.js";
import { cloneDeep, isEmpty, isNull, isUndefined, isEqual } from "lodash";
import { displaySnackMessages, isActionAllowedOnSubModule } from "../../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Grid } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { meta } from "./template.js"
import globalStyles from "core/Styles/globalStyles";


export const handleErrorMessage = (e, props) => {
  const errObj = e?.response?.data;
  if (errObj?.show_message)
    displaySnackMessages(errObj?.message, "error", props);
  else displaySnackMessages(ERROR_MESSAGE, "error", props);
};

const ReviewSizesComponent = (props) => {
  const globalClasses = globalStyles();
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const tabArticleReference = useRef({});
  const reviewDataRefernce = useRef({});
  const checkedRef = useRef(true)

  useEffect(() => {
    reviewDataRefernce.current = props?.reviewData
  }, [props?.reviewData]);


  useEffect(() => {
    if (!isEmpty(props?.selectedTab) && !isEmpty(props?.selectedArticle)) {
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      tabArticleReference.current = {
        selectedTab: props?.selectedTab,
        selectedArticle: props?.selectedArticle
      };
      checkedRef.current = true
      agGridInstance?.current?.api?.refreshCells()
    }
  }, [props?.selectedTab, props?.selectedArticle]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      filterDependencies.current = props.selectedFilters;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    } else {
      filterDependencies.current = {};
    }
    checkedRef.current = true
  }, [props.selectedFilters]);

  const onCellValueChanged = (params) => { };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const manualCallFetchSizeList = async ( manualBody,
    pageIndex,
    params) => {
    props.setDcTransferReviewDataLoader(true);
    let selectedTab = tabArticleReference?.current?.selectedTab
    let selectedArticle = tabArticleReference?.current?.selectedArticle
    let body = {
      meta: {
        ...manualBody,
        limit: { limit: 100, page: pageIndex + 1 },
      },
      filters: props?.selectedFilters,
      selectedTab,
      selectedArticle,
    };

    try {
      const isDataPresentForTabStyle = (reviewDataRefernce?.current[selectedTab?.id]['data'][selectedArticle?.value])
      if (isUndefined(isDataPresentForTabStyle) || (!isEmpty(body.meta?.range) || !isEmpty(body.meta?.search) || !isEmpty(body.meta?.sort))) {
        // If sizes data is not already fetched.
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
          let formattedData = response?.data?.data
          if (checkedRef.current) {
            formattedData = formattedData.filter((thisData) => {
              return thisData?.recommendation_flag
            })
          }
          props?.setDcTransferReviewData({ selectedTab, selectedArticle, data: response?.data?.data })
          return {
            data: formattedData,
            totalCount: null,
          };
        }
      } else {
        props.setDcTransferReviewDataLoader(false);
        let formattedData = isDataPresentForTabStyle
        if (checkedRef.current) {
          formattedData = formattedData.filter((thisData) => {
            return thisData?.recommendation_flag
          })
        }
        return {
          data: formattedData,
          totalCount: null,
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
  const filterStyles = () => {
    checkedRef.current = !checkedRef.current
    agGridInstance?.current?.api?.onFilterChanged();
    agGridInstance?.current?.api?.deselectAll(true);
    agGridInstance?.current?.api?.redrawRows();
  }
  
  const [currentOptions, setCurrentOptions] = useState(props?.options || [])
  const [selectedOptions, setSelectedOptions] = useState(props?.selectedArticle)
  const [isOpen, setIsOpen] = useState(false)

  const handleDownload = async () => {
    const article = props?.selectedArticle?.value
    let downloadPayload = {
      meta,
      filters: props?.selectedFilters,
      article
    }
    try {
      let response = await props.downloadSizes(downloadPayload);
      displaySnackMessages(response?.data?.data?.message, "success",props);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  return (
    <Grid>
      <Loader loader={props.dcTransferReviewDataLoader} minHeight={"350px"}>
        <AgGridComponent
          showDownloadButton = {true}
          onDownloadButtonClick = {() => handleDownload()}
          topRightOptions={[
            <Select
              isOpen={isOpen}
              setIsOpen = {setIsOpen}
              isWithSearch={true}
              label={"Choice"}
              isClearable={false}
              isMulti={false}
              setCurrentOptions = {setCurrentOptions}
              currentOptions={currentOptions}
              selectedOptions={selectedOptions}
              initialOptions={currentOptions}
              setSelectedOptions={setSelectedOptions}
              handleChange={(option) => {props?.onArticleChange(option)}}
              labelOrientation = "left"
            />,
            , <Switch
              id="productToggleBtn"
              checked={checkedRef.current}
              onChange={(event) =>
                filterStyles()
              }
              rightLabel={
                "Hide Non-Recommended Sizes"
              }
              leftLabel={
                ""
              }
            />
          ]
          }
          childKey={"data"}
          hideSelectAllRecords={false}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          selectAllHeaderComponent={false}
          treeData={true}
          cacheBlockSize={100}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex, params) =>
            manualCallFetchSizeList(body, pageIndex, params)
          }
          onCellValueChanged={(params) => {
            onCellValueChanged(params);
          }}
          skipAutoSizeColumn={true}
          groupDisplayType={"custom"}
          onGridChanged
          onRowSelected
          uniqueRowId={"size"}
          hideChildSelection={true}
          purgeClosedRowNodes={true}
          suppressAggFuncInHeader={true}
          suppressClickEdit={true}
          paginationPageSize={100}
          columns={props?.columns}
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
    downloadSizes: (body) => dispatch(downloadSizes(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewSizesComponent);