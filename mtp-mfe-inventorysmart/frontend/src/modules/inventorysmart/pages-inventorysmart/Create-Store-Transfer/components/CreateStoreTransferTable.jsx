import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { Button } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import {
  getCreateStoreTransferData,
  setCreateStoreTransferLoader,
  setCreateStoreTransferSetAll,
} from "../../../services-inventorysmart/Create-Store-Transfer/create-store-transfer-service";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import CreateStoreTransferSetAll from "./CreateStoreTransferSetAll";
import colours from "core/Styles/colours";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import { FulfillmentTypeTagCell, fulfillmentLabels } from "modules/inventorysmart/pages-inventorysmart/DC-Transfer-Rule/ruleListColumnRenderers"

const useStyles = makeStyles(() => ({
  tableContainer: {
    minHeight: "500px",
    width: "100%",
    "& .row-disabled": {
      backgroundColor: "#FAFAFA !important",
      "& .ag-cell": {
        color: `${colours.neutralText} !important`,
      },
      "& .ag-checkbox-input-wrapper": {
        "&::after": {
          backgroundColor: "#FAFAFA !important",
          cursor: "not-allowed",
        },
        "&:hover::after": {
          border: `1px solid ${colours.chips}`,
        },
        "& input": {
          cursor: "not-allowed",
        },
      },
    },
  },
}));

function CreateStoreTransferTable(props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const agGridInstance = useRef(null);
  const tableNameRef = useRef(props.tableName);
  const [tableColumns, setTableColumns] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showSetAllPanel, setShowSetAllPanel] = useState(false);
  const [setAllOptions, setSetAllOptions] = useState(null);
  const [editedRows, setEditedRows] = useState(new Map());

  const storeTransferConfig = props?.createStoreTransferModuleConfig?.store_transfer_config || {};
  const uniqueRowIdentifier = props.uniqueRowIdentifier;

  useEffect(() => {
    tableNameRef.current = props.tableName;
  }, [props.tableName]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  const getDisplayValue = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    if (Array.isArray(value)) {
      const labels = value.map((item) => getDisplayValue(item)).filter((item) => item !== "-");
      return labels.length ? labels.join(", ") : "-";
    }
    if (typeof value === "object") {
      const label = value.label ?? value.value ?? value.name;
      return label === null || label === undefined || label === "" ? "-" : String(label);
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value;
  };

  const addCellRenderer = (columns) => {
    return columns.map((column) => {
      if (column.sub_headers && column.sub_headers.length) {
        const nested = addCellRenderer(column.sub_headers);
        column.sub_headers = nested;
        column.children = nested;
      }
      if (column && column.is_editable) {
        return {
          ...column,
          cellRenderer: (params, extraProps) => {
            if (params.data?.checkbox_disabled) {
              return (
                <div className={column?.type === "float" ? "number-cell" : ""}>
                  {getDisplayValue(params.value)}
                </div>
              )
            } 
            return (
              <CellRenderer
                cellData={params}
                column={column}
                extraProps={extraProps}
                actions={null}
              />
            )
          }
        }
      }
      if (column.column_name === "fulfillment_type" || column.column_name === "fulfilment_type") {
        return {
          ...column,
          type: "str",
          is_editable: false,
          editable: false,
          cellRenderer: (cellProps) => (
            <FulfillmentTypeTagCell
              {...cellProps}
              fulfillmentLabels={fulfillmentLabels}
            />
          )
        }
      }
      return column;
    })
  }

  const fetchCreateStoreTransferTableConfig = async () => {
    try {
      setTableLoader(true);

      let columns = await getColumnsAg("table_name=create_store_transfer")();

      if (columns && columns.length > 0) {
        let formattedColumns = agGridColumnFormatter(columns, null, null);
        formattedColumns = addCellRenderer(formattedColumns);
        setTableColumns(formattedColumns);
      }
      setTableLoader(false);
    } catch (error) {
      handleErrorMessage(error);
      setTableLoader(false);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
    if (props.loadTableInstance) {
      props.loadTableInstance(params);
    }
  };

  const onSelectionChanged = (params) => {
    const selectedNodes = params?.api?.getSelectedNodes();
    const actuallySelectedNodes =
      selectedNodes?.filter((node) => node?.isSelected()) || [];
    const selectedData = actuallySelectedNodes.map((node) => node?.data);
    setSelectedRows(selectedData);

    // Notify parent component of selection changes
    if (props.onSelectionChange) {
      props.onSelectionChange(selectedData);
    }
  };

  const openSetAllPanel = () => {
    if (selectedRows.length === 0) {
      displaySnackMessages("Please select at least one row", "info", props);
      return;
    }
    setShowSetAllPanel(true);
  };

  const closeSetAllPanel = () => {
    setShowSetAllPanel(false);
  };

  const refreshTable = () => {
    if (agGridInstance.current?.api) {
      agGridInstance.current.api.deselectAll();
    }
    setSelectedRows([]);
    setEditedRows(new Map());
    agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
  };

  const onCellValueChanged = (params) => {
    const { data, colDef, oldValue, newValue } = params;
    if (oldValue === newValue) {
      return;
    }

    const rowId = data?.[uniqueRowIdentifier];
    const columnName = colDef?.accessor || colDef?.field;

    const updatedEditedRows = new Map(editedRows);
    const existingEdits = updatedEditedRows.get(rowId) || {
      [uniqueRowIdentifier]: rowId,
      changes: {},
    };

    // Extract value from dropdown selections
    let valueToStore = newValue;
    if (
      Array.isArray(newValue) &&
      newValue?.length > 0 &&
      newValue?.[0]?.value !== undefined
    ) {
      if (colDef?.extra?.isMulti) {
        valueToStore = newValue.map((item) => item?.value);
      } else {
        valueToStore = newValue?.[0]?.value;
      }
    } else if (newValue?.value !== undefined) {
      valueToStore = newValue?.value;
    }

    existingEdits.changes[columnName] = valueToStore;
    updatedEditedRows.set(rowId, existingEdits);
    setEditedRows(updatedEditedRows);

    if (props.onCellEdit) {
      props.onCellEdit(updatedEditedRows);
    }
  };

  const createStoreTransferManualCallBack = async (
    manualbody,
    pageIndex,
    params
  ) => {
    try {
      setTableLoader(true);

      const body = {
        meta: {
          ...manualbody,
          limit: {
            limit: props.pageSize || 10,
            page: pageIndex + 1,
          },
        },
        table_name: tableNameRef.current,
      };

      let response = await props.getCreateStoreTransferData(body);

      if (!response?.data?.data) {
        displaySnackMessages("No data available", "info", props);
        setTableLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      }

      const responseData = response?.data?.data;
      const totalCount = response?.data?.total;

      // Extract dropdown options from first row
      if (!setAllOptions && responseData && responseData?.length > 0) {
        const firstRow = responseData?.[0];

        if (storeTransferConfig?.formFieldOptions) {
          const optionsObject = {};
          Object.entries(storeTransferConfig.formFieldOptions).forEach(
            ([accessor, optionsKey]) => {
              optionsObject[optionsKey] = firstRow?.[optionsKey] || [];
            }
          );

          setSetAllOptions(optionsObject);
        }
      }

      setTableLoader(false);

      const result = {
        data: responseData,
        totalCount: totalCount,
      };

      return result;
    } catch (error) {
      handleErrorMessage(error);
      setTableLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  useEffect(() => {
    if (props.refreshTrigger > 0) {
      refreshTable();
    }
  }, [props.refreshTrigger]);

  useEffect(() => {
    if (props.tableName) {
      fetchCreateStoreTransferTableConfig();
    }
  }, [props.tableName]);

  const getTopRightOptions = () => {
    let options = [];

    options.push(
      <Button
        key="apply-button"
        variant="outlined"
        onClick={props.onApply}
        disabled={props.editedRowsCount === 0}
      >
        {"Save Grid Edit"}
      </Button>
    );

    options.push(
      <Button
        key="set-all-button"
        variant="contained"
        onClick={openSetAllPanel}
        disabled={selectedRows.length === 0}
      >
        Set All
      </Button>
    );

    return options;
  };

  return (
    <div className={classes.tableContainer}>
      <Loader loader={tableLoader} minHeight={351}>
        <AgGridComponent
          columns={tableColumns}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={props.pageSize || 10}
          paginationPageSize={props.pageSize || 10}
          pagination={true}
          manualCallBack={(body, pageIndex, params) =>
            createStoreTransferManualCallBack(body, pageIndex, params)
          }
          uniqueRowId={uniqueRowIdentifier}
          loadTableInstance={loadTableInstance}
          selectAllHeaderComponent={true}
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
          onCellValueChanged={onCellValueChanged}
          topRightOptions={getTopRightOptions()}
          tableHeader={"Details"}
          rowClassRules={{
            "row-disabled": (params) => params.data?.checkbox_disabled,
          }}
          height="460px"
          adjustTableHeight={true}
          showCustomNoRowOverlay={false}
        />
      </Loader>

      <CreateStoreTransferSetAll
        open={showSetAllPanel}
        onClose={closeSetAllPanel}
        selectedRows={selectedRows}
        setAllOptions={setAllOptions}
        displaySnackMessages={displaySnackMessages}
        addSnack={props.addSnack}
        agGridInstance={agGridInstance}
        tableName={props.tableName}
        filters={props.appliedFilters}
        setCreateStoreTransferSetAll={props.setCreateStoreTransferSetAll}
        refreshTable={refreshTable}
        storeTransferConfig={storeTransferConfig}
        uniqueRowIdentifier={uniqueRowIdentifier}
        isStoreToStore={true}
      />
    </div>
  );
}

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    pageSize:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count || 10,
    createStoreTransferModuleConfig:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferModuleConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getCreateStoreTransferData: (payload) =>
    dispatch(getCreateStoreTransferData(payload)),
  setCreateStoreTransferLoader: (payload) =>
    dispatch(setCreateStoreTransferLoader(payload)),
  setCreateStoreTransferSetAll: (payload) =>
    dispatch(setCreateStoreTransferSetAll(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateStoreTransferTable);
