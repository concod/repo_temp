import React, { useState, useRef, useEffect } from "react";
import AgGridComponent from "core/Utils/agGrid";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Loader from "core/Utils/Loader/loader";
import { useExceptionStyles } from "./exceptionStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import { isEmpty, cloneDeep } from "lodash";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  getStoreListData,
  setAddExceptionStoreFilterConfig,
  setExceptionStoreListFilters,
  setExceptionTableLoader,
  setSelectedStoreList,
  setStoreListBackFlowData,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../inventorysmart-utility";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { wrapColumnsWithEmptyCell } from "../Constraints/landing-screen/constraintsCommonUtils";
import { handleErrorMessage } from "../Constraints/Rules-Constraints/add-rcl-component";
import InfoBanner from "./InfoBanner";

/**
 * CoreComponentScreen's updateFilterDimension converts filter dimensions using extra.dimension
 * for cross-filter cascading (e.g., "store" → "product_store"). Since the table data API
 * expects the original dimension, this function reverts them back.
 *
 * Note: In SelectProduct.jsx (create-new-rule flow), the updateDependencyHandler callback
 * returns allDependencies with the original dimension ("store") — no revert is needed there.
 * Here in exception-store-listing, the onApplyFilter callback fires AFTER updateFilterDimension
 * has already transformed the dimension, so we must revert it before passing to the table API.
 */
const revertCrossFilterDimensions = (filters) => {
  if (!filters?.length) return filters;
  return filters.map((filter) =>
    filter.dimension === "product_store"
      ? { ...filter, dimension: "store" }
      : filter
  );
};

const applyRclFilterPreSelections = (filterDashboardData, rclFilterSelections, dimension) => {
  if (!filterDashboardData || !rclFilterSelections?.length) return;
  const rclFiltersForDimension = rclFilterSelections.filter((item) => item.dimension === dimension);
  filterDashboardData.forEach((filterItem) => {
    const matchedRclFilter = rclFiltersForDimension.find(
      (rclFilter) => rclFilter.attribute_name === filterItem.column_name
    );
    if (matchedRclFilter) {
      filterItem.initialData = matchedRclFilter.values.map((val) => ({
        value: val,
        label: val,
        id: val,
        isDisabled: true,
      }));
      filterItem.extra = { ...filterItem.extra, preserveInitialData: true };
    }
  });
};

const StoreListForException = (props) => {
  const [filterDependency, setFilterDependency] = useState([]);
  const [storeListColumns, setStoreListColumns] = useState([]);
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const [unmount, setUnmount] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const useStyles = useExceptionStyles();
  const agGridInstance = useRef(null);
  const onFilterDependency = useRef([]);

  // Empties only the buffered selection; the reducer replaces the whole object, hence the spread.
  const clearBufferedStoreSelection = () => {
    if (isEmpty(props.storeListBackFlowData?.selectedStoreList)) return;
    props.setStoreListBackFlowData({
      ...props.storeListBackFlowData,
      selectedStoreList: [],
    });
  };

  const renderInfoBanner = () => {
    if (!showInfoBanner || !props.isRedirectionFromCreateRclEnabled) return null;
    return (
      <InfoBanner
        message="Select different stores to override base constraints"
        onClose={() => setShowInfoBanner(false)}
      />
    );
  };

  useEffect(() => {
    const onLoad = async () => {
      let storeConstraintColDef = await getColumnsAg(
        "table_name=exception_store_list_columns"
      )();
      if (props.isRedirectionFromCreateRclEnabled) {
        wrapColumnsWithEmptyCell(storeConstraintColDef);
      }
      setStoreListColumns(storeConstraintColDef);

      const getInitialFilterConfiguration = async () => {
        try {
          let response = await fetchFilterConfig("Add Exception Store Filter");
          props?.setAddExceptionStoreFilterConfig(response);
        } catch (e) {
          handleErrorMessage(e, props);
        }
      };
      getInitialFilterConfiguration();
    };
    onLoad();
    return () => {
      //reset the filterDashboardConfiguration sent to CoreComponent so that filters are cleared when component unmounts and new cross filters can be triggered on new mount
      props.setFilterConfiguration({ addExceptionStoreFilterConfig: {} });
    };
  }, []);

  // The grid clears selectedStoreList on unmount, so a selection made before moving forward survives
  // only in the back-flow buffer. Restore it (array or { isSelectAllRecords, deSelections }) once on
  // re-entry and consume the buffer, so a later filter change starts with an empty selection.
  useEffect(() => {
    const bufferedSelection = props.storeListBackFlowData?.selectedStoreList;
    if (isEmpty(bufferedSelection)) return;
    props.setSelectedStoreList(cloneDeep(bufferedSelection));
    clearBufferedStoreSelection();
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props.addExceptionStoreFilterConfig) ||
      !isEmpty(props?.filtersOfExceptionStoreList?.filters)
    ) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.addExceptionStoreFilterConfig]);

  useEffect(() => {
    if (!isEmpty(props?.filtersOfExceptionStoreList?.filters)) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.savedFilterSelection]);

  useEffect(() => {
    if (!isEmpty(onFilterReqBody)) {
      onFilterDependency.current = onFilterReqBody;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      setUnmount(true);
    } else {
      onFilterDependency.current = {};
    }
  }, [onFilterReqBody]);

  useEffect(() => {
    if (unmount) setUnmount(false);
  }, [unmount]);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    // New filters fetch a different store list: drop the old selection (and its buffered copy) so
    // footer "Next", which is gated on selectedStoreList, stays disabled until stores are picked.
    props.setSelectedStoreList([]);
    clearBufferedStoreSelection();
    applyFilters(dependencyData || [], filterData);
  };
  const getFilterValues = async (selected, current) => {
    let selectedFilters = props?.filtersOfExceptionStoreList
      ? props?.filtersOfExceptionStoreList?.filters
      : props.savedFilterSelection;
    // Merge RCL store filters with existing filters, avoiding duplicates based on attribute_name
    if (props.isRedirectionFromCreateRclEnabled && props.rclFilterSelections?.length > 0) {
      const rclStoreFilters = props.rclFilterSelections.filter((item) => item.dimension === "store");
      const existingFilters = props?.filtersOfExceptionStoreList?.filters || [];
      const existingAttrNames = existingFilters.map((item) => item.attribute_name);
      const newRclFilters = rclStoreFilters.filter(
        (rclFilter) => !existingAttrNames.includes(rclFilter.attribute_name)
      );
      selectedFilters = [...existingFilters, ...newRclFilters];
    }
    try {
      let requiredFilterObjParams = {
        allFilters: cloneDeep(props.addExceptionStoreFilterConfig),
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      const filterConfigData = [
        {
          filterDashboardData: response,
          expectedFilterDimensions: getFilterDimensions(response),
          isCrossDimensionFilter: true,
          screen_name: props.screenName,
        },
      ];
      // Unmount wipes this config, so re-entry rebuilds it: seed appliedFilterData with the filters
      // already on the table, else the strip loses its chips and "Hide Filter (n)" count.
      const appliedStoreFilters = props?.filtersOfExceptionStoreList?.filters;
      const filterConfig = formattedFilterConfiguration(
        "addExceptionStoreFilterConfig",
        filterConfigData,
        "Add Exception Store filters",
        isEmpty(appliedStoreFilters) ? [] : appliedStoreFilters
      );
      // Pre-select and disable filter options inherited from the create RCL flow so users can't modify them
      if (props.isRedirectionFromCreateRclEnabled && props.rclFilterSelections?.length > 0) {
        applyRclFilterPreSelections(
          filterConfig?.addExceptionStoreFilterConfig?.filterConfig[0]?.filterDashboardData,
          props.rclFilterSelections,
          "store"
        );
      }

      //this change is for so that it the filter do not apply without manual trigger in new exception flow
      if (!props.isRedirectionFromCreateRclEnabled || !isEmpty(props?.filtersOfExceptionStoreList?.filters)) {
        onFilterDependency.current = selectedFilters;
      }
      const formattedSelectedFilters = formatSelectedFiltersData(
        filterConfigData,
        "Add Exception Store filters",
        selectedFilters
      );
      setFilterDependency(formattedSelectedFilters);
      props.setFilterConfiguration(filterConfig);
      if (isEmpty(onFilterDependency.current)) {
        props.setExceptionTableLoader(false);
      }
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  const applyFilters = async (_filterElements, dependency) => {
    const nextFilters = revertCrossFilterDimensions(_filterElements);
    props.setExceptionTableLoader(!isEmpty(nextFilters));
    setOnFilterReqBody(nextFilters);
  };

  const onSelectionChanged = () => {
    if (agGridInstance?.current?.api?.isSelectAllRecords) {
      let deSelections = agGridInstance?.current?.api
        ?.getRenderedNodes()
        ?.filter((node) => !node.selected)?.map((node) => node.data?.store_code);
      props?.setSelectedStoreList({
        isSelectAllRecords: agGridInstance?.current?.api?.isSelectAllRecords,
        deSelections
      });
    } else {
      let selectedRows = [];
      agGridInstance?.current?.api?.forEachNode((node) => {
        node.selected && selectedRows.push(node.data?.store_code);
      });
      props?.setSelectedStoreList(selectedRows);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const manualCallFetchExceptionStoreList = async (
    manualbody,
    pageIndex,
    params
  ) => {
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: isEmpty(onFilterDependency.current)
        ? []
        : onFilterDependency.current,
      selection: {
        data: [
          ...agGridInstance?.current?.api?.checkConfiguration,
          {
            checkedRows: agGridInstance?.current?.api
              .getSelectedRows()
              .map((item) => item.store_code),
          },
        ],
        unique_columns: ["store_code"],
      },
    };
    props?.setExceptionStoreListFilters(body);
    const payloadWithProductsFilter = structuredClone(body);
    const allSelectedFilters = [
      ...props?.filtersOfExceptionProdStores?.filters,
    ];
    const configFilters = allSelectedFilters.filter((filterData) =>
      props.exceptionConfigs?.selectStore?.storeListApiIncludes.includes(
        filterData.filter_id
      )
    );
    payloadWithProductsFilter.filters = [
      ...configFilters,
      ...payloadWithProductsFilter.filters,
    ];
    try {
      let response = await getStoreListData(payloadWithProductsFilter);
      props.setExceptionTableLoader(false);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      }
      let result = cloneDeep(response.data.data);
      let formattedData;
      if (pageIndex) {
        formattedData = agGridRowFormatter(
          result,
          params?.api?.checkConfiguration,
          props.uniqueKey
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = result;
      }
      return {
        data: formattedData,
        totalCount: response.data.total,
      };
    } catch (error) {
      props.setExceptionTableLoader(false);
      handleErrorMessage(error, props);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const getPreviousSelectedNode = (params) => {
    if (props?.selectedStoreList?.isSelectAllRecords) {
      const { deSelections } = props?.selectedStoreList;
      agGridInstance?.current?.api?.rowModel?.forEachNode((node) => {
        !deSelections?.includes(node?.data?.store_code) && node?.setSelected(true);
      });
    } else {
      agGridInstance?.current?.api?.rowModel?.forEachNode((node) => {
        if (props?.selectedStoreList?.indexOf(node?.data?.store_code) > -1) {
          node?.setSelected(true);
        }
      });
    }
  };

  useEffect(() => {
    if (props.renderFiltersInParent && props.onFilterHandlerReady) {
      props.onFilterHandlerReady(onFilterDashboardClick);
    }
  }, [props.renderFiltersInParent]);

  useEffect(() => {
    if (!props.renderFiltersInParent || !props.onFilterDependencyChange) return;
    // filterDependency is empty until getFilterValues fills it, so on re-entry publishing it would
    // blank the pre-selection the parent still holds; skip that first empty value only while filters
    // are applied (a genuinely filter-less step still publishes empty and shows the empty state).
    if (
      isEmpty(filterDependency) &&
      !isEmpty(props?.filtersOfExceptionStoreList?.filters)
    ) {
      return;
    }
    props.onFilterDependencyChange(filterDependency);
  }, [filterDependency, props.renderFiltersInParent]);

  return (
    <div>
      {!props.renderFiltersInParent && (
        <CoreComponentScreen
          showChipsOnLoad={true}
          showFilterDashboard={true}
          filterConfigKey={"addExceptionStoreFilterConfig"}
          onApplyFilter={onFilterDashboardClick}
          filterDependency={filterDependency}
          hideNoDataFound={
            isEmpty(props?.filtersOfExceptionStoreList?.filters) ? false : true
          }
        />
      )}
      {(!isEmpty(onFilterDependency.current) || props.exceptionLoader) && (
        <Loader loader={props.exceptionLoader} minHeight={"500px"}>
          {!isEmpty(onFilterDependency.current) && !unmount && (
            <AgGridComponent
              columns={storeListColumns}
              selectAllHeaderComponent={true}
              loadTableInstance={loadTableInstance}
              manualCallBack={manualCallFetchExceptionStoreList}
              disablePaginationForSinglePage={true}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={props.pageSize || 10}
              paginationPageSize={props.pageSize}
              onSelectionChanged={() => onSelectionChanged()}
              callOnModelUpdated={(params) => getPreviousSelectedNode(params)}
              uniqueRowId={"store_code"}
              topCenterOptions={renderInfoBanner()}
              tableHeader={
                props.showNewConstraintFlow
                  ? "Select Exception Stores"
                  : undefined
              }
            />
          )}
        </Loader>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    savedFilterSelection: filterReducer.savedFilterSelection,
    addExceptionStoreFilterConfig:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.addExceptionStoreFilterConfig,
    constraintsConfigs:
      store.inventorysmartReducer.inventorysmartConstraints?.constraintsConfigs,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "addExceptionStoreFilterConfig"
      ],
    selectedStoreList:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.selectedStoreList,
    filtersOfExceptionProdStores:
      inventorysmartReducer.exceptionConstraintsReducer
        .filtersOfExceptionProdStores,
    exceptionLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionLoader,
    storeTableData:
      inventorysmartReducer?.exceptionConstraintsReducer?.storeTableData,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filtersOfExceptionStoreList:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.filtersOfExceptionStoreList,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    storeListBackFlowData:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.storeListBackFlowData,
    exceptionConfigs:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionConfigs,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setSelectedStoreList: (body) => dispatch(setSelectedStoreList(body)),
    setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
    setAddExceptionStoreFilterConfig: (body) =>
      dispatch(setAddExceptionStoreFilterConfig(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setExceptionStoreListFilters: (filtersSelected) =>
      dispatch(setExceptionStoreListFilters(filtersSelected)),
    setStoreListBackFlowData: (body) =>
      dispatch(setStoreListBackFlowData(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreListForException);
