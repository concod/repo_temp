import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import { Button, useTranslation } from "impact-ui-v3";
import StoreTransferSetAll from "./StoreTransferSetAll";
import {
  getStoreTransferCreation,
  setStoreTransferSetAll,
} from "../../../services-inventorysmart/Store-Transfer-Configuration/store-transfer-configuration-service";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { FulfillmentTypeTagCell, fulfillmentLabels } from "modules/inventorysmart/pages-inventorysmart/DC-Transfer-Rule/ruleListColumnRenderers"

const useStyles = makeStyles(() => ({
  tableContainer: {
    minHeight: "500px",
    width: "100%",
  },
}));

function StoreTransferConfigTable(props) {
  const { t } = useTranslation();
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

  useEffect(() => {
    tableNameRef.current = props.tableName;
  }, [props.tableName]);

  const uniqueRowIdentifierKey = props.uniqueRowIdentifierKey;

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  const addCellRenderer = (columns) => {
    return columns.map((column) => {
      if (column.sub_headers && column.sub_headers.length) {
        const nested = addCellRenderer(column.sub_headers);
        column.sub_headers = nested;
        column.children = nested;
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

  const fetchStoreTransferTableConfig = async () => {
    try {
      setTableLoader(true);

      let columns = await getColumnsAg(
        "table_name=store_transfer_configuration"
      )();

      if (columns) {
        let formattedColumns = agGridColumnFormatter(columns, null, null);
        formattedColumns = addCellRenderer(formattedColumns);
        setTableColumns(formattedColumns);
      }
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const onSelectionChanged = (params) => {
    const selectedNodes = params?.api?.getSelectedNodes();
    const actuallySelectedNodes = selectedNodes?.filter((node) =>
      node?.isSelected()
    ) || [];
    const selectedData = actuallySelectedNodes.map((node) => node?.data);
    setSelectedRows(selectedData);
  };

  const openSetAllPanel = () => {
    if (selectedRows.length === 0) {
      displaySnackMessages(
        t("inventorysmart.pleaseSelectAtLeastOneRow"),
        "info",
        props
      );
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

    const rowIdentifier = data?.[uniqueRowIdentifierKey];
    const columnName = colDef?.accessor || colDef?.field;

    const updatedEditedRows = new Map(editedRows);
    const existingEdits = updatedEditedRows.get(rowIdentifier) || {
      [uniqueRowIdentifierKey]: rowIdentifier,
      changes: {},
    };

    // Extract value from dropdown selections (array of objects with {label, value})
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
    }

    existingEdits.changes[columnName] = valueToStore;
    updatedEditedRows.set(rowIdentifier, existingEdits);

    setEditedRows(updatedEditedRows);
  };

  const getTopRightOptions = () => {
    let options = [];
    options.push(
      <Button
        key="set-all-button"
        variant="contained"
        onClick={openSetAllPanel}
        disabled={selectedRows.length === 0}
      >
        {t("inventorysmart.setAll")}
      </Button>
    );

    return options;
  };

  useEffect(() => {
    fetchStoreTransferTableConfig();
  }, []);

  useEffect(() => {
    if (props.refreshTrigger > 0 && agGridInstance.current?.api) {
      setSelectedRows([]);
      setEditedRows(new Map());
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
    }
  }, [props.refreshTrigger]);

  useEffect(() => {
    if (props.filterAppliedTrigger > 0 && agGridInstance.current?.api) {
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
    }
  }, [props.filterAppliedTrigger]);

  useEffect(() => {
    // Notify parent component when edited rows change
    if (props.onEditedRowsChange) {
      props.onEditedRowsChange(editedRows);
    }
  }, [editedRows]);

  const storeTransferManualCallBack = async (manualbody, pageIndex, params) => {
    try {
      setTableLoader(true);

      const body = {
        meta: {
          ...manualbody,
          limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
        },
        table_name: tableNameRef.current,
      };

      let response = await props.getStoreTransferCreation(body);

      if (!response?.data?.data) {
        displaySnackMessages(
          t("inventorysmart.noDataAvailable"),
          "info",
          props
        );
        setTableLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      }

      const responseData = response?.data?.data;

      if (!setAllOptions && responseData && responseData?.length > 0) {
        const firstRow = responseData?.[0];
        const storeTransferConfig = props.storeTransferConfig;

        if (storeTransferConfig?.formFieldOptions) {
          const optionsObject = {};
          Object.entries(storeTransferConfig.formFieldOptions).forEach(
            ([accessor, optionsKey]) => {
              optionsObject[optionsKey] = firstRow?.[optionsKey] || [];
            }
          );
          setSetAllOptions(optionsObject);
        } else {
          setSetAllOptions({
            optimisation_level_options:
              firstRow?.optimisation_level_options || [],
            transfer_strategy_options: firstRow?.transfer_strategy_options || [],
            transfer_rule_options: firstRow?.transfer_rule_options || [],
          });
        }
      }

      setTableLoader(false);

      return {
        data: responseData,
        totalCount: responseData?.total,
      };
    } catch (error) {
      setTableLoader(false);
      handleErrorMessage(error);
      return { data: [], totalCount: 0 };
    }
  };

  return (
    <div className={globalClasses.padding}>
      <Loader loader={tableLoader}>
        <div className={classes.tableContainer}>
          <AgGridComponent
            columns={tableColumns}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSize || 10}
            paginationPageSize={props.pageSize || 10}
            pagination={true}
            manualCallBack={(body, pageIndex, params) =>
              storeTransferManualCallBack(body, pageIndex, params)
            }
            uniqueRowId={uniqueRowIdentifierKey}
            loadTableInstance={loadTableInstance}
            selectAllHeaderComponent={true}
            rowSelection="multiple"
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            topRightOptions={getTopRightOptions()}
            tableHeader={t("inventorysmart.storeTransferConfiguration")}
          />
        </div>
      </Loader>

      <StoreTransferSetAll
        open={showSetAllPanel}
        onClose={closeSetAllPanel}
        selectedRows={selectedRows}
        setAllOptions={setAllOptions}
        displaySnackMessages={displaySnackMessages}
        addSnack={props.addSnack}
        agGridInstance={agGridInstance}
        tableName={props.tableName}
        filters={props.filters}
        setStoreTransferSetAll={props.setStoreTransferSetAll}
        refreshTable={refreshTable}
        storeTransferConfig={props.storeTransferConfig}
        uniqueRowIdentifierKey={uniqueRowIdentifierKey}
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
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getStoreTransferCreation: (payload) =>
      dispatch(getStoreTransferCreation(payload)),
    setStoreTransferSetAll: (payload) =>
      dispatch(setStoreTransferSetAll(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreTransferConfigTable);
