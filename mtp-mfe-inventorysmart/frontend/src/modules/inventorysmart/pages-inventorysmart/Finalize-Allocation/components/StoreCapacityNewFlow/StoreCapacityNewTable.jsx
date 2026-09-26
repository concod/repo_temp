import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import InfoIcon from "assets/infoIcon24.svg";
import RedWarningIcon from "assets/redWarning24.svg";
import { Alert, Button, Switch, Tooltip } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import OverflowTooltip from "core/Utils/agGrid/OverflowTooltip";
import ConstraintOverflowTooltip from "modules/inventorysmart/pages-inventorysmart/Constraints/landing-screen/ConstraintOverflowTooltip";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import {
  getStoreCapacityData,
  setStoreCapactiySummaryLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";
import {
  defaultTableData,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import StoreCapacityDetailTable from "./StoreCapacityDetailTable";

const useStoreCapacityTableStyles = makeStyles({
  // need to remove after v36 migration
  grid: {
    "& .ia-basic-table-layout.table-v32 .nested-table-container": {
      margin: "0 !important",
      padding: "0px 16px 16px !important",
    },
  },
  storeCodeButton: {
    padding: 0,
    minHeight: "auto",
    fontWeight: 500,
    maxWidth: "100%",
    minWidth: 0,
  },
  coloredBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "164px",
    padding: "2px 8px",
    borderRadius: "16px",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  storeNameRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    gap: 8,
  },
  storeNameLabel: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
  },
  storeNameBreachMeta: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexShrink: 0,
  },
  breachedOnlyGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  breachedOnlyLabel: {
    color: "#60697d",
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
});

const getCapacityBannerMsg = (summary) => {
  const levels = summary?.product_hierarchy_level || [];
  const hierarchy = levels.length
    ? ["Store", ...levels].join("-")
    : "Store";
  return `Capacity is set at ${hierarchy} level; expanding a store expands this grouping.`;
};

const getViewBreachedOnlyTooltip = (summary) => {
  // if (!summary) return "";

  const breachedStores = summary?.breached_stores ?? "";
  const totalStores = summary?.total_stores ?? "";
  const nonBreachesStores = summary?.non_breaches_stores ?? "";
  const levels = summary?.product_hierarchy_level || [];

  let hierarchyText = "";
  if (levels.length > 1) {
    hierarchyText = `${levels.join(" - ")} Combination`;
  } else if (levels.length === 1) {
    hierarchyText = levels[0];
  }

  const hierarchyPhrase = hierarchyText
    ? `Store Inclusion Is Based On Any ${hierarchyText} Being Breached`
    : "Store Inclusion Is Based On Any Breach";

  return `Only Stores With A Capacity Breach — Showing ${breachedStores} Of ${totalStores}, ${nonBreachesStores} Without Any Breach Hidden. ${hierarchyPhrase} — Not On Whether The Store's Aggregated Total Nets Out Positive.`;
};

const StoreCodeCellRenderer = (cellProps) => {
  const classes = useStoreCapacityTableStyles();
  return (
    <Button
      variant="url"
      className={classes.storeCodeButton}
      onClick={() => cellProps.onStoreCodeClick?.(cellProps.data)}
    >
      <OverflowTooltip
        {...cellProps}
        value={cellProps.value ?? cellProps.data?.store_code ?? ""}
      />
    </Button>
  );
};

const ColoredBadge = ({ label, backgroundColor, color }) => {
  const classes = useStoreCapacityTableStyles();
  return (
    <div
      className={classes.coloredBadge}
      style={{ backgroundColor, color }}
    >
      {label}
    </div>
  );
};

const StoreNameCellRenderer = (cellProps) => {
  const classes = useStoreCapacityTableStyles();
  const storeName = cellProps.value ?? cellProps.data?.store_name ?? "";
  const breached = Number(cellProps.data?.breached_capacity_groups) || 0;
  const total = Number(cellProps.data?.total_capacity_groups) || 0;
  const hasBreach = breached > 0;

  return (
    <div className={classes.storeNameRow}>
      <span className={classes.storeNameLabel}>
        <ConstraintOverflowTooltip {...cellProps} value={storeName} />
      </span>
      {hasBreach ? (
        <div className={classes.storeNameBreachMeta}>
          <ColoredBadge
            label={`${breached}/${total}`}
            backgroundColor="#fef4f5"
            color="#d62f2d"
          />
          <RedWarningIcon />
        </div>
      ) : null}
    </div>
  );
};

const formatStoreCapacityColumns = (columns, onStoreCodeClick) =>
  columns?.map((item) => {
    const colName = item.column_name || item.field;
    if (colName === "store_code") {
      return {
        ...item,
        type: "str",
        is_editable: false,
        editable: false,
        cellStyle: {
          ...(typeof item.cellStyle === "object" ? item.cellStyle : {}),
          display: "flex",
          alignItems: "center",
        },
        cellRenderer: (cellProps) => (
          <StoreCodeCellRenderer
            {...cellProps}
            onStoreCodeClick={onStoreCodeClick}
          />
        ),
      };
    }
    if (colName === "store_name") {
      return {
        ...item,
        cellStyle: {
          ...(typeof item.cellStyle === "object" ? item.cellStyle : {}),
          display: "flex",
          alignItems: "center",
        },
        cellRenderer: (cellProps) => <StoreNameCellRenderer {...cellProps} />,
      };
    }
    return item;
  });

const StoreCapacityNewTable = (props) => {
  const tableClasses = useStoreCapacityTableStyles();
  const [allTableData, setAllTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [breachedOnly, setBreachedOnly] = useState(false);
  const [capacitySummary, setCapacitySummary] = useState(null);
  const [showCapacityBanner, setShowCapacityBanner] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);
  const handleStoreCodeClickRef = useRef(null);
  const tableInstance = useRef(null);

  const tableData = useMemo(() => {
    if (!breachedOnly) return allTableData;
    return allTableData.filter(
      (row) => Number(row?.breached_capacity_groups) > 0
    );
  }, [allTableData, breachedOnly]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({ message, options: { variant: variance } });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const handleStoreCodeClick = useCallback((data) => {
    setSelectedStore(data?.store_code ?? null);
  }, []);

  handleStoreCodeClickRef.current = handleStoreCodeClick;

  const fetchStoreLevelData = useCallback(async () => {
    if (!props.allocationCode || !props.planType) return;
    try {
      props.setStoreCapactiySummaryLoader(true);
      const body = {
        allocation_code: props.allocationCode,
        article: props.articles,
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_type: props.planType,
        breached_only: false,
      };
      const response = await props.getStoreCapacityData(body, true);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success");
        if (!response?.data?.status) {
          setTableColumns([]);
          setAllTableData([]);
          setCapacitySummary(null);
          return;
        }
      }
      setCapacitySummary(response?.data?.data?.summary ?? null);
      const config = response?.data?.data?.table_config;
      const rawData = response?.data?.data?.table_data || [];
      setAllTableData(rawData.map((item, index) => ({ ...item, index })));
      setTableColumns(
        formatStoreCapacityColumns(
          agGridColumnFormatter(config, null),
          (data) => handleStoreCodeClickRef.current?.(data)
        )
      );
      requestAnimationFrame(() => {
        tableInstance.current?.api?.sizeColumnsToFit?.();
      });
    } catch (err) {
      handleErrorMessage(err);
      setCapacitySummary(null);
      return defaultTableData;
    } finally {
      props.setStoreCapactiySummaryLoader(false);
    }
  }, [
    props.allocationCode,
    props.planType,
    props.articles,
    props.originalAllocationCode,
  ]);

  useEffect(() => {
    fetchStoreLevelData();
    setSelectedStore(null);
  }, [fetchStoreLevelData]);

  useEffect(() => {
    if (
      selectedStore &&
      !tableData.some((row) => row.store_code === selectedStore)
    ) {
      setSelectedStore(null);
    }
  }, [tableData, selectedStore]);

  const getTopCenterOptions = () => {
    if (!showCapacityBanner) return null;
    return [
      <Alert
        key="store-capacity-info-banner"
        severity="info"
        title={getCapacityBannerMsg(capacitySummary)}
        subtleBackground
        onClose={() => setShowCapacityBanner(false)}
      />,
    ];
  };

  const getTopRightOptions = () => [
    <span
      key="view-breached-only-group"
      className={tableClasses.breachedOnlyGroup}
    >
      <Tooltip
        title={getViewBreachedOnlyTooltip(capacitySummary)}
        orientation="bottom"
        variant="tertiary"
      >
        <span style={{ marginTop: 4 }}>
          <InfoIcon />
        </span>
      </Tooltip>
      <span className={tableClasses.breachedOnlyLabel}>
        View breached only
      </span>
    </span>,
    <Switch
      key="view-breached-only-switch"
      leftLabel=""
      rightLabel=""
      value={breachedOnly}
      onChange={(e) => setBreachedOnly(e.target.checked)}
    />,
  ];

  return (
    <Loader loader={props.storeCapacitySummaryLoader} minHeight={350}>
      <AgGridComponent
        customClass={tableClasses.grid}
        tableHeader="Details"
        columns={tableColumns}
        rowdata={tableData}
        selectAllHeaderComponent={false}
        suppressFieldDotNotation
        uniqueRowId="index"
        topCenterOptions={getTopCenterOptions()}
        topRightOptions={getTopRightOptions()}
        downloadAsExcel={
          tableData?.length ? true : false
        }
        showDownloadTooltip={true}
        sizeColumnsToFitFlag
        // skipAutoSizeColumn
        loadTableInstance={(params) => {
          tableInstance.current = params;
        }}
        hideMarginBottom
        nestedTable={!!selectedStore}
        nestedTableComponent={
          selectedStore ? (
            <StoreCapacityDetailTable
              storeCode={selectedStore}
              allocationCode={props.allocationCode}
              articles={props.articles}
              originalAllocationCode={props.originalAllocationCode}
              planType={props.planType}
              onClose={() => setSelectedStore(null)}
            />
          ) : null
        }
      />
    </Loader>
  );
};

const mapStateToProps = (store) => ({
  storeCapacitySummaryLoader:
    store.inventorysmartReducer.inventorySmartFinalizeStoreCapacityService
      .storeCapacitySummaryLoader,
  planType:
    store.inventorysmartReducer.inventorySmartFinalizeStoreCapacityService
      .planType,
  allocationCode:
    store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
      .allocationCode,
  originalAllocationCode:
    store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
      .originalAllocationCode,
  articles:
    store.inventorysmartReducer.inventorySmartFinalizeStoreViewService.articles,
});

const mapDispatchToProps = (dispatch) => ({
  setStoreCapactiySummaryLoader: (payload) =>
    dispatch(setStoreCapactiySummaryLoader(payload)),
  getStoreCapacityData: (payload, isV3) =>
    dispatch(getStoreCapacityData(payload, isV3)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreCapacityNewTable);
