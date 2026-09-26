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
import AlertsActionTable from "./AlertsActionTable";
import AlertsActionPopup from "./AlertsActionPopup";
import { Paper, Typography } from "@mui/material";
import classNames from "classnames";
import {
  getAlertsActionPopupData,
  reviewAlerts,
  setAlertsActionPopupDataLoader,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/alerts-actions-service";
import { setInventoryDashboardAlertCount } from "modules/inventorysmart/services-inventorysmart/KPI-Matrix/kpi-services";
import { setStoreInventoryAlertsTableData } from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-inventory-alerts-service";
import { cloneDeep } from "lodash";

const AlertsAction = forwardRef((props, ref) => {
  const globalClasses = globalStyles();
  const alertsActionRef = useRef(null);

  const [showTableLoader, setShowTableLoader] = useState(false);
  const [showAlertsTable, setShowAlertsTable] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [isPaginatedTableApi, setIsPaginatedTableApi] = useState(false);
  const [isPaginatedPopupApi, setIsPaginatedPopupApi] = useState(false);
  const [alert, setAlert] = useState(null);
  const [alertTableData, setAlertTableData] = useState(null);
  const [alertTableLink, setAlertTableLink] = useState(null);
  const [alertPopupData, setAlertPopupData] = useState(null);
  const [alertPopupLink, setAlertPopupLink] = useState(null);
  const [alertPopupTableConfig, setAlertPopupTableConfig] = useState(null);
  const [redirection, setRedirection] = useState(null);
  const [totalModelStockData, setTotalModelStockData] = useState(null);

  const [currentLevel, setCurrentLevel] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(null);

  const handleAlertActionAtCurrentLevel = (alertData) => {
    const currentAction = alertData.type[alertData.current_level];

    switch (currentAction) {
      case ALERTS_ACTION_MAP.NEW_TABLE:
        if (alert) {
          setShowAlertsTable(true);
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
      case ALERTS_ACTION_MAP.PAGINATED_NEW_TABLE:
        if (alert) {
          setShowAlertsTable(true);
        }
        break;
      case ALERTS_ACTION_MAP.PAGINATED_POP_UP:
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

  const handlePopupLinkAction = async (url, articles) => {
    try {
      props.setAlertsActionPopupDataLoader(true);
      let filters = [...props.selectedFilters]?.filter(
        (filterItem) => filterItem?.values?.length > 0
      );
      let articleFilter = tableArticleFilter;

      articleFilter.values = [...articles];

      filters.push(articleFilter);

      let data = {
        filters,
        meta: {
          ...tableConfigurationMetaData.meta,
        },
      };

      const payload = {
        url,
        data,
      };

      const response = await props.getAlertsActionPopupData(payload);
      return response.data.data;
    } finally {
      props.setAlertsActionPopupDataLoader(false);
    }
  };

  const setDataForPopUp = (alertData, type, currentLevel) => {
    const popupData = alertData[`${type[currentLevel]}_data`];
    setIsPaginatedTableApi(false);
    setIsPaginatedPopupApi(false);
    setAlertPopupData({
      data: popupData,
      extra: {
        index: alertData?.index,
        plan_code: alertData?.plan_code,
        article: fetchProductCode(alertData),
      },
    });
  };

  const setDataForDynamicPopUp = (alertData, type, currentLevel) => {
    const popupData = alertData[`${type[currentLevel]}_data`].data;
    setIsPaginatedTableApi(false);
    setIsPaginatedPopupApi(false);
    setAlertPopupTableConfig(alertData[`${type[currentLevel]}_data`].columns);
    setAlertPopupData({
      data: popupData,
      extra: {
        index: alertData?.index,
        plan_code: alertData?.plan_code,
        article: fetchProductCode(alertData),
      },
    });
  };

  const setDataForPopUpLink = async (alertData, type, currentLevel) => {
    const url = alertData[`${type[currentLevel]}_data`].link;
    const articles = alertData[`${type[currentLevel]}_data`].articles;
    const popupData = await handlePopupLinkAction(url, articles);
    setIsPaginatedTableApi(false);
    setIsPaginatedPopupApi(false);
    setAlertPopupData({
      data: popupData,
      extra: {
        index: alertData?.index,
        plan_code: alertData?.plan_code,
      },
    });
  };

  const setDataForNewTable = async (alertData, type, currentLevel) => {
    const tableData = alertData[`${type[currentLevel]}_data`];
    setIsPaginatedTableApi(false);
    setIsPaginatedPopupApi(false);
    let totalCount = 0;
    tableData.map(item => {
      if(item.allocated_total){
        totalCount+=item.allocated_total;
      }
    })
    setTotalAllocated(totalCount);
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
      currentAction === ALERTS_ACTION_MAP.DYNAMIC_POP_UP &&
      alert[`${alert?.type[currentLevel]}_data`]
    ) {
      setDataForDynamicPopUp(alert, alert?.type, currentLevel);
    } else if (
      currentAction === ALERTS_ACTION_MAP.POP_UP_LINK &&
      alert[`${alert?.type[currentLevel]}_data`]
    ) {
      await setDataForPopUpLink(alert, alert?.type, currentLevel);
    } else if (
      currentAction === ALERTS_ACTION_MAP.NEW_TABLE &&
      alert[`${alert?.type[currentLevel]}_data`]
    ) {
      setDataForNewTable(alert, alert?.type, currentLevel);
    } else if (
      currentAction === ALERTS_ACTION_MAP.PAGINATED_NEW_TABLE &&
      alert[`${alert?.type[currentLevel]}_link`]
    ) {
      setIsPaginatedTableApi(true);
      setAlertTableLink(alert[`${alert?.type[currentLevel]}_link`]);
    } else if (
      currentAction === ALERTS_ACTION_MAP.PAGINATED_POP_UP &&
      alert[`${alert?.type[currentLevel]}_link`]
    ) {
      setIsPaginatedPopupApi(true);
      setAlertPopupLink(alert[`${alert?.type[currentLevel]}_link`]);
    }

    handleAlertActionAtCurrentLevel(alert);
  };

  const onReviewClick = async (data, isAlertPaginated) => {
    const alertData = { ...alert };

    if (
      (data.sku || data.article || data.product_code) &&
      alertData.table_name &&
      alertData.is_tracking &&
      !data?.[`${alertData?.prefix}_is_resolved`]
    ) {
      const product_codes =
        alertData?.type[alertData.current_level] ===
        ALERTS_ACTION_MAP.POP_UP_LINK
          ? data?.articles
          : fetchProductCodes([data]);

      const reviewPayload = {
        table_name: alertData.table_name,
        product_codes,
        prefix: alertData?.prefix,
      };
      data[`${alertData?.prefix}_is_resolved`] = 1;

      if (!isAlertPaginated) {
        alertData[`${alertData?.type[alertData.current_level]}_data`][
          data.index
        ] = data;

        if (
          alertData.type[alertData.current_level] ===
            ALERTS_ACTION_MAP.NEW_TABLE &&
          alertData[`${alertData?.type[alertData.current_level]}_data`]
        ) {
          setDataForNewTable(alert, alert?.type, currentLevel);
        }
      }

      const alertsCount = modifyInvetoryAlertsCount(ref.current, product_codes);
      let alertsCountPayload = {
        key: props.screen,
        data: alertsCount,
      };
      props.setInventoryDashboardAlertCount(alertsCountPayload);
      props.reviewAlerts(reviewPayload);
      // to update is resolved count in parent table - alerts
      let cloneAlerts = cloneDeep(props.storeInventoryAlertsTableData);
      let updateIsResolvedIndex = cloneAlerts?.map((item) => {
        if (item?.prefix === alertData?.prefix) {
          return {
            ...item,
            is_resolved: Number(item.is_resolved) + 1,
          };
        } else return item;
      });
      props.setStoreInventoryAlertsTableData(updateIsResolvedIndex);
    }

    alertData.current_level += 1;

    const currentAction = alertData.type[alertData.current_level];
    setCurrentLevel(alertData.current_level);

    if (currentAction === ALERTS_ACTION_MAP.DYNAMIC_POP_UP) {
      setDataForDynamicPopUp(data, alertData?.type, alertData.current_level);
    } else if (currentAction === ALERTS_ACTION_MAP.POP_UP_LINK) {
      setDataForPopUpLink(data, alertData?.type, alertData.current_level);
    } else {
      setDataForPopUp(data, alertData?.type, alertData.current_level);
    }

    setAlert(alertData);
  };

  useEffect(() => {
    if (showAlertsTable) {
      scrollIntoView(alertsActionRef);
    }
  }, [showAlertsTable]);

  useEffect(() => {
    if (props.alertsActionPopupDataLoader) {
      if (
        currentLevel === 1 &&
        alert?.type[currentLevel] === ALERTS_ACTION_MAP.POP_UP_LINK
      ) {
        setShowTableLoader(false);
        props.setShowActionLoader(true);
      } else {
        props.setShowActionLoader(false);
        setShowTableLoader(true);
      }
    } else {
      props.setShowActionLoader(false);
      setShowTableLoader(false);
    }
  }, [props.alertsActionPopupDataLoader]);

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

  const updateAggModelStockOnSave = (data) => {
    setTotalModelStockData(data);
  };

  const updateAlertsTableOnDelete = (planCode, alertArticleData) => {
    alertTableData.forEach((item) => {
      if (item.plan_code === planCode) {
        item.skus = alertArticleData;
        item.pop_up_data = item.pop_up_data.filter((article) => {
          const articleId = fetchProductCode(article);

          return alertArticleData.indexOf(articleId) > -1;
        });
      }
    });
    setAlertTableData([...alertTableData]);
  };

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
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <Typography
                className={globalClasses.marginVertical1rem}
                variant="h5"
              >
                Review Recommendation
              </Typography>
              {props.data.name ==='Auto Allocation' &&
               props?.inventorysmartScreenConfig?.dashboard?.drillDown
                    ?.showTotalAllocated && 
              (
                  <Typography  
                    className={globalClasses.marginVertical1rem}
                    variant="h5"
                  >
                    Total Allocated Units : {totalAllocated}
                  </Typography>
              )}
            </div>
            <AlertsActionTable
              loading={showTableLoader}
              isPaginatedTableApi={isPaginatedTableApi}
              alertTableLink={alertTableLink}
              alertInfo={alert}
              downloadAllLink={alert?.download_all_link}
              tableData={alertTableData}
              tableConfigName={alert?.table_config?.[currentLevel]}
              tableConfig={alert?.table_config?.auto_allocation}
              downloadAllTableConfigName={alert?.table_config?.["2"]}
              reviewPrefix={alert?.prefix}
              uniqueKey={alert?.unique[currentLevel]}
              includeExclusionFilter={alert?.includeExclusionFilter}
              excludeURLObject={alert?.excludeURLObject}
              setShowTableLoader={setShowTableLoader}
              onReviewClick={onReviewClick}
              totalModelStockData={totalModelStockData}
            />
          </Paper>
        </div>
      )}
      <AlertsActionPopup
        ref={ref}
        loading={showTableLoader}
        screen={props.screen}
        isPaginatedPopupApi={isPaginatedPopupApi}
        active={showAlertsDialog}
        openModal={openAlertsPopUp}
        closeModal={closeAlertsPopUp}
        alertPopupLink={alertPopupLink}
        downloadLink={alert?.download_link}
        tableConfigName={alert?.table_config?.[currentLevel]}
        tableConfig={alertPopupTableConfig}
        tableName={alert?.table_name}
        reviewPrefix={alert?.prefix}
        uniqueKey={alert?.unique?.[currentLevel]}
        data={alertPopupData}
        name={alert?.name}
        redirection={redirection}
        alertLevel={alert?.level}
        isSelectionEnabled={alert?.is_selectable}
        minimumOneArticle={alert?.minimumOneArticle}
        canUpdate={alert?.is_update}
        updateURL={alert?.update} // to call the update api on model stock value edit
        updateKeys={alert?.update_key}
        updateAggModelStock={updateAggModelStockOnSave}
        updateAlertsTableOnDelete={updateAlertsTableOnDelete}
        setShowTableLoader={setShowTableLoader}
        includeExclusionFilter={alert?.includeExclusionFilter}
        excludeURLObject={alert?.excludeURLObject}
        canReview={alert?.is_tracking}
        canEdit={props.canEdit}
        canDelete={props.canDelete}
        canCreate={props.canCreate}
      />
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
    storeInventoryAlertsTableData:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setAlertsActionPopupDataLoader: (payload) =>
    dispatch(setAlertsActionPopupDataLoader(payload)),
  getAlertsActionPopupData: (payload) =>
    dispatch(getAlertsActionPopupData(payload)),
  setInventoryDashboardAlertCount: (payload) =>
    dispatch(setInventoryDashboardAlertCount(payload)),
  reviewAlerts: (payload) => dispatch(reviewAlerts(payload)),
  setStoreInventoryAlertsTableData: (payload) =>
    dispatch(setStoreInventoryAlertsTableData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(AlertsAction);
