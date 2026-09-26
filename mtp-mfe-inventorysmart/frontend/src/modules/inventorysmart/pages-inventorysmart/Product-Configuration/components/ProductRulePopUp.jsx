import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import { uniqBy } from "lodash";
import {Modal} from "impact-ui-v3"
import {
  BLANK_LIST,
  ERROR_MESSAGE,
  NO_DATA_FOUND,
  POP_UP_TYPE,
  PRODUCT_RULE_POP_UP_TITLE,
  UPDATED_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { getSelectedFiltersFromConfig } from "core/commonComponents/coreComponentScreen/utils";

import { addSnack } from "core/actions/snackbarActions";

import {
  getProductRulePOPUPTableData,
  getRuleHeaderConfiguration,
  saveProductRulePOPUPTableData,
  setProductRulePopUpLoader,
  setSavePayloadForPopUp,
  setSelectedStoreGroupDataPopUp,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";

import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";

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
  _openModal,
  closeModal,
  _filters,
  popUpColumnData,
  popUpROWData,
  ...props
}) => {
  const classes = useStyles();
  const [storeGroupRowData, setStoreGroupRowData] = useState([]);
  const [
    storeGroupDefaultSelectedRowData,
    setStoreGroupDefaultSelectedRowData,
  ] = useState([]);
  const [productDCMappingDefault, setProductDCMappingDefault] = useState([]);
  const [dcAndProductColumn, setDcAndProductColumn] = useState([]);
  const [productDCMappingRowData, setProductDCMappingRowData] = useState([]);
  const [agGridInstance, setSetGridInstance] = useState({});
  const [popUpType, setPopUpType] = useState("");

  const [columnDefs, setColumnDefs] = useState([]);
  const mappingTableGridInstance = useRef(null);
  const [dcInitialSelectionApplied, setDcInitialSelectionApplied] = useState(false);

  const loadTableInstance = (params) => {
    setSetGridInstance(params);
    mappingTableGridInstance.current = params;
  };
  const autoGroupColumnDef = {
    headerName: "Store Group",
    minWidth: 200,
    width: 350,
  };

  const fetchStoreMappingData = async () => {
    try {
      props.setProductRulePopUpLoader(true);
      let bodyPayload = {};
      if (popUpColumnData?.accessor === "dc_mapped") {
        bodyPayload = {
          selection_type: "dc",
          primary_sku: popUpROWData?.primary_sku,
          article: popUpROWData?.article,
          application_code: 1,
          ph_code: popUpROWData?.ph_code,
          channel: setChannel(),
          available: popUpROWData?.dc_available || [],
          default: popUpROWData?.default_dcs || [],
        };
      } else if (popUpColumnData?.accessor === "product_profile_name") {
        // payload to be changed once api is up
        bodyPayload = {
          selection_type: "product_profile",
          ph_code: popUpROWData?.ph_code,
          article: popUpROWData?.article,
          channel: popUpROWData?.channel,
          available: popUpROWData?.product_profile_available || 0,
          default:
            popUpROWData?.default_product_profile == null
              ? []
              : [popUpROWData?.default_product_profile],
        };
      }

      let response = await props.getProductRulePOPUPTableData(bodyPayload);
      if (response?.data?.available.length > 0) {
        let selectedRows = response.data.available
          .filter((row) => {
            let isItemPresent = response.data.selected.indexOf(
              row.dc_code || row.pp_code
            );
            if (isItemPresent > -1) {
              return row.dc_code || row.pp_code;
            }
          })
          .map((modifiedRow) => modifiedRow.dc_code || modifiedRow.pp_code);

        let selectedRowsWithCode = uniqBy(selectedRows, function (e) {
          return e;
        });

        setProductDCMappingRowData(response?.data?.available);
        setProductDCMappingDefault(selectedRowsWithCode);
        props.setProductRulePopUpLoader(false);
      } else {
        displaySnackMessages(NO_DATA_FOUND, "success");
        setProductDCMappingRowData([]);
        props.setProductRulePopUpLoader(false);
      }
    } catch(e) {
      props.handleErrorMessage(e);
    }
  };

  const manualCallBackStoregroup = async (manualbody, pageIndex, params) => {
    try {
      props.setProductRulePopUpLoader(true);
      let bodyPayload = {};
      if (popUpColumnData?.accessor === "store_group_mapped_display") {
        setPopUpType(POP_UP_TYPE.store);
        bodyPayload = {
          primary_sku: popUpROWData?.primary_sku,
          article: popUpROWData?.article,
          channel: setChannel(),
          selection_type: "store",
          application_code: 1,
          available: popUpROWData?.store_group_available || [],
          meta: {
            ...manualbody,
            limit: { limit: 10, page: pageIndex + 1 },
          },
          default:
            popUpROWData?.default_store_groups == null
              ? []
              : popUpROWData?.default_store_groups,
        };
      }
      let response = await props.getProductRulePOPUPTableData(bodyPayload);

      if (response.data.available.length === 0) {
        displaySnackMessages(NO_DATA_FOUND, "success");
        props.setProductRulePopUpLoader(false);
        setStoreGroupRowData([]);
      }
      let selectedRows = response.data.available
        .filter((row) => {
          let isItemPresent = response.data.selected.indexOf(row.sg_code);
          if (isItemPresent > -1) {
            return row.sg_name;
          }
        })
        .map((modifiedRow) => modifiedRow.sg_name);

      let selectedRowsWithName = uniqBy(selectedRows, function (e) {
        return e;
      });
      response.data.available.forEach((row) => {
        let isItemPresent = response.data.selected.indexOf(row.sg_code);
        if (isItemPresent > -1) {
          row.is_selected = true;
        } else {
          row.is_selected = false;
        }
        row.isGroupFlag = !row.is_disabled;
      });
      let selectedConfig = response.data.selected
        ? [
            { checkedRows: response.data.selected },
            ...params?.api?.checkConfiguration,
          ]
        : params?.api?.checkConfiguration;
      let formattedData = agGridRowFormatter(
        response.data.available,
        selectedConfig,
        "sg_code"
      );

      const finalTableData = formattedData.sort(
        (a, b) => Number(b.is_selected) - Number(a.is_selected)
      );
      setStoreGroupRowData(finalTableData);
      setStoreGroupDefaultSelectedRowData(selectedRowsWithName);
      props.setProductRulePopUpLoader(false);
      return {
        data: finalTableData,
        totalCount: response?.total,
      };
    } catch (e){
      props.handleErrorMessage(e)
      props.setProductRulePopUpLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };
  const setChannel = () => {
    let allFiltersData = props.filterDashboardConfigurationObj.filter(
      (item) => item.screen_name === "Inventorysmart Configurations"
    )[0];
    let channel = [];
    let alreadySelectedChannel = getSelectedFiltersFromConfig(
      props.filterDashboardConfigurationObj,
      0,
      props.filterReducer
    )
      ?.filter((item) => item.filter_id === "channel")
      .map((item) => item.values)[0];
    if (alreadySelectedChannel && alreadySelectedChannel?.length > 0) {
      channel = alreadySelectedChannel;
    } else {
      let allChannelData = allFiltersData?.filterDashboardData
        ?.filter((item) => item.column_name === "channel")
        .map((item) => item.initialData)[0];
      channel = allChannelData?.map((item) => item.value);
    }
    return channel ? channel : ["NC"];
  };

  const manualCallBackProductProfileMapped = async (manualbody, pageIndex) => {
    try {
      props.setProductRulePopUpLoader(true);
      let bodyPayload = {
        selection_type: "product_profile",
        channel: setChannel(),
        primary_sku: popUpROWData?.primary_sku,
        article: popUpROWData?.article,
        application_code: 1,
        available: popUpROWData?.product_profile_available || 0,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        default:
          popUpROWData?.default_product_profile == null
            ? []
            : [popUpROWData?.default_product_profile],
      };

      let response = await props.getProductRulePOPUPTableData(bodyPayload);
      if (response?.data?.available.length > 0) {
        response.data.available = response.data.available.map((row) => {
          let isItemPresent = response.data.selected.indexOf(
            row.dc_code || row.pp_code
          );
          if (isItemPresent > -1) {
            row.is_selected = true;
          }
          return row;
        });

        setProductDCMappingRowData(response?.data?.available);
        props.setProductRulePopUpLoader(false);
        return {
          data: response?.data?.available,
          totalCount: response?.total,
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
      props.handleErrorMessage(err);
      props.setProductRulePopUpLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };
  const saveHandlerPopUp = async () => {
    props.setProductRulePopUpLoader(true);
    let selectedRowData;
    let selectedRowsForLocalUpdate;
    let channel = [];

    let allFiltersData = props.filterDashboardConfigurationObj.filter(
      (item) => item.screen_name === "Inventorysmart Configurations"
    )[0];
    if (popUpType === POP_UP_TYPE.store) {
      selectedRowData = agGridInstance.api.getSelectedNodes().map((row) => {
        return row?.data?.sg_code;
      });
      selectedRowsForLocalUpdate = [];
      agGridInstance.api.getSelectedNodes().forEach((masterRow) => {
        selectedRowsForLocalUpdate.push(masterRow.group);
      });
    } else {
      selectedRowsForLocalUpdate = agGridInstance.api
        .getSelectedNodes()
        .map((row) => {
          return row.data;
        });

      selectedRowData = selectedRowsForLocalUpdate.map((selectedItems) => {
        return selectedItems?.dc_code || selectedItems?.pp_code;
      });
    }
    let alreadySelectedChannel = allFiltersData?.filterDependencyData
      ?.filter((item) => item.filter_id === "channel")
      .map((item) => item.values)[0];
    if (alreadySelectedChannel && alreadySelectedChannel?.length > 0) {
      channel = alreadySelectedChannel;
    } else {
      let allChannelData = allFiltersData?.filterDashboardData
        ?.filter((item) => item.column_name === "channel")
        .map((item) => item.initialData)[0];
      channel = allChannelData?.map((item) => item.value);
    }
    if (popUpType === POP_UP_TYPE.product_profile) {
      let allChannelData = allFiltersData?.filterDashboardData
        ?.filter((item) => item.column_name === "channel")
        .map((item) => item.initialData)[0];
      channel = allChannelData?.map((item) => item.value);
    }
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
    } else {
      l_selectedValues =
        popUpType === POP_UP_TYPE.store || popUpType === POP_UP_TYPE.dc
          ? selectedRowData
          : selectedRowData[0];
    }
    let updatePayload = {
      selection_type: popUpType,
      ph_code: popUpROWData?.ph_code,
      channel: channel ? channel : ["NC"],
      selectedRowData: [...selectedRowsForLocalUpdate],
      selected_values: l_selectedValues,
      default_selected: l_defaultValues,
    };
    try {
      let saveResponse = await props.saveProductRulePOPUPTableData(
        updatePayload
      );
      if (!saveResponse.message) {
        throw ERROR_MESSAGE;
      }
      const successMessage = (saveResponse.data?.status || saveResponse.data?.show_message) ? saveResponse?.data?.message : UPDATED_MESSAGE;
      props.setProductRulePopUpLoader(true);
      props.setSavePayloadForPopUp(updatePayload);
      displaySnackMessages(successMessage, "success");
      props.setProductRuleTableLoader(true);
      props.agGridInstance.api?.deselectAll();
      props.agGridInstance.api?.setCheckConfiguration([]);
      props.agGridInstance.api?.refreshServerSideStore({ purge: true });
      // fetch table data to show the updated store group/stores mapped count
    } catch (e){
      props.handleErrorMessage(e);
    }
    setStoreGroupRowData([]);
    setProductDCMappingRowData([]);
    setTimeout(() => {
      closeModal();
    }, 0);
    if (popUpType === POP_UP_TYPE.store) {
      props.setProductRuleTableLoader(true);
      props.agGridInstance.api?.refreshServerSideStore({ purge: true });
      props.manualCallBack();
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
  const getRowStyle = (params) => {
    if (params?.data?.is_disabled) {
      return { background: "#f7f7f7" };
    }
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

      if (popUpColumnData?.accessor === "store_group_mapped_display") {
        columns = await getRuleHeaderConfiguration(
          "inventorysmart_pr_store_groups"
        )();
        // fetch row data
        // getSGGroupingTableData();

        //set type of popup
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

        //set column data
        setColumnDefs(columns);
        return;
        /* return from function as grouping table has different logic for displaying table
            Set -> Column definition & Popup Type
         */
      } else if (popUpColumnData?.accessor === "dc_mapped") {
        columns = await getRuleHeaderConfiguration(
          "inventorysmart_pr_dc_mapping"
        )();
        columns.map((column) => (column["width"] = "350"));
        setPopUpType(POP_UP_TYPE.dc);
        fetchStoreMappingData();
      } else if (popUpColumnData?.accessor === "product_profile_name") {
        setPopUpType(POP_UP_TYPE.product_profile);
        columns = await await getRuleHeaderConfiguration(
          "inventorysmart_pr_product_profile_mapping"
        )();
      }
      let formattedColumns = agGridColumnFormatter(columns);
      setDcAndProductColumn(formattedColumns);
    };

    if (active) {
      fetchColumnData();
    }

    return () => {
      setProductDCMappingRowData([]);
      setStoreGroupRowData([]);
    };
  }, [active]);

  const gridSelectionType = () => {
    if (popUpType === POP_UP_TYPE.store || popUpType === POP_UP_TYPE.dc) {
      return "multiple";
    }
    return "single";
  };

  const gridUniqueKey = () => {
    if (popUpType === POP_UP_TYPE.store || popUpType === POP_UP_TYPE.dc) {
      return "dc_code";
    }
    return "pp_code";
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };
  const setReadonlyStyleValue = () => {
    if (popUpROWData?.sku_description) {
      return replaceSpecialCharacter(popUpROWData?.sku_description);
    }

    return "-";
  };
  const setReadOnlyStyleDescValue = () => {
    if (popUpROWData?.product_description) {
      return replaceSpecialCharacter(popUpROWData?.product_description);
    }
    return "-";
  };

  const onCheckBoxChange = (p_checked, p_rowData, p_column) => {
    if (p_column?.colId === "selected" && p_checked) {
      p_rowData.available = true;
      mappingTableGridInstance?.current?.api?.refreshCells();
    }
  };

  return active ? (
    <Modal
      classes={{ paper: classes.dialogPaper }}
      id="productRulePopup"
      aria-labelledby="product-rule-dialog"
      open={active}
      size="large"
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        closeModal();
      }}
      title={
        popUpColumnData?.accessor === "store_group_mapped_display" ? (
          props.dynamicLabels?.store_group
        ) : (
          PRODUCT_RULE_POP_UP_TITLE[popUpColumnData?.accessor]
        )
      }
      primaryButtonLabel="Update and Save"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={saveHandlerPopUp}
      onSecondaryButtonClick={closeModal}
      primaryButtonProps={{
        disabled:
          props.productRulePopUpLoader ||
          (popUpColumnData?.accessor === "store_group_mapped_display" &&
            !storeGroupRowData.length) ||
          (popUpColumnData?.accessor === "product_profile_name" &&
            !productDCMappingRowData.length) ||
          !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_RULES,
            "edit"
          ),
      }}
    >

      <div  style={{ height: "350px" }}>
        {/* Grid for row grouped store grouping table */}
        {popUpType === POP_UP_TYPE.store && (
          <>
            <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
              {columnDefs?.length > 0 && (
                <>
                  <AgGridComponent
                    columns={columnDefs}
                    manualCallBack={(body, pageIndex, params) =>
                      manualCallBackStoregroup(body, pageIndex, params)
                    }
                    onCheckBoxChange={onCheckBoxChange}
                    getRowStyle={getRowStyle}
                    onRowSelected
                    rowModelType={"serverSide"}
                    serverSideStoreType="partial"
                    hideChildSelection={true}
                    SelectAllRecords={true}
                    loadTableInstance={loadTableInstance} // to make use of available grid api's
                    treeData={true}
                    sizeColumnsToFitFlag={true}
                    groupDisplayType={"custom"}
                    cacheBlockSize={10}
                    childKey={"store_details"}
                    checkRowMasterKey={"isGroupFlag"}
                    totalCount={100} // to set the total count once received from BE
                    uniqueRowId={"sg_code"}
                    rowSelection="multiple"
                    selectAllHeaderComponent={
                      !props.defaultAndAvailableSelections
                    }
                    tableHeader={`${props.dynamicLabels?.sku_id}: ${popUpROWData?.primary_sku}`}
                    topRightOptions={`${props.dynamicLabels?.sku_dispcription}: ${setReadOnlyStyleDescValue()}`}
                  />
                </>
              )}
            </Loader>
          </>
        )}

        {/* Grid for DC and product profiling table */}
        {popUpType === POP_UP_TYPE.dc && (
          <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
            {dcAndProductColumn?.length > 0 && productDCMappingRowData && (
              <>
                <AgGridComponent
                  selectAllHeaderComponent={true}
                  columns={dcAndProductColumn}
                  rowdata={productDCMappingRowData}
                  uniqueRowId={gridUniqueKey()}
                  rowSelection={gridSelectionType()}
                  loadTableInstance={loadTableInstance} // to make use of available grid api's
                  selectEachRow={false}
                  sizeColumnsToFitFlag={true}
                  selectedRows={dcInitialSelectionApplied ? undefined : (productDCMappingDefault || [])}
                  onFirstDataRender={() => setDcInitialSelectionApplied(true)}
                  tableHeader={`${props.dynamicLabels?.sku_id}: ${popUpROWData?.primary_sku}`}
                  topRightOptions={`${props.dynamicLabels?.sku_dispcription}: ${setReadOnlyStyleDescValue()}`}
                />
              </>
            )}
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.product_profile && (
          <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
            {dcAndProductColumn?.length > 0 && productDCMappingRowData && (
              <>
                <AgGridComponent
                  columns={dcAndProductColumn}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBackProductProfileMapped(body, pageIndex, params)
                  }
                  rowModelType={"serverSide"}
                  serverSideStoreType="partial"
                  selectAllHeaderComponent={true}
                  hideHeaderCheckboxComponent={true}
                  uniqueRowId={gridUniqueKey()}
                  rowSelection={"single"}
                  sizeColumnsToFitFlag={true}
                  selectedRows={productDCMappingDefault || []}
                  cacheBlockSize={10}
                  loadTableInstance={loadTableInstance} // to make use of available grid api's
                  tableHeader={`${props.dynamicLabels?.sku_id}: ${popUpROWData?.primary_sku}`}
                  topRightOptions={`${props.dynamicLabels?.sku_dispcription}: ${setReadOnlyStyleDescValue()}`}
                />
              </>
            )}
          </Loader>
        )}
      </div>
    </Modal>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    productRulePopUpLoader:
      store.inventorysmartReducer.productRuleService.productRulePopUpLoader,
    filterDashboardConfigurationObj:
      store.filterReducer.filterDashboardConfiguration
        .productRuleFilterConfiguration.filterConfig,
    articleHeading:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.dynamicLabels.article,
    dynamicLabels:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.dynamicLabels,
    defaultAndAvailableSelections:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.defaultAndAvailableSelections,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    filterReducer: store.filterReducer,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setProductRulePopUpLoader: (payload) =>
    dispatch(setProductRulePopUpLoader(payload)),
  getProductRulePOPUPTableData: (body) =>
    dispatch(getProductRulePOPUPTableData(body)),
  setSelectedStoreGroupDataPopUp: (body) =>
    dispatch(setSelectedStoreGroupDataPopUp(body)),
  saveProductRulePOPUPTableData: (body) =>
    dispatch(saveProductRulePOPUPTableData(body)),
  setSavePayloadForPopUp: (body) => dispatch(setSavePayloadForPopUp(body)),

  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductRulePopUp);
