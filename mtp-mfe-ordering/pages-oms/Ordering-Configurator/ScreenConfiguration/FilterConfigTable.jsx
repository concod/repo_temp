import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import Loader from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import { getColumnsAg } from "../../../../../core/actions/tableColumnActions";
import { connect } from "react-redux";
import agGridColumnFormatter from "../../../../../core/Utils/agGrid/column-formatter";
import { capitalize, cloneDeep, uniqueId, isEmpty } from "lodash";
import { fetchFilterConfig } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility.js";
import { addSnack } from "core/actions/snackbarActions";
import { Button } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import DeleteIcon from "@mui/icons-material/Delete";
import { saveScreenConfiguration } from "modules/oms/services-oms/Ordering-Configurator/ordering-configurator-service.js";
import { disableJustCache } from "core/Utils/axios";
import { Typography, Box } from "@mui/material";

const DEFAULT_PAGE_SIZE = 20;

const FilterConfigTable = (props) => {
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [originalRowData, setOriginalRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [instanceLoaded, setInstanceLoaded] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const tableInstance = useRef();
  const classes = useStyles();
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [hasEmptyLabel, setHasEmptyLabel] = useState(false);
  const lastEmptyWarnRef = useRef(null);

  // // Function to detect changes between original and current data
  // const hasChanges = useMemo(() => {
  //   if (originalRowData.length !== rowData.length) {
  //     setButtonDisabled(true);
  //   }

  //   return setButtonDisabled(JSON.stringify(originalRowData) !== JSON.stringify(rowData));

  // }, [originalRowData, rowData]);

  const createDropdownObject = (label, value, id) => ({
    label,
    value,
    id,
  });



  const fetchData = async () => {
    setLoading(true);
    setInstanceLoaded(false);
    try {
      disableJustCache()      // TODO: Replace with real API calls to fetch filter config data and columns
      // let tableColumnConfig = await props.getColumnsAg(
      //   "table_name=filter_config_create_update_table"
      // );
      console.log("filtersData", props?.productFilters);
      //   const mockRows = Array.from({ length: 87 }).map((_, i) => ({
      //     config_name: `Filter_${i + 1}`,
      //     dimension: i % 2 === 0 ? "channel" : "cluster",
      //     display_order: i + 1,
      //   }));
   
      let columnData = [
        {
          sub_headers: [],
          tc_code: 198,
          label: "Dimension",
          column_name: "dimension",
          dimension: "Others",
          type: "str",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 1,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "71279",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Column Name",
          column_name: "column_name",
          dimension: "Others",
          type: "list",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 2,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "71268",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {
            dropdownSearchable: "true",
          },
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Label",
          column_name: "label",
          dimension: "Others",
          type: "str",
          is_frozen: false,
          is_editable: true,
          is_aggregated: true,
          order_of_display: 3,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "71280",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: true,
          extra: {
            labelHirarchy: "false",
          },
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Multi Select",
          column_name: "is_multiple_selection",
          dimension: "Others",
          type: "ToogleField",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 4,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "727227",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Functionality",
          column_name: "display_type",
          dimension: "Others",
          type: "list",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 5,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "7270",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Filter Type",
          column_name: "filter_type",
          dimension: "Others",
          type: "list",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 6,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "7271",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Mandatory",
          column_name: "is_mandatory",
          dimension: "Others",
          type: "ToogleField",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 7,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "7272",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Order of Display",
          column_name: "display_order",
          dimension: "Others",
          type: "str",
          is_frozen: false,
          is_editable: false,
          is_aggregated: false,
          order_of_display: 5.0,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "7270",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
        // {
        //     "sub_headers": [],
        //     "tc_code": 198,
        //     "label": "Display Order",
        //     "column_name": "display_order",
        //     "dimension": "Others",
        //     "type": "list",
        //     "is_frozen": false,
        //     "is_editable": true,
        //     "is_aggregated": false,
        //     "order_of_display": 8,
        //     "is_hidden": false,
        //     "is_required": true,
        //     "tc_mapping_code": "71274",
        //     "aggregate_type": null,
        //     "formatter": null,
        //     "is_row_span": false,
        //     "footer": null,
        //     "is_searchable": false,
        //     "extra": {},
        //     "is_sortable": true,
        //     "width": 200,
        //     "is_deleted": false,
        //     "is_master_group": false
        // },
        {
          sub_headers: [],
          tc_code: 198,
          label: "Clearable",
          column_name: "is_clearable",
          dimension: "Others",
          type: "ToogleField",
          is_frozen: false,
          is_editable: true,
          is_aggregated: false,
          order_of_display: 10,
          is_hidden: false,
          is_required: false,
          tc_mapping_code: "71277",
          aggregate_type: null,
          formatter: null,
          is_row_span: false,
          footer: null,
          is_searchable: false,
          extra: {},
          is_sortable: true,
          width: 200,
          is_deleted: false,
          is_master_group: false,
        },
      ];

      const colConfig = cloneDeep(columnData).map((column) => {
        let config = column;
        switch (config.column_name) {
          case "column_name":
            // Create and assign options array for column_name col defs
            config.options = cloneDeep(props?.productFilters).map((option) =>
              createDropdownObject(
                option.column_name,
                option.column_name,
                option.hierarchy_level
              )
            );
            config.cellRenderer = (cellProps, extraProps) => {
              return (
                <CellRenderers
                  cellData={cellProps}
                  column={config}
                  extraProps={extraProps}
                ></CellRenderers>
              );
            };
            break;
          case "display_type":
            // Create and assign options array for display_type col defs using predefined input types
            config.options = ["dropdown"].map((field) =>
              createDropdownObject(
                capitalize(field.replace(/[^\w ]/, " ")),
                field,
                field
              )
            );
            config.cellRenderer = (cellProps, extraProps) => {
              return (
                <CellRenderers
                  cellData={cellProps}
                  column={config}
                  extraProps={extraProps}
                ></CellRenderers>
              );
            };
            break;
          case "filter_type":
            config.options = [
              { label: "Cascaded", value: "cascaded" },
              { label: "NonCascaded", value: "non-cascaded" },
            ];
            config.cellRenderer = (cellProps, extraProps) => {
              return (
                <CellRenderers
                  cellData={cellProps}
                  column={config}
                  extraProps={extraProps}
                ></CellRenderers>
              );
            };
            break;
            //   case "level":
            //   case "display_order":
            if (rowData.length > 0) {
              config.options = updateLevels(rowData);
              config.cellRenderer = (cellProps, extraProps) => {
                return (
                  <CellRenderers
                    cellData={cellProps}
                    column={config}
                    extraProps={extraProps}
                  ></CellRenderers>
                );
              };
            }
            break;
        }
        return config;
      });
      let formattedColumns = agGridColumnFormatter(colConfig);
      setColumnDefs(formattedColumns);
      if (formattedColumns) {
        let fc_name = localStorage.getItem("module_fc_name");
        const fetchData = await fetchFilterConfig(
          fc_name
        );
        console.log("rowData", fetchData);
        setDataLoaded(true);
        // Disable rows whose column_name is frozen based on productFilters.freeze === true
        const frozenColumns = new Set(
          (props?.productFilters || [])
            .filter((f) => f?.is_freezed === true)
            .map((f) => f?.column_name)
        );
        const processedRows = (fetchData || []).map((row) => {
          const base = frozenColumns.has(row?.column_name)
            ? { ...row, disableEditSelection: true, _hideSelection: true }
            : { ...row };
          const l_filter_type =
            typeof row?.type === "string"
              ? row.type.toLowerCase()
              : row?.filter_type;

                        // Map hierarchy_level from productFilters to display_order
          const matchedProductFilter = (props?.productFilters || []).find(
            (f) => f?.column_name === row?.column_name
          );
          const displayOrder = matchedProductFilter?.hierarchy_level || row?.display_order || 1;

          return {
            _rowId: row?._rowId || uniqueId("fc_"),
            ...base,
            ...(l_filter_type ? { filter_type: l_filter_type } : {}),
            display_order: displayOrder,
          };
        });
        processedRows.sort((a, b) => a.display_order - b.display_order);
        setRowData(processedRows);
        setOriginalRowData(processedRows);
      }
    } catch (e) {
      console.log("error", e);
      // no-op for now
    } finally {
      setLoading(false);
    }
  };

  const forceUpdateTable = () => {
    tableInstance?.current?.api.refreshCells({
      force: true,
    });
  };

  useEffect(() => {
    console.log("rowData", rowData);
    // Only fetch data if it hasn't been loaded yet

      fetchData();
    
  }, [instanceLoaded]);

  const onCellValueChangeHandler = async (event) => {
    const columnId = event.column.colId;
    const initialValue = event.oldValue;
    const value = event.value;
    const rowIndex = event.rowIndex; // not used for updates; _rowId is used instead for stability
    setButtonDisabled(true);
    if (columnId === "column_name") {
      const currentRowId = event?.data?._rowId;
      // check duplicates using local state (source of truth)
      const isDuplicate = (rowData || []).some(
        (row) => row?._rowId !== currentRowId && row?.column_name === value
      );
      if (isDuplicate) {
        props?.addSnack?.({
          message: "Please select a unique filter combination",
          options: { variant: "error" },
        });
        // revert column_name and label on the edited node only; no table reload
        try {
          event?.node?.setDataValue?.("column_name", initialValue);
          const prevMatched = (props?.productFilters || []).find(
            (f) => f?.column_name === initialValue
          );
          const prevLabel = prevMatched?.label ?? event?.data?.label;
          event?.node?.setDataValue?.("label", prevLabel);
          
        } catch (e) {}
        return;
      }

      // unique: update label and mapped attributes from productFilters
      const matched = (props?.productFilters || []).find(
        (f) => f?.column_name === value
      );
      const newLabel = matched?.label ?? event?.data?.label;
      const newDisplayOrder = matched?.hierarchy_level ?? event?.data?.display_order ?? 1;

      // apply on grid node (no refresh)
      try {
        event?.node?.setDataValue?.("label", newLabel);
        event?.node?.setDataValue?.("display_order", newDisplayOrder);
      } catch (e) {}

      // sync local state using stable _rowId
      setRowData((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((r) => r?._rowId === currentRowId);
        if (idx > -1) {
          next[idx] = {
            ...next[idx],
            column_name: value,
            label: newLabel,
            display_order: newDisplayOrder,
          };
        }
        return next;
      });
      return;
    }

    // handle normal label change
    if (columnId === "label") {
      
      const currentRowId = event?.data?._rowId;
      const newLabel = value;
      const prevLabel = initialValue;
      const warnKey = `${currentRowId}:${String(newLabel ?? "").trim()}`;
      // update only local state; grid already has the edit
      setRowData((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((r) => r?._rowId === currentRowId);
        if (idx > -1) {
          next[idx] = {
            ...next[idx],
            label: newLabel,
          };
        }
        const hasEmpty = next.some(r => !String(r?.label ?? "").trim());
        setHasEmptyLabel(hasEmpty);
        const becameEmpty = !String(newLabel ?? "").trim() && !!String(prevLabel ?? "").trim();
        if (becameEmpty && lastEmptyWarnRef.current !== warnKey) {
          props?.addSnack?.({
            message: "Label cannot be empty",
            options: { variant: "warning" },
          });
          lastEmptyWarnRef.current = warnKey;
        }
        return next;
      });
      return;
    }

    // handle simple filter_type change
    if (columnId === "filter_type") {
      const currentRowId = event?.data?._rowId;
      const allowed = ["cascaded", "non-cascaded"];
      const normalized =
        typeof value === "string" ? value.toLowerCase() : value;
      if (!allowed.includes(normalized)) {
        // revert invalid
        try {
          event?.node?.setDataValue?.("filter_type", initialValue);
        } catch (e) {}
        return;
      }
      // grid has the value; sync local state
      setRowData((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((r) => r?._rowId === currentRowId);
        if (idx > -1) {
          next[idx] = {
            ...next[idx],
            filter_type: normalized,
            type: normalized,
          };
        }
        return next;
      });
      return;
    }

    // handle boolean toggles without reload
    if (
      ["is_mandatory", "is_multiple_selection", "is_clearable"].includes(
        columnId
      )
    ) {
      const currentRowId = event?.data?._rowId;
      // coerce to boolean if needed
      let boolVal = value;
      if (typeof boolVal !== "boolean") {
        if (typeof boolVal === "string") {
          boolVal = boolVal.toLowerCase() === "true";
        } else {
          boolVal = !!boolVal;
        }
      }
      // grid already set the value; just sync local state
      setRowData((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const idx = next.findIndex((r) => r?._rowId === currentRowId);
        if (idx > -1) {
          next[idx] = {
            ...next[idx],
            [columnId]: boolVal,
          };
        }
        return next;
      });
      return;
    }
    forceUpdateTable();
  };

  const loadTableInstance = (instance) => {
    tableInstance.current = instance;
    //setInstanceLoaded(true);
  };

  const onSelectionChangeHandler = (event) => {
    var selections = event.api.getSelectedRows();
    //console.log("selections", selections);

    const visibleSelections = selections.filter(
      row => row._hideSelection !== true
    );
    //console.log("visibleSelections", visibleSelections);
    setSelectedRows(visibleSelections);
  };

  const onDeleteHandler = () => {
    if (!selectedRows?.length) return;
    const idsToDelete = new Set(selectedRows.map((r) => r?._rowId));
    setRowData((prev) =>
      Array.isArray(prev) ? prev.filter((r) => !idsToDelete.has(r?._rowId)) : []
    );
    try {
      tableInstance?.current?.api?.deselectAll?.();
      setButtonDisabled(true);
    } catch (e) {}

    props?.addSnack?.({
      message: `${idsToDelete.size} row(s) deleted`,
      options: { variant: "success" },
    });
  };
  let fc_code = localStorage.getItem("module_fc_code");

  const addingNewFilter = () => {
    // allow maximum of 2 newly added filters (beyond initially loaded data)
    const existingCount = originalRowData?.length || 0;
    const currentCount = rowData?.length || 0;
    const newlyAddedCount = Math.max(0, currentCount - existingCount);
    if (newlyAddedCount >= 2) {
      props?.addSnack?.({
        message: "Maximum 2 new filters allowed",
        options: { variant: "warning" },
      });
      return;
    }
    // create a new row with default values
    const newRow = {
      _rowId: uniqueId("fc_"), // unique identifier
      column_name: "", // empty by default
      label: "", // empty by default
      dimension: "product", // can keep empty or default value
      display_type: "dropdown", // empty dropdown initially
      filter_type: "cascaded", // empty until user selects
      is_mandatory: false,
      is_multiple_selection: false,
      is_clearable: false,
      disableEditSelection: false,
      _hideSelection: false,
      fc_code: fc_code,
      "level": 1,
      "range_min": null,
      "range_max": null,
      "default_value": null,
      "is_disabled": false,
      "is_clearable": true,
      "is_required": false,
      "extra": {},
      "is_deleted": false,
      type: "cascaded"
    
    };

    // update rowData state
    const nextLength = (rowData?.length || 0) + 1;
    setRowData((prev) => [...(prev || []), newRow]);

    // optional: scroll to bottom / focus new row
    try {
      setTimeout(() => {
        const api = tableInstance?.current?.api;
        if (api) {
          const lastRowIndex = nextLength - 1;
          api.ensureIndexVisible(lastRowIndex, "bottom");
          props?.addSnack?.({
            message: `New filter row added`,
            options: { variant: "success" },
          });
        }
      }, 50);
    } catch (e) {}
  };

  const saveConfiguration = async () => {
    try {
      // validation: block save if any label is empty
      const hasEmpty = rowData.some(r => !String(r?.label ?? "").trim());
      if (hasEmpty) {
        setHasEmptyLabel(true);
        props?.addSnack?.({
          message: "Please fill all labels before saving",
          options: { variant: "warning" },
        });
        return;
      }
      // Remove unwanted keys from row data before sending
      const cleanedRowData = rowData.map((row) => {
        const {
          disableEditSelection,
          filter_type,
          _hideSelection,
          _rowId,
          ...cleanedRow
        } = row;
        return cleanedRow;
      });

      const payload = {
        //table_name: localStorage.getItem("module_fc_name"),
        filter_configurations: cleanedRowData,
      };
      let saveData = await props.saveScreenConfiguration(payload);
      if (saveData?.data?.status) {
        setInstanceLoaded(true);
        tableInstance?.current?.api.refreshCells({
          force: true,
        });
        setButtonDisabled(true);
        props?.addSnack?.({
          message: "Filter Configuration saved successfully",
          options: { variant: "success" },
        });
        //window.location.reload()
      }
    } catch (error) {
      setButtonDisabled(false);
      props?.addSnack?.({
        message: "Something went wrong",
        options: { variant: "error" },
      });
    }
  };

  const getTopRightOptions = () => {
    let options = [];

    options.push(
      <>
        <Button
         variant="secondary"
         color="primary"
         className={classes.button}
          //className={classes.button}
          onClick={() => saveConfiguration()}
          disabled={!buttonDisabled || hasEmptyLabel}
        >
          Save
        </Button>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          onClick={() => addingNewFilter()}
        >
          Add New Filter
        </Button>
        <Button
          onClick={() => onDeleteHandler()}
          size="large"
          disabled={selectedRows.length === 0}
          icon={<DeleteIcon />}
          variant="secondary"
          color="primary"
          sx={{
            minWidth: "20px",
            marginRight: "10px",
          }}
        />
      </>
    );
    return options;
  };


  return (
    <Loader loader={loading} minHeight={"260px"}>
      {rowData?.length !==0 ?
      <div className="ag-theme-alpine" style={{ height: 500, width: "100%" }}>
        <AgGridTable
          rowdata={rowData}
          columns={columnDefs}
          //defaultColDef={defaultColDef}
          pagination={true}
          //paginationPageSize={pageSize}
          suppressPaginationPanel={false}
          animateRows={true}
          onCellValueChanged={onCellValueChangeHandler}
          loadTableInstance={loadTableInstance}
          uniqueRowId={"_rowId"}
          onSelectionChanged={onSelectionChangeHandler}
          topRightOptions={getTopRightOptions()}
          selectAllHeaderComponent={true}
          hideSelectAllRecords={true}
          tableHeader={
            props.moduleName
              ? `${props.moduleName} Screen Filter Configuration`
              : "Screen Filter Configuration"
          }
        />
      </div>
      :
      <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="200px"
      width="100%"
    >
      <Typography variant="h6" color="text.secondary" style={{marginRight:"9%"}}>
        No filter configuration available for {props.moduleName}
      </Typography>
    </Box>
}
    </Loader>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapActionToProps = {
  // getFilterConfiguration,
  // saveFilterConfig,
  getColumnsAg,
  addSnack,
  saveScreenConfiguration,
};

export default connect(mapStateToProps, mapActionToProps)(FilterConfigTable);
