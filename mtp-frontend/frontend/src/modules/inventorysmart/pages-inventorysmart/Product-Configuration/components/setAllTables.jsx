import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import {
  Button,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  BLANK_LIST,
  ERROR_MESSAGE,
  NO_DATA_FOUND,
  POP_UP_TYPE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import LoadingOverlay from "core/Utils/Loader/loader";
import ReactSelect from "../../../../../core/Utils/select";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import { addSnack } from "core/actions/snackbarActions";

import {
  getProductRuleDcMappedTableData,
  getProductRulePOPUPTableData,
  getProductRuleStoreGroupTableData,
  getRuleHeaderConfiguration,
  saveProductRuleSetAllTableData,
  setProductRulePopUpLoader,
  setSavePayloadForPopUp,
  setSelectedStoreGroupDataPopUp,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";

import { getUserCreatedTableData } from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { getObjectsAfterCheckAll } from "../../StoreInventoryAlerts/components/AlertsActionPopup";
import { forEach, isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  fetchSetAllSKUCount,
  setAllTableData,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { UPDATE_CROSS_COUNTRY_ALLOCATION_SET_ALL } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { getAllocationRules } from "modules/inventorysmart/services-inventorysmart/Auto-Allocation-Rules/auto-allocation-rules-service";
import { APPROVAL_TYPE_OPTIONS } from "../../Auto-Allocation-Rules/autoAllocationConstant";
import { PRODUCT_RULE_ALLOCATION_TYPE } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

const useStyles = makeStyles((theme) => ({
  btn: {
    marginRight: "1rem",
  },
  actionBtn: {
    padding: "1rem",
    display: "flex",
    justifyContent: "flex-end",
  },
  selectedGroup: {
    display: "flex",
    margin: "1rem",
    alignItems: "center",
  },
  hideCheckBox: {
    display: "none",
  },
}));
const ProductRulePopUp = ({
  active,
  _openModal,
  closeModal,
  _filters,
  popUpColumnData,
  ...props
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [productDCMappingDefault, setProductDCMappingDefault] = useState([]);
  const [dcAndProductColumn, setDcAndProductColumn] = useState([]);
  const [productDCMappingRowData, setProductDCMappingRowData] = useState([]);
  const [agGridInstance, setSetGridInstance] = useState({});
  const [popUpType, setPopUpType] = useState("");
  const offsetValues = useRef({});
  const mappingTableGridInstance = useRef(null);
  const [columnDefs, setColumnDefs] = useState([]);
  const [selectedGroupsValue, setSelectedGroupsValue] = useState("");
  const [confirmSetAll, setConfirmSetAll] = useState(false);
  const [saveJobId, setJobId] = useState("");
  const [displaySetAllSKUCount, setDisplaySetAllSKUCount] = useState(0);
  const [crossCountryData, setCrossCountryData] = useState({})
  const schedulerMappingRef = useRef(true);
  const [threshold, setThreshold] = useState();
  const [approvalType, setApprovalType] = useState({})
  const [updatedStoreList ,setUpdatedStoreList] = useState({});
  const updatedStoreListRef = useRef(updatedStoreList);

  // Update the ref whenever the updatedStoreList state changes
  // the ref is required as the callback functions like manualCallBackStoregroup 
  // will not have the latest updated state value for updatedStoreList.
  useEffect(() => {
    updatedStoreListRef.current = updatedStoreList;
  }, [updatedStoreList]);

  const loadTableInstance = (params) => {
    setSetGridInstance(params);
    mappingTableGridInstance.current = params;
  };

  const setFilterPayload = () => {
    let selected_phcodes = {
      attribute_name: "ph_code",
      dimension: "product",
      filter_type: "cascaded",
      operator: "in",
      system_filter: true,
      values: props.selectedRowData.map((item) => item.ph_code),
    };
    let l_userActions = getObjectsAfterCheckAll(
      props.agGridInstance?.api?.checkConfiguration
    );
    let filterPayload = [];
    if (isEmpty(l_userActions)) {
      filterPayload = [...props.filters, selected_phcodes];
    } else {
      let l_userActionClubbed = l_userActions.reduce(
        (result, obj) => Object.assign(result, obj),
        {}
      );
      if (l_userActionClubbed?.unCheckedRows) {
        let unselected_phcodes = {
          attribute_name: "ph_code",
          dimension: "product",
          filter_type: "cascaded",
          operator: "not in",
          system_filter: true,
          values: l_userActionClubbed?.unCheckedRows.map((item) =>
            Number(item)
          ),
        };

        filterPayload = [...props.filters, unselected_phcodes];
      } else {
        filterPayload = [...props.filters];
      }
    }
    return filterPayload;
  };

  const manualCallBackStoregroup = async (manualbody, pageIndex, params) => {
    try {
      let bodyPayload = {};
      if (props.modalKey === "store_group_mapped_display") {
        setPopUpType(POP_UP_TYPE.store);
        let limit =
          Object.keys(offsetValues.current)?.length > 0 && pageIndex !== 0
            ? { limit: 10, page: pageIndex + 1, ...offsetValues.current }
            : { limit: 10, page: pageIndex + 1 };
        let filtersData = setFilterPayload();

        bodyPayload = {
          application_code: 1,
          filters: filtersData,
          meta: {
            ...manualbody,
            limit,
          },
          popupLink: props.popUpLinkFromDashbaord,
        };
      }

      let response = await props.getProductRuleStoreGroupTableData(bodyPayload);
      if (response.data === 0) {
        displaySnackMessages(NO_DATA_FOUND, "success");
        props.setProductRulePopUpLoader(false);
      } else {
        response.data.data = response.data?.data?.map((item) => {
          item.uniqueId = `${item.sg_name}__id_${item.sg_code}`;
          return item;
        });
      }
      offsetValues.current = {
        offset: response.data.offset,
        sub_offset: response.data.sub_offset,
      };

      let formattedData = agGridRowFormatter(
        response.data.data,
        params?.api?.checkConfiguration,
        "uniqueId"
      );

      if (!isEmpty(updatedStoreListRef.current)) {
        formattedData.forEach((row) => {
          if (updatedStoreListRef.current?.available.hasOwnProperty(row.sg_code)) {
            row.is_selected = updatedStoreListRef.current?.available[row.sg_code];
            row.available = updatedStoreListRef.current?.available[row.sg_code];
          }
          if (updatedStoreListRef.current?.default.hasOwnProperty(row.sg_code)) {
            row.selected = updatedStoreListRef.current?.default[row.sg_code];
          }
        });
      }

      return {
        data: formattedData,
        totalCount: response.data?.total,
      };
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackDcMapped = async (manualbody, pageIndex, params) => {
    try {
      props.setProductRulePopUpLoader(true);
      let bodyPayload = {};
      bodyPayload = {
        selection_type: "dc",
        application_code: 1,
        filters: props.filters,
        popupLink: props.popUpLinkFromDashbaord,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let response = await props.getProductRuleDcMappedTableData(bodyPayload);

      if (response.data.length === 0) {
        displaySnackMessages(NO_DATA_FOUND, "success");
        props.setProductRulePopUpLoader(false);
      }
      props.setProductRulePopUpLoader(false);
      let formattedData = agGridRowFormatter(
        response.data,
        params?.api?.checkConfiguration,
        "dc_code"
      );
      return {
        data: formattedData,
        totalCount: response?.total,
      };
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setProductRulePopUpLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackProductProfileMapped = async (
    manualbody,
    pageIndex,
    params
  ) => {
    try {
      props.setProductRulePopUpLoader(true);
      let bodyPayload = {
        selection_type: "product_profile",
        product_attributes: props.filters.filter(
          (item) => item.dimension.toLowerCase() === "product"
        ),
        store_attributes: props.filters.filter(
          (item) => item.dimension.toLowerCase() === "store"
        ),
        application_code: 1,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        popupLink: props.popUpLinkFromDashbaord,
      };

      let response = await props.getProductRuleProductProfileTableData(
        bodyPayload
      );
      if (response?.data?.data?.length > 0) {
        setProductDCMappingRowData(response?.data?.data);
        let formattedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "pp_code"
        );
        props.setProductRulePopUpLoader(false);
        return {
          data: formattedData,
          totalCount: response.data?.total,
        };
      } else {
        displaySnackMessages(NO_DATA_FOUND, "success");
        setProductDCMappingRowData([]);
        props.setProductRulePopUpLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setProductRulePopUpLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const getEndPoint = () => {
    if (popUpType === POP_UP_TYPE.auto_allocation) {
      return "product-rule-allocation-scheduler";
    } else if (popUpType === POP_UP_TYPE.approval_type || popUpType === POP_UP_TYPE.threshold ) {
      return PRODUCT_RULE_ALLOCATION_TYPE;
    } else if (popUpType === POP_UP_TYPE.cross_country_allocation ) {
      return UPDATE_CROSS_COUNTRY_ALLOCATION_SET_ALL;
    } else return "product-rule"
  }

  const manualCallAllocationRuleMapped = async (manualbody, pageIndex, params) => {
    try {
      props.setProductRulePopUpLoader(true);
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let response = await getAllocationRules(body)();
      if (response.data.status) {
        let finalData = response.data.data;
        props.setProductRulePopUpLoader(false);
        return { data: finalData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setProductRulePopUpLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setProductRulePopUpLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const saveHandlerPopUp = async (isUnMapRequest = false) => {
    props.setProductRulePopUpLoader(true);
    try {
      let updatePayload = popUpType === POP_UP_TYPE.auto_allocation ? requestBodyForAutoAllocation(isUnMapRequest) : setRequestBodyForSetAll();

      if (updatePayload?.blankUpdate) {
        displaySnackMessages(BLANK_LIST, "error");
        props.setProductRulePopUpLoader(false);
        return;
      }

      if (dynamicLabelsBasedOnTenant("article") === "SKU" ||dynamicLabelsBasedOnTenant("article") === "Material") {
        let skuCountResponse = await props.fetchSetAllSKUCount(
          updatePayload,
          getEndPoint()
        );
        setJobId(skuCountResponse.data?.data?.job_id);
        setDisplaySetAllSKUCount(skuCountResponse.data?.data?.sku_count);
        setConfirmSetAll(true);
        props.setProductRulePopUpLoader(false);
      } else {
        setJobId("");
        setDisplaySetAllSKUCount(0);
        saveHandlerRequest();
      }
    } catch (err) {
      props.setProductRulePopUpLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    
    }
  };

  const requestBodyForAutoAllocation = (isUnMapRequest = false) => {
    let excludedFilterValues = JSON.parse(
      localStorage.getItem("filter_attribute_exclusion_values")
    );
    let updatePayload = {
      filters: [...props.filters, ...excludedFilterValues],
      meta: props.metaBody,
    };
    let l_userActions = getObjectsAfterCheckAll(
      props.agGridInstance?.api?.checkConfiguration
    );
    let selectedRowsForLocalUpdate = agGridInstance.api
      ?.getSelectedNodes()
      .map((row) => {
        return row?.data?.rule_code;
      });
    if (selectedRowsForLocalUpdate.length === 0 && !isUnMapRequest) {
      updatePayload = {
        ...updatePayload,
        blankUpdate: true,
      };
    }
    let l_articleSearched = props.metaBody?.search
      ?.filter((ele) => ele.column == "article")?.[0]
      ?.pattern?.split(",");
    updatePayload = {
      ...updatePayload,
      values: {
        is_scheduler_mapping: schedulerMappingRef.current,
        ...(schedulerMappingRef.current && {
          scheduler_code: selectedRowsForLocalUpdate[0],
        }),
        ...(!l_userActions[0]?.checkAll && {
          articles: props.selectedRowData.map((item) => item.article),
        }),
        ...(l_articleSearched?.length && {
          articles: l_articleSearched,
        }),
      },
    };

    return updatePayload;
  }

  const setRequestBodyForSetAll = () => {
    let selectedRowsForLocalUpdate = [];

    if (popUpType === POP_UP_TYPE.store) {
      selectedRowsForLocalUpdate = agGridInstance.api
        .getSelectedNodes()
        .map((row) => {
          return row?.data?.sg_code;
        });
    } else if (popUpType === POP_UP_TYPE.cross_country_allocation) {
      // Do nothing.
    } else if (popUpType === POP_UP_TYPE.auto_allocation) {
      selectedRowsForLocalUpdate = agGridInstance.api
        .getSelectedNodes()
        .map((row) => {
          return row?.data?.rule_code;
        });
    } else if (popUpType === POP_UP_TYPE.approval_type || popUpType === POP_UP_TYPE.threshold) {
      // Do nothing.
    } else {
      selectedRowsForLocalUpdate = agGridInstance.api
        .getSelectedNodes()
        .map((row) => {
          return row.data;
        });

      selectedRowsForLocalUpdate = selectedRowsForLocalUpdate.map(
        (selectedItems) => {
          return selectedItems?.dc_code || selectedItems?.pp_code;
        }
      );
    }
    let filtersData = setFilterPayload();
    let updatePayload = {
      selection_type: popUpType,
      application_code: 1,
      filters: filtersData,
      selected_values: [...selectedRowsForLocalUpdate],
      filtered_selection: !isEmpty(props.filteredSelection)
        ? props.filteredSelection :
        [],
      popupLink: props.popUpLinkFromDashbaord,
    };

    let l_selectedValues,
      l_defaultValues = [];
    if (
      props.defaultAndAvailableSelections &&
      popUpType === POP_UP_TYPE.store
    ) {
      let l_popUpData = [];
      mappingTableGridInstance.current?.api?.forEachNode((node) => {
        l_popUpData.push(node?.data);
      });
      l_selectedValues = l_popUpData
        ?.filter((val) => val.available)
        ?.map((value) => value?.sg_code);
      l_defaultValues = l_popUpData
        ?.filter((val) => val.selected)
        ?.map((value) => value?.sg_code);

      let updatedSelectedValues = [];
      let updatedDefaultValues = [];
      const available = [];
      forEach(updatedStoreListRef.current?.available, (item, key) => {
        if (item) available.push(Number(key));
      });
      const defaultItems = []
      forEach(updatedStoreListRef.current?.default, (item, key) => {
        if (item) defaultItems.push(Number(key));
      });
      updatedSelectedValues = [...new Set([...l_selectedValues, ...available])];
      updatedDefaultValues = [...new Set([...l_defaultValues, ...defaultItems])];
      

      updatePayload.selected_values = updatedSelectedValues;
      updatePayload.default_selected = updatedDefaultValues;
    }

    if (props?.metaBody?.search) {
      updatePayload.meta = {};
      updatePayload.meta.search = props.metaBody?.search || [];
    }

    if (popUpType === POP_UP_TYPE.approval_type || popUpType === POP_UP_TYPE.threshold) {
      let approvalTypeParam = {
        approval_type: approvalType.value,
      };

      if ((popUpType === POP_UP_TYPE.approval_type && !approvalType.value) || (popUpType === POP_UP_TYPE.threshold && !threshold )) {
        updatePayload = {
          ...updatePayload,
          blankUpdate: true,
        }
        return updatePayload;
      }
      
      let thresholdParam = {
        threshold: threshold,
      };
      delete updatePayload.selection_type;
      updatePayload = {
        ...updatePayload,
        values: {
          auto_alloc_type: schedulerMappingRef.current,
          ...approvalTypeParam,
          ...thresholdParam,
        },
      };
    } 

    if (popUpType === POP_UP_TYPE.cross_country_allocation) {
      if (isEmpty(crossCountryData.value)) {
        updatePayload = {
          ...updatePayload,
          blankUpdate: true,
        }
        return updatePayload;
      }
      let crossCountryParam = {
        cross_country_allocation: crossCountryData.value,
      };

      delete updatePayload.selection_type;
      updatePayload = {
        ...updatePayload,
        values: {
          ...crossCountryParam,
        },
      };
    }
    return updatePayload;
  };

  const saveHandlerRequest = async (selectAllRequest) => {
    props.setProductRulePopUpLoader(true);
    let updatePayload = popUpType === POP_UP_TYPE.auto_allocation ? requestBodyForAutoAllocation() : setRequestBodyForSetAll();
    try {
      let saveResponse = selectAllRequest
        ? await props.setAllTableData(
            { body: updatePayload, jobIdCheck: saveJobId },
            getEndPoint()
          )
        : await props.saveProductRulePOPUPTableData(updatePayload);

      props.setProductRulePopUpLoader(true);
      props.setSavePayloadForPopUp(updatePayload);
      displaySnackMessages(
        "Saved request is running in background. Please refresh the table once a notification is received",
        "info"
      );
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
    setProductDCMappingRowData([]);
    setTimeout(() => {
      closeModal();
    }, 0);

    if (popUpType === POP_UP_TYPE.store) {
      props.setProductRuleTableLoader(true);
      props.agGridInstance.api?.deselectAll(true);
      props.agGridInstance.api?.refreshServerSideStore({ purge: true });
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
  const setCustomClassName = (row, item) => {
    if (row?.sg_name) {
      return {};
    } else {
      return classes.hideCheckBox;
    }
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      let columns = [];
      if (props.modalKey === "store_group_mapped_display") {
        columns = await getRuleHeaderConfiguration(
          "inventorysmart_pr_store_groups"
        )();

        setPopUpType(POP_UP_TYPE.store);
        columns.forEach((column) => {
          if (column?.column_name === "sg_name") {
            column["cellRenderer"] = "agGroupCellRenderer";
            column.rowGroup = true;
          }
          if (
            column?.column_name === "available" ||
            column?.column_name === "selected"
          ) {
            column.customClassName = setCustomClassName;
          }
        });

        setColumnDefs(columns);
        return;
        /* return from function as grouping table has different logic for displaying table
            Set -> Column definition & Popup Type
         */
      } else if (props.modalKey === "dc_mapped") {
        columns = await getRuleHeaderConfiguration(
          "inventorysmart_pr_dc_mapping"
        )();
        setPopUpType(POP_UP_TYPE.dc);
      } else if (props.modalKey === "product_profile_name") {
        setPopUpType(POP_UP_TYPE.product_profile);
        columns = await await getRuleHeaderConfiguration(
          "inventorysmart_pr_product_profile_mapping"
        )();
      } else if (props.modalKey === "cross_country_allocation") {
        setPopUpType(POP_UP_TYPE.cross_country_allocation);
      } else if (props.modalKey === "auto_allocation_rule") {
        setPopUpType(POP_UP_TYPE.auto_allocation);
        columns = await getRuleHeaderConfiguration(
          "inventorysmart_pr_allocation_rule_mapping"
        )();
      } else if (props.modalKey === "approval_type") {
        setPopUpType(POP_UP_TYPE.approval_type);
      } else if (props.modalKey === "threshold") {
        setPopUpType(POP_UP_TYPE.threshold);
      }
      let formattedColumns = agGridColumnFormatter(columns);
      setDcAndProductColumn(formattedColumns);
    };

    fetchColumnData();
    props.setProductRulePopUpLoader(false);
    return () => {
      setProductDCMappingRowData([]);
      props.setProductRulePopUpLoader(false);
    };
  }, []);

  const gridUniqueKey = () => {
    if (popUpType === POP_UP_TYPE.store || popUpType === POP_UP_TYPE.dc) {
      return "dc_code";
    } else if (popUpType === POP_UP_TYPE.auto_allocation) {
      return "rule_code";
    }
    return "pp_code";
  };
  const onCheckBoxChange = (p_checked, p_rowData, p_column) => {
    if (p_column?.colId === "selected" && p_checked) {
      p_rowData.available = true;
      mappingTableGridInstance?.current?.api?.refreshCells();
    }
    setUpdatedStoreList((prevUpdatedStoreList) => {
      const editedStoreObject = {
        available: { ...prevUpdatedStoreList.available },
        default: { ...prevUpdatedStoreList.default },
      };
  
      if (p_column?.colId === "selected") {
        editedStoreObject.default[p_rowData.sg_code] = p_checked;
        if (p_checked) {
          editedStoreObject.available[p_rowData.sg_code] = p_checked;
        }
      } else {
        editedStoreObject.available[p_rowData.sg_code] = p_checked;
      }
  
      return editedStoreObject;
    });
  };

  const selectedStoreGroupsText = (params) => {
    let selectedRowsForLocalUpdate = params?.api
      ?.getSelectedNodes()
      .map((row) => {
        return row?.data?.sg_name;
      });
    let finalText =
      selectedRowsForLocalUpdate?.length > 0
        ? replaceSpecialCharacter(selectedRowsForLocalUpdate.join(", "))
        : "";
    setSelectedGroupsValue(finalText);
  };
  const openConfirmationPopUp = () => {
    return (
      <Dialog
        open={confirmSetAll}
        onClose={() => setConfirmSetAll(false)}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>Confirm Set All</DialogTitle>
        <DialogContent>
          <Typography variant="h6">
            Set All operation is being applied for {displaySetAllSKUCount}{" "}
            number of{" "}
            {dynamicLabelsBasedOnTenant("article") === "Material"
              ? "Material/Material's"
              : "SKU/SKU's"}{" "}
            . Please confirm to proceed.
          </Typography>
        </DialogContent>
        {/* </LoadingOverlay> */}
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setConfirmSetAll(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => saveHandlerRequest(true)}
          >
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const handleCrossCountrySelection = (data) => {
    setCrossCountryData(data);
  };
  
  const handleApprovalType = (data) => {
    setApprovalType(data);
  };

  return (
    <div>
      <div>
        {/* Grid for row grouped store grouping table */}
        {popUpType === POP_UP_TYPE.store && (
          <Loader loader={props.productRulePopUpLoader}>
            <div className={classes.selectedGroup}>
              <Typography component="h1" variant="h4">
                Selected Store groups :
              </Typography>
              <span>{selectedGroupsValue}</span>
            </div>
            {columnDefs?.length > 0 && (
              <>
                <AgGridComponent
                  columns={columnDefs}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBackStoregroup(body, pageIndex, params)
                  }
                  rowModelType={"serverSide"}
                  ignoreClearSelectionOnSearchandSort={true}
                  serverSideStoreType="partial"
                  hideChildSelection={true}
                  onCheckBoxChange={onCheckBoxChange}
                  loadTableInstance={loadTableInstance} // to make use of available grid api's
                  treeData={true}
                  sizeColumnsToFitFlag={true}
                  hideSelectAllRecords={true}
                  groupDisplayType={"custom"}
                  cacheBlockSize={10}
                  childKey={"store_details"}
                  uniqueRowId={"uniqueId"}
                  onRowSelected
                  onSelectionChanged={(params) => {
                    selectedStoreGroupsText(params);
                  }}
                  rowSelection="multiple"
                  selectAllHeaderComponent={
                    !props.defaultAndAvailableSelections
                  }
                />
              </>
            )}
          </Loader>
        )}

        {/* Grid for DC and product profiling table */}
        {popUpType === POP_UP_TYPE.dc && (
          <Loader loader={props.productRulePopUpLoader}>
            {dcAndProductColumn?.length > 0 && (
              <AgGridComponent
                columns={dcAndProductColumn}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBackDcMapped(body, pageIndex, params)
                }
                rowModelType={"serverSide"}
                ignoreClearSelectionOnSearchandSort={true}
                serverSideStoreType="partial"
                selectAllHeaderComponent={true}
                uniqueRowId={gridUniqueKey()}
                rowSelection={"multiple"}
                sizeColumnsToFitFlag={true}
                onRowSelected
                cacheBlockSize={10}
                loadTableInstance={loadTableInstance} // to make use of available grid api's
              />
            )}
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.product_profile && (
          <Loader loader={props.productRulePopUpLoader}>
            {dcAndProductColumn?.length > 0 && productDCMappingRowData && (
              <AgGridComponent
                columns={dcAndProductColumn}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBackProductProfileMapped(body, pageIndex, params)
                }
                rowModelType={"serverSide"}
                serverSideStoreType="partial"
                selectAllHeaderComponent={true}
                uniqueRowId={gridUniqueKey()}
                rowSelection={"single"}
                hideHeaderCheckboxComponent={true}
                hideSelectAllRecords={true}
                sizeColumnsToFitFlag={true}
                cacheBlockSize={10}
                onRowSelected
                loadTableInstance={loadTableInstance} // to make use of available grid api's
              />
            )}
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.cross_country_allocation && (
          <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
            <div>Select Cross Country Allocation:</div>
            <div style={{ width: "24rem" }}>
              <ReactSelect
                placeholder="Select"
                isClearable={false}
                menuShouldBlockScroll={false}
                isMulti={false}
                options={props.crossCountryAllocationOptions}
                value={crossCountryData}
                onChange={(option) => handleCrossCountrySelection(option)}
              />
            </div>
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.auto_allocation && (
          <Loader loader={props.productRulePopUpLoader}>
            {dcAndProductColumn?.length > 0 && (
              <>
                <div className={`${globalClasses.layoutAlignEnd}`}>
                  <Button
                    onClick={() => {
                      schedulerMappingRef.current = false;
                      saveHandlerPopUp(true);
                    }}
                    id="unmapSchedulerBtn"
                    color="primary"
                    variant="contained"
                    className={classes.btn}
                  >
                    Unmap Scheduler
                  </Button>
                </div>
                <AgGridComponent
                  columns={dcAndProductColumn}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallAllocationRuleMapped(body, pageIndex, params)
                  }
                  rowModelType={"serverSide"}
                  serverSideStoreType="partial"
                  selectAllHeaderComponent={true}
                  hideHeaderCheckboxComponent={true}
                  hideSelectAllRecords={true}
                  uniqueRowId={gridUniqueKey()}
                  rowSelection={"single"}
                  sizeColumnsToFitFlag={true}
                  onRowSelected
                  cacheBlockSize={10}
                  loadTableInstance={loadTableInstance} // to make use of available grid api's
                />
              </>
            )}
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.approval_type && (
          <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
            <div>Select Approval Type:</div>
            <div style={{ width: "24rem" }}>
              <ReactSelect
                placeholder="Select Approval Type"
                isClearable={false}
                menuShouldBlockScroll={false}
                isMulti={false}
                options={APPROVAL_TYPE_OPTIONS}
                value={approvalType}
                onChange={(option) => handleApprovalType(option)}
              />
             </div>
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.threshold && (
          <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
            <div>
              <div>Auto Allocation Threshold:</div>
              <TextField
                style={{ minWidth: "50%" }}
                required={true}
                placeholder="Set Auto Allocation Threshold between 0 to 1 eg: 0.7"
                variant="outlined"
                type="number"
                value={threshold}
                onChange={e => {
                  const value = Number(e.target.value);
                  if (!isNaN(value)) {
                    if (value > 1) {
                      setThreshold(1);
                    } else if (value < 0) {
                      setThreshold(0);
                    } else {
                      setThreshold(value);
                    }
                  }
                }}
                onBlur={e => {
                  const value = Number(e.target.value);
                  if (isNaN(value) || value < 0) {
                    setThreshold(0);
                  } else if (value > 1) {
                    setThreshold(1);
                  }
                }}
                inputProps={{
                  min: 0,
                  max: 1,
                  step: 0.1,
                  onKeyDown: (e) => {
                    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                      e.preventDefault();
                    }
                  }
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </div>
          </Loader>
        )}
      </div>
      {confirmSetAll && openConfirmationPopUp()}
      <div className={classes.actionBtn}>
        <Button
          onClick={closeModal}
          id="productRulePopCancelBtn"
          color="primary"
          variant="outlined"
          className={classes.btn}
        >
          Cancel
        </Button>
        <Button
          onClick={()=>{
            schedulerMappingRef.current=true;
            saveHandlerPopUp();
          }}
          id="productRulePopCancelBtn"
          color="primary"
          variant="contained"
        >
          Update and Save
        </Button>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    productRulePopUpLoader:
      store.inventorysmartReducer.productRuleService.productRulePopUpLoader,
    popUpLinkFromDashbaord:
      store.inventorysmartReducer.productRuleService.popUpLinkFromDashbaord,
    filterDashboardConfigurationObj:
      store.filterReducer.filterDashboardConfiguration
        .productRuleFilterConfiguration.filterConfig,
    defaultAndAvailableSelections:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.defaultAndAvailableSelections,
    filteredSelection:
      store.inventorysmartReducer.productRuleService.filteredSelection,
    articleHeading:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.dynamicLabels.article,
    dynamicLabels:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.dynamicLabels,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setProductRulePopUpLoader: (payload) =>
    dispatch(setProductRulePopUpLoader(payload)),
  getProductRulePOPUPTableData: (body, screen) =>
    dispatch(getProductRulePOPUPTableData(body, screen)),
  getProductRuleStoreGroupTableData: (body) =>
    dispatch(getProductRuleStoreGroupTableData(body)),
  getProductRuleDcMappedTableData: (body) =>
    dispatch(getProductRuleDcMappedTableData(body)),
  getProductRuleProductProfileTableData: (body) =>
    dispatch(getUserCreatedTableData(body)),
  setAllTableData: (payload, screen) =>
    dispatch(setAllTableData(payload, screen)),
  setSelectedStoreGroupDataPopUp: (body) =>
    dispatch(setSelectedStoreGroupDataPopUp(body)),
  saveProductRulePOPUPTableData: (body) =>
    dispatch(saveProductRuleSetAllTableData(body)),
  setSavePayloadForPopUp: (body) => dispatch(setSavePayloadForPopUp(body)),
  fetchSetAllSKUCount: (payload, screen) =>
    dispatch(fetchSetAllSKUCount(payload, screen)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getAllocationRules: (body) => dispatch(getAllocationRules(body)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductRulePopUp);
