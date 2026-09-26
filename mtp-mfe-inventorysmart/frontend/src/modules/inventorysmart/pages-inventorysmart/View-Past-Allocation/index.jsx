// @ts-nocheck
import { useNavigate } from "react-router-dom-v5-compat";
import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Tabs } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { VIEW_PAST_ALLOCATION } from "../../constants-inventorysmart/routesConstants";
import { VIEW_PAST_ALLOCATION_TABS } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { checkS2SAvaiableOrNot } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { getModuleBasedTenantConfig } from "../../services-inventorysmart/common/inventory-smart-common-services";
import {
  setInventorysmartPastAllocationFilterLoader,
  setViewPastAllocationModuleConfig,
  resetPastAllocationState,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import { setAlanExplainability } from "../../services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import ViewPastAllocationDcStoreTranfer from "./components/DcToStore/ViewPastAllocationDcStoreTranfer";
import ViewPastAllocationStoretoStore from "./components/StoreToStore/ViewPastAllocationStoretoStore";
import DcStoreFilterPanel from "./components/DcToStore/DcStoreFilterPanel";
import StoreToStoreFilterPanel from "./components/StoreToStore/StoreToStoreFilterPanel";
import { makeStyles } from "@mui/styles";
import { useLocation } from "react-router";

export const inventoryCommonStyles = makeStyles(() => ({
  filterComponent: {
    position: "absolute",
    right: 0,
    top: "4px",
    width: "100%",
    "& .MuiContainer-root .main-container": {
      marginTop: "16px",
    },
  },
  tabsContainer: {
    "& .MuiTabs-root.ia-styles.ia-tabList": {
      width: "calc(100% - 130px)", // 12px gap
    },
    "& .ia-styles.ia-tabPanel": {
      paddingBottom: "0 !important",
      paddingTop: "0 !important",
    },
    "& .ia-styles.ia-tab": {
      zIndex: 999,
    },
    "& .vpa-marginBottom_4": {
      marginBottom: "0.25rem !important",
    },
  },
}));

const ViewPastAllocation = (props) => {
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const classes = inventoryCommonStyles();
  const location = useLocation();
  const tabFromQuery = new URLSearchParams(location.search).get("tab");

  const isS2SAvailable = checkS2SAvaiableOrNot(
    props.sideBarReducer.activeSideBarData || []
  );
  const visibleTabs = useMemo(() => {
    if (isS2SAvailable) {
      return VIEW_PAST_ALLOCATION_TABS;
    }
    return [VIEW_PAST_ALLOCATION_TABS[0]];
  }, [isS2SAvailable]);

  const [activeTab, setActiveTab] = useState(
    tabFromQuery && visibleTabs.some((t) => t.value === tabFromQuery)
      ? tabFromQuery
      : visibleTabs[0]?.value || "dc_to_store"
  );

  // Track which tabs have been opened so we only mount (and fetch config for)
  // tabs the user has actually visited — not both on initial load.
  const [activatedTabs, setActivatedTabs] = useState(() => ({
    [activeTab]: true,
  }));

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
    setActivatedTabs((prev) => ({ ...prev, [newValue]: true }));
  };

  const [selectedButton, setSelectedButton] = useState("tableView");
  const handleButtonChange = (event, newValue) => {
    setSelectedButton(newValue);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: { variant: variance },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setInventorysmartPastAllocationFilterLoader(false);
  };

  // Fetch module config once (shared across both tabs)
  useEffect(() => {
    const fetchModuleConfigs = async () => {
      try {
        props.setInventorysmartPastAllocationFilterLoader(true);
        let reqBody = {
          module_name: "View Past Allocation Table",
          screen_name: props.screenName,
        };
        let response = await props.getModuleBasedTenantConfig(reqBody);
        props.setViewPastAllocationModuleConfig(response);

        let advanceFilterReqBody = {
          module_name: "Advance Filtering",
          screen_name: props.screenName,
        };
        const advanceFilterResponse = await props.getModuleBasedTenantConfig(
          advanceFilterReqBody
        );
        const enableExplainatory =
          advanceFilterResponse?.enableAlanExplainatory || false;
        props.setAlanExplainability(enableExplainatory);

        props.setInventorysmartPastAllocationFilterLoader(false);
      } catch (e) {
        handleErrorMessage(e);
        props.setAlanExplainability(false);
      }
    };
    fetchModuleConfigs();
  }, []);

  useEffect(() => {
    return () => {
      props.resetPastAllocationState();
    };
  }, []);

  const dcToStoreContent = (
    <ViewPastAllocationDcStoreTranfer
      {...props}
      handleButtonChange={handleButtonChange}
      selectedButton={selectedButton}
      singleView={visibleTabs.length === 1}
    />
  );

  const storeToStoreContent = (
    <ViewPastAllocationStoretoStore
      {...props}
      handleButtonChange={handleButtonChange}
      selectedButton={selectedButton}
    />
  );

  const renderTabPanels = () => {
    return visibleTabs.map((tab) => {
      const tabValue = tab.value;
      // Only mount the panel for tabs that have been activated.
      // Inactive tabs render an empty placeholder so the Tabs layout
      // is preserved but no config is fetched until the user opens it.
      if (!activatedTabs[tabValue]) {
        return <div key={tabValue} />;
      }
      return (
        <div
          key={tabValue}
          className={`${globalClasses.positionRelative} ${classes.filterComponent}`}
        >
          {tabValue === "dc_to_store" ? (
            <DcStoreFilterPanel
              viewPastAllocationModuleConfig={
                props.viewPastAllocationModuleConfig
              }
              screenName={props.screenName}
            >
              {dcToStoreContent}
            </DcStoreFilterPanel>
          ) : (
            <StoreToStoreFilterPanel
              viewPastAllocationModuleConfig={
                props.viewPastAllocationModuleConfig
              }
              screenName={props.screenName}
            >
              {storeToStoreContent}
            </StoreToStoreFilterPanel>
          )}
        </div>
      );
    });
  };

  return (
    <div className={globalClasses.paddingAroundNew}>
      {visibleTabs.length > 1 && (
        <div
          className={`${globalClasses.breadcrumbPadding} ${globalClasses.marginBottom_12}`}
        >
          <HeaderBreadCrumbs
            options={[
              {
                label: "Home",
                to: "/home",
              },
              {
                label: "View Past Allocations",
                id: 1,
                action: () => {
                  navigate(VIEW_PAST_ALLOCATION);
                },
              },
            ]}
          />
        </div>
      )}
      <div
        className={`${globalClasses.positionRelative} ${classes.tabsContainer}`}
      >
        {(() => {
          if (visibleTabs.length === 1 && activeTab === "dc_to_store") {
            return (
              <DcStoreFilterPanel
                showHeader
                viewPastAllocationModuleConfig={
                  props.viewPastAllocationModuleConfig
                }
                screenName={props.screenName}
              >
                {dcToStoreContent}
              </DcStoreFilterPanel>
            );
          }
          return (
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              tabNames={visibleTabs}
              tabPanels={renderTabPanels()}
            />
          );
        })()}
      </div>
    </div>
  );
};

const mapStateToProps = (store) => ({
  inventorysmartPastAllocationFilterLoader:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      .inventorysmartPastAllocationFilterLoader,
  viewPastAllocationModuleConfig:
    store.inventorysmartReducer.inventorySmartPastAllocationService
      ?.viewPastAllocationModuleConfig,
  sideBarReducer: store?.sideBarReducer,
  isFilterStripVisible: store?.filterReducer?.showFilters,
});

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartPastAllocationFilterLoader: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterLoader(payload)),
  setViewPastAllocationModuleConfig: (body) =>
    dispatch(setViewPastAllocationModuleConfig(body)),
  resetPastAllocationState: () => dispatch(resetPastAllocationState()),
  getModuleBasedTenantConfig: (module) =>
    dispatch(getModuleBasedTenantConfig(module)),
  setAlanExplainability: (payload) => dispatch(setAlanExplainability(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ViewPastAllocation);
