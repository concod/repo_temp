import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Loader from "core/Utils/Loader/loader";
import {
  displaySnackMessages,
  fetchFilterOptions,
} from "../../inventorysmart-utility";
import { connect } from "react-redux";
import {
  isAllFiltersSelectedForRCLProduct,
  fetchSelectedRclHeirarchies,
  getRclHierarchy,
  setRCLProductFilterCOnfig,
  setRclSelectedLevel,
  setRclSelectedProductLevel,
  setRulesTableLoader,
  setActiveRclStep,
  setProductsLevelDataForBackFlow,
  setHierarchyList,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { CREATE_RULES_SELECT_PRODUCTS_CONFIG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { handleErrorMessage } from "./add-rcl-component";
import ProductFilterIcon from "assets/IS_icons/productFilterIcon.png";
import StoreFilterIcon from "assets/IS_icons/storeFilterIcon.png";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useTranslation } from "impact-ui-v3";

//OMS Related Imports
import { getOmsRulesConstraintsFilterConfiguration } from "modules/oms/services-oms/Constraints/constraints-services";

const SelectRclProductLevel = (props) => {
  const { t } = useTranslation();
  const isConstraintsFlow =
    sessionStorage.getItem("isConstraintsFlow") === "true";
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";

  const [filterDependency, setFilterDependency] = useState({});

  useEffect(() => {
    let productFilters = cloneDeep(props.selectedRclProductLevel).filter(
      (item) =>
        item.dimension === "product" &&
        !props?.defaultFilters?.some(
          (df) => df?.attribute_name === item?.attribute_name
        )
    );
    let allStoreFiltersSelected = true;
    if (props.disableStoreFilterToggle) {
      let mandatoryStoreFilters = props.rclProductFilterConfig.filter(
        (item) => item.dimension === "store" && item.is_mandatory === true
      );
      let selectedStoreFilters = props.selectedRclProductLevel.filter(
        (item) => item.dimension === "store" && item.is_mandatory === true
      );

      // Check if all mandatory store filters are present in selected store filters
      if (mandatoryStoreFilters.length > 0) {
        allStoreFiltersSelected = mandatoryStoreFilters.every(
          (mandatoryFilter) =>
            selectedStoreFilters.some(
              (selectedFilter) =>
                selectedFilter.attribute_name === mandatoryFilter.column_name
            )
        );
      }
    }
    if (
      productFilters?.length < props?.selectedRclLevel?.length ||
      (props.disableStoreFilterToggle && !allStoreFiltersSelected)
    ) {
      props?.isAllFiltersSelectedForRCLProduct(false);
    } else {
      props?.isAllFiltersSelectedForRCLProduct(true);
    }
  }, [props?.selectedRclLevel, props.selectedRclProductLevel]);

  useEffect(() => {
    const onLoad = async () => {
      if (!isEmpty(props?.selectedRclForAddHierarchies)) {
        props?.setRulesCreateLoader(true);
        let isDCNetworkFlow = props.location.state?.redirectedFromNetworkTab;
        let response = await fetchSelectedRclHeirarchies(
          props?.selectedRclForAddHierarchies?.rcl_code,
          isConstraintsFlow,
          isOMSConstraintsFlow,
          isDCNetworkFlow
        );
        let hierarchyList = response?.data?.data?.map((key) => {
          return key?.column_name;
        });
        props.setRclSelectedLevel(hierarchyList);
        props?.setRulesCreateLoader(false);
      }
    };
    onLoad();
  }, [props?.selectedRclForAddHierarchies]);

  useEffect(() => {
    const fetchHeirarchy = async () => {
      props?.setRulesCreateLoader(true);
      try {
        let isDCNetworkFlow = props.location.state?.redirectedFromNetworkTab;
        const is_po_strategy_flow =
          JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false;
        let response = await getRclHierarchy(
          isConstraintsFlow,
          isOMSConstraintsFlow,
          isDCNetworkFlow,
          is_po_strategy_flow
        );
        props.setHierarchyList(response.data.data);
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        let clonedRclLevel = cloneDeep(props?.selectedRclLevel);
        let tempAttributeData = cloneDeep(response?.data?.data);
        let customFilterConfig = tempAttributeData
          ?.map((key, index) => {
            return {
              ...CREATE_RULES_SELECT_PRODUCTS_CONFIG,
              ...key,
              level: index + 1,
              is_multiple_selection: !props?.createRulesConfigs?.create_rcl_single_select_fields?.includes(
                key?.column_name
              ),
              dimension: key.attribute_dimension || "product",
              is_required: key.attribute_dimension
                ? key.attribute_dimension === "product"
                  ? true
                  : false
                : true,
            };
          })
          .filter(
            (key) =>
              clonedRclLevel?.indexOf(key.column_name) > -1 ||
              key.dimension === "store"
          );

        let selectedLevels = cloneDeep(customFilterConfig)
          .filter((item) => item.dimension === "product")
          .map((item) => item.label);
        if (
          props.rclList?.length &&
          !props.selectedRclForAddHierarchies?.rcl_code
        ) {
          let ruleExists = false;
          props.rclList.map((rule) => {
            let match = true;
            if (selectedLevels.length != rule.level.length) {
              match = false;
            } else {
              rule.level.map((item) => {
                if (!selectedLevels.includes(item)) {
                  match = false;
                }
              });
            }
            if (match) {
              ruleExists = true;
            }
          });
          if (ruleExists) {
            displaySnackMessages(
              t("inventorysmart.rclLevelAlreadyExists"),
              "error",
              props
            );
            props.setActiveRclStep(0);
          }
        }

        const omsFilterConfig = await props.getOmsRulesConstraintsFilterConfiguration();
        const filteredCountryProduct = omsFilterConfig.data.data.filter(
          (item) => item.column_name === "country_product"
        );
        if (filteredCountryProduct.length > 0 && isOMSConstraintsFlow) {
          customFilterConfig.forEach((item) => {
            if (item.column_name === "l0_name") {
              Object.assign(item, {
                extra: {
                  ...(filteredCountryProduct[0]?.extra || {}),
                  include_in_filter_dependency: true,
                },
              });
            }
          });
        }
        props?.setRCLProductFilterCOnfig(customFilterConfig);
        props?.setRulesCreateLoader(false);
      } catch (error) {
        props?.setRulesCreateLoader(false);
        handleErrorMessage(error, props);
      }
    };
    if (props.selectedRclLevel.length > 0) {
      fetchHeirarchy();
    }
  }, [props?.selectedRclLevel]);

  useEffect(() => {
    if (
      (isEmpty(props?.filterDashboardConfiguration) &&
        !isEmpty(props.rclProductFilterConfig)) ||
      !isEmpty(props.productsLevelDataForBackFlow?.filterConfig) ||
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.filterDashboardData?.length !== props.rclProductFilterConfig?.length
    ) {
      const getFilterValues = async (selected, current) => {
        const isRedirectedFromDifferentStep =
          props.productsLevelDataForBackFlow?.filterConfig?.length > 0;
        let selectedFilters = isRedirectedFromDifferentStep
          ? cloneDeep(props?.productsLevelDataForBackFlow.filterConfig)
          : selected;
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.rclProductFilterConfig),
            appliedFilters: selectedFilters,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          if (response?.data?.show_message) {
            displaySnackMessages(response?.data?.message, "success", props);
          }
          const filterConfigData = [
            {
              filterDashboardData: response,
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "rclProductFilterConfig",
            filterConfigData,
            "RCP Product Filters"
          );
          if (isRedirectedFromDifferentStep) {
            const formattedSelectedFilters = formatSelectedFiltersData(
              filterConfigData,
              "RCP Product Filters",
              selectedFilters
            );
            setFilterDependency(formattedSelectedFilters);
            props.setProductsLevelDataForBackFlow({
              ...props.productsLevelDataForBackFlow,
              filterConfig: [],
            });
          }
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          handleErrorMessage(err, props);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.rclProductFilterConfig,
    props?.selectedRclLevel,
    props.productsLevelDataForBackFlow.filterConfig,
  ]);

  const onFilterUpdate = (
    dependency,
    dimension,
    filter,
    initialFilterElements,
    selectionDependency,
    allDependencies
  ) => {
    let productFilters = cloneDeep(allDependencies).filter(
      (item) => item.dimension === "product"
    );
    props?.setRclSelectedProductLevel(allDependencies);
    if (initialFilterElements?.length === productFilters?.length) {
      props?.isAllFiltersSelectedForRCLProduct(true);
    }
  };

  const handleStoreFiltersToggle = (e) => {
    if (!e.target.checked) {
      let productFilters = cloneDeep(props.selectedRclProductLevel);
      productFilters = productFilters.filter(
        (item) => item.dimension !== "store"
      );
      props.setRclSelectedProductLevel(productFilters);
    }
  };

  const stackedFiltersPanelConfigs = {
    product: {
      toggle: {
        enabled: false,
      },
      icon: ProductFilterIcon,
    },
    store: {
      toggle: {
        enabled: props.disableStoreFilterToggle ? false : true,
        toggleMessage: t("inventorysmart.rclStoreToggleMessage", {
          dimension: dynamicLabelsBasedOnTenant("Store", "core")?.toLowerCase(),
        }),
        infoMessage: t("inventorysmart.rclStoreToggleInfoMessage", {
          dimension: dynamicLabelsBasedOnTenant("Store", "core")?.toLowerCase(),
        }),
        onChange: handleStoreFiltersToggle,
      },
      icon: StoreFilterIcon,
    },
  };

  return (
    <div>
      {!isEmpty(props?.rclProductFilterConfig) && (
        <Loader loader={props.createRulesTableLoader}>
          <CoreComponentScreen
            disableFilterModal={true}
            stackedFiltersPanelConfigs={stackedFiltersPanelConfigs}
            showFilterDashboard={true}
            filterConfigKey="rclProductFilterConfig"
            showChipsOnLoad={true}
            hideSaveFilterSection={true}
            hideFilterActions={true}
            removeFilterAccordian={true}
            updateDependencyHandler={onFilterUpdate}
            hideNoDataFound={true}
            filterDependency={filterDependency}
            preventFilterPreselection={isEmpty(filterDependency) ? true : false}
          />
        </Loader>
      )}
    </div>
  );
};

SelectRclProductLevel.propTypes = {
  filterDashboardConfiguration: PropTypes.any,
  inventorysmartScreenConfig: PropTypes.shape({
    roleBasedAccess: PropTypes.any,
  }),
  rclProductFilterConfig: PropTypes.any,
  savedFilterSelection: PropTypes.any,
  screenName: PropTypes.any,
  selectedRclLevel: PropTypes.any,
  setFilterConfiguration: PropTypes.func,
  setRCLProductFilterCOnfig: PropTypes.func,
  setRclSelectedProductLevel: PropTypes.func,
  setRulesCreateLoader: PropTypes.func,
  tenantFilterUamConfig: PropTypes.any,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    selectedRclLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclLevel,
    rclProductFilterConfig:
      inventorysmartReducer?.rulesConstraintsReducer?.rclProductFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration["rclProductFilterConfig"],
    savedFilterSelection: filterReducer.savedFilterSelection,
    selectedRclProductLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclProductLevel,
    productsLevelDataForBackFlow:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.productsLevelDataForBackFlow,
    selectedRclForAddHierarchies:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.selectedRclForAddHierarchies,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    createRulesTableLoader:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesTableLoader,
    rclList: inventorysmartReducer.rulesConstraintsReducer.rclList,
    defaultFilters:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs
        ?.default_filters,
    disableStoreFilterToggle:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs
        ?.disableStoreFilterToggle,
    createRulesConfigs:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    setRulesCreateLoader: (payload) => dispatch(setRulesTableLoader(payload)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setRCLProductFilterCOnfig: (payload) =>
      dispatch(setRCLProductFilterCOnfig(payload)),
    setRclSelectedProductLevel: (payload) =>
      dispatch(setRclSelectedProductLevel(payload)),
    setRclSelectedLevel: (payload) => dispatch(setRclSelectedLevel(payload)),
    isAllFiltersSelectedForRCLProduct: (payload) =>
      dispatch(isAllFiltersSelectedForRCLProduct(payload)),
    setActiveRclStep: (payload) => dispatch(setActiveRclStep(payload)),
    getOmsRulesConstraintsFilterConfiguration: () =>
      dispatch(getOmsRulesConstraintsFilterConfiguration()),
    setProductsLevelDataForBackFlow: (payload) =>
      dispatch(setProductsLevelDataForBackFlow(payload)),
    setHierarchyList: (payload) => dispatch(setHierarchyList(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SelectRclProductLevel);
