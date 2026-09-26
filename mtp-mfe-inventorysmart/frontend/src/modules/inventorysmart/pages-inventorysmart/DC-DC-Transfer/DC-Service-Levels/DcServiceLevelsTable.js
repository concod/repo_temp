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
import {
  handleErrorMessage,
  isActionAllowedOnSubModule,
} from "../../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import {
  setDcServiceLevelsLoader,
  getDcServiceLevelsData,
  updateDCServiceLevels,
} from "modules/inventorysmart/services-inventorysmart/DC-Service-Levels/dc-service-levels-service";
import { Grid } from "@mui/material";
import { Button, Modal } from "impact-ui-v3";
import Form from "core/Utils/form";
import { getTenantConfigData } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";

const DcServiceLevelsTable = (props) => {
  const [columnDefs, setColumnDefs] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [deSelections, setDeSelections] = useState([]);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [setAllFormData, updateSetAllFormData] = useState([]);
  const [setAllInputData, updateSetAllInputData] = useState({});
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const [enableSave, setEnableSave] = useState(false);
  const [setAllSaveEnable, updateSetAllSaveEnable] = useState(false);
  const [requiredFields, setRequiredFields] = useState([]);

  const agGridInstance = useRef(null);
  const tableMetaDataRef = useRef({});
  const dcServiceLevelsFiltersRef = useRef({});
  const updatedRowEditInstance = useRef([]);

  useEffect(() => {
    const onLoad = async () => {
      let columns = await getColumnsAg("table_name=dc_service_levels_table")();

      columns = columns.map((col) => {
        if (
          [
            "safety_stock_units",
            "service_level_percentage",
            "safety_stock_wos",
          ].indexOf(col.column_name) > -1
        ) {
          col.cellRenderer = (cellProps, extraProps) => {
            let isDisabled = true;
            switch (cellProps.data.safety_stock_method) {
              case "Service Level":
                if (col.column_name === "service_level_percentage") {
                  isDisabled = false;
                }
                break;
              case "Safety Stock":
                if (col.column_name === "safety_stock_units") {
                  isDisabled = false;
                }
                break;
              case "Safety Stock WOS":
                if (col.column_name === "safety_stock_wos") {
                  isDisabled = false;
                }
                break;
              default:
                isDisabled = true;
            }
            col.extra.is_disabled = isDisabled;
            return (
              <CellRenderers
                cellData={cellProps}
                column={col}
                extraProps={extraProps}
              ></CellRenderers>
            );
            // );
          };
        }
        return col;
      });
      const setAllData = await getTenantConfigData(
        1,
        "inventory_smart_dc_service_levels_set_all"
      );
      updateSetAllFormData(setAllData.data?.data?.[0]?.attribute_value);
      setColumnDefs(columns);
    };
    onLoad();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      dcServiceLevelsFiltersRef.current = props.selectedFilters;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    }
    agGridInstance?.current?.api?.deselectAll();
  }, [props.selectedFilters]);

  useEffect(() => {
    if (setAllFormData?.length) {
      initializeSetAllInputData();
      let fields = [];
      setAllFormData.map((field) => {
        if (field.required) {
          fields.push(field);
        }
      });
      setRequiredFields(fields);
    }
  }, [setAllFormData]);

  useEffect(() => {
    if (
      requiredFields.length &&
      openDialogForSetAll &&
      updatedRowEdits.length
    ) {
      let data = cloneDeep(updatedRowEdits[0]);
      let validationCheck = true;
      requiredFields.map((field) => {
        if (!data[field.accessor] || data[field.accessor] === "") {
          validationCheck = false;
        }
      });
      updateSetAllSaveEnable(validationCheck);
    }
  }, [requiredFields, openDialogForSetAll, updatedRowEdits]);

  useEffect(() => {
    if (!isEmpty(updatedRowEdits)) {
      updatedRowEditInstance.current = cloneDeep(updatedRowEdits);
      const safetyStockMethodMetricsMapping = {
        service_level_percentage: "Service Level",
        safety_stock_units: "Safety Stock",
        safety_stock_wos: "Safety Stock WOS",
      };
      let validationCheck = true;
      updatedRowEdits.map((row) => {
        Object.entries(row).map(([key, value]) => {
          if (key in safetyStockMethodMetricsMapping) {
            if (
              row["safety_stock_method"] ===
                safetyStockMethodMetricsMapping[key] &&
              (!value || value === "")
            ) {
              validationCheck = false;
            }
          } else if (key !== "id") {
            if (!value || value === "") {
              validationCheck = false;
            }
          }
        });
      });
      setEnableSave(validationCheck);
    } else {
      setEnableSave(false);
    }
  }, [updatedRowEdits]);

  const initializeSetAllInputData = () => {
    let editableFieldKeys = setAllFormData.map((item) => {
      if (item.value_type === "percentage") {
        return {
          [item.accessor]: "",
        };
      } else {
        return {
          [item.accessor]: null,
        };
      }
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

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const hasEditAccess = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_TRANSFER_CONSTRAINTS,
      "edit"
    );
    return editEnabled;
  };

  const updateSetAllFormFields = (value) => {
    let fields = cloneDeep(setAllFormData);
    let slpIdx = -1;
    let ssuIdx = -1;
    let sswIdx = -1;
    fields.map((field, idx) => {
      switch (field.accessor) {
        case "safety_stock_units":
          ssuIdx = idx;
          break;
        case "service_level_percentage":
          slpIdx = idx;
          break;
        case "safety_stock_wos":
          sswIdx = idx;
          break;
      }
    });
    fields[slpIdx] = { ...fields[slpIdx], isDisabled: true, required: false };
    fields[ssuIdx] = { ...fields[ssuIdx], isDisabled: true, required: false };
    fields[sswIdx] = { ...fields[sswIdx], isDisabled: true, required: false };
    switch (value) {
      case "Service Level":
        fields[slpIdx] = {
          ...fields[slpIdx],
          isDisabled: false,
          required: true,
        };
        break;
      case "Safety Stock":
        fields[ssuIdx] = {
          ...fields[ssuIdx],
          isDisabled: false,
          required: true,
        };
        break;
      case "Safety Stock WOS":
        fields[sswIdx] = {
          ...fields[sswIdx],
          isDisabled: false,
          required: true,
        };
        break;
    }
    updateSetAllFormData(fields);
  };

  const handleSetAllChange = (updatedFormData, id, field, e) => {
    if (id === "safety_stock_method") {
      updateSetAllFormFields(e[0].value);
      switch (e[0].value) {
        case "Service Level":
          updatedFormData["safety_stock_units"] = "";
          updatedFormData["safety_stock_wos"] = "";
          break;
        case "Safety Stock":
          updatedFormData["service_level_percentage"] = "";
          updatedFormData["safety_stock_wos"] = "";
          break;
        case "Safety Stock WOS":
          updatedFormData["safety_stock_units"] = "";
          updatedFormData["service_level_percentage"] = "";
          break;
      }
    }
    if (field.value_type === "number") {
      updatedFormData[id] = Number(updatedFormData[id]);
    }
    if (field.minCappedValue && updatedFormData[id] < field.minCappedValue) {
      updatedFormData[id] = field.minCappedValue;
    }
    if (field.maxCappedValue && updatedFormData[id] > field.maxCappedValue) {
      updatedFormData[id] = field.maxCappedValue;
    }
    let rowEdits = [];
    rowEdits.push({
      id: 1,
      ...updatedFormData,
    });
    setUpdatedRowEdits(rowEdits);
  };

  const closeSetAll = () => {
    setOpenDialogForSetAll(false);
    initializeSetAllInputData();
    setUpdatedRowEdits([]);
  };

  const saveDataOnApply = async (isSetAll) => {
    try {
      let constraints = [];
      updatedRowEdits.map((row) => {
        constraints.push({
          id: row.id ? row.id : 1,
          target_wos: row.target_wos,
          min_stock: row.min_stock,
          safety_stock_method: row.safety_stock_method,
          safety_stock_units: row.safety_stock_units
            ? row.safety_stock_units
            : null,
          service_level_percentage: row.service_level_percentage
            ? row.service_level_percentage
            : "",
          safety_stock_wos: row.safety_stock_wos ? row.safety_stock_wos : null,
        });
      });
      let checkConfiguration = agGridInstance.current?.api?.checkConfiguration;
      let isAllSelected =
        checkConfiguration[checkConfiguration.length - 1]?.checkAll;
      let excludedRows = [];
      let row_update = [];
      if (isSetAll) {
        selectedRecords.map((row) => {
          row_update.push(row.id);
        });
      }
      if (isAllSelected) {
        deSelections.map((row) => {
          excludedRows.push(row.id);
        });
      }
      let body = {
        filters: dcServiceLevelsFiltersRef.current,
        constraint: constraints,
        is_all_records_selected: isAllSelected ? isAllSelected : false,
        excluded_rows: excludedRows,
        row_update: row_update,
        meta: {
          ...tableMetaDataRef.current,
          limit: { limit: props.pageSize || 10, page: 1 },
        },
      };
      props.setDcServiceLevelsLoader(true);
      let response = await props.updateDCServiceLevels(body);
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
      props.setDcServiceLevelsLoader(false);
    } catch (error) {
      props.setDcServiceLevelsLoader(false);
      handleErrorMessage(error, props);
    }
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

  const manualCallDcServiceLevels = async (manualBody, pageIndex, params) => {
    tableMetaDataRef.current = manualBody;
    let body = {
      meta: {
        ...manualBody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      filters: dcServiceLevelsFiltersRef.current,
    };
    try {
      props.setDcServiceLevelsLoader(true);
      let response = await props.getDcServiceLevelsData(body);
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
        props.setDcServiceLevelsLoader(false);
        setTimeout(() => {
          agGridInstance.current.api.refreshCells({
            columns: [
              "service_level_percentage",
              "safety_stock_units",
              "safety_stock_wos",
            ],
            force: true,
          });
        }, 1000);
        return {
          data: formattedData,
          totalCount: response.data.total,
        };
      }
    } catch (error) {
      props.setDcServiceLevelsLoader(false);
      handleErrorMessage(error, props);
    }
  };

  const openPopUpModal = () => {
    return (
      <Modal
        open={openDialogForSetAll}
        onClose={() => setOpenDialogForSetAll(false)}
        size="medium"
        title="Set All"
        primaryButtonLabel="Apply"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={() => saveDataOnApply(true)}
        onSecondaryButtonClick={() => closeSetAll()}
        primaryButtonProps={{ disabled: !setAllSaveEnable }}
      >
        <Loader loader={props.dcTransferConstraintsTableDataLoader}>
          <Form
            layout={"horizontal"}
            maxFieldsInRow={2}
            handleChange={handleSetAllChange}
            fields={setAllFormData}
            updateDefaultValue={true}
            defaultValues={setAllInputData}
            labelWidthSpan={8}
            spacing={2}
            rowSpacing={2}
          ></Form>
        </Loader>
      </Modal>
    );
  };

  const handleCellValueChange = (params) => {
    const { data, newValue, oldValue } = params;
    if (oldValue !== newValue && !isNull(newValue)) {
      if (params.column?.colId === "safety_stock_method") {
        agGridInstance.current.api.refreshCells({
          columns: [
            "service_level_percentage",
            "safety_stock_units",
            "safety_stock_wos",
          ],
          force: true,
        });
      }

      let cloneRefInstance = cloneDeep(updatedRowEditInstance.current);
      const existingIndex = cloneRefInstance.findIndex(
        (obj) => obj.id === data.id
      );
      let editedData = {};
      let editableFields = cloneDeep(setAllFormData);
      editableFields.map((field) => {
        let value =
          field.value_type === "percentage"
            ? data[field.accessor]?.toString()
            : data[field.accessor];
        editedData[field.accessor] = value;
      });
      editedData.id = data.id;
      if (existingIndex !== -1) {
        // Replace the existing object with the new object
        cloneRefInstance[existingIndex] = editedData;
        setUpdatedRowEdits(cloneRefInstance);
      } else {
        // Push the new object to the state
        setUpdatedRowEdits((prevState) => [...prevState, editedData]);
      }
    }
  };

  const getTopRightOptions = () => {
    const options = [
      <Button
        id="set-all-dc-transfer-constraints"
        variant="primary"
        size="large"
        onClick={() => {
          setOpenDialogForSetAll(true);
          setUpdatedRowEdits([]);
        }}
        disabled={!hasEditAccess() || !selectedRecords.length}
      >
        Set All
      </Button>,
      <Button
        id="create-product-profile"
        onClick={() => saveDataOnApply(false)}
        variant="primary"
        size="large"
        disabled={!hasEditAccess() || !enableSave}
      >
        Save
      </Button>,
    ];
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
            manualCallDcServiceLevels(body, pageIndex, params)
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
          topRightOptions={getTopRightOptions()}
          tableHeader="DC Service Levels"
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
    dcServiceLevelsLoader:
      inventorysmartReducer.inventorySmartDcServiceLevelsService
        .dcServiceLevelsLoader,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    setDcServiceLevelsLoader: (body) =>
      dispatch(setDcServiceLevelsLoader(body)),
    getDcServiceLevelsData: (body) => dispatch(getDcServiceLevelsData(body)),
    updateDCServiceLevels: (body) => dispatch(updateDCServiceLevels(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DcServiceLevelsTable);
