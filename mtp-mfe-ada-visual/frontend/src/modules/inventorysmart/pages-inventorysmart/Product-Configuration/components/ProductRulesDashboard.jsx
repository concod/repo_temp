import globalStyles from "../../../../../core/Styles/globalStyles";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import {
  ALERTS_CONFIGURATION_CHANNEL_FILTER,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import ProductRuleTableWrapper from "./ProductRuleTableWrapper";
import {
  resetProductRuleStoreState,
  setApplicationObjectList,
  setInventorysmartRulesFilterDependency,
  setProductRuleFilterLoader,
  setProductRulesFilterConfig,
  setProductRuleTableLoader,
  setSelectedFilters,
  setShowGridContainer,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";
import { addSnack } from "core/actions/snackbarActions";
import { getApplicationMaster } from "core/actions/tenantConfigActions";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { setActiveScreenName } from "modules/assortsmart/services-assortsmart/common-assort-service";
import { cloneDeep, isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { CUSTOMFILTERS } from "./config";

const ProductRuleDashboard = (props) => {
  const globalClasses = globalStyles();

  const [filterDependency, setFilterDependency] = useState([]);

  const type = new URLSearchParams(window.location.search).get("type");

  const isRedirectedFromDifferentPage =
    type && props?.inventorysmartRulesFilterDependency?.length > 0;

  const applyFilters = (filterElements, dependency) => {
    props.setProductRuleTableLoader(true);
    let filterDependency = [...dependency];
    if (isRedirectedFromDifferentPage) {
      let channelFilterElement = filterElements?.filter(
        (item) => item.column_name === "channel"
      )[0];
      if (
        channelFilterElement?.is_mandatory &&
        !dependency.some((item) => item.attribute_name === "channel")
      ) {
        let allChannelData = channelFilterElement?.initialData?.map(
          (item) => item.value
        );
        let channelValueObj = {
          ...ALERTS_CONFIGURATION_CHANNEL_FILTER,
          values: allChannelData,
        };
        filterDependency.push(channelValueObj);
      }
    }
    const payload = filtersPayload(filterElements, filterDependency, true);
    payload.reqBody = payload.reqBody.filter(
      (item) => item.values && item.values?.length > 0
    );
    let selectedFilterValues = [...payload.reqBody];
    if (payload.reqBody.some((item) => item.attribute_name === "channel")) {
      selectedFilterValues = payload.reqBody;
    } else {
      if (props.filterDashboardConfigurationObj) {
        let allFiltersData = props.filterDashboardConfigurationObj.filter(
          (item) => item.screen_name === "Inventorysmart Configurations"
        )[0];
        let allChannelData = allFiltersData?.filterDashboardData
          ?.filter((item) => item.column_name === "channel")
          .map((item) => item.initialData)[0];
        let channelValueObj = {
          attribute_name: "channel",
          dimension: "Store",
          filter_type: "cascaded",
          operator: "in",
          values: allChannelData.map((item) => item.value),
        };
        selectedFilterValues = [channelValueObj, ...payload.reqBody];
      }
    }
    props.setShowGridContainer(payload.isValid);
    props.setSelectedFilters(selectedFilterValues);
    props.setProductRuleTableLoader(false);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Inventorysmart Product Rules");
        if (
          isEmpty(props.filterDashboardConfiguration) ||
          props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
        ) {
          props.setProductRulesFilterConfig(response);
        }
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    getInitialFilterConfiguration();
    props.setActiveScreenName("inventorysmart_product_rules");
    sessionStorage.setItem("activeScreenName", "inventorysmart_product_rules");
  }, []);

  useEffect(() => {
    if (!isEmpty(props.productRulesFilterConfig)) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setProductRuleFilterLoader(true);
          const selectedFilters = isRedirectedFromDifferentPage
            ? cloneDeep(props.inventorysmartRulesFilterDependency)
            : selected;
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.productRulesFilterConfig) || [],
            appliedFilters: selectedFilters,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterDatawithCustomFilers = [...response, ...CUSTOMFILTERS];
          const filterConfigData = [
            {
              filterDashboardData: filterDatawithCustomFilers,
              expectedFilterDimensions: getFilterDimensions(
                filterDatawithCustomFilers
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "productRuleFilterConfiguration",
            filterConfigData,
            "Product Rules",
            selectedFilters
          );

          if (isRedirectedFromDifferentPage) {
            const formattedSelectedFilters = formatSelectedFiltersData(
              filterConfigData,
              "Product Rules",
              selectedFilters
            );

            filterConfig[
              "productRuleFilterConfiguration"
            ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;
            setFilterDependency(formattedSelectedFilters);
            onFilterDashboardClick(selectedFilters, filterDatawithCustomFilers);
          }

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setProductRuleFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [props.productRulesFilterConfig]);

  //fetch application on load
  useEffect(() => {
    if (props.applicationObjectList !== null) return;

    // fetch only if not master list is available in store
    const fetchApplicationMasterList = async () => {
      let getApplicationMasterList = await props.getApplicationMaster();
      let applicationObjectList = getApplicationMasterList.data.data.filter(
        (masterList) => {
          if (
            masterList.name?.toLowerCase() === "InventorySmart".toLowerCase()
          ) {
            return masterList;
          }
        }
      );
      props.setApplicationObjectList(applicationObjectList);
    };
    fetchApplicationMasterList();
  }, []);

  useEffect(() => {
    return () => {
      props.setShowGridContainer(false);
      props.resetProductRuleStoreState();
    };
  }, []);

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        // Filter dashboard props
        filterDependency={filterDependency}
        showChipsOnLoad={isRedirectedFromDifferentPage}
        disableFilters={isRedirectedFromDifferentPage}
        filterConfigKey={"productRuleFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
      />

      {props.showGridContainer && (
        <div className={globalClasses.marginVertical1rem}>
          <CustomAccordion label="Details table">
            <ProductRuleTableWrapper
              isRedirectedFromDifferentPage={isRedirectedFromDifferentPage}
              {...props}
            />
          </CustomAccordion>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventoryProductFilterLoader:
      store.inventorysmartReducer.productRuleService
        .inventoryProductFilterLoader,
    filterDashboardConfigurationObj:
      store.filterReducer?.filterDashboardConfiguration
        ?.productRuleFilterConfiguration?.filterConfig,
    showGridContainer:
      store.inventorysmartReducer.productRuleService.showGridContainer,
    applicationObjectList:
      store.inventorysmartReducer.productRuleService.applicationObjectList,
    selectedRulesArticles:
      store.inventorysmartReducer.productRuleService.selectedRulesArticles,
    productRulesFilterConfig:
      store.inventorysmartReducer.productRuleService.productRulesFilterConfig,
    inventorysmartRulesFilterDependency:
      store.inventorysmartReducer.productRuleService
        .inventorysmartRulesFilterDependency,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "productRuleFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setProductRuleFilterLoader: (payload) =>
    dispatch(setProductRuleFilterLoader(payload)),
  setProductRuleTableLoader: (payload) =>
    dispatch(setProductRuleTableLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setShowGridContainer: (payload) => dispatch(setShowGridContainer(payload)),
  getApplicationMaster: (body) => dispatch(getApplicationMaster(body)),
  setApplicationObjectList: (body) => dispatch(setApplicationObjectList(body)),
  setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
  setProductRulesFilterConfig: (payload) =>
    dispatch(setProductRulesFilterConfig(payload)),
  setInventorysmartRulesFilterDependency: (payload) =>
    dispatch(setInventorysmartRulesFilterDependency(payload)),
  resetProductRuleStoreState: (payload) =>
    dispatch(resetProductRuleStoreState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductRuleDashboard);
