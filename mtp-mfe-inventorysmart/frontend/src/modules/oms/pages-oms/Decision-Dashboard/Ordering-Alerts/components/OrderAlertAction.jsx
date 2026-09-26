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
  const [alertTopRightOptions, setAlertTopRightOptions] = useState(null);
  const [isSingleSelectRow, setIsSingleSelectRow] = useState(false);
  const [showDownloadButton, setShowDownloadButton] = useState(undefined);
  const [isExpeditePosRawROQAlert, setIsExpeditePosRawROQAlert] = useState(
    false
  );
  const [actionButtonLabel, setActionButtonLabel] = useState("View PO");

  const popupPayloadRef = useRef(null);
  const [popupIsPayloadRequired, setPopupIsPayloadRequired] = useState(null);
  const [popupColumnsSortOnApi, setPopupColumnsSortOnApi] = useState([]);

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

    setPopupColumnsSortOnApi(
      recommendedPopUpApi?.current?.columns_sort_on_api || []
    );

    props.setOrderAlertsPopUpTableDataLoader(true);

    let payloadData = {};

    if (recommendedPopUpApi.current?.is_payload_required) {
      const rowKeys = recommendedPopUpApi.current?.row_keys || [];
      const rowKeyObject = rowKeys.reduce((acc, key) => {
        if (alertData?.[key] !== undefined && alertData?.[key] !== null) {
          acc[key] = alertData[key];
        }
        return acc;
      }, {});

      payloadData = {
        tableDataApi: recommendedPopUpApi.current?.data,
        filters: props?.selectedFilters,
        row_keys: rowKeyObject,
      };
    } else {
      payloadData = {
        tableDataApi:
          recommendedPopUpApi.current?.data +
          "/" +
          alertData?.unique_row_id +
          (props?.isCalledFromVendorStore ? "?vendor_store=true" : ""),
      };
    }

    const isPayloadRequired = Boolean(
      recommendedPopUpApi.current?.is_payload_required
    );
    setPopupIsPayloadRequired(isPayloadRequired);

    popupPayloadRef.current = {
      ...payloadData,
      is_payload_required: isPayloadRequired,
    };
    const response = await props.getRecommendedOrderPopUpTableData(
      payloadData,
      props.dashboardApiFlags
    );

    if (response?.data?.status) {
      const rows = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data?.data?.data)
        ? response.data.data.data
        : [];
      const rowsWithId = rows.map((row, i) => ({
        ...row,
        unique_id: i,
      }));
      setAlertPopupData(rowsWithId);
      props.setOrderAlertsPopUpTableDataLoader(false);
    }
  };

  const refetchPopupDataOnApiSort = async ({ sortMeta, api }) => {
    const basePayload = popupPayloadRef.current;
    if (!basePayload) return;

    if (!basePayload.is_payload_required) {
      return;
    }

    try {
      props.setOrderAlertsPopUpTableDataLoader(true);
      const payloadWithSort = {
        ...basePayload,
        meta: {
          sort: sortMeta,
        },
      };

      const response = await props.getRecommendedOrderPopUpTableData(
        payloadWithSort,
        props.dashboardApiFlags
      );
      if (response?.data?.status) {
        const rows = Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.data?.data?.data)
          ? response.data.data.data
          : [];
        const rowsWithId = rows.map((row, i) => ({
          ...row,
          unique_id: i,
        }));
        setAlertPopupData(rowsWithId);

        if (api?.setRowData) {
          setTimeout(() => {
            if (api?.isDestroyed?.()) return;
            api.setRowData([]);
            api.setRowData(rowsWithId);
          }, 0);
        }
      }
    } finally {
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
      setActionButtonLabel(alertData?.action_button_label || "View PO");

      if (alertData?.topRightOptions) {
        setAlertTopRightOptions(alertData.topRightOptions);
      }
      if (alertData?.isSingleSelectRow) {
        setIsSingleSelectRow(true);
      }
      if (alertData?.showDownloadButton !== undefined) {
        setShowDownloadButton(alertData.showDownloadButton);
      } else {
        setShowDownloadButton(undefined);
      }
      if (alertData?.isExpeditePORawROQAlert) {
        setIsExpeditePosRawROQAlert(true);
      }
    }
  }, [props.data]);

  return (
    <>
      <div className={globalClasses.marginVertical1rem}>
        {showAlertsTable && (
          <div ref={alertsActionRef}>
            <OrderAlertActionTable
              alertId={alert?.id}
              alertKey={alert?.key}
              tableConfigName={alert?.recommended?.table_config}
              tableDataApiName={alert?.recommended?.data}
              articleCount={alert?.article_count}
              resolvedArticleCount={alert?.resolved_article_count}
              onReviewClick={onReviewClick}
              setReloadKpi={props?.setReloadKpi}
              redirectionLevel={currentRedirectionLevels}
              setReloadAlerts={props?.setReloadAlerts}
              alertName={alert?.name}
              setSelectedAlertIndex={props?.setSelectedAlertIndex}
              isCalledFromVendorStore={props?.isCalledFromVendorStore}
              alertButtons={redirectionButtons}
              isActionButtonPresent={isActionButtonPresent}
              alertTopRightOptions={alertTopRightOptions}
              isSingleSelectRow={isSingleSelectRow}
              showDownloadButton={showDownloadButton}
              isExpeditePosRawROQAlert={isExpeditePosRawROQAlert}
              popupConfig={alert?.pop_up_config}
              isSelectAllRecordsEnabled={alert?.is_select_all_records_enabled}
              actionButtonLabel={actionButtonLabel}
              dashboardApiFlags={props.dashboardApiFlags}
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
          onApiSort={refetchPopupDataOnApiSort}
          enableApiSort={popupIsPayloadRequired}
          columnsSortOnApi={popupColumnsSortOnApi}
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
  getRecommendedOrderPopUpTableData: (payload, apiFlags) =>
    dispatch(getRecommendedOrderPopUpTableData(payload, apiFlags)),
  setOrderAlertsPopUpTableConfigLoader: (payload) =>
    dispatch(setOrderAlertsPopUpTableConfigLoader(payload)),
  setOrderAlertsPopUpTableDataLoader: (payload) =>
    dispatch(setOrderAlertsPopUpTableDataLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(OrderAlertAction);
