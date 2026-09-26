import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import StoreGroup from "./components/store-group";
import ProductGroup from "./components/product-group";
import Tabs from "core/commonComponents/tabs";
import {
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import { setInventorySmartModulesPermissions } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";

const Grouping = (props) => {
  const [tabValue, setTabValue] = useState(
    props.location?.state?.from?.includes("product-grouping") ? 1 : 0
  );
  const tabsData = [
    {
      label: "Store Group",
      id: "storeGroup",
      TabPanel: <StoreGroup {...props} />,
    },
    {
      label: `${dynamicLabelsBasedOnTenant("product", "core")} Group`,
      id: "productGroup",
      TabPanel: <ProductGroup {...props} />,
    },
  ];
  const [tabs, setTabsData] = useState([]);

  useEffect(() => {
    setTabsData(tabsData);
  }, []);

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const currentActiveTab = sessionStorage.getItem("grouping-active-tab");
      const fetchModulesAccess = async () => {
        try {
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse = await getModuleLevelAccessUtility({
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
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (error) {
          console.log(error, "e");
        }
      };
      fetchModulesAccess();
      if (props.inventorysmartScreenConfig.inventorysmart_grouping_hiddentab) {
        let finaltabs = tabsData.filter(
          (item) =>
            props.inventorysmartScreenConfig.inventorysmart_grouping_hiddentab.indexOf(
              item.id
            ) === -1
        );
        setTabsData(finaltabs);
      }
      if (currentActiveTab != undefined || currentActiveTab != null) {
        setTabValue(Number(currentActiveTab));
      }
    }
  }, [props.inventorysmartScreenConfig]);

  const handleChange = (newValue) => {
    //setting the value to newValue that is coming from tabs component
    setTabValue(newValue);
    sessionStorage.setItem("grouping-active-tab", newValue);
    //If the newValue is 0 and path has product-grouping, then change the route to
    //store-eligibility grouping
    props.history.push({
      pathname: `/inventory-smart/store-eligibility-grouping`,
      state: {
        from: null,
      },
    });
    return true;
  };

  return (
    <div>
      <Tabs
        tabPannelStyle={{ padding: "0px" }}
        tabsData={tabs}
        customSelectedtab={tabValue}
        handleChange={handleChange}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Grouping);
