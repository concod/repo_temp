import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { ALLOCATION_REPORT } from "../../constants-inventorysmart/routesConstants";
import globalStyles from "../../../../core/Styles/globalStyles";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Box } from "@mui/system";
import { Paper, Tab, Tabs } from "@mui/material";
import {
  ALLOCATION_REPORT_HEADER_TAB,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  ROLES_ACCESS_MODULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import AllocationReporting from "./AllocationReporting";

import OMSReporting from "./OMSReporting";
import { tabModulePermissionMap } from "./config/tabConfig";
import { getTabItemVisibility } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const ProductConfiguration = (props) => {
  const {
    inventorysmartScreenConfig,
    inventorysmartModulesPermission,
    module,
  } = props;
  const history = useHistory();
  const globalClasses = globalStyles();

  const [hideHeaderTab, setHideHeaderTab] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);
  const [tabsList, setTabsList] = useState([]);

  useEffect(() => {
    const newTabsList = ALLOCATION_REPORT_HEADER_TAB.map((tabOption) => {
      if (
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
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

  useEffect(() => {
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

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  const renderTabComponents = () => {
    switch (selectedTab) {
      case "reports_oms":
        return <OMSReporting {...props} />;
      case "allocation_reporting":
        return <AllocationReporting {...props} />;
      default:
        return;
    }
  };

  useEffect(() => {
    if (
      props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
        "reports_oms"
      )
    ) {
      if (
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
          "allocation_reporting"
        )
      ) {
        setHideHeaderTab(true);
      } else setSelectedTab("allocation_reporting");
    } else setSelectedTab("allocation_reporting");
  }, [props.inventorysmartScreenConfig]);

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Reporting",
            id: 1,
            action: () => {
              history.push(ALLOCATION_REPORT);
            },
          },
        ]}
      ></HeaderBreadCrumbs>

      <div className={globalClasses.filterWrapper}>
        <Paper elevation={0}>
          {hideHeaderTab ? (
            <Box sx={{ width: "100%", typography: "body1" }}>
              <AllocationReporting {...props} />
            </Box>
          ) : (
            <Box sx={{ width: "100%", typography: "body1" }}>
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                aria-label="reports-header-tab"
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductConfiguration);
