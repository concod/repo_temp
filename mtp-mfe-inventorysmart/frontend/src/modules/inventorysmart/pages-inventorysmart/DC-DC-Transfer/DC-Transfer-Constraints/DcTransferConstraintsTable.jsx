import React, { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import { cloneDeep, isEmpty, isNull } from "lodash";
import moment from "moment";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import {
  setDcTransferConstraintsDataLoader,
  getDcTransferConstraintsData,
  updateDCTransferConstraints,
} from "modules/inventorysmart/services-inventorysmart/DC-Transfer-Constraints/dc-transfer-constraints-service";
import { Grid } from "@mui/material";
import { Button, Modal } from "impact-ui-v3";
import Form from "core/Utils/form";
import { getTenantConfigData } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { handleErrorMessage } from "../../inventorysmart-utility";

const DcTransferConstraintsTable = (props) => {
  const [columnDefs, setColumnDefs] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [deSelections, setDeSelections] = useState([]);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [setAllFormData, updateSetAllFormData] = useState([]);
  const [setAllInputData, updateSetAllInputData] = useState({});
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [enableSave, setEnableSave] = useState(false);

  const agGridInstance = useRef(null);
  const tableMetaDataRef = useRef({});
  const dcTransferConstraintsFiltersRef = useRef({});
  const updatedRowEditInstance = useRef([]);

  useEffect(() => {
    const onLoad = async () => {
      let columns = await getColumnsAg(
        "table_name=dc_transfer_constraints_table"
      )();
      const setAllData = await getTenantConfigData(
        1,
        "inventory_smart_dc_transfer_set_all"
      );
      updateSetAllFormData(setAllData.data?.data?.[0]?.attribute_value);
      setColumnDefs(columns);
    };
    onLoad();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      dcTransferConstraintsFiltersRef.current = props.selectedFilters;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    }
    agGridInstance?.current?.api?.deselectAll();
  }, [props.selectedFilters]);

  useEffect(() => {
    if (setAllFormData?.length) {
      initializeSetAllInputData();
    }
  }, [setAllFormData]);

  useEffect(() => {
    if (!isEmpty(updatedRowEdits)) {
      updatedRowEditInstance.current = cloneDeep(updatedRowEdits);
      let validationCheck = true;
      let updatedData = cloneDeep(updatedRowEdits);
      updatedData.map((item) => {
        if (!item.min_transfer_quantity || item.min_transfer_quantity === "") {
          validationCheck = false;
        }
      });
      setEnableSave(validationCheck);
    } else {
      setEnableSave(false);
    }
  }, [updatedRowEdits]);

  const initializeSetAllInputData = () => {
    let editableFieldKeys = setAllFormData.map((item) => {
      return {
        [item.accessor]: "",
      };
    });
    let editableFieldKeysObject = Object.assign({}, ...editableFieldKeys);
    updateSetAllInputData(editableFieldKeysObject);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const hasEditAccess = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_TRANSFER_CONSTRAINTS,
      "edit"
    );
    return editEnabled;
  };

  const selectionsForRowModel = (params) => {
    const l_rowModelType = params.api.getModel().getType();
    if (l_rowModelType == "infinite") {
      return getSelectedRowsForInfiniteRowModel(params);
    } else {
      return params.api.getSelectedRows();
    }
  };

  const onSelectionChanged = (event) => {
    let selections = selectionsForRowModel(event);
    setSelectedRecords(selections);
    let deSelectedRows = event.api
      ?.getRenderedNodes()
      ?.filter((node) => !node.selected)
      ?.map((rowNode) => rowNode.data);
    setDeSelections(deSelectedRows);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const manualCallDcTransferConstraints = async (
    manualBody,
    pageIndex,
    params
  ) => {
    tableMetaDataRef.current = manualBody;
    let body = {
      meta: {
        ...manualBody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: dcTransferConstraintsFiltersRef.current,
    };
    try {
      setDcTransferConstraintsDataLoader(true);
      let response = await props.getDcTransferConstraintsData(body);
      if (response.data?.show_message) {
        props.displaySnackMessages(response.data?.message, "success", props);
      }
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        let formattedData;
        if (pageIndex) {
          formattedData = agGridRowFormatter(
            response.data.data,
            params?.api?.checkConfiguration,
            props.uniqueKey
          );
        } else {
          params.api.setCheckConfiguration([]);
          formattedData = response.data.data;
        }
        setDcTransferConstraintsDataLoader(false);
        return {
          data: formattedData,
          totalCount: response.data.total,
        };
      }
    } catch (error) {
      setDcTransferConstraintsDataLoader(false);
      handleErrorMessage(error, props);
    }
  };

  const closeSetAll = () => {
    setOpenDialogForSetAll(false);
    initializeSetAllInputData();
    setUpdatedRowEdits([]);
  };

  const openPopUpModal = () => {
    return (
      <Modal
        open={openDialogForSetAll}
        onClose={() => setOpenDialogForSetAll(false)}
        size="small"
        title="Set All"
        primaryButtonLabel="Apply"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={() => saveDataOnApply()}
        onSecondaryButtonClick={() => closeSetAll()}
        primaryButtonProps={{ disabled: !enableSave }}
      >
        <Loader loader={props.dcTransferConstraintsTableDataLoader}>
          <Form
            layout={"horizontal"}
            maxFieldsInRow={1}
            handleChange={handleSetAllChange}
            fields={setAllFormData}
            updateDefaultValue={false}
            defaultValues={setAllInputData}
            fieldTypeWidthSpan={4}
          ></Form>
        </Loader>
      </Modal>
    );
  };

  const handleSetAllChange = (updatedFormData) => {
    let rowEdits = [];
    let checkConfiguration = agGridInstance.current?.api?.checkConfiguration;
    let isAllSelected =
      checkConfiguration[checkConfiguration.length - 1]?.checkAll;
    if (isAllSelected) {
      rowEdits.push({
        id: 1,
        ...updatedFormData,
      });
    } else {
      selectedRecords.map((row) => {
        rowEdits.push({
          id: row.id,
          ...updatedFormData,
        });
      });
    }
    setUpdatedRowEdits(rowEdits);
  };

  const saveDataOnApply = async () => {
    try {
      let constraints = [];
      updatedRowEdits.map((row) => {
        constraints.push({
          id: row.id ? row.id : 1,
          min_transfer_quantity: Number(row.min_transfer_quantity),
        });
      });
      let checkConfiguration = agGridInstance.current?.api?.checkConfiguration;
      let isAllSelected =
        checkConfiguration[checkConfiguration.length - 1]?.checkAll;
      let excludedRows = [];
      if (isAllSelected) {
        deSelections.map((row) => {
          excludedRows.push(row.id);
        });
      }
      let body = {
        filters: dcTransferConstraintsFiltersRef.current,
        constraint: constraints,
        is_all_records_selected: isAllSelected ? isAllSelected : false,
        excluded_rows: excludedRows,
        meta: {
          ...tableMetaDataRef.current,
          limit: { limit: props.pageSize || 10, page: 1 },
        },
      };
      props.setDcTransferConstraintsDataLoader(true);
      let response = await props.updateDCTransferConstraints(body);
      setOpenDialogForSetAll(false);
      agGridInstance.current.api?.deselectAll();
      if (response.data?.status || response.data?.show_message) {
        props.displaySnackMessages(response.data?.message, "success", props);
        setUpdatedRowEdits([]);
        updatedRowEditInstance.current = [];
        // call the table api to fetch interdependent col with updated values
        agGridInstance.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
      props.setDcTransferConstraintsDataLoader(false);
    } catch (error) {
      props.setDcTransferConstraintsDataLoader(false);
      handleErrorMessage(error, props);
    }
  };

  const handleCellValueChange = (params) => {
    const { data, newValue, oldValue } = params;
    if (oldValue !== newValue && !isNull(newValue)) {
      let cloneRefInstance = cloneDeep(updatedRowEditInstance.current);
      const existingIndex = cloneRefInstance.findIndex(
        (obj) => obj.id === data.id
      );
      if (existingIndex !== -1) {
        // Replace the existing object with the new object
        cloneRefInstance[existingIndex] = data;
        setUpdatedRowEdits(cloneRefInstance);
      } else {
        // Push the new object to the state
        setUpdatedRowEdits((prevState) => [...prevState, data]);
      }
    }
  };

  const getTopRightOptions = () => {
    const options = [];
    options.push(<Button
      id="set-all-dc-transfer-constraints"
      variant="tertiary"
      size="large"
      onClick={() => setOpenDialogForSetAll(true)}
      disabled={!hasEditAccess() || !selectedRecords.length}
    >
      Set All
    </Button>);
    options.push(<Button
      id="create-product-profile"
      onClick={() => saveDataOnApply()}
      variant="primary"
      size="large"
      disabled={!hasEditAccess() || !enableSave}
    >
      Save
    </Button>);
    return options;
  };

  return (
    <Grid>
      <Loader loader={props.dcTransferConstraintsTableDataLoader}>
        <AgGridComponent
          uniqueRowId={"id"}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          selectAllHeaderComponent={hasEditAccess()}
          columns={columnDefs}
          cacheBlockSize={props.pageSize || 10}
          onSelectionChanged={onSelectionChanged}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex, params) =>
            manualCallDcTransferConstraints(body, pageIndex, params)
          }
          onCellValueChanged={(params) => {
            handleCellValueChange(params);
          }}
          skipAutoSizeColumn={true}
          hideChildSelection={true}
          groupDisplayType={"custom"}
          suppressAggFuncInHeader={true}
          childKey={"data"}
          treeData={true}
          purgeClosedRowNodes={true}
          paginationPageSize={props.pageSize}
          tableHeader="DC Transfer Constraints"
          topRightOptions={getTopRightOptions()}
        />
      </Loader>
      {openDialogForSetAll && openPopUpModal()}
    </Grid>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    dcTransferConstraintsTableDataLoader:
      inventorysmartReducer.inventorySmartDcTransferConstraints
        .dcTransferConstraintsTableDataLoader,
    savedEditedData:
      inventorysmartReducer.inventorySmartDcTransferConstraints.savedEditedData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    setDcTransferConstraintsDataLoader: (body) =>
      dispatch(setDcTransferConstraintsDataLoader(body)),
    getDcTransferConstraintsData: (body) =>
      dispatch(getDcTransferConstraintsData(body)),
    updateDCTransferConstraints: (body) =>
      dispatch(updateDCTransferConstraints(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DcTransferConstraintsTable);
