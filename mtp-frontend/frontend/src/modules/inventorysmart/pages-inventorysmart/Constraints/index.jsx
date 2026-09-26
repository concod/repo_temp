import { useHistory } from "react-router";
import { DASHBOARD } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import {
  APP_NAME,
  CONSTRAINTS_HEADER_TAB,
  CONSTRAINTS_OMS_DELIVERY_SUBTAB,
  CONSTRAINTS_OMS_SUBTAB,
  FULL_ACCESS_PERMISSIONS_LIST,
  ROLES_ACCESS_MODULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import { Paper, Tab, Tabs } from "@mui/material";
import { Box } from "@mui/system";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import StoreAllocations from "./StoreAllocations";
import Status from "./Status";
import SafetyStock from "./SafetyStock";
import OrderPolicy from "./OrderPolicy";
import Ordering from "./Ordering";
import LeadTime from "./Delivery/leadTime";
import QcTime from "./Delivery/qcTime";
import DeleiveryFilter from "./Delivery/DeleiveryFilter";
import { connect } from "react-redux";
import UserReserveInvComponent from "./User-Reserve-Inv";
import SMAComponent from "./SMA";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  omsTabModulePermissionMap,
  tabModulePermissionMap,
} from "./config/tabConfig";
import { getTabItemVisibility } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import PoConversion from "./PoConversion";

const InventoryDashboard = (props) => {
  const {
    inventorysmartScreenConfig,
    inventorysmartModulesPermission,
    module,
  } = props;

  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [hideHeaderTab, setHideHeaderTab] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);
  const [selectedSubTab, setSelectedSubTab] = useState(null);
  const [selectedDeliveryTab, setSelectedDeliveryTab] = useState(null);
  const [tabsList, setTabsList] = useState([]);

  useEffect(() => {
    const newTabsList = CONSTRAINTS_HEADER_TAB.map((tabOption) => {
      if (
        props.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown?.hidden?.includes(
          tabOption.value
        )
      ) {
        return null;
      }

      const { value } = tabOption;
      const tabPermissions = tabModulePermissionMap[value];
      const displayFlag = getTabItemVisibility(
        inventorysmartModulesPermission[module],
        tabPermissions
      );

      if (!displayFlag) {
        return null;
      }

      return <Tab {...tabProps(tabOption)} />;
    });

    setTabsList(newTabsList);
  }, [inventorysmartScreenConfig, inventorysmartModulesPermission, module]);

  const routeOptions = [
    {
      label: "Constraints",
      id: 1,
      action: () => {
        history.push(DASHBOARD);
      },
    },
  ];

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSubTabChange = (event, newValue) => {
    setSelectedSubTab(newValue);
  };

  const handleDeliveryTabChange = (event, newValue) => {
    setSelectedDeliveryTab(newValue);
  };

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  useEffect(() => {
    if (
      props.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown?.hidden?.includes(
        "constraints_oms"
      ) &&
      props.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown?.hidden?.includes(
        "store_allocations"
      ) &&
      props.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown?.hidden?.includes(
        "user_reserve"
      ) &&
      props.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown?.hidden?.includes(
        "sma"
      )
    ) {
      setHideHeaderTab(true);
    }

    if (
      props.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown?.hidden?.includes(
        "store_allocations"
      )
    ) {
      setSelectedTab(CONSTRAINTS_HEADER_TAB[1].value);
    } else {
      setSelectedTab(CONSTRAINTS_HEADER_TAB[0].value);
      setSelectedSubTab(CONSTRAINTS_OMS_SUBTAB[0].value);
      setSelectedDeliveryTab(CONSTRAINTS_OMS_DELIVERY_SUBTAB[0].value);
    }

    fetchModulesAccess();
  }, [props.inventorysmartScreenConfig]);

  const fetchModulesAccess = async () => {
    try {
      const module = props.module;
      const subModules = ROLES_ACCESS_MODULES_MAPPING[module];
      let rolesBasedModulesPermission = {};

      props.setInventorySmartPermissionLoader(true);

      if (props.inventorysmartScreenConfig?.roleBasedAccess) {
        const accessDataResponse = await getModuleLevelAccessUtility({
          app: APP_NAME,
          module: subModules,
        })();

        rolesBasedModulesPermission = Object.fromEntries(
          Object.entries(accessDataResponse).map(([module, actions]) => [
            module,
            Object.keys(actions),
          ])
        );
      } else {
        subModules.map(async (subModule) => {
          rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
        });
      }

      props.setInventorySmartModulesPermissions({
        [module]: rolesBasedModulesPermission,
      });
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorySmartPermissionLoader(false);
    }
  };

  const renderTabComponents = () => {
    switch (selectedTab) {
      case "store_allocations":
        return <StoreAllocations {...props} screenName={props.screenName} />;
      case "constraints_oms":
        return <OMSTabPanel screenName={props.screenName} />;
      case "user_reserve":
        return (
          <UserReserveInvComponent {...props} screenName={props.screenName} />
        );
      case "sma":
        return <SMAComponent {...props} screenName={props.screenName} />;
      default:
        return;
    }
  };

  const OMSTabPanel = (props) => {
    return (
      <>
        <Tabs
          value={selectedSubTab}
          onChange={handleSubTabChange}
          aria-label="oms-constraints-tab"
        >
          {CONSTRAINTS_OMS_SUBTAB.map((tabOption) => {
            if (
              props.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown?.hidden?.includes(
                tabOption.value
              )
            ) {
              return null;
            }
            const { value } = tabOption;
            const tabPermissions = omsTabModulePermissionMap[value];
            const displayFlag = getTabItemVisibility(
              inventorysmartModulesPermission[module],
              tabPermissions
            );

            if (!displayFlag) {
              return null;
            }

            return <Tab {...tabProps(tabOption)} />;
          })}
        </Tabs>
        {renderSubTabComponents(props.screenName)}
      </>
    );
  };

  const renderSubTabComponents = (screenName) => {
    switch (selectedSubTab) {
      case "constraints_status":
        return <Status screenName={screenName} />;
      case "constraints_delivery":
        return <OMSDeliveryTabPanel screenName={screenName} />;
      case "constraints_ordering":
        return <Ordering screenName={screenName} />;
      case "constraints_safety_stock":
        return <SafetyStock screenName={screenName} />;
      case "constraints_order_policy":
        return <OrderPolicy screenName={screenName} />;
      case "constraints_po_conversion":
        return <PoConversion screenName={screenName} />;  
      default:
        return;
    }
  };

  const OMSDeliveryTabPanel = (props) => {
    return (
      <>
        <Tabs
          value={selectedDeliveryTab}
          onChange={handleDeliveryTabChange}
          aria-label="oms-constraints-delivery-tab"
        >
          {CONSTRAINTS_OMS_DELIVERY_SUBTAB.map(
            (tabOption) =>
              !props.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown?.hidden?.includes(
                tabOption.value
              ) && <Tab {...tabProps(tabOption)} />
          )}
        </Tabs>
        {renderSubDeliveryTabComponents(props.screenName)}
      </>
    );
  };

  const renderSubDeliveryTabComponents = (screenName) => {
    switch (selectedDeliveryTab) {
      case "constraints_lead_time":
        return <DeleiveryFilter screenName={screenName} selectedTab={"Lead"} />;
      case "constraints_qc_time":
        return <DeleiveryFilter screenName={screenName} selectedTab={"Qc"} />;
      default:
        return;
    }
  };

  return (
    <>
      <HeaderBreadCrumbs options={routeOptions} />

      <div className={globalClasses.filterWrapper}>
        <Paper elevation={0}>
          {hideHeaderTab ? (
            <StoreAllocations screenName={props.screenName} />
          ) : (
            <Box sx={{ width: "100%", typography: "body1" }}>
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                aria-label="constraints-tab"
              >
                {tabsList}
              </Tabs>
              {renderTabComponents()}
            </Box>
          )}
        </Paper>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(InventoryDashboard);
