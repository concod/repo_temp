import React, { useState, useEffect } from "react";
import globalStyles from "core/Styles/globalStyles";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt, Tabs, Button } from "impact-ui-v3";
import ChevronRight from "@mui/icons-material/ChevronRight";
import {
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  INVENTORY_SUBMODULES_NAMES,
  SCREENS_LIST_MAP,
} from "../../../constants-inventorysmart/stringConstants";
import {
  deletePlans,
  setInventorysmartDeletePlanLoader,
  getPlanSummary,
} from "../../../services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { connect } from "react-redux";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import KPIWrapper from "../../KPI/kpiWrapper";
import InventoryDashboardAlerts from "./InventoryDashboardAlerts";
import StyleInventoryDetailsTable from "./StyleInventoryDetailsTable";
import ViewPlansTable from "./ViewPlansTable";
import Loader from "core/Utils/Loader/loader";
import DialogContent from "@mui/material/DialogContent";
import Dialog from "@mui/material/Dialog";
import KPIAlertsData, { getValueForKPIPlans } from "modules/inventorysmart/pages-inventorysmart/KPI/component/KPIAlertsData";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

const InventoryDashboardDetails = function (props) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [renderAgGrid, setRenderAgGrid] = useState(false); // using instead of aggrid refreshServerSideStore api
  const [tabValue, setTabValue] = useState("store");
  const [summary, setSummary] = useState({});
  const [hasSomePlans, setHasSomePlans] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isSomePlanDeleted, setIsSomePlanDeleted] = useState(false);

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    if (isEmpty(props?.ddScreenConfigs)) return;

    const kpiTabValues =
      props.ddScreenConfigs?.dashboard?.drillDown?.kpiTabs || [];
    const isForecastTab = props.tabValue === "forecast";

    let availableTabs = kpiTabValues;
    if (props.isForecastSeparate && !isForecastTab) {
      availableTabs = kpiTabValues.filter((tab) => tab !== "forecast");
    }

    if (isForecastTab && props.isForecastSeparate) {
      setTabValue("forecast");
    } else if (availableTabs.length > 0) {
      setTabValue(availableTabs[0]);
    } else {
      setTabValue("");
    }
  }, [props?.ddScreenConfigs, props.tabValue, props.isForecastSeparate]);

  const tabProps = (index) => {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    confirmDeletePlans();
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const confirmDeletePlans = () => {
    const callDelete = async () => {
      props.setInventorysmartDeletePlanLoader(true);
      setRenderAgGrid(false);
      try {
        let body = {
          plan_codes: [...selectedPlanIds],
        };

        let response = await props.deletePlans(body);
        if (response.data.status) {
          displaySnackMessages("Successfully deleted plans", "success");
          setSelectedPlanIds([]);
          setRenderAgGrid(true);
          setIsSomePlanDeleted(true);
        }
        props.setInventorysmartDeletePlanLoader(false);
      } catch (err) {
        props.setInventorysmartDeletePlanLoader(false);
        setRenderAgGrid(true);
        displaySnackMessages("Something went wrong on delete", "error");
      }
    };
    callDelete();
  };

  const onDeleteSelectedPlans = (update) => {
    selectedPlanIds?.length > 0 && setShowDeleteDialog(true);
  };

  const getDeleteMessage = (p_msg = "") => {
    return `Are you sure you want to delete ${p_msg}`;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getTabPanels = () => {
    let tabPanels = [];
    let kpiTabs = props.ddScreenConfigs?.dashboard?.drillDown?.kpiTabs || [];

    // Filter tabs based on parent tabValue and isForecastSeparate flag
    let filteredTabs;
    if (props.isForecastSeparate) {
      filteredTabs = isForecastTab
        ? kpiTabs.filter((tab) => tab === "forecast")
        : kpiTabs.filter((tab) => tab !== "forecast");
    } else {
      filteredTabs = kpiTabs;
    }

    filteredTabs.forEach((thisTab) => {
      tabPanels.push(
        <KPIWrapper
          screen={SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY}
          showDateFilter={
            props.ddScreenConfigs?.dashboard?.drillDown
              ?.store_inventory_kpis_require_fiscal_calendar
          }
          tabValue={thisTab}
          isForecastSeparate={props.isForecastSeparate}
        />
      );
    });
    return tabPanels;
  };

  const getAllocationPlanSummary = async () => {
    try {
      setSummaryLoading(true);
      let body = {
        filters: props?.selectedFilters,
        meta: {
          limit: { limit: 10, page: 1 },
          range: [],
          search: [],
          sort: [],
        },
      };
      const response = await props?.getPlanSummary(body);
      let temp = [];
      let hasPlans = false;
      if (response?.data?.data) {
        Object.keys(response?.data?.data)
          .sort()
          .forEach((key) => {
            if (getValueForKPIPlans(response?.data?.data[key]) > 0) {
              hasPlans = true;
            }
            
            temp.push({
              label: key,
              value: response?.data?.data[key],
            });
          });
        setSummary(temp);
        setHasSomePlans(hasPlans);
      }
      setSummaryLoading(false);
    } catch (error) {
      displaySnackMessages("Error Fetching Allocation Plans", "error");
      setHasSomePlans(false);
      setSummaryLoading(false);
    }
  };
  useEffect(() => {
    if (!isEmpty(props?.selectedFilters)) {
      // When Filter is changed We fetch Summary
      getAllocationPlanSummary();
      setIsSomePlanDeleted(false);
    }
  }, [props?.selectedFilters]);

  useEffect(() => {
    if (!isEmpty(props?.selectedFilters) && isSomePlanDeleted) {
      // When any plan is deleted we refresh the summary
      getAllocationPlanSummary();
      setIsSomePlanDeleted(false);
    }
  }, [isSomePlanDeleted]);

  const isForecastTab =
    props.isForecastSeparate && props.tabValue === "forecast";

  const kpiTabs = props.ddScreenConfigs?.dashboard?.drillDown?.kpiTabs || [];
  const filteredKpiTabs = props.isForecastSeparate
    ? isForecastTab
      ? kpiTabs.filter((tab) => tab === "forecast")
      : kpiTabs.filter((tab) => tab !== "forecast")
    : kpiTabs;

  return (
    <>
      {!(
        props.ddScreenConfigs?.dashboard?.drillDown?.hidden?.indexOf(
          "store_inventory_kpis"
        ) > -1
      ) &&
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_KPI,
          "view"
        ) && (
          <>
            {filteredKpiTabs.length > 1 ? (
              <div>
                <Tabs
                  value={tabValue}
                  onChange={handleChangeTabValue}
                  aria-label="decision-dashboard-kpi-tabs"
                  tabNames={filteredKpiTabs.map((thisTab) => {
                    return {
                      label: thisTab.toLowerCase() === "dc" ? "DC" : thisTab,
                      value: thisTab,
                    };
                  })}
                  tabPanels={getTabPanels()}
                ></Tabs>
              </div>
            ) : filteredKpiTabs.length === 1 ? (
              <KPIWrapper
                screen={
                  SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY
                }
                showDateFilter={
                  props.ddScreenConfigs?.dashboard?.drillDown
                    ?.store_inventory_kpis_require_fiscal_calendar
                }
                tabValue={filteredKpiTabs[0]}
                isForecastSeparate={props.isForecastSeparate}
              />
            ) : null}
          </>
        )}
      {!isForecastTab &&
        !(
          props.ddScreenConfigs?.dashboard?.drillDown?.hidden?.indexOf(
            "view_plans"
          ) > -1
        ) &&
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
          "view"
        ) && (
          <div className={globalClasses.marginTop_24}>
            <Dialog
              container={props?.containerRef?.current}
              style={{ position: "absolute", zIndex: 1000 }}
              hideBackdrop
              fullScreen
              open={props.openPlans}
              onClose={() => {
                props.setOpenPlans(false);
              }}
              PaperProps={{
                sx: {
                  boxShadow: 0,
                  padding: 0,
                },
              }}
            >
              <DialogContent className={classes.invisibleDialogStyle}>
                <ViewPlansTable
                  tableHeader="Allocation Plans"
                  setSelectedPlanIds={setSelectedPlanIds}
                  confirmDeletePlans={confirmDeletePlans}
                  canTakeActionOnModules={canTakeActionOnModules}
                  renderAgGrid={renderAgGrid}
                  selectedPlanIds={selectedPlanIds}
                  setRenderAgGrid={setRenderAgGrid}
                  onDeleteSelectedPlans={onDeleteSelectedPlans}
                  isEditAllowed={canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
                    "edit"
                  )}
                  isDeleteAllowed={canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_VIEW_PLANS,
                    "delete"
                  )}
                />
              </DialogContent>
            </Dialog>
            {!(
              props.ddScreenConfigs?.dashboard?.drillDown?.hidden?.indexOf(
                "allocation_plans"
              ) > -1
            ) && (
              <Loader
                loader={summaryLoading}
                spinner
                text="Loading Allocation Plans"
                size="medium"
              >
                <div style={{ minHeight: "76px" }}>
                  {!isEmpty(summary) && (
                    <div className={classes.planWrapper}>
                      <KPIAlertsData
                        data={{
                          data: summary,
                          label: "Allocation plans",
                          type: "Plans",
                        }}
                      />
                      <Button
                        disabled={!hasSomePlans}
                        variant="secondary"
                        size="large"
                        iconPlacement="right"
                        icon={<ChevronRight fontSize="small" />}
                        onClick={() => props.setOpenPlans(true)}
                      >
                        View details
                      </Button>
                    </div>
                  )}
                </div>
              </Loader>
            )}
          </div>
        )}

      {!(
        props.ddScreenConfigs?.dashboard?.drillDown?.hidden?.indexOf(
          "store_inventory_alerts"
        ) > -1
      ) &&
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
          "view"
        ) && (
          <InventoryDashboardAlerts
            screen={SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY}
            parentTabValue={props.tabValue}
            isForecastSeparate={props.isForecastSeparate}
            canEdit={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
              "edit"
            )}
            canDelete={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
              "delete"
            )}
            canCreate={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
              "create"
            )}
          />
        )}

      {!isForecastTab &&
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_ARTICLE_DETAILS,
          "view"
        ) && (
          <div className={globalClasses.marginTop_24}>
            <StyleInventoryDetailsTable
              isCreateAllocationAllowed={canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_STORE_INVENTORY_ALERTS,
                "create"
              )}
            />
          </div>
        )}
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete Selected Allocation Plan"
        onPrimaryButtonClick={() => {
          confirmDelete();
          setShowDeleteDialog(false);
        }}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        handleClose={() => setShowDeleteDialog(false)}
        variant="error"
        primaryButtonLabel={DIALOG_CONFIRM_BTN_TEXT}
        secondaryButtonLabel={DIALOG_REJECT_BTN_TEXT}
      >
        {getDeleteMessage("the selected allocation Plan?")}
      </Prompt>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        .ddScreenConfigs,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    isNewStyles:
      store.inventorysmartReducer.inventorySmartDashboardService.ddScreenConfigs
        .dashboard.drillDown.newStyles,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  setInventorysmartDeletePlanLoader: (payload) =>
    dispatch(setInventorysmartDeletePlanLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getPlanSummary: (payload) => dispatch(getPlanSummary(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InventoryDashboardDetails);
