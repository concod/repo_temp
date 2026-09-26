import React, { useEffect, useState, useRef, forwardRef } from "react";
import { connect } from "react-redux";
import {
  fetchProductCode,
  fetchProductCodes,
  modifyInvetoryAlertsCount,
  scrollIntoView,
} from "../../inventorysmart-utility";

import globalStyles from "core/Styles/globalStyles";
import {
  ALERTS_ACTION_MAP,
  tableArticleFilter,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import OrderAlertActionTable from "./OrderAlertActionTable";
// import AlertsActionPopup from "./AlertsActionPopup";
import { Paper, Typography } from "@mui/material";
import classNames from "classnames";
import {
  getAlertsActionPopupData,
  reviewAlerts,
  setAlertsActionPopupDataLoader,
  getAlertsActionPopupConfiguration,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/alerts-actions-service";
import { setInventoryDashboardAlertCount } from "modules/inventorysmart/services-inventorysmart/KPI-Matrix/kpi-services";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  getRecommendedOrderPopUpTableData,
  setOrderAlertsPopUpTableConfigLoader,
  setOrderAlertsPopUpTableDataLoader,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-order-alerts-service";
import OrderAlertsActionPopup from "./OrderAlertsActionPopup";

const OrderAlertAction = forwardRef((props, ref) => {
  const globalClasses = globalStyles();
  const alertsActionRef = useRef(null);

  const [showTableLoader, setShowTableLoader] = useState(false);
  const [showAlertsTable, setShowAlertsTable] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [alert, setAlert] = useState(null);
  const [alertTableData, setAlertTableData] = useState(null);
  const [alertPopupData, setAlertPopupData] = useState(null);
  const [alertPopupTableConfig, setAlertPopupTableConfig] = useState(null);
  const [redirection, setRedirection] = useState(null);
  const [totalModelStockSum, setTotalModelStockSum] = useState("");

  const [currentLevel, setCurrentLevel] = useState(0);

  const handleAlertActionAtCurrentLevel = (alertData) => {
    const currentAction = alertData.type[alertData.current_level];

    switch (currentAction) {
      case ALERTS_ACTION_MAP.NEW_TABLE:
        if (alert) {
          setShowAlertsTable(true);
          //setShowTableLoader(true)
        }
        break;
      case ALERTS_ACTION_MAP.POP_UP:
        if (alert) {
          handleAlertsActionPopupData();
        }
        break;
      case ALERTS_ACTION_MAP.POP_UP_LINK:
        if (alert) {
          handleAlertsActionPopupData();
        }
        break;
      case ALERTS_ACTION_MAP.DYNAMIC_POP_UP:
        if (alert) {
          handleAlertsActionPopupData();
        }
        break;
      default:
        if (alert) {
          setShowAlertsTable(true);
        }
        break;
    }
  };

  const openAlertsPopUp = () => {
    setShowAlertsDialog(true);
  };

  const closeAlertsPopUp = () => {
    setShowAlertsDialog(false);
  };

  const handleAlertsActionPopupData = () => {
    openAlertsPopUp();
  };

  const setDataForPopUp = async (
    alertData,
    type,
    currentLevel,
    recommendedPopUpApi
  ) => {
    //const popupData = alertData[`${type[currentLevel]}_data`];
    let columns;
    const payload = {
      tableConfigName: recommendedPopUpApi.current.table_config,
    };
    setAlertPopupData([]);
    setShowAlertsDialog(true);
    props.setOrderAlertsPopUpTableConfigLoader(true);
    columns = await props.getAlertsActionPopupConfiguration(payload);
    props.setOrderAlertsPopUpTableConfigLoader(false);
    let formattedColumns = agGridColumnFormatter(columns?.data?.data);
    setAlertPopupTableConfig(formattedColumns);
    let payloadData = {
      tableDataApi:
        recommendedPopUpApi.current?.data + "/" + alertData?.product_code,
    };
    props.setOrderAlertsPopUpTableDataLoader(true);
    const response = await props.getRecommendedOrderPopUpTableData(payloadData);
    if (response.data.status) {
      response.data.data.map((data, i) => {
        data.unique_id = i;
      });
      setAlertPopupData(response.data.data);
      props.setOrderAlertsPopUpTableDataLoader(false);
    }
  };

  const setDataForNewTable = async (alertData, type, currentLevel) => {
    const tableData = alertData[`${type[currentLevel]}_data`];
    setAlertTableData([...tableData]);
  };

  const handleAlertAction = async (alert) => {
    const currentAction = alert.type[currentLevel];

    if (
      currentAction === ALERTS_ACTION_MAP.POP_UP &&
      alert[`${alert?.type[currentLevel]}_data`]
    ) {
      setDataForPopUp(alert, alert?.type, currentLevel);
    } else if (
      currentAction === ALERTS_ACTION_MAP.NEW_TABLE &&
      alert[`${alert?.type[currentLevel]}_data`]
    ) {
      setDataForNewTable(alert, alert?.type, currentLevel);
    }

    handleAlertActionAtCurrentLevel(alert);
  };

  const onReviewClick = async (data, recommendedApi) => {
    const alertData = { ...alert };
    alertData.current_level += 1;
    const currentAction = alertData.type[alertData.current_level];
    setCurrentLevel(alertData.current_level);
    if (currentAction === ALERTS_ACTION_MAP.DYNAMIC_POP_UP) {
      // setDataForDynamicPopUp(data, alertData?.type, alertData.current_level);
    } else if (currentAction === ALERTS_ACTION_MAP.POP_UP_LINK) {
      //setDataForPopUpLink(data, alertData?.type, alertData.current_level);
    } else {
      setDataForPopUp(
        data,
        alertData?.type,
        alertData.current_level,
        recommendedApi
      );
    }
  };

  useEffect(() => {
    if (showAlertsTable) {
      scrollIntoView(alertsActionRef);
    }
  }, [showAlertsTable]);

  useEffect(() => {
    if (alert) {
      handleAlertAction(alert);
    }
  }, [alert]);

  useEffect(() => {
    if (props.data) {
      setShowAlertsTable(false);
      const alertData = { ...props.data };
      alertData.current_level += 1;
      if (props.data.redirect) {
        setRedirection(props.data.redirect);
      }
      setCurrentLevel(alertData.current_level);
      setAlert(alertData);
    }
  }, [props.data]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      {showAlertsTable && (
        <div ref={alertsActionRef}>
          <Paper
            elevation={4}
            className={classNames(
              globalClasses.paperWrapper,
              globalClasses.marginVertical1rem
            )}
          >
            <Typography className={globalClasses.marginTop} variant="h5">
              Review Recommendation
            </Typography>
            <OrderAlertActionTable
              loading={showTableLoader}
              alertId={alert?.id}
              tableConfigName={alert?.recommended?.table_config}
              tableDataApiName={alert?.recommended?.data}
              totalCount={alert?.article_count}
              onReviewClick={onReviewClick}
              setReloadKpi={props?.setReloadKpi}
            />
          </Paper>
        </div>
      )}
      {showAlertsDialog && (
        <OrderAlertsActionPopup
          ref={ref}
          active={showAlertsDialog}
          openModal={openAlertsPopUp}
          closeModal={closeAlertsPopUp}
          tableData={alertPopupData}
          tableConfig={alertPopupTableConfig}
        />
      )}
    </div>
  );
});

const mapStateToProps = (store) => {
  return {
    alertsActionPopupDataLoader:
      store.inventorysmartReducer.inventorySmartAlertsActionService
        .alertsActionPopupDataLoader,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getAlertsActionPopupConfiguration: (payload) =>
    dispatch(getAlertsActionPopupConfiguration(payload)),
  setAlertsActionPopupDataLoader: (payload) =>
    dispatch(setAlertsActionPopupDataLoader(payload)),
  getAlertsActionPopupData: (payload) =>
    dispatch(getAlertsActionPopupData(payload)),
  setInventoryDashboardAlertCount: (payload) =>
    dispatch(setInventoryDashboardAlertCount(payload)),
  reviewAlerts: (payload) => dispatch(reviewAlerts(payload)),
  getRecommendedOrderPopUpTableData: (payload) =>
    dispatch(getRecommendedOrderPopUpTableData(payload)),
  setOrderAlertsPopUpTableConfigLoader: (payload) =>
    dispatch(setOrderAlertsPopUpTableConfigLoader(payload)),
  setOrderAlertsPopUpTableDataLoader: (payload) =>
    dispatch(setOrderAlertsPopUpTableDataLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(OrderAlertAction);
