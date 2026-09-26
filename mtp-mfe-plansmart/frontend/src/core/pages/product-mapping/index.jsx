import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import ProductStoreBand from "./components/product-store-band";
import HeaderBreadCrumbs from "../../Utils/HeaderBreadCrumbs";
import ModifyMappings from "./components/modify-mapping";
import ProductDcFc from "./components/product-dc-fc";
import ProductToPo from "./components/product-to-po";
import ProductToAsn from "./components/product-to-asn";
import { cloneDeep, isEmpty } from "lodash";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import "./index.scss";
import {
  fetchProductIdsInGrp,
  resetProductMappingStates,
  setIsAggregated,
} from "./services-product-mapping/productMappingService";
import { connect } from "react-redux";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  isFilterAccessRestricted
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt as IaPrompt } from "impact-ui";
import { Prompt } from "react-router";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mapping-tabpanel-${index}`}
      aria-labelledby={`mapping-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function a11yProps(index) {
  return {
    id: `mapping-tab-${index}`,
    "aria-controls": `mapping-tab-${index}`,
  };
}

function ProductMapping(props) {
  const [value, setValue] = React.useState(0);
  const [modifyMapping, setModifyMapping] = useState(false);
  const [selectedProducts, updateSelectedProducts] = useState([]);
  const [selectAllDependency, setSelectAllDependency] = useState(null);
  const [filtersSelection, setFiltersSelection] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [storeBandFilterSelection, setStoreBandFilterSelction] = useState([]);
  const filterDependencyRef = useRef([]);
  const storeDepRef = useRef([]);
  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage =
    type && props?.productMappingFilterDependency?.length > 0;
  const [confirmBox, setConfirmBox] = useState(false);
  const [flagEdit, setFlagEdit] = useState(false);
  const [changedTabValue, setChangedtabValue] = useState(0);
  const [productMappingTabs, setProductMappingTabs] = useState([]);
  const [disableBandActionButtons, setDisableBandActionButtons] = useState(
    false
  );

  useEffect(() => {
    const setAggregated = async () => {
      const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
        attribute_name: "display_levels",
      });
      if (
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"] &&
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
          "product"
        ]
      ) {
        const hidden_levels =
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ]?.["hidden_levels"];
        if (hidden_levels?.includes("product")) {
          props.setIsAggregated(true);
        }
      }
      let hasProductDCMappingConfig = Boolean(
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
          "ProductDCMapping"
        ]
      );
      const requiredSKUDCConfig = hasProductDCMappingConfig
        ? displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
            "ProductDCMapping"
          ]
        : displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ];
      const productDCHiddenLevels = requiredSKUDCConfig?.["hidden_levels"];
      if (productDCHiddenLevels.includes("product")) {
        props.setIsDCMappingAggregated(true);
      }
    };
    setAggregated();
    loadFilters();
    loadStoreBandFilters();
    updateStoreBandFilterBasedAccess();
    return () => props.resetProductMappingStates();
  }, []);

  const productToStoreMappingObj = {
    label: `${dynamicLabelsBasedOnTenant(
      "product",
      "core"
    )}-${dynamicLabelsBasedOnTenant("Store", "core")}`,
    id: "Product Mapping",
    index: 0,
  };
  const productToStoreDCFCMappingObj = {
    label: `${dynamicLabelsBasedOnTenant("product", "core")}-DC`,
    id: "Product to DC/FC Mapping",
    index: 1,
  };
  const productToPOMappingObj = {
    label: `${dynamicLabelsBasedOnTenant("product", "core")}-PO`,
    id: "Product to PO Mapping",
    index: 2,
  };
  const productToASNMappingObj = {
    label: `${dynamicLabelsBasedOnTenant("product", "core")}-ASN`,
    id: "Product to ASN Mapping",
    index: 3,
  };
  let productMappingTabsData = [
    productToStoreMappingObj,
    productToStoreDCFCMappingObj,
    productToPOMappingObj,
    productToASNMappingObj,
  ];

  useEffect(() => {
    if (props.productMappingFilterDependency.length > 0) {
      if (isRedirectedFromDifferentPage) {
        onFilter();
      }
    }
  }, [
    props.productMappingFilterDependency,
    value,
    isRedirectedFromDifferentPage,
  ]);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  useEffect(() => {
    const applicationDetails = getCurrentApplicationDetails();
    let productMappingTabsDataCopy = cloneDeep(productMappingTabsData);
    productMappingTabsDataCopy = productMappingTabsDataCopy.slice(0, -2); //by default remove product to po and product to asn tabs
    if (
      applicationDetails?.applicationCode === 1 &&
      !isEmpty(props?.inventorysmartModulesPermission)
    ) {
      let hiddenTabs =
        props.inventorysmartScreenConfig?.[props?.module]?.drillDown
          ?.hiddenTabs || [];
      let productMappingHasAccess = canTakeActionOnModules(
        "Product Mapping",
        "view"
      );
      let productMappingStoreToDcFcHasAccess = canTakeActionOnModules(
        "Product to DC/FC Mapping",
        "view"
      );
      // if user does not have any access to product Mapping, remove the tab
      if (hiddenTabs.includes("Product Mapping") || !productMappingHasAccess) {
        productMappingTabsDataCopy = productMappingTabsDataCopy.slice(1);
      }
      // if user does not have any access to product to dc/fc Mapping, remove the tab
      if (
        hiddenTabs.includes("Product to DC/FC Mapping") ||
        !productMappingStoreToDcFcHasAccess
      ) {
        productMappingTabsDataCopy.pop();
      }
      setProductMappingTabs(productMappingTabsDataCopy);
    } else {
      setProductMappingTabs(cloneDeep(productMappingTabsDataCopy));
    }
  }, [props?.inventorysmartModulesPermission]);

  /**
   * @function
   * @description Load dashboard filters using filter name
   */
  const loadStoreBandFilters = async () => {
    const response = await fetchFilterFieldValues(
      "ps mapping rules list",
      props.savedFilterSelection,
      props.screenName
    );
    if (isEmpty(props.producMappingRulesFilterConfiguration)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: props.screenName,
        },
      ];
      if (sessionStorage.getItem("currentApp") === "inventorysmart") {
        filterConfigData[0]["saved_filter_screen_name"] =
          "Inventorysmart Product Mapping";
      }
      const filterConfig = formattedFilterConfiguration(
        "producMappingRulesFilterConfiguration",
        filterConfigData,
        "Product Mapping"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  const loadFilters = async () => {
    const response = await fetchFilterFieldValues(
      "product mapping",
      props.savedFilterSelection,
      props.screenName
    );
    if (isEmpty(props.productMappingFilterDashboardConfiguration)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: props.screenName,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "productMappingFilterConfiguration",
        filterConfigData,
        "Product Mapping"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  const updateStoreBandFilterBasedAccess = (
    dependencyList = [],
    filterCheck = false
  ) => {
    const filterBasedAccessList = fetchDynamicConfigFromTenantReducer(
      "core",
      "mapping_no_edit_access"
    );
    if (filterBasedAccessList) {
      const isFilterBasedAccessRestricted = filterCheck
        ? isFilterAccessRestricted(filterBasedAccessList, dependencyList)
        : true;
      setDisableBandActionButtons(isFilterBasedAccessRestricted);
    }
  };

  const onFilter = async () => {
    try {
      let dependencyList;
      if (isRedirectedFromDifferentPage) {
        dependencyList = dependencyStructure(
          props.productMappingFilterDependency
        );
      } else {
        dependencyList = Boolean(value)
          ? filterDependencyRef.current
          : storeDepRef.current;
      }
      if (Boolean(value)) {
        setFiltersSelection(cloneDeep(dependencyList));
      } else {
        setStoreBandFilterSelction(cloneDeep(dependencyList));
        updateStoreBandFilterBasedAccess(dependencyList, true);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const dependencyStructure = (dependencyList) => {
    return dependencyList.map((item) => {
      return {
        attribute_name: item.filter_id,
        operator: "in",
        values: Array.isArray(item.values)
          ? item.values.map((opt) => opt.value)
          : item.values,
        filter_type: item.filter_type,
      };
    });
  };

  const onFilterDashboardClick = (dependencyData) => {
    filterDependencyRef.current = dependencyData;
    onFilter();
  };

  const onStoreBandFilterDashboardClick = (dependencyData) => {
    storeDepRef.current = dependencyData;
    onFilter();
  };

  /**
   * @function
   * @description Update current state with selected product to modify
   * @param {Object} data
   */
  const toggleModifyMapping = async (data, metaPayload) => {
    setSelectAll(false);
    updateSelectedProducts(data);
    setSelectAllDependency({
      rule_filters: {
        filters: [...storeDepRef.current],
        ...metaPayload,
      },
    });
    setModifyMapping(true);
  };

  const toggleSelectAllModify = async (metaPayload) => {
    setSelectAllDependency({
      rule_filters: {
        filters: [ ...storeDepRef.current ],
        ...metaPayload,
      },
    });
    setSelectAll(true);
    setModifyMapping(true);
  };

  const handleChange = (_event, newValue) => {
    setChangedtabValue(newValue);
    if (flagEdit) {
      setConfirmBox(true);
    } else {
      setValue(newValue);
    }
  };

  const updateFlagEdit = (flag) => {
    setFlagEdit(flag);
  };

  return (
    <>
      {!props.hideBreadCrumbs && (
        <HeaderBreadCrumbs
          options={
            modifyMapping
              ? [
                  {
                    label: dynamicLabelsBasedOnTenant(
                      "product_mapping",
                      "core"
                    ),
                    id: 1,
                    action: () => {
                      if (flagEdit) {
                        setConfirmBox(true);
                      } else {
                        setModifyMapping(false);
                      }
                    },
                  },
                  {
                    label: "Modify Mapping",
                    id: 2,
                    action: () => {},
                  },
                ]
              : [
                  {
                    label: dynamicLabelsBasedOnTenant(
                      "product_mapping",
                      "core"
                    ),
                    id: 1,
                    action: () => {
                      setModifyMapping(false);
                    },
                  },
                ]
          }
        ></HeaderBreadCrumbs>
      )}
      <Container maxWidth={false}>
        <IaPrompt
          isOpen={confirmBox}
          title="Unsaved Changes"
          subHeading="Your changes will be lost. Do you want to proceed?"
          infoList={[]}
          primaryButtonProps={{
            children: "Confirm",
            onClick: () => {
              if (!modifyMapping) {
                setValue(changedTabValue);
              }
              setModifyMapping(false);
              setFlagEdit(false);
              setConfirmBox(false);
            },
          }}
          tertiaryButtonProps={{
            children: "Cancel",
            onClick: () => setConfirmBox(false),
          }}
        />
        {!modifyMapping && (
          <div>
            {/* default router message will appear when try to change the route */}
            <Prompt when={flagEdit} message="" />
            <Paper elevation={0}>
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label="simple tabs example"
              >
                {productMappingTabs.map((tab) => (
                  <Tab label={tab.label} {...a11yProps(tab.index)} />
                ))}
              </Tabs>
              <CoreComponentScreen
                showFilterDashboard={true}
                filterConfigKey={
                  !Boolean(value)
                    ? "producMappingRulesFilterConfiguration"
                    : "productMappingFilterConfiguration"
                }
                onApplyFilter={
                  !Boolean(value)
                    ? onStoreBandFilterDashboardClick
                    : onFilterDashboardClick
                }
                hideNoDataFound
              >
                {productMappingTabs.findIndex(
                  (tab) => tab.id === "Product Mapping"
                ) !== -1 && (
                  <TabPanel value={value} index={0}>
                    <ProductStoreBand
                      ref={storeDepRef}
                      toggleModifyMapping={toggleModifyMapping}
                      toggleSelectAllModify={toggleSelectAllModify}
                      filtersSelection={storeBandFilterSelection}
                      isRedirectedFromDifferentPage={
                        isRedirectedFromDifferentPage
                      }
                      module={props.module} // for roleBasedAccess
                      screenName={props.screenName}
                      roleBasedAccess={props.roleBasedAccess}
                      disableActionButtons={disableBandActionButtons}
                    ></ProductStoreBand>
                  </TabPanel>
                )}
                {productMappingTabs.findIndex(
                  (tab) => tab.id === "Product to DC/FC Mapping"
                ) !== -1 && (
                  <TabPanel value={value} index={1}>
                    <ProductDcFc
                      filtersSelection={filtersSelection}
                      ref={filterDependencyRef}
                      selectedProductMappingArticles={
                        props.selectedProductMappingArticles
                      }
                      isRedirectedFromDifferentPage={
                        isRedirectedFromDifferentPage
                      }
                      module={props.module}
                      screenName={props.screenName}
                      roleBasedAccess={props.roleBasedAccess}
                      updateFlagEdit={updateFlagEdit}
                    />
                  </TabPanel>
                )}
                {productMappingTabs.findIndex(
                  (tab) => tab.id === "Product to PO Mapping"
                ) !== -1 && (
                  <TabPanel value={value} index={2}>
                    <ProductToPo filtersSelection={filtersSelection} />
                  </TabPanel>
                )}
                {productMappingTabs.findIndex(
                  (tab) => tab.id === "Product to ASN Mapping"
                ) !== -1 && (
                  <TabPanel value={value} index={3}>
                    <ProductToAsn filtersSelection={filtersSelection} />
                  </TabPanel>
                )}
              </CoreComponentScreen>
            </Paper>
          </div>
        )}

        {modifyMapping && (
          <ModifyMappings
            selectedProducts={selectedProducts}
            dependencyRef={storeDepRef}
            dependency={selectAllDependency}
            isSelectAll={selectAll}
            closeModify={() => {
              setModifyMapping(false);
              updateSelectedProducts([]);
              onFilter();
            }}
          ></ModifyMappings>
        )}
      </Container>
    </>
  );
}

const mapStateToProps = (store) => {
  return {
    productMappingFilterDependency:
      store.productMappingReducerService.productMappingFilterDependency,
    selectedProductMappingArticles:
      store.productMappingReducerService.selectedProductMappingArticles,
    productMappingFilterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "productMappingFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    inventorysmartModulesPermission:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapActionsToProps = {
  fetchProductIdsInGrp,
  getTenantConfigApplicationLevel,
  resetProductMappingStates,
  setFilterConfiguration,
  setIsAggregated,
  addSnack,
};

export default connect(mapStateToProps, mapActionsToProps)(ProductMapping);
