import PropTypes from "prop-types";
import React, { useEffect, useState, useRef } from "react";
import { Paper } from "@mui/material";
import InfoBanner from "./InfoBanner";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "actions/filterAction";
import { Alert } from 'impact-ui-v3';
import { connect } from "react-redux";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "actions/tableColumnActions";
import { wrapColumnsWithEmptyCell } from "../Constraints/landing-screen/constraintsCommonUtils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  getProductListData,
  setAddExceptionStoreFilterConfig,
  setExceptionStoreFilterConfig,
  setExceptionStoreListFilters,
  setExceptionTableLoader,
  setFiltersForExceptionProdStores,
  setSelectedProductList,
  setSelectedStoreList,
  setProductListBackFlowData,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { cloneDeep, filter, isEmpty, isUndefined, isEqual } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { handleErrorMessage } from "../Constraints/Rules-Constraints/add-rcl-component";
import { getCreateNewRuleTableName } from "../Constraints/create-new-rule-flow/createNewRuleFlowSession";


const ProductListForException = (props) => {
  const [filterDependency, setFilterDependency] = useState([]);
  const [productListColumns, setProductListColumns] = useState([]);
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const [unmount, setUnmount] = useState(false);
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const onFilterDependency = useRef([]);
  const agGridInstance = useRef(null);
  const rclFiltersApplied = useRef(false);

  const renderInfoBanner = () => {
    if (!showInfoBanner || !props.isRedirectionFromCreateRclEnabled) return null;
    return ( 
      <Alert
        title="Exceptions will only be created for selected products. Uncheck any that don't need store-level overrides."
        onClose={() => setShowInfoBanner(false)}
        severity="info"
        subtleBackground={true}
      />
    );
  };

  useEffect(() => {
    const onLoad = async () => {
      let exception_product_columns = await getColumnsAg(
        "table_name=exception_screen_product_columns"
      )();
      if (props.isRedirectionFromCreateRclEnabled) {
        wrapColumnsWithEmptyCell(exception_product_columns);
      }
      setProductListColumns(exception_product_columns);
      const getInitialFilterConfiguration = async () => {
        try {
          let response = await fetchFilterConfig(
            "Add Exception Products Filter"
          );
          props?.setExceptionStoreFilterConfig(response);
        } catch (e) {
          handleErrorMessage(e, props);
        }
      };
      getInitialFilterConfiguration();
      props?.setSelectedStoreList([]);
      props?.setAddExceptionStoreFilterConfig([]);
      props?.setExceptionStoreListFilters([]);
    };
    onLoad();
    return () => {};
  }, []);

  useEffect(() => {
    if (props.isRedirectionFromCreateRclEnabled && !rclFiltersApplied.current) {
      props.setExceptionTableLoader(true);
      const productFilters = props.rclFilterSelections.filter((item) => item.dimension === "product");
      onFilterDependency.current = productFilters;
      setOnFilterReqBody(productFilters);
      //this isSelectAllRecords helps in pre-selection of all the fetched Products-list in step-1 and only select when it has not been selected before 
      if (!props.selectedProductList?.isSelectAllRecords && !(props.selectedProductList?.length > 0)) {
        props.setSelectedProductList({ isSelectAllRecords: true, deSelections: [] });
      }
      rclFiltersApplied.current = true;
      return;
    }
    if (
      (isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.productExceptionFilterConfig)) ||
      !isEmpty(props?.filtersOfExceptionProdStores?.filters)
    ) {
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.productExceptionFilterConfig, props.savedFilterSelection]);

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
    if (props.productListBackFlowData?.selectedProductList?.length > 0) {
      props.setSelectedProductList(
        cloneDeep(props.productListBackFlowData.selectedProductList)
      );
      props.setProductListBackFlowData({
        ...props.productListBackFlowData,
        selectedProductList: [],
      });
    } else if(props.productListBackFlowData?.selectedProductList?.isSelectAllRecords) {
      props.setSelectedProductList({
        isSelectAllRecords: true,
        deSelections: props.productListBackFlowData?.selectedProductList?.deSelections || []
    })
    } else {
      props.setSelectedProductList([]);
    }
    applyFilters(dependencyData, filterData);
  };

  const getPreviousSelectedNode = (params) => {
    if (props?.selectedProductList?.isSelectAllRecords) {
      const { deSelections } = props?.selectedProductList;
      agGridInstance?.current?.api?.rowModel?.forEachNode((node) => {
        !deSelections?.includes(node?.data?.rule_code) && node?.setSelected(true);
      });
    } else {
      agGridInstance?.current?.api?.rowModel?.forEachNode((node) => {
        if (props?.selectedProductList?.indexOf(node?.data?.rule_code) > -1) {
          node?.setSelected(true);
        }
      });
    }
  };

  const getFilterValues = async (selected, current) => {
    let selectedFilters = props?.filtersOfExceptionProdStores?.filters
      ? props?.filtersOfExceptionProdStores?.filters
      : props.savedFilterSelection;
    try {
      let requiredFilterObjParams = {
        allFilters: cloneDeep(props.productExceptionFilterConfig),
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
      const filterConfig = formattedFilterConfiguration(
        "productExceptionFilterConfig",
        filterConfigData,
        "Exception Product Filter Dashboard"
      );
      onFilterDependency.current = selectedFilters;
      const formattedSelectedFilters = formatSelectedFiltersData(
        filterConfigData,
        "Exception Product Filter Dashboard",
        selectedFilters
      );
      setFilterDependency(formattedSelectedFilters);
      props.setFilterConfiguration(filterConfig);
    } catch (err) {
      handleErrorMessage(err, props);
    }
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setExceptionTableLoader(true);
    setOnFilterReqBody(_filterElements);
    props.setExceptionTableLoader(false);
  };

  const onSelectionChanged = () => {
    if (agGridInstance?.current?.api?.isSelectAllRecords) {
      let deSelections = agGridInstance?.current?.api
        ?.getRenderedNodes()
        ?.filter((node) => !node.selected)?.map((node) => node.data?.rule_code);
      props?.setSelectedProductList({
        isSelectAllRecords: agGridInstance?.current?.api?.isSelectAllRecords,
        deSelections
      });
    } else {
      let selectedRows = [];
      agGridInstance?.current?.api?.forEachNode((node) => {
        node.selected && selectedRows.push(node.data?.rule_code);
      });
      props?.setSelectedProductList(selectedRows);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const manualCallFetchExceptionProductList = async (
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
              .map((item) => item.rule_code),
          },
        ],
        unique_columns: ["rule_code"],
      },
    };
    if (props.isRedirectionFromCreateRclEnabled) {
      //temp table from create rcl flow to not allow default rule in response
      const tableName = getCreateNewRuleTableName();
      if (tableName) {
        body.table_name = tableName;
      }
    }
    if (props.ruleGroupRuleList?.length) {
      body.rule_list = props.ruleGroupRuleList;
      body.table_name = props.ruleGroupTableName ?? "";
    }
    props.setFiltersForExceptionProdStores(body);
    try {
      let response = await getProductListData(body);
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
    } catch (e) {
      props.setExceptionTableLoader(false);
      handleErrorMessage(e, props);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  useEffect(() => {
    if (props.renderFiltersInParent && props.onFilterHandlerReady) {
      props.onFilterHandlerReady(onFilterDashboardClick);
    }
  }, [props.renderFiltersInParent]);

  useEffect(() => {
    if (props.renderFiltersInParent && props.onFilterDependencyChange) {
      props.onFilterDependencyChange(filterDependency);
    }
  }, [filterDependency, props.renderFiltersInParent]);

  return (
    <div>
      {!props.renderFiltersInParent && (
        <CoreComponentScreen
          showChipsOnLoad={true}
          showFilterDashboard={true}
          filterConfigKey={"productExceptionFilterConfig"}
          onApplyFilter={onFilterDashboardClick}
          hideNoDataFound={
            isEmpty(props?.filtersOfExceptionProdStores?.filters) ? false : true
          }
          filterDependency={filterDependency}
        />
      )}
      <Loader loader={props.exceptionLoader} minHeight={"500px"}>
        {!isEmpty(onFilterDependency.current) && !unmount && (
          <AgGridComponent
            columns={productListColumns}
            selectAllHeaderComponent={true}
            loadTableInstance={loadTableInstance}
            manualCallBack={manualCallFetchExceptionProductList}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSize || 10}
            paginationPageSize={props.pageSize}
            onSelectionChanged={onSelectionChanged}
            callOnModelUpdated={(params) => getPreviousSelectedNode(params)}
            disablePaginationForSinglePage={true}
            uniqueRowId={"rule_code"}
            topCenterOptions={renderInfoBanner()}
            tableHeader={
              props.showNewConstraintFlow ? "Review Products" : undefined
            }
          />
        )}
      </Loader>
    </div>
  );
};

ProductListForException.propTypes = {
  filterDashboardConfiguration: PropTypes.any,
  filtersOfExceptionProdStores: PropTypes.shape({
    filters: PropTypes.any,
  }),
  getProductListData: PropTypes.func,
  history: PropTypes.shape({
    push: PropTypes.func,
  }),
  inventorysmartScreenConfig: PropTypes.shape({
    roleBasedAccess: PropTypes.any,
  }),
  productExceptionFilterConfig: PropTypes.any,
  savedFilterSelection: PropTypes.any,
  screenName: PropTypes.any,
  selectedProductList: PropTypes.shape({
    indexOf: PropTypes.func,
    isSelectAllRecords: PropTypes.any,
  }),
  setActiveSteps: PropTypes.func,
  setAddExceptionStoreFilterConfig: PropTypes.func,
  setExceptionStoreFilterConfig: PropTypes.func,
  setExceptionStoreListFilters: PropTypes.func,
  setExceptionTableLoader: PropTypes.func,
  setFilterConfiguration: PropTypes.func,
  setFiltersForExceptionProdStores: PropTypes.func,
  setProductTableData: PropTypes.func,
  setSelectedProductList: PropTypes.func,
  setSelectedStoreList: PropTypes.func,
  tenantFilterUamConfig: PropTypes.any,
  renderFiltersInParent: PropTypes.bool,
  onFilterDependencyChange: PropTypes.func,
  onFilterHandlerReady: PropTypes.func,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    productExceptionFilterConfig:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.productExceptionFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "productExceptionFilterConfig"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    productListExceptions:
      inventorysmartReducer.exceptionConstraintsReducer.productListExceptions,
    filtersOfExceptionProdStores:
      inventorysmartReducer.exceptionConstraintsReducer
        .filtersOfExceptionProdStores,
    exceptionLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionLoader,
    selectedProductList:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.selectedProductList,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    productListBackFlowData:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.productListBackFlowData,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setExceptionStoreFilterConfig: (body) =>
      dispatch(setExceptionStoreFilterConfig(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
    getProductListData: (body) => dispatch(getProductListData(body)),
    setSelectedProductList: (body) => dispatch(setSelectedProductList(body)),
    setFiltersForExceptionProdStores: (body) =>
      dispatch(setFiltersForExceptionProdStores(body)),
    setSelectedStoreList: (body) => dispatch(setSelectedStoreList(body)),
    setAddExceptionStoreFilterConfig: (body) =>
      dispatch(setAddExceptionStoreFilterConfig(body)),
    setExceptionStoreListFilters: (filtersSelected) =>
      dispatch(setExceptionStoreListFilters(filtersSelected)),
    setProductListBackFlowData: (body) =>
      dispatch(setProductListBackFlowData(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductListForException);
