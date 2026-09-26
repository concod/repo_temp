import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { findIndex, isEmpty } from "lodash";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import ProductStatus from "core/pages/productStatus";
import ProductMapping from "core/pages/product-mapping";
import TabsComponent from "core/commonComponents/tabs";
import DCStatus from "core/pages/dc-status";
import DCMapping from "core/pages/dcmapping";
import StoreStatus from "core/pages/storeStatus";
import StoreMapping from "core/pages/storeMapping";
import NewStoreSetup from "../../New-Store-Setup";
import ProductRulesDashboard from "../../Product-Configuration/components/ProductRulesDashboard";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  ADD_NEW_STORE,
  CREATE_AUTO_ALLOCATION_RULES,
  CREATE_NEW_PRODUCT_MAPPING,
  NEW_STORE_APPROVAL_FLOW,
  REVIEW_NEW_STORE_ALLOCATION,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import ProductsSupersession from "../../Product-Supersession";
import ProductStoreInventorySourceMapping from "../../Product-Store-Inventory-Source-Mapping";
import StoreDCConfiguration from "../../Store-DC-Configuration";
import StoreCapacity from "./store-capacity";
import UserMaintainedDates from "../../User-Maintained-Dates";
import PriorityCodeConfig from "../../Priority-Code-Config";
import AutoAllocationRules from "../../Auto-Allocation-Rules";

function TabLayout(props) {
  const [dcTabVal, setDcTabVal] = useState([]);
  const navigate = useNavigate();
  let location = useLocation();

  const { product: productLabel } = props.dynamicLabels || {};

  const dcStatusObj = {
    label: "DC Status",
    id: "dc status",
    TabPanel: (
      <DCStatus
        hideBreadCrumbs={true}
        module={props.module}
        screenName={props.screenName}
        roleBasedAccess={props.roleBasedAccess}
      ></DCStatus>
    ),
  };
  const dcMappingObj = {
    label: "DC Mapping",
    id: "dc mapping",
    TabPanel: (
      <DCMapping
        hideBreadCrumbs={true}
        module={props.module}
        screenName={props.screenName}
        roleBasedAccess={props.roleBasedAccess}
      ></DCMapping>
    ),
  };
  let dcTabsData = [dcStatusObj, dcMappingObj];

  useEffect(() => {
    const hideDCMapping =
      props.hideDCDimensionSubTabs &&
      props.hideDCDimensionSubTabs.includes("dc mapping");
    const hideDCStatus =
      props.hideDCDimensionSubTabs &&
      props.hideDCDimensionSubTabs.includes("dc status");

    if (hideDCMapping) {
      dcTabsData.pop(dcMappingObj);
    }
    if (hideDCStatus) {
      dcTabsData.pop(dcStatusObj);
    }
    setDcTabVal(dcTabsData);
  }, [props.hideDCDimensionSubTabs]);
  const [defaultIndex, setDefaultIndex] = useState(0);
  const [productConfigTabs, setProductConfigTabs] = useState([]);
  const [storeConfigTabs, setStoreConfigTabs] = useState([]);

  const fromPath = props.history?.location?.state;

  let productTabsData = [
    {
      label: dynamicLabelsBasedOnTenant("product_rules"),
      id: "product rules",
      TabPanel: (
        <div>
          <ProductRulesDashboard
            module={props.module}
            screenName={props.screenName}
          />
        </div>
      ),
    },
    {
      label: dynamicLabelsBasedOnTenant("product_status"),
      id: "product status",
      TabPanel: (
        <ProductStatus
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></ProductStatus>
      ),
    },
    {
      label: dynamicLabelsBasedOnTenant("product_mapping"),
      id: "product mapping",
      TabPanel: (
        <ProductMapping
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></ProductMapping>
      ),
    },
    {
      label: `${productLabel ?? "Product"} Supersession`,
      id: "product supersession",
      TabPanel: (
        <ProductsSupersession
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></ProductsSupersession>
      ),
    },
    {
      label: "User Maintained Dates",
      id: "user maintained dates",
      TabPanel: (
        <UserMaintainedDates
          hideBreadCrumbs={true}
          module={props.module}
          screenName={"Product Life Cycle"}
          roleBasedAccess={props.roleBasedAccess}
        />
      ),
    },
    {
      label: "Product Store Inv. Source Mapping",
      id: "product store inventory source mapping",
      TabPanel: (
        <ProductStoreInventorySourceMapping
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></ProductStoreInventorySourceMapping>
      ),
    },
    {
      label: "Priority Code Setup",
      id: "priority code",
      TabPanel: (
        <PriorityCodeConfig
          hideBreadCrumbs={true}
          module={props.module}
          screenName={"Product Life Cycle"}
          roleBasedAccess={props.roleBasedAccess}
        />
      )
    },
    {
      label: "Auto Allocation Scheduler",
      id: "auto allocation rules",
      TabPanel: (
        <AutoAllocationRules
          hideBreadCrumbs={true}
          module={props.module}
          screenName={"Auto Allocation Rules"}
          roleBasedAccess={props.roleBasedAccess}
        />
      )
    },    
  ];

  let storeTabsData = [
    {
      label: "Store Status",
      id: "store status",
      TabPanel: (
        <StoreStatus
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></StoreStatus>
      ),
    },
    {
      label: "Store Mapping",
      id: "store mapping",
      TabPanel: (
        <StoreMapping
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          application_code={1}
        ></StoreMapping>
      ),
    },
    {
      label: "Store Lead Time Configuration",
      id: "dc lead time",
      TabPanel: (
        <StoreDCConfiguration
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></StoreDCConfiguration>
      ),
    },
    {
      label: "New Store Setup",
      id: "new store setup",
      TabPanel: (
        <NewStoreSetup
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></NewStoreSetup>
      ),
    },
    {
      label: "Store Capacity",
      id: "Store Capacity",
      TabPanel: (
        <StoreCapacity
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></StoreCapacity>
      ),
    },
  ];
  useEffect(() => {
    if (fromPath === NEW_STORE_APPROVAL_FLOW || fromPath === ADD_NEW_STORE) {
      // When there is an additional tab  present in store view (Lead Time config) change the index to 3 to land on new store tab
      let indexVal =
        props.hideStoreDimensionSubTabs &&
        props.hideStoreDimensionSubTabs.includes("dc lead time")
          ? 2
          : 3;
      setDefaultIndex(indexVal);
    } else if (fromPath === CREATE_NEW_PRODUCT_MAPPING) {
      setDefaultIndex(findIndex(productTabsData, {id: "product supersession" }));
    } else if (fromPath === CREATE_AUTO_ALLOCATION_RULES) {
      setDefaultIndex(findIndex(productTabsData, {id: "auto allocation rules" }));
      navigate({ state: "" }, { replace: true });
    } else if(fromPath === REVIEW_NEW_STORE_ALLOCATION) {
      setDefaultIndex(
        findIndex(storeTabsData, { id: "new store setup" })
      );
    } else {
      setDefaultIndex(0);
    }
    // DC status and DC mapping do not have access for the roles Director and planner
    if (
      !isEmpty(props.inventorysmartModulesPermission) &&
      props.dimension === "dc"
    ) {
      let noDCStatusAccess =
        props.inventorysmartModulesPermission[props.module]?.[
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS
        ]?.length === 0;
      let noDCMappingAccess =
        props.inventorysmartModulesPermission[props.module]?.[
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING
        ]?.length === 0;
      let dcAccessTabsData = [];
      if (noDCStatusAccess) {
        dcAccessTabsData = [
          {
            label: "DC Mapping",
            id: "dc mapping",
            TabPanel: (
              <DCMapping
                hideBreadCrumbs={true}
                module={props.module}
                screenName={props.screenName}
                roleBasedAccess={props.roleBasedAccess}
              ></DCMapping>
            ),
          },
        ];
      } else if (noDCMappingAccess) {
        dcAccessTabsData = [
          {
            label: "DC Status",
            id: "dc status",
            TabPanel: (
              <DCStatus
                hideBreadCrumbs={true}
                module={props.module}
                screenName={props.screenName}
                roleBasedAccess={props.roleBasedAccess}
              ></DCStatus>
            ),
          },
        ];
      } else {
        dcAccessTabsData = dcTabsData;
      }
      setDcTabVal(dcAccessTabsData);
    }
  }, [
    props.inventorysmartModulesPermission,
    props.dimension,
    props.hideDCDimensionSubTabs,
  ]);

  useEffect(() => {
    // Do not show new store tab for signet (Will be removed later)
    // Currently applying this logic only for store dimension tabs
    if (props.hideProductDimensionSubTabs?.length) {
      productTabsData = productTabsData.filter(
        (item) =>
          !props.hideProductDimensionSubTabs.some(
            (tabNames) => tabNames === item.id
          )
      );
      setProductConfigTabs(productTabsData);
    } else setProductConfigTabs(productTabsData);
  }, [props.hideProductDimensionSubTabs]);

  useEffect(() => {
    // Do not show new store tab for signet (Will be removed later)
    // Currently applying this logic only for store dimension tabs
    if (props.hideStoreDimensionSubTabs?.length) {
      storeTabsData = storeTabsData.filter(
        (item) =>
          !props.hideStoreDimensionSubTabs.some(
            (tabNames) => tabNames === item.id
          )
      );
      setStoreConfigTabs(storeTabsData);
    } else setStoreConfigTabs(storeTabsData);
  }, [props.hideStoreDimensionSubTabs]);

  const configJSON = {
    product: productConfigTabs,
    store: storeConfigTabs,
    dc: dcTabVal,
  };

  return (
    <TabsComponent
      tabPannelStyle={{ padding: "0px" }}
      tabContainerstyle={{ padding: "0px" }}
      tabsData={configJSON[props.dimension]}
      disabled={props.disabled}
      type={props.type}
      customSelectedtab={defaultIndex}
    />
  );
}

const mapStateToProps = (store) => {
  return {
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
  };
};

export default connect(mapStateToProps)(TabLayout);
