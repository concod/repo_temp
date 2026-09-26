import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import classnames from "classnames";

import { Dialog, DialogContent, Typography } from "@mui/material";
import {BottomSheet} from "impact-ui-v3"
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getStoreInventoryTableConfiguration,
  getStoreInventoryTableData,
  setStoreInventoryTableConfigLoader,
  setStoreInventoryLoader,
  setStoreInventoryTableData,
  getStoreDetailsAtSizes,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
  minHeightPopUp: {
    minHeight: "25rem",
  },
}));

const StoreArticleInventoryPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [storeInventoryTableColumns, setStoreInventoryTableColumns] = useState(
    []
  );
  const [storeInventoryData, setStoreInventoryData] = useState([]);

  const isMinsColumnVisibleVSI = props.ddScreenConfigs?.dashboard?.drillDown?.isMinsColumnVisibleVSI;
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const applyCustomKpiColumn = (columns) => {
    if (!Array.isArray(columns) || !props.customKpiColumn) return columns;
    const customKpiIndex = columns.findIndex(
      (col) => col.column_name === "custom_kpis"
    );
    if (customKpiIndex === -1) return columns;
    const updatedColumns = [...columns];
    updatedColumns[customKpiIndex] = props.customKpiColumn;
    return updatedColumns;
  };

  const fetchStoreInventoryData = async () => {
    try {
      props.setStoreInventoryLoader(true);
      if (props.storeDcModal) {
        let body = {
          filters: props.filters,
          article: props.article,
        };
        let response = await props.getStoreDetailsAtSizes(body);
        if (response.data.status) {
          let l_formattedColumns = agGridColumnFormatter(
            response?.data?.data?.columns?.[props.metric]
          );
          let l_data = response?.data?.data?.data;
          const dc_cols = [
            "available_to_allocate",
            "dc_oh_1",
            "dc_oh_qcloc",
            "dc_oh_cwc",
            "oo_dc",
            "it_dc",
            "bulk_remaining",
            "dc_oh_1_wms_location",
          ];
          if (dc_cols.includes(props.metric))
            l_data = l_data?.filter((data) => data.is_dc);
          else l_data = l_data?.filter((data) => !data.is_dc);
          
          l_formattedColumns = applyCustomKpiColumn(l_formattedColumns);
          setStoreInventoryTableColumns(l_formattedColumns);
          setStoreInventoryData(l_data);
          props.setStoreInventoryLoader(false);
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      } else {
        let body = {
          filters: props.filters,
          meta: {
            ...tableConfigurationMetaData.meta,
          },
          article: props.article,
          metrics: props.metric,
        };
        let response = await props.getStoreInventoryTableData(body);
        if (response.data.status) {
          setStoreInventoryData(response.data.data?.data);
          props.setStoreInventoryTableData(response.data.data);
          props.setStoreInventoryLoader(false);
        } else {
          const show_message = response?.data?.show_message;
          setStoreInventoryData([]);
          props.setStoreInventoryTableData([]);
          props.setStoreInventoryLoader(false);
          // show_message && displaySnackMessages( response.data.message , "success");
        }
      }
    } catch(e){
      // handleErrorMessage(e);
      return [];
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const resetStoreArticleInventoryData = () => {
    setStoreInventoryData([]);
    setStoreInventoryTableColumns([]);
  };

  const ALERTS_STORE_TABLE = "inventorysmart_allocation_alerts_store_table";
  const DETAILS_STORE_TABLE = "inventorysmart_details_store_table";
  const CHOICES_BELOW_MINS_STORE_TABLE = "choices_below_mins_alert_store_table";

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setStoreInventoryTableConfigLoader(true);
      let columns;
      
      if (props.alertsAllocationActionItem) {
        // For "Choices Below Mins" alert
        if (props.alertsAllocationActionItem === "Choices Below Mins") {
          try {
            columns = await props.getStoreInventoryTableConfiguration(CHOICES_BELOW_MINS_STORE_TABLE);
            if (!columns?.data?.data || columns?.data?.data?.length === 0) {
              columns = await props.getStoreInventoryTableConfiguration(DETAILS_STORE_TABLE);
            }
          } catch (error) {
            columns = await props.getStoreInventoryTableConfiguration(DETAILS_STORE_TABLE);
          }
        } else {
          try {
            columns = await props.getStoreInventoryTableConfiguration(ALERTS_STORE_TABLE);
            if (!columns?.data?.data || columns?.data?.data?.length === 0) {
              columns = await props.getStoreInventoryTableConfiguration(DETAILS_STORE_TABLE);
            }
          } catch (error) {
            columns = await props.getStoreInventoryTableConfiguration(DETAILS_STORE_TABLE);
          }
        }
      } else {
        columns = await props.getStoreInventoryTableConfiguration(DETAILS_STORE_TABLE);
      }
      
      props.setStoreInventoryTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      if (isMinsColumnVisibleVSI && props.alertsAllocationActionItem !== "Choices Below Mins") {
        formattedColumns = formattedColumns.filter(column => column.accessor !== "min");
      }
      formattedColumns = applyCustomKpiColumn(formattedColumns);
      setStoreInventoryTableColumns(formattedColumns);
    };

    if (props.active) {
      !props.storeDcModal && fetchColumnData();
      if(props.storeAlertData){
        setStoreInventoryData(props.storeAlertData);
        props.setStoreInventoryTableData(props.storeAlertData);
      }
      else{
        fetchStoreInventoryData();
      }
    } else {
      resetStoreArticleInventoryData();
    }
  }, [props.active, props.storeDcModal, props.storeAlertData]);

  return props.active ? (
    <BottomSheet
     withExpandIcon = {false}
      isBottomSheet
      title = {props.title ? props.title : props.metric}
      id="storeInventoryDialog"
      aria-labelledby="store-invenotry-dialog"
      open={props.active}
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.closeModal();
      }}
    >

        <Loader
          loader={
            props.storeInventoryLoader || props.storeInventoryTableConfigLoader
          }
        >
          <div className={`${classes.minHeightPopUp}`}>
          {storeInventoryTableColumns?.length > 0 &&
            !props.storeInventoryLoader &&
            !props.storeInventoryTableConfigLoader && (
              <AgGridComponent
                isInsideBottomSheet
                tableHeader="Details"
                isBottomSheetExpanded = {true}
                cardContainer = {false}
                columns={storeInventoryTableColumns}
                rowdata={storeInventoryData}
                selectAllHeaderComponent={false}
                uniqueRowId={"store_code"}
                height="230px"
                pagination={
                  !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                    "dashboard"
                  )
                }
                suppressFieldDotNotation
              />
            )}
          </div>
        </Loader>

    </BottomSheet>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    storeInventoryLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .storeInventoryLoader,
    storeInventoryTableConfigLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .storeInventoryTableConfigLoader,
    storeInventoryTableData:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .storeInventoryTableData,
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        .ddScreenConfigs,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreInventoryTableConfiguration: (tableName) =>
    dispatch(getStoreInventoryTableConfiguration(tableName)),
  getStoreInventoryTableData: (payload) =>
    dispatch(getStoreInventoryTableData(payload)),
  getStoreDetailsAtSizes: (payload) =>
    dispatch(getStoreDetailsAtSizes(payload)),
  setStoreInventoryTableConfigLoader: (payload) =>
    dispatch(setStoreInventoryTableConfigLoader(payload)),
  setStoreInventoryLoader: (payload) =>
    dispatch(setStoreInventoryLoader(payload)),
  setStoreInventoryTableData: (payload) =>
    dispatch(setStoreInventoryTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreArticleInventoryPopup);
