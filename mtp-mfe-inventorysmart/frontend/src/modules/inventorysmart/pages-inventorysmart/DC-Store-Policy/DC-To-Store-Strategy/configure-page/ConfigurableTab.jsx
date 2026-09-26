import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty, cloneDeep, isNull } from "lodash";
import {
  COLUMN_TYPE_MAPPING,
  DC_STORE_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  getRclStoreGroupMappings,
  getRclProductProfileMappings,
  getRclStoreStrategy,
  getAllocations,
  getAutoAllocationScheduler,
  setMappingsPopUpLoader,
} from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import { handleErrorMessage } from "../dCStoreStrategyTable";

const useStyles = makeStyles((theme) => ({
  tabContainer: {
    minHeight: "400px",
  }
}));

const ConfigurableTab = ({
  tabKey,
  tabName,
  ruleCode,
  filterDependencies,
  preselectedItem,
  onSelectionChange,
  ...props
}) => {
  const classes = useStyles();
  const [colDefs, setColDefs] = useState([]);
  const [storeColumnDefs, setStoreColumnDefs] = useState([]);
  const [loading, setLoading] = useState(false);
  // tabType is derived directly from tabKey — no internal mapping needed
  const tabType = tabKey || "";
  const mappingTableGridInstance = useRef(null);
  const loadTableInstance = (params) => {
    mappingTableGridInstance.current = params;
  };
  useEffect(() => {
    const fetchColumnData = async () => {
      setLoading(true);
      let columns = [];
      let table = "";

      if (tabType === "product") {
        table = DC_STORE_CONFIG["product"].table.user;
      } else {
        table = DC_STORE_CONFIG[tabType]?.table;
      }

      if (!table) {
        setLoading(false);
        return;
      }

      try {
        columns = await getColumnsAg(`table_name=${table}`)();
        if (columns?.data?.show_message) {
          displaySnackMessages(columns?.data?.message, "success", props);
        }
      } catch (e) {
        handleErrorMessage(e, props);
        setLoading(false);
        return;
      }

      // Special handling for store groups tree structure
      if (table === "store_store_groups") {
        columns = columns.map((item) => {
          if (item.column_name === "sg_code") {
            item.cellRenderer = "agGroupCellRenderer";
          }
          return item;
        });
        setStoreColumnDefs(columns);
      }

      setColDefs(columns);
      setLoading(false);
    };

    fetchColumnData();
  }, [tabType]);

  useEffect(() => {
  if (preselectedItem && mappingTableGridInstance.current && tabType !== "store") {
    // Manually trigger preselection when preselectedItem changes
    getPreviousSelectedNode(mappingTableGridInstance.current);
  }
}, [preselectedItem]);

  const manualCallBack = async (manualbody, pageIndex) => {
    setLoading(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
    };

    let response = {};
    try {
      if (tabType === "store") {
        const store_filters = {}
        
        if (props?.dc_store_sg_filters) {
          props.dc_store_sg_filters.forEach(item => {
            const filter = filterDependencies?.current?.filters?.filter(
              (thisFilter) => {
                return thisFilter.attribute_name === item.attribute_name;
              }
            )?.[0]?.values[0] ?? null;
            filter && (store_filters[item.filter_name] = filter);
          });
        }
        
        body = {
          ...body,
          store_groups: preselectedItem?.parentData?.default_store_groups ||[],
          store_filters,
        };
        response = await props.getRclStoreGroupMappings(body);
      }
      
      if (tabType === "product") {
        const type = "user";
        const screenName = "DC-Store-Policy-Strategy";

        const filters = props?.isManageRclFlow
          ? props?.selectedRclProductLevel || []
          : filterDependencies?.selectedFilters?.["dc-store-policy-strategy-product-0"] || [];
        // const filters = filterDependencies?.selectedFilters?.["dc-store-policy-strategy-product-0"] || []; 

        body = {
          ...body,
          filters,
          type,
          screen_name: screenName,
        };
        response = await props.getRclProductProfileMappings(body);
      }
      
      if (tabType === "strategy") {
        body = {
          ...body,
          rule_code: ruleCode,
        };
        response = await props.getRclStoreStrategy(body);
      }
      
      if (tabType === "allocation") {
        body = {
          ...body,
          rule_code: ruleCode,
        };
        response = await props.getAllocations(body);
      }
      
      if (tabType === "scheduler") {
        body = {
          ...body,
          sh_code: ruleCode,
        };
        response = await props.getAutoAllocationScheduler(body);
      }
      
      if (response?.show_message) {
        displaySnackMessages(response?.message, "success");
      }
      setLoading(false);
      
      if (!response.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      }

      let result = cloneDeep(response.data);
      return {
        data: result,
        totalCount: response?.total,
      };
    } catch (e) {
      setLoading(false);
      handleErrorMessage(e, props);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getPreviousSelectedNode = (params) => {
    const {
      selectIdentifier,
      attributeType,
    } = DC_STORE_CONFIG[tabType];
    
    // Only preselect if we have a specific item to select
    if (preselectedItem && preselectedItem.fieldValue) {
      params?.api?.forEachNode((node) => {
        if (preselectedItem?.parentData?.[attributeType] === node?.data?.[selectIdentifier]) {
          node?.setSelected(true);
        }
        else{
          node?.setSelected(false);
        }
      });
    }
  };

  const handleSelectionChanged = (params) => {
    const {
      selectIdentifier,
      nameIdentifier,
      attributeType,
      attributeName,
      selectionType,
      defaultValue
    } = DC_STORE_CONFIG[tabType];

    const selectedNodes = params.api.getSelectedNodes();
    let newSelectedValues = [];
    let newSelectedNames = [];
    
    selectedNodes.forEach((node) => {
      newSelectedValues.push(node.data[selectIdentifier]);
      newSelectedNames.push(node.data[nameIdentifier]);
    });

    const selections = selectionType === "multiple"
      ? newSelectedValues
      : newSelectedValues.length > 0 ? newSelectedValues[0] : defaultValue;
    const names = selectionType === "multiple"
      ? newSelectedNames
      : newSelectedNames.length > 0 ? newSelectedNames[0] : defaultValue;
    if (onSelectionChange && preselectedItem) {
      onSelectionChange({
        tabType,
        attributeName,
        attributeType,
        selections,
        names,
        preselectedItem
      });
    }
  };

  return (
    <div className={classes.tabContainer}>
      <Loader loader={loading} minHeight={"350px"}>
        {tabType === "store" && storeColumnDefs?.length > 0 && (
          <AgGridComponent
            childKey={"stores"}
            hideSelectAllRecords={false}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            selectAllHeaderComponent={true}
            treeData={true}
            cacheBlockSize={props.pageSize || 10}
            paginationPageSize={props.pageSize}
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallBack(body, pageIndex)
            }
            columns={storeColumnDefs}
            groupDisplayType={"custom"}
            sizeColumnsToFitFlag={true}
            onGridChanged
            onRowSelected
            uniqueRowId={DC_STORE_CONFIG[tabType]["selectIdentifier"]}
            onSelectionChanged={handleSelectionChanged}
            hideChildSelection={true}
            purgeClosedRowNodes={true}
            suppressAggFuncInHeader={true}
            suppressClickEdit={true}
            rowSelection="multiple"
            disableSelectionOnSelectAll={true}
            wrapCellText
            autoCellHeight
            autoHeaderHeight
            wrapHeaderText
          />
        )}
        
        {["product", "strategy", "allocation", "scheduler"].includes(tabType) && colDefs?.length > 0 && (
          <AgGridComponent
            loadTableInstance={loadTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallBack(body, pageIndex)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSize || 10}
            paginationPageSize={props.pageSize}
            columns={colDefs}
            uniqueRowId={DC_STORE_CONFIG[tabType]["selectIdentifier"]}
            selectAllHeaderComponent={true}
            rowSelection={"single"}
            onSelectionChanged={handleSelectionChanged}
            sizeColumnsToFitFlag={true}
            hideHeaderCheckboxComponent={true}
            callOnModelUpdated={(params) =>
              getPreviousSelectedNode(params)
            }
            wrapCellText
            autoCellHeight
            autoHeaderHeight
            wrapHeaderText
          />
        )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    mappingsPopUpLoader:
      store.inventorysmartReducer.dcStoreStrategyReducer.mappingsPopUpLoader,
    selectedRclLevel:
      store.inventorysmartReducer?.rulesConstraintsReducer?.selectedRclLevel,
    selectedRclProductLevel:
      store.inventorysmartReducer?.rulesConstraintsReducer?.selectedRclProductLevel,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    filterReducer: store.filterReducer,
    dc_store_sg_filters:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.drillDown?.dc_store_sg_filters,
    pageSize: store.inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setMappingsPopUpLoader: (payload) =>
    dispatch(setMappingsPopUpLoader(payload)),
  getRclStoreGroupMappings: (data) => dispatch(getRclStoreGroupMappings(data)),
  getRclProductProfileMappings: (data) =>
    dispatch(getRclProductProfileMappings(data)),
  getRclStoreStrategy: (data) => dispatch(getRclStoreStrategy(data)),
  getAllocations: (data) => dispatch(getAllocations(data)),
  getAutoAllocationScheduler: (data) =>
    dispatch(getAutoAllocationScheduler(data)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ConfigurableTab);