import { useEffect, useState, useCallback, useRef } from "react";
import { connect } from "react-redux";
import { cloneDeep, uniqueId } from "lodash";
import { Button, useTranslation } from "impact-ui-v3";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import axiosInstance from "core/Utils/axios";
import LoadingOverlay from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";

const TABLE_DATA_API_URL = "/core/configuration/table-data";
const ATTRIBUTES_LIST_API_URL =
  "/core/configuration/product-store-attributes-list";

const COL_DEFAULTS = {
  sub_headers: [],
  tc_code: null,
  dimension: "Product",
  is_frozen: false,
  is_editable: true,
  is_aggregated: false,
  is_hidden: false,
  is_required: false,
  tc_mapping_code: null,
  aggregate_type: "",
  formatter: "",
  is_row_span: false,
  footer: "",
  is_searchable: false,
  extra: {},
  is_sortable: false,
  width: 150,
  is_deleted: false,
};

const ALL_COLUMNS_MAP = {
  attribute_name: { ...COL_DEFAULTS, label: "Hierarchies", column_name: "attribute_name", type: "list", order_of_display: 1, is_searchable: true },
  label: { ...COL_DEFAULTS, label: "Attribute Label", column_name: "label", type: "str", order_of_display: 2 },
  is_hierarchy: { ...COL_DEFAULTS, label: "Is Hierarchy", column_name: "is_hierarchy", type: "bool", order_of_display: 3 },
  is_attribute: { ...COL_DEFAULTS, label: "Is Attribute", column_name: "is_attribute", type: "bool", order_of_display: 3 },
  is_main_col: { ...COL_DEFAULTS, label: "Is Main Col", column_name: "is_main_col", type: "bool", order_of_display: 4 },
  hierarchy_level: { ...COL_DEFAULTS, label: "Hierarchy Level", column_name: "hierarchy_level", type: "list", order_of_display: 5 },
  datatype: {
    ...COL_DEFAULTS,
    label: "Datatype",
    column_name: "datatype",
    type: "list",
    order_of_display: 6,
    extra: {
      options: [
        { label: "str", value: "str", id: "str" },
        { label: "int", value: "int", id: "int" },
        { label: "float", value: "float", id: "float" },
        { label: "bool", value: "bool", id: "bool" },
        { label: "date", value: "date", id: "date" },
        { label: "datetime", value: "datetime", id: "datetime" },
        { label: "percentage", value: "percentage", id: "percentage" },
        { label: "list", value: "list", id: "list" },
      ],
    },
  },
  order_of_display: { ...COL_DEFAULTS, label: "Order Of Display", column_name: "order_of_display", type: "list", order_of_display: 8 },
  is_mandatory: { ...COL_DEFAULTS, label: "Is Mandatory", column_name: "is_mandatory", type: "bool", order_of_display: 9 },
  module_code: { ...COL_DEFAULTS, label: "Module Code", column_name: "module_code", type: "int", order_of_display: 10 },
  attribute_dimension: {
    ...COL_DEFAULTS,
    label: "Attribute Dimension",
    column_name: "attribute_dimension",
    type: "list",
    order_of_display: 11,
    extra: {
      options: [
        { label: "Product", value: "product", id: "product" },
        { label: "Store", value: "store", id: "store" },
      ],
    },
  },
  extra: { ...COL_DEFAULTS, label: "Extra", column_name: "extra", type: "str", order_of_display: 12 },
};

const DEFAULT_COLUMN_LIST = ["attribute_name", "label", "order_of_display", "is_mandatory"];

const RclModuleSettings = (props) => {
  const { t } = useTranslation();
  const [rowData, setRowData] = useState([]);
  const [formattedColumns, setFormattedColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const tableInstance = useRef();
  const productSetRef = useRef(new Set());
  const storeSetRef = useRef(new Set());
  const psafSetRef = useRef(new Set());
  const baseColumnsRef = useRef(null);
  const labelMapRef = useRef(new Map());
  const attributeMetadataRef = useRef(new Map());

  const loadTableInstance = (instance) => {
    tableInstance.current = instance;
  };

  const forceUpdateTable = () => {
    tableInstance?.current?.api?.refreshCells({
      force: true,
    });
  };

  const onSelectionChangeHandler = (event) => {
    const selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  const addNewRow = () => {
    const newRow = cloneDeep({
      attribute_name: null,
      label: '',
      order_of_display: rowData.length + 1,
      is_mandatory: false,
      attribute_dimension: 'product',
      row_id: uniqueId('row_')
    });
    setRowData((prev) => [...prev, newRow]);
  };

  const handleDelete = () => {
    tableInstance.current.api.applyTransaction({ remove: selectedRows });
    const displayedRowCount =
      tableInstance.current?.api?.getDisplayedRowCount() || 0;
    const remainingRows = [];
    for (let i = 0; i < displayedRowCount; i++) {
      const rowNode = tableInstance.current.api.getDisplayedRowAtIndex(i);
      remainingRows.push(rowNode.data);
    }
    remainingRows.sort((a, b) => a.order_of_display - b.order_of_display);
    remainingRows.forEach((row, index) => {
      row.order_of_display = index + 1;
    });
    setRowData(remainingRows);
    setSelectedRows([]);
  };

  const handleCellValueChanged = (event) => {
    const columnId = event.column.colId;
    const initialValue = event.oldValue;
    const value = event.value;
    const rowIndex = event.rowIndex;

    switch (columnId) {
      case "attribute_name": {
        if (initialValue === value) break;

        const allSelectedValues = rowData.map((data) => data.attribute_name);
        const idx = allSelectedValues.indexOf(value);
        if (idx > -1) {
          allSelectedValues.splice(idx, 1);
        }

        if (allSelectedValues.includes(value)) {
          props.addSnack({
            message: t("moduleConfigurator.rcl.uniqueAttribute"),
            options: { variant: "error" },
          });
          setRowData((old) =>
            old.map((row, index) => {
              if (index === rowIndex) {
                return { ...row, [columnId]: initialValue };
              }
              return row;
            })
          );
        } else {
          const newLabel = labelMapRef.current.get(value) || value;
          
          setRowData((old) =>
            old.map((row, index) => {
              if (index === rowIndex) {
                return { 
                  ...row, 
                  [columnId]: value,
                  label: newLabel
                };
              }
              return row;
            })
          );
        }
        break;
      }
      case "is_mandatory": {
        // Check if trying to set to true and already have 3 mandatory rows
        if (value === true) {
          const mandatoryCount = rowData.filter(
            (row, idx) => idx !== rowIndex && row.is_mandatory === true
          ).length;
          
          if (mandatoryCount >= 3) {
            props.addSnack({
              message: t("moduleConfigurator.rcl.maxMandatory"),
              options: { variant: "error" },
            });
            // Revert the change
            setRowData((old) =>
              old.map((row, index) => {
                if (index === rowIndex) {
                  return { ...row, [columnId]: false };
                }
                return row;
              })
            );
            forceUpdateTable();
            return;
          }
        }
        
        // If validation passes or setting to false, update normally
        setRowData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return { ...row, [columnId]: value };
            }
            return row;
          })
        );
        break;
      }
      default:
        setRowData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return { ...row, [columnId]: value };
            }
            return row;
          })
        );
    }
    forceUpdateTable();
  };

  const saveRclConfiguration = async () => {
    try {
      // Validate that all rows have attribute_name and label
      const emptyRows = rowData.filter(
        (row) => !row.attribute_name || !row.label?.trim()
      );
      
      if (emptyRows.length > 0) {
        props.addSnack({
          message: t("moduleConfigurator.rcl.fillAllFields"),
          options: { variant: "error" },
        });
        return false;
      }

      const config = props.filterConfigProps;
      const filters = config?.filters ?? {};
      // Construct payload with all required fields
      const tableData = rowData.map((row) => {
        const inProduct = productSetRef.current.has(row.attribute_name);
        const inStore = storeSetRef.current.has(row.attribute_name);
        const inPsaf = psafSetRef.current.has(row.attribute_name);

        let attribute_dimension = row.attribute_dimension || "product";
        let extra = null;

        // Logic:
        // - If in product only: attribute_dimension = "product", extra = null
        // - If in store only: attribute_dimension = "store", extra = null
        // - If only in psaf_schema: attribute_dimension = "store", extra = {dimension: "product_store"}
        if (inProduct && !inStore && !inPsaf) {
          attribute_dimension = "product";
          extra = null;
        } else if (inStore && !inProduct && !inPsaf) {
          attribute_dimension = "store";
          extra = null;
        } else if (inPsaf && !inProduct && !inStore) {
          attribute_dimension = "store";
          extra = { dimension: "product_store" };
        } else if (inProduct) {
          // If in product and also in store/psaf, product takes precedence
          attribute_dimension = "product";
          extra = null;
        } else if (inStore) {
          // If in store and also in psaf (but not product), store takes precedence
          attribute_dimension = "store";
          extra = null;
        }
        
        // Get metadata for this attribute
        const metadata = attributeMetadataRef.current.get(row.attribute_name) || {
          is_hierarchy: null,
          is_attribute: null,
        };
        
        // Return ALL required fields explicitly
        return {
          attribute_name: row.attribute_name,
          label: row.label,
          order_of_display: row.order_of_display,
          is_mandatory: row.is_mandatory,
          attribute_dimension,
          extra,
          datatype: row.datatype ?? 'varchar',
          hierarchy_level: row.hierarchy_level ?? null,
          is_attribute: row.is_attribute ?? metadata.is_attribute,
          is_hierarchy: row.is_hierarchy ?? metadata.is_hierarchy,
          is_main_col: row.is_main_col ?? null,
        };
      });
      const data = {
          ...filters,
          table_data: tableData,
        }

      await axiosInstance({
        url: config?.save_endpoint,
        method: "POST",
        data,
      });
      props.addSnack({
        message: t("moduleConfigurator.rcl.savedSuccess"),
        options: { variant: "success" },
      });
      return true;
    } catch (error) {
      console.error("Error saving RCL configuration:", error);
      props.addSnack({
        message: t("moduleConfigurator.rcl.savedError"),
        options: { variant: "error" },
      });
      return false;
    }
  };

  useEffect(() => {
    if (props.setUpCallbacks) {
      props.setUpCallbacks({ nextNavFunc: saveRclConfiguration });
    }
  }, [rowData]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const config = props.filterConfigProps;
        const filters = config?.filters ?? {};
        const attrOptionKeys = config?.attribute_options ?? ["product", "store", "psaf_schema"];
        const needsPsaf = attrOptionKeys.includes("psaf_schema");

        const [tableResponse, attrResponse] = await Promise.all([
          axiosInstance({
            url: TABLE_DATA_API_URL,
            method: "POST",
            data: {
              table_name: config?.table_name,
              schema: config?.schema,
              filters,
            },
          }),
          axiosInstance({
            url: `${ATTRIBUTES_LIST_API_URL}${needsPsaf ? "?query_psaf=true" : ""}`,
            method: "GET",
          }),
        ]);

        // Row data — assign row_id for AG Grid row tracking
        const rows = (tableResponse?.data?.data?.data ?? []).map(
          (row) => ({ ...row, row_id: uniqueId('row_') })
        );
        setRowData(rows);

        // Build dropdown options dynamically from attribute_options config
        const attrData = attrResponse?.data?.data ?? {};

        // Store membership sets for save logic
        productSetRef.current = new Set((attrData.product ?? []).map((p) => p.value));
        storeSetRef.current = new Set((attrData.store ?? []).map((p) => p.value));
        const psafSchema = (attrData.psaf_schema ?? []).filter((item) => item.data_type !== "ARRAY");
        psafSetRef.current = new Set(psafSchema.map((p) => p.value));

        // Build label map from all sources (product/store takes precedence over psaf)
        const labelMap = new Map();
        
        // Add PSAF labels first
        psafSchema.forEach((item) => {
          labelMap.set(item.value, item.label);
        });
        
        // Add product/store labels (will override PSAF if duplicate)
        for (const key of ["product", "store"]) {
          const items = attrData[key] ?? [];
          items.forEach((item) => {
            labelMap.set(item.value, item.label);
          });
        }
        
        labelMapRef.current = labelMap;

        // Build metadata map for is_hierarchy and is_attribute
        const metadataMap = new Map();

        // Add product metadata
        (attrData.product ?? []).forEach((item) => {
          metadataMap.set(item.value, {
            is_hierarchy: item.is_hierarchy ?? null,
            is_attribute: item.is_attribute ?? null,
          });
        });

        // Add store metadata (will override product if duplicate)
        (attrData.store ?? []).forEach((item) => {
          metadataMap.set(item.value, {
            is_hierarchy: item.is_hierarchy ?? null,
            is_attribute: item.is_attribute ?? null,
          });
        });

        // PSAF schema doesn't have is_hierarchy/is_attribute, so set to null
        psafSchema.forEach((item) => {
          if (!metadataMap.has(item.value)) {
            metadataMap.set(item.value, {
              is_hierarchy: null,
              is_attribute: null,
            });
          }
        });

        attributeMetadataRef.current = metadataMap;

        // Deduplicate dropdown options: iterate in config order
        // Show technical values (e.g., l0_name) in dropdown, labels will display in label column
        const optionsMap = new Map();
        for (const key of attrOptionKeys) {
          const items = key === "psaf_schema"
            ? psafSchema
            : (attrData[key] ?? []);
          items.forEach((item) =>
            optionsMap.set(item.value, { label: item.value, value: item.value, id: item.value })
          );
        }
        const dropdownOptions = [...optionsMap.values()];

        // Label field already exists in rows from table-data API
        // For rows without label, populate from labelMap
        const rowsWithLabels = rows.map((row) => {
          if (!row.label) {
            const attrName = row.attribute_name;
            return {
              ...row,
              label: labelMapRef.current.get(attrName) || attrName
            };
          }
          return row;
        });
        setRowData(rowsWithLabels);

        // Build columns from config.column_list
        const columnList = config?.column_list ?? DEFAULT_COLUMN_LIST;
        
        // Ensure label is included in the column list
        const finalColumnList = columnList.includes('label') 
          ? columnList 
          : [...columnList.slice(0, 1), 'label', ...columnList.slice(1)];
        
        const columnsClone = finalColumnList
          .filter((name) => ALL_COLUMNS_MAP[name])
          .map((name) => JSON.parse(JSON.stringify(ALL_COLUMNS_MAP[name])));

        // Inject dropdown options into attribute_name column
        const attrCol = columnsClone.find(
          (col) => col.column_name === "attribute_name"
        );
        if (attrCol) {
          attrCol.options = dropdownOptions;
        }

        // Store base columns (with attribute options) for reuse
        baseColumnsRef.current = columnsClone;

        // Inject numeric dropdown options for order-like list columns
        const numericListCols = ["order_of_display", "hierarchy_level"];
        const numericOptions = rows.map((_, i) => ({
          label: String(i + 1),
          value: i + 1,
          id: i + 1,
        }));
        columnsClone.forEach((col) => {
          if (numericListCols.includes(col.column_name)) {
            col.extra = { ...col.extra, options: numericOptions };
          }
        });
        const cols = agGridColumnFormatter(
          columnsClone,
          {},
          {},
          false,
          null,
          false
        );
        setFormattedColumns(cols);
      } catch (error) {
        console.error("Error initializing RCL table:", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Rebuild numeric list column options & reformat columns whenever rowData changes
  useEffect(() => {
    if (!baseColumnsRef.current) return;
    const columnsClone = JSON.parse(JSON.stringify(baseColumnsRef.current));
    const numericListCols = ["order_of_display", "hierarchy_level"];
    const numericOptions = rowData.map((_, i) => ({
      label: String(i + 1),
      value: i + 1,
      id: i + 1,
    }));
    columnsClone.forEach((col) => {
      if (numericListCols.includes(col.column_name)) {
        col.extra = { ...col.extra, options: numericOptions };
      }
    });
    const cols = agGridColumnFormatter(
      columnsClone,
      {},
      {},
      false,
      null,
      false
    );
    setFormattedColumns(cols);
  }, [rowData.length]);

  return (
    <LoadingOverlay loader={isLoading} spinner>
      <div>
        {formattedColumns.length > 0 && (
          <AgGridComponent
          tableHeader = {t("moduleConfigurator.rcl.details")}
          hideMarginBottom
          paginationPageSize={20}
          domLayout="normal"
          height="500px"
            topRightOptions={[
              <Button
                onClick={handleDelete}
                icon={<DeleteIcon fontSize="large"></DeleteIcon>}
                variant="tertiary"
                disabled={!selectedRows.length}
              />,
            ]}
            bottomLeftOptions={<Button
              icon={<AddIcon fontSize="large"></AddIcon>}
              onClick={addNewRow}
              variant="primary"
            >
              {t("moduleConfigurator.rcl.addNewHierarchy")}
            </Button>}
            columns={formattedColumns}
            rowdata={rowData}
            uniqueRowId={"row_id"}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChangeHandler}
            onCellValueChanged={handleCellValueChanged}
            loadTableInstance={loadTableInstance}
          />
        )}
      </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => ({});
const mapDispatchToProps = (dispatch) => ({
  addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RclModuleSettings);
