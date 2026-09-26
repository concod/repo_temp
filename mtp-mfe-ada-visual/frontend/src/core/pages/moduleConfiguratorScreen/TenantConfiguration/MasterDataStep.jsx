import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { isNull, isEmpty } from "lodash";
import { Tabs, Badge } from "impact-ui-v3";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TextFormatOutlinedIcon from "@mui/icons-material/TextFormatOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { makeStyles } from "@mui/styles";
import {
  getProductStoreGenericMappings,
  updateProductStoreGenericMappings,
} from "core/actions/tenantConfigActions";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";

const BooleanToggleIcon = ({ className }) => (
  <svg className={className} width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="21" height="13" rx="6.5" stroke="#5C6784" />
    <circle cx="15" cy="7" r="4" fill="#5C6784" />
  </svg>
);

const IntIcon = ({ className }) => (
  <svg className={className} width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="12" y="13" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="14" fontWeight="800" fill="#5C6784">123</text>
  </svg>
);

const FloatIcon = ({ className }) => (
  <svg className={className} width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="13" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="14" fontWeight="800" fill="#5C6784">1.5</text>
  </svg>
);

const useLocalStyles = makeStyles(() => ({
  masterDataWrapper: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    marginTop: "12px",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "21px",
    color: "#1F2B4D",
  },
  infoIcon: {
    color: "#7A8294",
    fontSize: "18px !important",
    cursor: "pointer",
  },
  dataTypeIcon: {
    fontSize: "14px !important",
  },
}));

const DATATYPE_MAP = {
  str: { label: "Text", Icon: TextFormatOutlinedIcon },
  string: { label: "Text", Icon: TextFormatOutlinedIcon },
  text: { label: "Text", Icon: TextFormatOutlinedIcon },
  int: { label: "Integer", Icon: IntIcon },
  integer: { label: "Integer", Icon: IntIcon },
  float: { label: "Float", Icon: FloatIcon },
  double: { label: "Float", Icon: FloatIcon },
  decimal: { label: "Float", Icon: FloatIcon },
  bool: { label: "Boolean", Icon: BooleanToggleIcon },
  boolean: { label: "Boolean", Icon: BooleanToggleIcon },
  varchar: { label: "Text", Icon: TextFormatOutlinedIcon },
  date: { label: "Date", Icon: CalendarTodayOutlinedIcon },
  datetime: { label: "Date", Icon: CalendarTodayOutlinedIcon },
};

const DataTypeCellRenderer = (params) => {
  const classes = useLocalStyles();
  const raw = (params.value || "").toLowerCase();
  const config = DATATYPE_MAP[raw] || DATATYPE_MAP["varchar"];
  const { label, Icon } = config;
  return (
    <Badge
      isIcon
      icon={<Icon className={classes.dataTypeIcon} />}
      label={label}
      variant="subtle"
      color="default"
      size="default"
    />
  );
};

// Column configuration for the master data tables
const MASTER_DATA_COLUMNS = [
  {
    column_name: "source_column_name",
    label: "Source column",
    type: "str",
    is_editable: false,
    is_hidden: false,
    is_sortable: false,
    sub_headers: [],
    order_of_display: 1,
  },
  {
    column_name: "generic_column_name",
    label: "Generic column",
    type: "str",
    is_editable: false,
    is_hidden: false,
    is_sortable: false,
    sub_headers: [],
    order_of_display: 2,
  },
  {
    column_name: "display_name",
    label: "Display name",
    type: "str",
    is_editable: true,
    is_hidden: false,
    is_sortable: false,
    sub_headers: [],
    order_of_display: 3,
  },
  {
    column_name: "generic_column_datatype",
    label: "Data type",
    type: "str",
    is_editable: false,
    is_hidden: false,
    is_sortable: false,
    sub_headers: [],
    order_of_display: 4,
  },
];

const TAB_CONFIG = [
  { label: "Product master", value: "product_master", dataKey: "product_mappings", tableName: "product_generic_schema_mapping", title: "Product Master Fields" },
  { label: "Store master", value: "store_master", dataKey: "store_mappings", tableName: "store_generic_schema_mapping", title: "Store Master Fields" },
];

const MasterDataStep = forwardRef((props, ref) => {
  const classes = useLocalStyles();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("product_master");
  const [formattedColumns, setFormattedColumns] = useState([]);
  const [mappingsData, setMappingsData] = useState({ product_mappings: [], store_mappings: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cols = agGridColumnFormatter(
      JSON.parse(JSON.stringify(MASTER_DATA_COLUMNS)),
      {},
      {},
      false,
      null,
      false
    );
    const dtCol = cols.find((c) => c.field === "generic_column_datatype");
    if (dtCol) {
      dtCol.cellRenderer = DataTypeCellRenderer;
    }
    setFormattedColumns(cols);
  }, []);

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        setLoading(true);
        const data = await getProductStoreGenericMappings()();
        if (data) {
          const normalized = {
            product_mappings: data.product_mappings || [],
            store_mappings: data.store_mappings || [],
          };
          setMappingsData(normalized);
        }
      } catch (error) {
        console.error("Failed to fetch product-store generic mappings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMappings();
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => {
      const tab = TAB_CONFIG.find((t) => t.value === activeTab);
      if (!tab) return;

      const current = mappingsData[tab.dataKey] || [];
      const mappings = current
        .filter((row) => !isNull(row.display_name) && !isEmpty(row.display_name))
        .map((row) => ({
          generic_column_name: row.generic_column_name,
          display_name: row.display_name,
        }));

      const productKeys = (mappingsData.product_mappings || []).map((r) => r.generic_column_name);
      const storeKeys = (mappingsData.store_mappings || []).map((r) => r.generic_column_name);
      const overlapping_keys = productKeys.filter((key) => storeKeys.includes(key));

      const payload = {
        table_name: tab.tableName,
        mappings,
        overlapping_keys,
      };

      try {
        setLoading(true);
        const result = await updateProductStoreGenericMappings(payload)();
        dispatch(
          addSnack({
            message: result?.message || "Mappings updated successfully",
            options: { variant: "success" },
          })
        );
        return result;
      } catch (error) {
        console.error(`[MasterDataStep] Failed to save ${tab.tableName}:`, error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
  }), [activeTab, mappingsData]);

  const handleCellValueChanged = (dataKey) => (event) => {
    const { data, colDef, newValue } = event;
    const field = colDef.field;
    setMappingsData((prev) => ({
      ...prev,
      [dataKey]: prev[dataKey].map((row) =>
        row.generic_column_name === data.generic_column_name
          ? { ...row, [field]: newValue }
          : row
      ),
    }));
  };

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  const tabNames = TAB_CONFIG.map((tab) => ({
    label: tab.label,
    value: tab.value,
  }));

  const tabPanels = TAB_CONFIG.map((tab) => (
      <AgGridComponent
        columns={formattedColumns}
        rowdata={mappingsData[tab.dataKey]}
        uniqueRowId="generic_column_name"
        domLayout="autoHeight"
        pagination={false}
        sizeColumnsToFitFlag
        showSaveTableConfig={false}
        showSearchModalBtn={false}
        hideFormatSideBar
        suppressFieldDotNotation
        cellValueChanged={handleCellValueChanged(tab.dataKey)}
        tableHeight = {400}
        tableHeader={
          <div className={classes.tableHeader}>
            <span>{tab.title}</span>
            <InfoOutlinedIcon className={classes.infoIcon} />
          </div>
        }
      />
  ));

  return (
    <div className={classes.masterDataWrapper}>
      {loading ? (
        <LoadingOverlay loader={loading} minHeight="500px" text="Loading generic lables" size="medium" />
      ) : (
        <Tabs
          tabNames={tabNames}
          tabPanels={tabPanels}
          value={activeTab}
          onChange={handleTabChange}
          remountOnTabChange={false}
        />
      )}
    </div>
  );
});

export default MasterDataStep;
