import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import { isNull, cloneDeep, isEmpty } from "lodash";
import {
  COLUMN_TYPE_MAPPING,
  DC_STORE_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  getRclProductProfileMappings,
  getRclStoreGroupMappings,
  getRclStoreStrategy,
  getAllocations,
  getAutoAllocationScheduler,
  saveMappings,
  setMappingsPopUpLoader,
} from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import { handleErrorMessage } from "./dCStoreStrategyTable";
import { Modal } from "impact-ui-v3"

const useStyles = makeStyles((theme) => ({
  labelPopUp: {
    marginRight: "1.25rem",
    fontWeight: 500,
  },
  dialogPaper: {
    minHeight: "30vh",
    maxHeight: "60vh",
  },
  hideCheckBox: {
    display: "none",
  },
}));

const ProductRulePopUp = ({
  active,
  openModal,
  closeModal,
  filterDependencies,
  popUpColumnData,
  parentData,
  clickedRowData,
  agGridInstance,
  parentNode,
  isSetAllPopUp,
  currentNode,
  setRowData,
  rowData,
  clickedStoreListRowNode,
  clickedStoreListRowData,
  is_intermediary_flow,
  ...props
}) => {
  const classes = useStyles();
  const [popUpType, setPopUpType] = useState("");
  const [storeColumnDefs, setStoreColumnDefs] = useState([]);
  const [colDefs, setColDefs] = useState([]);
  const mappingTableGridInstance = useRef(null);

  const loadTableInstance = (params) => {
    mappingTableGridInstance.current = params;
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      let popUp = COLUMN_TYPE_MAPPING[popUpColumnData?.accessor];
      setPopUpType(popUp);
      props.setMappingsPopUpLoader(true);
      let columns = [];
      let table = "";
      if (popUp === "product") {
        if (clickedRowData.product_profile === "ia-recommended") {
          table = DC_STORE_CONFIG["product"].table.user;
        } else {
          table = DC_STORE_CONFIG["product"].table.user;
        }
      } else {
        table = DC_STORE_CONFIG[popUp].table;
      }
      try {
        columns = await getColumnsAg(`table_name=${table}`)();
        if (columns?.data?.show_message) {
          displaySnackMessages(columns?.data?.message, "success", props);
        }
      } catch (e) {
        handleErrorMessage(e, props);
        props.setMappingsPopUpLoader(false);
        return;
      }

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
    };

    if (active) {
      fetchColumnData();
    }

    return () => { };
  }, [active]);

  const handleUpdateMappings = async () => {
    const {
      selectIdentifier,
      attributeType,
      selectionType,
      attributeName,
      nameIdentifier,
      defaultValue,
      defaultValueKey,
    } = DC_STORE_CONFIG[popUpType];

    if (is_intermediary_flow) {
      let newSelectedValues = [];
      let newSelectedNames = [];
      mappingTableGridInstance.current?.api?.getSelectedNodes().map((node) => {
        newSelectedValues.push(node.data[selectIdentifier]);
        newSelectedNames.push(node.data[nameIdentifier]);
      });
      let old_data = cloneDeep(clickedStoreListRowData)
      old_data['auto_allocation_schedular_name'] = !isEmpty(newSelectedNames) ? newSelectedNames[0] : null
      old_data['auto_allocation_schedular'] = !isEmpty(newSelectedValues) ? newSelectedValues[0] : null
      // This sets the previously store in previoisly opened 
      // table to the selected scheduler.
      clickedStoreListRowNode.setData(old_data)
      closeModal()
      return
    }

    const clickedRowId = clickedRowData.id;
    let selections = null;
    let names = null;
    let newSelectedValues = [];
    let newSelectedNames = [];
    mappingTableGridInstance.current?.api?.getSelectedNodes().map((node) => {
      newSelectedValues.push(node.data[selectIdentifier]);
      newSelectedNames.push(node.data[nameIdentifier]);
    });
    selections =
      selectionType === "multiple"
        ? newSelectedValues
        : !isEmpty(newSelectedValues)
          ? newSelectedValues[0]
          : null;
    names =
      selectionType === "multiple"
        ? newSelectedNames
        : !isEmpty(newSelectedNames)
          ? newSelectedNames[0]
          : null;

    if (isSetAllPopUp) {
      let old_rows = cloneDeep(rowData);
      old_rows.forEach((thisRow) => {
        if (thisRow.id === clickedRowId) {
          thisRow[attributeName] = names;
          thisRow[attributeType] = selections;
          if (popUpType === "store") {
            if (isEmpty(selections)) {
              thisRow[attributeName] = defaultValue;
              thisRow[attributeType] = [];
            }
          } else {
            if (isNull(selections)) {
              thisRow[attributeName] = defaultValue;
              thisRow[attributeType] = null;
            }
          }
        }
      });
      currentNode.setData(old_rows);
      // If set All we updated the rowData which is pop up the set all table data.
      // Main table data would only be updated on saving the set all using the instance of the main table.
      setRowData(old_rows);
    } else {
      let updated_store_details = cloneDeep(parentNode.data.store_details);
      updated_store_details.forEach((thisStore) => {
        if (thisStore.id === clickedRowId) {
          thisStore[attributeName] = names;
          thisStore[attributeType] = selections;
          if (popUpType === "store" || popUpType === "storeName") {
            thisStore["store_store_groups_mapped"] = selections;
            thisStore["store_groups_names"] = names;
            thisStore[attributeType] = selections;
            if (isEmpty(selections)) {
              thisStore["store_store_groups_mapped"] =
                parentData["_default_store_groups_mapped"];
              thisStore["store_groups_names"] =
                parentData["_store_groups_names"];
              thisStore[attributeType] = [];
            }
          } else {
            if (isNull(selections)) {
              thisStore[attributeName] = parentData[defaultValueKey];
              thisStore[attributeType] = null;
            }
          }
        }
      });
      const updated_data = {
        ...parentNode.data,
        store_details: isEmpty(updated_store_details)
          ? null
          : updated_store_details,
        isEdited: true,
      };
      parentNode.setData(updated_data);
      parentNode.group = updated_data;
      parentNode.setExpanded(false);
      // If it is not set all (Normal flow) we update the main table with pop up values.
      //flashing is being removed wrt new design
      // agGridInstance.current.api.flashCells({ rowNodes: [parentNode] });
      parentNode.setExpanded(true);
    }
    closeModal();
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const manualCallBack = async (manualbody, pageIndex) => {
    props.setMappingsPopUpLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: { limit: props.pageSize || 10, page: isNull(pageIndex) ? 1 : pageIndex + 1 }, //checked
      },
    };
    let response = {};
    try {
      if (popUpType === "store" || popUpType === "storeName") {
        let channelObj = null;
        let channel = null;
        let countryObj = null;
        let country = null;
        const store_filters = {}
        if (props?.dc_store_sg_filters) {
          const selectedFilters = props.isManageRclFlow ? filterDependencies.current : filterDependencies.current.filters
          props.dc_store_sg_filters.forEach(item => {
            const filter = selectedFilters?.filter(
              (thisFilter) => {
                return thisFilter.attribute_name === item.attribute_name;
              }
            )?.[0]?.values[0] ?? null;
            filter && (store_filters[item.filter_name] = filter);
          });
        }
        body = {
          ...body,
          store_groups: clickedRowData?.default_store_groups || [],
          store_filters
        };
        response = await props.getRclStoreGroupMappings(body);
      }
      if (popUpType === "product") {
        let type = clickedRowData.product_profile;
        // type = type === "ia-recommended" ? "ia" : "user";
        type = "user";

        // Use DC-Store-Policy-Strategy for both DC and PO flows 
        const screenName = "DC-Store-Policy-Strategy";

        body = {
          ...body,
          filters: !props?.isManageRclFlow
            ? filterDependencies.current.filters || []
            : filterDependencies.current || [],
          type,
          screen_name: screenName,
        };
        response = await props.getRclProductProfileMappings(body);
      }
      if (popUpType === "strategy") {
        body = {
          ...body,
          rule_code: !isSetAllPopUp ? clickedRowData?.dc_store_rule : undefined,
        };
        response = await props.getRclStoreStrategy(body);
      }
      if (popUpType === "allocation") {
        body = {
          ...body,
          rule_code: !isSetAllPopUp ? clickedRowData?.auto_allocation_rule : undefined,
        };
        response = await props.getAllocations(body);
      }
      if (popUpType === "scheduler") {
        let sh_code = undefined
        if (!is_intermediary_flow) {
          sh_code = !isSetAllPopUp ? clickedRowData?.auto_allocation_schedular : undefined
        }
        body = {
          ...body,
          sh_code
        };
        response = await props.getAutoAllocationScheduler(body);
      }
      if (response?.show_message) {
        displaySnackMessages(response?.message, "success");
      }
      props.setMappingsPopUpLoader(false);
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
      props.setMappingsPopUpLoader(false);
      handleErrorMessage(e, props);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const getPreviousSelectedNode = (params) => {
    const {
      selectIdentifier,
      attributeType,
      selectionType,
      attributeName,
    } = DC_STORE_CONFIG[popUpType];
    const clickedRowId = clickedRowData.id;
    if (isSetAllPopUp) {
      params?.api?.forEachNode((node) => {
        if (
          clickedRowData[attributeType] === node?.data?.[selectIdentifier]
        ) {
          node?.setSelected(true);
        }
      });
    } else {
      if (!is_intermediary_flow) {
        params?.api?.forEachNode((node) => {
          if (
            parentData.store_details[clickedRowId][attributeType] ===
            node?.data?.[selectIdentifier]
          ) {
            node?.setSelected(true);
          }
        });
      } else {
        params?.api?.forEachNode((node) => {
          if (
            clickedStoreListRowNode?.data[attributeType] ===
            node?.data?.[selectIdentifier]
          ) {
            node?.setSelected(true);
          }
        });
      }
    }
  };

  return active ? (
    <Modal
      title = {popUpType && DC_STORE_CONFIG[popUpType].label}
      id="productRulePopup"
      open={active}
      size = 'large'
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        closeModal();
      }}
      primaryButtonLabel={"Update Mappings"}
      onPrimaryButtonClick={()=>handleUpdateMappings() }
      secondaryButtonLabel={"Cancel"}
      onSecondaryButtonClick={()=>closeModal()}
    >
        {["store", "storeName"].includes(popUpType) && (
          <Loader loader={props.mappingsPopUpLoader} minHeight={"350px"}>
            {storeColumnDefs?.length > 0 && (
              <>
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
                  uniqueRowId={DC_STORE_CONFIG[popUpType]["selectIdentifier"]}
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
                  disablePaginationForSinglePage
                />
              </>
            )}
          </Loader>
        )}
        {["product", "strategy", "allocation", "scheduler"].includes(
          popUpType
        ) && (
            <Loader loader={props.mappingsPopUpLoader} minHeight={"350px"}>
              {colDefs?.length > 0 && (
                <>
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
                    uniqueRowId={DC_STORE_CONFIG[popUpType]["selectIdentifier"]}
                    selectAllHeaderComponent={true}
                    rowSelection={"single"}
                    sizeColumnsToFitFlag={true}
                    hideHeaderCheckboxComponent={true}
                    callOnModelUpdated={(params) =>
                      getPreviousSelectedNode(params)
                    }
                    wrapCellText
                    autoCellHeight
                    autoHeaderHeight
                    wrapHeaderText
                    disablePaginationForSinglePage
                  />
                </>
              )}
            </Loader>
          )}

    </Modal>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    mappingsPopUpLoader:
      store.inventorysmartReducer.dcStoreStrategyReducer.mappingsPopUpLoader,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    filterReducer: store.filterReducer,
    editedRows: store.inventorysmartReducer?.dcStoreStrategyReducer?.editedRows,
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
  saveMappings: (body) => dispatch(saveMappings(body)),
  getRclStoreGroupMappings: (data) => dispatch(getRclStoreGroupMappings(data)),
  getRclProductProfileMappings: (data) =>
    dispatch(getRclProductProfileMappings(data)),
  getRclStoreStrategy: (data) => dispatch(getRclStoreStrategy(data)),
  getAllocations: (data) => dispatch(getAllocations(data)),
  getAutoAllocationScheduler: (data) =>
    dispatch(getAutoAllocationScheduler(data)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductRulePopUp);
