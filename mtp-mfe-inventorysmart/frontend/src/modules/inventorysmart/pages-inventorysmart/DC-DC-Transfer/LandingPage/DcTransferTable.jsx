import React, { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { Switch, Button } from "impact-ui-v3";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isActionAllowedOnSubModule, displaySnackMessages, handleErrorMessage } from "../../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import {
  setDcTransferDataLoader,
  getDcToDcTrasferData,
  saveAsDraftOrApproveDcTransfer,
  setDcTransferCode,
  downloadDcransfers
} from "modules/inventorysmart/services-inventorysmart/DC-TO-DC/dc-to-dc-landing-page-service.js";
import {
  Box
} from "@mui/material";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import DownloadIcon from "@mui/icons-material/Download";
import ReviewComponent from "./ReviewComponent/index.jsx"
import { meta } from "./ReviewComponent/template.js"


const DcTransferTableView = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [columnDefs, setColumnDefs] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [articlesToBeReviwed, setArticlesToBeReviewed] = useState([]);
  const checkedRef = useRef(true)

  const agGridInstance = useRef(null);
  const tableMetaDataRef = useRef({});
  const dcTransferFiltersRef = useRef({});

  useEffect(() => {
    const onLoad = async () => {
      let columns = await getColumnsAg(
        "table_name=dc_dc_transfer_table"
      )();
      columns = columns.map((item) => {
        if (item.column_name === "article") {
          item.cellRenderer = "agGroupCellRenderer";
        }
        return item
      })
      setColumnDefs(columns);
    };
    onLoad();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      dcTransferFiltersRef.current = props.selectedFilters;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    }
    agGridInstance?.current?.api?.deselectAll();
  }, [props.selectedFilters]);

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

  const onSelectionChanged = (params) => {
    let selections = params.api.getSelectedRows();
    setArticlesToBeReviewed([])
    props?.setShowReview(false)
    setSelectedRecords(selections);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const manualCallDcTransfer = async (
    manualBody,
    pageIndex,
    params
  ) => {
    tableMetaDataRef.current = manualBody;
    let body = {
      meta: {
        ...manualBody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: dcTransferFiltersRef.current,
    };
    try {
      props?.setDcTransferDataLoader(true);
      let response = await props.getDcToDcTrasferData(body);

      if (response.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        let formattedData = agGridRowFormatter(
          response?.data?.data,
          params?.api?.checkConfiguration,
          "article"
        );
        let dc_transfer_code = response?.data?.data[0]?.dc_transfer_code
        props?.setDcTransferCode(dc_transfer_code)
        if (checkedRef.current) {
          formattedData = formattedData.filter((thisData) => {
            return thisData?.recommendation_flag
          })
        }
        return {
          data: formattedData,
          totalCount: response?.data?.total,
        };
      }
    } catch (error) {
      handleErrorMessage(error, props);
    }
    finally {
      props?.setDcTransferDataLoader(false);
    }
  };

  const onApprove = () => {
    const approvePayload = {
      "non_reviewed_articles": selectedRecords.map((thisArticle) => { return thisArticle?.article }),
      "status_code": 3,
      meta,
      filters: dcTransferFiltersRef.current,
    }
    try {
      props?.setDcTransferDataLoader(true);
      let response = props?.saveAsDraftOrApproveDcTransfer(approvePayload)
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      agGridInstance?.current?.api?.refreshServerSideStore({ purge: true });
    }
    catch (error) {
      handleErrorMessage(error, props);
    }
    finally {
      props?.setDcTransferDataLoader(false);
    }
  };
  const onReview = () => {
    props?.setShowReview(true)
    setArticlesToBeReviewed(selectedRecords)
  };
  const onDownload = async () => {
    try {
      let downloadPayload = {
        meta,
        filters: dcTransferFiltersRef.current,
      }
      props?.setDcTransferDataLoader(true);
      let response = await props?.downloadDcransfers(downloadPayload)
      displaySnackMessages(response?.data?.data?.message, "success", props);
    }
    catch (error) {
      handleErrorMessage(error, props);
    } finally {
      props?.setDcTransferDataLoader(false);
    }
  };
  const filterStyles = () => {
    checkedRef.current = !checkedRef.current
    agGridInstance?.current?.api?.onFilterChanged();
    setSelectedRecords([])
    setArticlesToBeReviewed([])
    props?.setShowReview(false)
    agGridInstance?.current?.api?.deselectAll(true);
    agGridInstance?.current?.api?.redrawRows();
  }

  const getTopRightOptions = () => {
    let options = []
    if (selectedRecords.length > 0) {
      options.push(<Button
        variant="secondary"
        id="dc-approve-button"
        onClick={onApprove}
        title={"Download"}
        size="large"
        disabled={props?.showReview}
      >
        Approve
      </Button>)
    }
    if(selectedRecords.length > 0){
      options.push(<Button
        id="review-dc-dc"
        variant="primary"
        size="large"
        onClick={onReview}
      >
        Review Recommendation & Sizes
      </Button>)
    }
    return options
  }


  return (
    <div className={classes.autoOverflowWrapper}>
      <Loader loader={props.dcTransferTableDataLoader}>
        <AgGridComponent
          showDownloadButton = {true}
          onDownloadButtonClick = {() => onDownload()}
          topRightOptions={getTopRightOptions()}
          topLeftOptions={[<Switch
            id="productToggleBtn"
            checked={checkedRef.current}
            onChange={(event) =>
              filterStyles()
            }
            rightLabel={
              "Hide Non-Recommended Choices"
            }
            leftLabel={
              ""
            }
          />]}
          uniqueRowId={"article"}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          selectAllHeaderComponent={hasEditAccess()}
          columns={columnDefs}
          cacheBlockSize={props.pageSize || 10}
          onSelectionChanged={onSelectionChanged}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex, params) =>
            manualCallDcTransfer(body, pageIndex, params)
          }
          skipAutoSizeColumn={true}
          hideChildSelection={true}
          groupDisplayType={"custom"}
          suppressAggFuncInHeader={true}
          childKey={"data"}
          treeData={true}
          purgeClosedRowNodes={true}
          paginationPageSize={props.pageSize}
        />

        {props?.showReview && props.dc_transfer_code && (
          <ReviewComponent
            selectedFilters={props?.selectedFilters}
            setShowReview={props?.setShowReview}
            dcTransferTableInstance={agGridInstance}
            articlesSelectedForReview={articlesToBeReviwed.map((thisArticle) => {
              return {
                id: thisArticle?.article,
                value: thisArticle?.article,
                label: thisArticle?.article,
              }
            })}
          />
        )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    dcTransferTableDataLoader:
      inventorysmartReducer.inventorySmartDcTransferService
        .dcTransferTableDataLoader,
    dc_transfer_code:
      inventorysmartReducer.inventorySmartDcTransferService
        .dc_transfer_code,

  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    setDcTransferDataLoader: (body) =>
      dispatch(setDcTransferDataLoader(body)),
    getDcToDcTrasferData: (body) =>
      dispatch(getDcToDcTrasferData(body)),
    saveAsDraftOrApproveDcTransfer: (body) =>
      dispatch(saveAsDraftOrApproveDcTransfer(body)),
    setDcTransferCode: (body) =>
      dispatch(setDcTransferCode(body)),
    downloadDcransfers: (body) =>
      dispatch(downloadDcransfers(body)),

  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DcTransferTableView);
