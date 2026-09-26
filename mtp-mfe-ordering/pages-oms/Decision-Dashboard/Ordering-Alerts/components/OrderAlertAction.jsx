import React, { useEffect, useState, useRef, forwardRef } from "react";
import { connect } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import { ALERTS_ACTION_MAPPING } from "modules/oms/constants-oms/stringConstants";
import { scrollIntoView } from "modules/oms/utils-oms/oms-utility";
import OrderAlertsActionPopup from "./OrderAlertsActionPopup";
import OrderAlertActionTable from "./OrderAlertActionTable";
import {
  getRecommendedOrderPopUpTableData,
  setOrderAlertsPopUpTableConfigLoader,
  setOrderAlertsPopUpTableDataLoader,
  setOrderAlertCount,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-alerts-service";
import { getAlertsActionPopupConfiguration } from "modules/oms/services-oms/Decision-Dashboard/alerts-actions-service";

const OrderAlertAction = forwardRef((props, ref) => {
  const globalClasses = globalStyles();
  const alertsActionRef = useRef(null);
  const [showAlertsTable, setShowAlertsTable] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [alert, setAlert] = useState(null);
  const [alertPopupData, setAlertPopupData] = useState(null);
  const [alertPopupTableConfig, setAlertPopupTableConfig] = useState(null);
  const [currentRedirectionLevels, setCurrentRedirectionLevels] = useState([
    "style",
  ]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [redirectionButtons, setRedirectionButtons] = useState([]);
  const [isActionButtonPresent, setIsActionButtonPresent] = useState(true);

  const handleAlertActionAtCurrentLevel = (alertData) => {
    const currentAction = alertData.type[alertData.current_level];

    switch (currentAction) {
      case ALERTS_ACTION_MAPPING.NEW_TABLE:
        if (alert) {
          setShowAlertsTable(true);
        }
        break;
      case ALERTS_ACTION_MAPPING.POP_UP:
        if (alert) {
          handleAlertsActionPopupData();
        }
        break;
      case ALERTS_ACTION_MAPPING.POP_UP_LINK:
        if (alert) {
          handleAlertsActionPopupData();
        }
        break;
      case ALERTS_ACTION_MAPPING.DYNAMIC_POP_UP:
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
    let columns;
    const payload = {
      tableConfigName: recommendedPopUpApi.current.table_config,
    };
    setAlertPopupData([]);
    setShowAlertsDialog(true);
    props.setOrderAlertsPopUpTableConfigLoader(true);
    columns = await props.getAlertsActionPopupConfiguration(payload);
    props.setOrderAlertsPopUpTableConfigLoader(false);
    let formattedColumns = agGridColumnFormatter(
      columns?.data?.data,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );
    setAlertPopupTableConfig(formattedColumns);
    let payloadData = {
      tableDataApi:
        recommendedPopUpApi.current?.data +
        "/" +
        alertData?.unique_row_id +
        (props?.isCalledFromVendorStore ? "?vendor_store=true" : ""),
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

  const handleAlertAction = async (alert) => {
    const currentAction = alert.type[currentLevel];

    if (
      currentAction === ALERTS_ACTION_MAPPING.POP_UP &&
      alert[`${alert?.type[currentLevel]}_data`]
    ) {
      setDataForPopUp(alert, alert?.type, currentLevel);
    }

    handleAlertActionAtCurrentLevel(alert);
  };

  const onReviewClick = async (data, recommendedApi) => {
    const alertData = { ...alert };
    alertData.current_level += 1;
    const currentAction = alertData.type[alertData.current_level];
    setCurrentLevel(alertData.current_level);
    if (currentAction === ALERTS_ACTION_MAPPING.DYNAMIC_POP_UP) {
      // setDataForDynamicPopUp(data, alertData?.type, alertData.current_level);
    } else if (currentAction === ALERTS_ACTION_MAPPING.POP_UP_LINK) {
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
      setCurrentRedirectionLevels(
        alertData?.redirect_filter_level?.[alertData.current_level]
      );
      setCurrentLevel(alertData.current_level);
      setAlert(alertData);
      setRedirectionButtons(alertData?.redirect_buttons);
      const isPopupAvailable = Object.values(alertData?.type).includes(
        "paginated_pop_up"
      );
      setIsActionButtonPresent(isPopupAvailable);
    }
  }, [props.data]);

  return (
    <>
      <div className={globalClasses.marginVertical1rem}>
        {showAlertsTable && (
          <div ref={alertsActionRef}>
            <OrderAlertActionTable
              alertId={alert?.id}
              tableConfigName={alert?.recommended?.table_config}
              tableDataApiName={alert?.recommended?.data}
              totalCount={alert?.article_count}
              onReviewClick={onReviewClick}
              setReloadKpi={props?.setReloadKpi}
              redirectionLevel={currentRedirectionLevels}
              setReloadAlerts={props?.setReloadAlerts}
              alertName={alert?.name}
              setSelectedAlertIndex={props?.setSelectedAlertIndex}
              isCalledFromVendorStore={props?.isCalledFromVendorStore}
              alertButtons={redirectionButtons}
              isActionButtonPresent={isActionButtonPresent}
            />
          </div>
        )}
      </div>

      {showAlertsDialog && (
        <OrderAlertsActionPopup
          ref={ref}
          active={showAlertsDialog}
          openModal={openAlertsPopUp}
          closeModal={closeAlertsPopUp}
          tableData={alertPopupData}
          tableConfig={alertPopupTableConfig}
          isCalledFromVendorStore={props?.isCalledFromVendorStore}
        />
      )}
    </>
  );
});

const mapStateToProps = (store) => {
  return {
    alertsActionPopupDataLoader:
      store.omsReducer.omsAlertsActionsService.alertsActionPopupDataLoader,
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getAlertsActionPopupConfiguration: (payload) =>
    dispatch(getAlertsActionPopupConfiguration(payload)),
  setOrderAlertCount: (payload) => dispatch(setOrderAlertCount(payload)),
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
