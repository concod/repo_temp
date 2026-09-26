import React from "react";
import { connect } from "react-redux";
import { isEmpty, cloneDeep } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import { getSelectProductFilterConfiguration } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import {
  setProductsLevelDataForBackFlow,
  setRclSelectedProductLevel,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import ProductFilterIcon from "assets/IS_icons/productFilterIcon.png";
import StoreFilterIcon from "assets/IS_icons/storeFilterIcon.png";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  CREATE_NEW_RULE_FILTER_CONFIG_KEY,
  isStoreLikeApiDimension,
} from "./createNewRuleFilterUtils";
import { useCreateNewRuleProductFilters } from "./useCreateNewRuleProductFilters";

const SelectProductView = (props) => {
  const {
    screenName,
    inventorysmartScreenConfig,
    tenantFilterUamConfig,
    createRulesConfigs,
    filterDashboardConfiguration,
    savedFilterSelection,
    setFilterConfiguration: setFilterConfig,
    getSelectProductFilterConfiguration: fetchSelectProductFilterConfig,
    setRclSelectedProductLevel: setSelectedProductLevel,
    addSnack: dispatchSnack,
    onMandatorySatisfactionChange,
    productsLevelDataForBackFlow,
    setProductsLevelDataForBackFlow,
    selectedRclProductLevel,
  } = props;

  const { loading, filterFieldConfig, filterDependency } =
    useCreateNewRuleProductFilters({
      screenName,
      createRulesConfigs,
      inventorysmartScreenConfig,
      tenantFilterUamConfig,
      filterDashboardConfiguration,
      savedFilterSelection,
      productsLevelDataForBackFlow,
      selectedRclProductLevel,
      fetchSelectProductFilterConfig,
      setFilterConfig,
      setProductsLevelDataForBackFlow,
      dispatchSnack,
      onMandatorySatisfactionChange,
    });

  const onFilterUpdate = (
    _dependency,
    _dimension,
    _filter,
    _initialFilterElements,
    _selectionDependency,
    allDependencies
  ) => {
    setSelectedProductLevel(allDependencies);
  };

  const handleStoreFiltersToggle = (e) => {
    if (!e.target.checked) {
      let next = cloneDeep(selectedRclProductLevel || []);
      next = next.filter((item) => !isStoreLikeApiDimension(item.dimension));
      setSelectedProductLevel(next);
    }
  };

  const storeStackedPanel = {
    toggle: {
      enabled: createRulesConfigs?.disableStoreFilterToggle ? false : true,
      toggleMessage:
        `Do you want to create the constraints varying by ${dynamicLabelsBasedOnTenant("Store", "core")?.toLowerCase()} dimensions?`,
      infoMessage: `By default all ${dynamicLabelsBasedOnTenant("Store", "core")?.toLowerCase()} dimensions will be selected`,
      onChange: handleStoreFiltersToggle,
    },
    icon: StoreFilterIcon,
  };

  const stackedFiltersPanelConfigs = {
    product: {
      toggle: { enabled: false },
      icon: ProductFilterIcon,
    },
    store: storeStackedPanel,
    product_store: storeStackedPanel,
  };

  return (
    <Loader minHeight={500} loader={loading}>
      {!isEmpty(filterFieldConfig) && (
        <CoreComponentScreen
          disableFilterModal={true}
          stackedFiltersPanelConfigs={stackedFiltersPanelConfigs}
          showFilterDashboard={true}
          filterConfigKey={CREATE_NEW_RULE_FILTER_CONFIG_KEY}
          showChipsOnLoad={true}
          hideSaveFilterSection={true}
          hideFilterActions={true}
          removeFilterAccordian={true}
          updateDependencyHandler={onFilterUpdate}
          hideNoDataFound={true}
          filterDependency={filterDependency}
          preventFilterPreselection={isEmpty(filterDependency) ? true : false}
        />
      )}
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        CREATE_NEW_RULE_FILTER_CONFIG_KEY
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    createRulesConfigs:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs,
    selectedRclProductLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclProductLevel,
    productsLevelDataForBackFlow:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.productsLevelDataForBackFlow,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        ?.filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setFilterConfiguration: (payload) => dispatch(setFilterConfiguration(payload)),
  getSelectProductFilterConfiguration: (screen) =>
    dispatch(getSelectProductFilterConfiguration(screen)),
  setRclSelectedProductLevel: (payload) =>
    dispatch(setRclSelectedProductLevel(payload)),
  setProductsLevelDataForBackFlow: (payload) =>
    dispatch(setProductsLevelDataForBackFlow(payload)),
});

export const SelectProduct = connect(
  mapStateToProps,
  mapDispatchToProps
)(SelectProductView);
