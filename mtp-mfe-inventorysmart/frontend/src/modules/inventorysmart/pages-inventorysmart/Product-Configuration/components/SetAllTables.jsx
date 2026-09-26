import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import { Button } from "impact-ui-v3";
import {
  ERROR_MESSAGE,
  NO_DATA_FOUND,
  POP_UP_TYPE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
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

const useStyles = makeStyles((theme) => ({
  btn: {
    marginRight: "1rem",
  },
  actionBtn: {
    padding: "1rem",
    display: "flex",
    justifyContent: "flex-end",
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
  const [productDCMappingDefault, setProductDCMappingDefault] = useState([]);
  const [dcAndProductColumn, setDcAndProductColumn] = useState([]);
  const [productDCMappingRowData, setProductDCMappingRowData] = useState([]);
  const [agGridInstance, setSetGridInstance] = useState({});
  const [popUpType, setPopUpType] = useState("");
  const offsetValues = useRef({});
  const mappingTableGridInstance = useRef(null);
  const [columnDefs, setColumnDefs] = useState([]);

  const loadTableInstance = (params) => {
    setSetGridInstance(params);
    mappingTableGridInstance.current = params;
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
        let selected_phcodes = {
          attribute_name: "ph_code",
          dimension: "product",
          filter_type: "cascaded",
          operator: "in",
          system_filter: true,
          values: props.selectedRowData.map((item) => item.ph_code),
        };
        bodyPayload = {
          application_code: 1,
          filters: props.checkAll
            ? [...props.filters]
            : [...props.filters, selected_phcodes],
          meta: {
            ...manualbody,
            limit,
          },
        };
      }

      let response = await props.getProductRuleStoreGroupTableData(bodyPayload);
      if (response.data === 0) {
        displaySnackMessages(NO_DATA_FOUND, "success");
        props.setProductRulePopUpLoader(false);
      }
      offsetValues.current = {
        offset: response.data.offset,
        sub_offset: response.data.sub_offset,
      };
      let formattedData = agGridRowFormatter(
        response.data.data,
        params?.api?.checkConfiguration,
        "sg_code"
      );
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
      };

      let response = await props.getProductRuleProductProfileTableData(
        bodyPayload
      );
      if (response?.data?.data.length > 0) {
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
  const saveHandlerPopUp = async () => {
    props.setProductRulePopUpLoader(true);
    let selectedRowsForLocalUpdate = [];

    if (popUpType === POP_UP_TYPE.store) {
      selectedRowsForLocalUpdate = agGridInstance.api
        .getSelectedNodes()
        .map((row) => {
          return row?.data?.sg_code;
        });
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
    let selected_phcodes = {
      attribute_name: "ph_code",
      dimension: "product",
      filter_type: "cascaded",
      operator: "in",
      system_filter: true,
      values: props.selectedRowData.map((item) => item.ph_code),
    };
    let updatePayload = {
      selection_type: popUpType,
      application_code: 1,
      filters: props.checkAll
        ? [...props.filters]
        : [...props.filters, selected_phcodes],
      selected_values: [...selectedRowsForLocalUpdate],
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
      updatePayload.selected_values = l_selectedValues;
      updatePayload.default_selected = l_defaultValues;
    }

    if (popUpType === POP_UP_TYPE.store && props?.metaBody?.search) {
      updatePayload.meta = {};
      updatePayload.meta.search = props.metaBody?.search;
    }

    try {
      let saveResponse = await props.saveProductRulePOPUPTableData(
        updatePayload
      );
      if (!saveResponse.message) {
        throw ERROR_MESSAGE;
      }
      props.setProductRulePopUpLoader(true);
      props.setSavePayloadForPopUp(updatePayload);
      displaySnackMessages(
        "Saved request is running in background. Please refresh the table once a notification is received",
        "info"
      );
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
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
    }
    return "pp_code";
  };
  const onCheckBoxChange = (p_checked, p_rowData, p_column) => {
    if (p_column?.colId === "selected" && p_checked) {
      p_rowData.available = true;
      mappingTableGridInstance?.current?.api?.refreshCells();
    }
  };

  return (
    <div>
      <div>
        {/* Grid for row grouped store grouping table */}
        {popUpType === POP_UP_TYPE.store && (
          <>
            <Loader loader={props.productRulePopUpLoader}>
              {columnDefs?.length > 0 && (
                <>
                  <AgGridComponent
                    columns={columnDefs}
                    manualCallBack={(body, pageIndex, params) =>
                      manualCallBackStoregroup(body, pageIndex, params)
                    }
                    rowModelType={"serverSide"}
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
                    uniqueRowId={"sg_code"}
                    onRowSelected
                    rowSelection="multiple"
                    selectAllHeaderComponent={
                      !props.defaultAndAvailableSelections
                    }
                  />
                </>
              )}
            </Loader>
          </>
        )}

        {/* Grid for DC and product profiling table */}
        {popUpType === POP_UP_TYPE.dc && (
          <Loader loader={props.productRulePopUpLoader}>
            {dcAndProductColumn?.length > 0 && (
              <>
                <AgGridComponent
                  columns={dcAndProductColumn}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBackDcMapped(body, pageIndex, params)
                  }
                  rowModelType={"serverSide"}
                  serverSideStoreType="partial"
                  selectAllHeaderComponent={true}
                  uniqueRowId={gridUniqueKey()}
                  rowSelection={"multiple"}
                  sizeColumnsToFitFlag={true}
                  onRowSelected
                  cacheBlockSize={10}
                  loadTableInstance={loadTableInstance} // to make use of available grid api's
                />
              </>
            )}
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.product_profile && (
          <Loader loader={props.productRulePopUpLoader}>
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
                  uniqueRowId={gridUniqueKey()}
                  rowSelection={"single"}
                  hideSelectAllRecords={true}
                  sizeColumnsToFitFlag={true}
                  cacheBlockSize={10}
                  onRowSelected
                  loadTableInstance={loadTableInstance} // to make use of available grid api's
                />
              </>
            )}
          </Loader>
        )}
      </div>
      <div className={classes.actionBtn}>
        <Button
          onClick={closeModal}
          id="productRulePopCancelBtn"
          variant="primary"
          className={classes.btn}
        >
          Cancel
        </Button>
        <Button
          onClick={saveHandlerPopUp}
          id="productRulePopCancelBtn"
          variant="primary"
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
    filterDashboardConfigurationObj:
      store.filterReducer.filterDashboardConfiguration
        .productRuleFilterConfiguration.filterConfig,
    defaultAndAvailableSelections:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.defaultAndAvailableSelections,
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
  getProductRulePOPUPTableData: (body) =>
    dispatch(getProductRulePOPUPTableData(body)),
  getProductRuleStoreGroupTableData: (body) =>
    dispatch(getProductRuleStoreGroupTableData(body)),
  getProductRuleDcMappedTableData: (body) =>
    dispatch(getProductRuleDcMappedTableData(body)),
  getProductRuleProductProfileTableData: (body) =>
    dispatch(getUserCreatedTableData(body)),

  setSelectedStoreGroupDataPopUp: (body) =>
    dispatch(setSelectedStoreGroupDataPopUp(body)),
  saveProductRulePOPUPTableData: (body) =>
    dispatch(saveProductRuleSetAllTableData(body)),
  setSavePayloadForPopUp: (body) => dispatch(setSavePayloadForPopUp(body)),

  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductRulePopUp);
