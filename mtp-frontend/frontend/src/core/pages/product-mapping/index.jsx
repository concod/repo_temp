import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";
import ProductToStore from "./components/product-to-store";
import HeaderBreadCrumbs from "../../Utils/HeaderBreadCrumbs";
import Modify from "./components/modify-product-mapping";
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
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";
import { addSnack } from "core/actions/snackbarActions";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function ProductMapping(props) {
  const [value, setValue] = React.useState(0);
  const [modifyMapping, setModifyMapping] = useState(false);
  const [cols, updateCols] = useState([]);
  const [productDimension, setProductDimension] = useState("product");
  const [selectedProducts, updateselectedProducts] = useState([]);
  const [filtersSelection, setFiltersSelection] = useState([]);
  const [productMappingTabs, setProductMappingTabs] = useState([]);
  const [fetchProductIdsInGrpLoader, showfetchProductIdsInGrpLoader] = useState(
    false
  );
  const [reset, setReset] = useState(false);
  const filterDependencyRef = useRef([]);
  const type = new URLSearchParams(window.location.search).get("type");
  const isRedirectedFromDifferentPage =
    type && props?.productMappingFilterDependency?.length > 0;

  const [tableConfig, setTableConfig] = useState({});
  const [enableSelectAll, setEnableSelectAll] = useState(false);

  const onFilter = async () => {
    try {
      if (isRedirectedFromDifferentPage) {
        let dependencyList = dependencyStructure(
          props.productMappingFilterDependency
        );
        setFiltersSelection(cloneDeep(dependencyList));
      } else {
        let dependencyList = filterDependencyRef.current;
        setFiltersSelection(cloneDeep(dependencyList));
      }
    } catch (err) {
      console.log(err);
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
      if (sessionStorage.getItem("currentApp") === "inventorysmart") {
        filterConfigData[0]["saved_filter_screen_name"] =
          "Inventorysmart Product Mapping";
      }
      const filterConfig = formattedFilterConfiguration(
        "productMappingFilterConfiguration",
        filterConfigData,
        "Product Mapping"
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

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
        if (hidden_levels.includes("product")) {
          props.setIsAggregated(true);
        }
      }
    };
    setAggregated();
    loadFilters();
    return () => props.resetProductMappingStates();
  }, []);

  const handleChange = (_event, newValue) => {
    setReset(!reset);
    setValue(newValue);
  };

  const displaySnackMessages = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  const toggleModifyMapping = async (data) => {
    updateCols(data.cols);
    updateselectedProducts(data.selectedProducts);
    if (productDimension === "product_group") {
      showfetchProductIdsInGrpLoader(true);
      const resp = await props.fetchProductIdsInGrp({
        group_ids: data.selectedProducts.map((codes) => codes.pg_code),
      });
      showfetchProductIdsInGrpLoader(false);
      if (resp?.data?.data?.length > 10000) {
        displaySnackMessages(
          "Number of products in selected group(s) exceeds 10000 limit",
          "error"
        );
        return;
      }
      updateselectedProducts(resp.data.data);
      setTableConfig(data?.tableConfiguration?.selection);
      setEnableSelectAll(data?.tableConfiguration?.enable_selectall);
      setModifyMapping(true);
    } else {
      updateselectedProducts(data.selectedProducts);
      setModifyMapping(true);
      setTableConfig(data?.tableConfiguration?.selection);
      setEnableSelectAll(data?.tableConfiguration?.enable_selectall);
    }
  };

  const productToStoreMappingObj = {
    label: `${dynamicLabelsBasedOnTenant("product", "core")}-Store`,
    id: "Product Mapping",
    index: 0,
  };
  const productToStoreDCFCMappingObj = {
    label: `${dynamicLabelsBasedOnTenant("product", "core")}-DC/FC`,
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
                      setModifyMapping(false);
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
        {!modifyMapping && (
          <div>
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
                filterConfigKey={"productMappingFilterConfiguration"}
                onApplyFilter={onFilterDashboardClick}
              >
                {productMappingTabs.findIndex(
                  (tab) => tab.id === "Product Mapping"
                ) !== -1 && (
                  <TabPanel value={value} index={0}>
                    <ProductToStore
                      ref={filterDependencyRef}
                      toggleModifyMapping={toggleModifyMapping}
                      changeDimension={(event) => {
                        setProductDimension(event);
                      }}
                      filtersSelection={filtersSelection}
                      fetchProductIdsInGrpLoader={fetchProductIdsInGrpLoader}
                      selectedProductMappingArticles={
                        props.selectedProductMappingArticles
                      }
                      isRedirectedFromDifferentPage={
                        isRedirectedFromDifferentPage
                      }
                      module={props.module} // for roleBasedAccess
                      screenName={props.screenName}
                      roleBasedAccess={props.roleBasedAccess}
                    ></ProductToStore>
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
          <Modify
            selectedDimension={"product"}
            // defaultDataSet={defaultDataSet}
            cols={cols}
            selectedProducts={selectedProducts}
            goBack={() => {
              setModifyMapping(false);
              setProductDimension("product");
            }}
            fetchIdsLoader={fetchProductIdsInGrpLoader}
            screenName={props.screenName}
            filters={filterDependencyRef?.current || []}
            tableConfig={tableConfig}
            enableSelectAll={enableSelectAll}
          ></Modify>
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
      store?.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
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
