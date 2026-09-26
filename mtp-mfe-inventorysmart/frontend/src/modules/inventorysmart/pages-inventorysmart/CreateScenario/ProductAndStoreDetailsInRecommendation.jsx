import { connect } from "react-redux";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { getColumnsAg } from "../../../../core/actions/tableColumnActions";
import AgGridComponent from "core/Utils/agGrid";
import { getProductStoreDetailsInRecomendation } from "../../services-inventorysmart/Create-Scenario/store-view-services";
import Loader from "core/Utils/Loader/loader";
import { displaySnackMessages } from "../inventorysmart-utility";
import { addSnack } from "../../../../core/actions/snackbarActions";
import agGridColumnFormatter from "../../../../core/Utils/agGrid/column-formatter";
import { replaceSpecialCharacter } from "../../../../core/Utils/functions/utils";
import {
  buildScenarioSimBody,
  shouldFetchScenarioRecommendation,
} from "./scenarioCompareUtils";
import { ButtonGroup, Button, BottomSheet } from "impact-ui-v3";
import CloseIcon from "@mui/icons-material/Close";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import TrendingUpIconSvg from "assets/trendingUpIcon.svg";
import TrendingDownIconSvg from "assets/trendingDownIcon.svg";
import TrendingEqualIconSvg from "assets/trendingEqualIcon.svg";
import OpenIcon from "assets/open.svg";
import ISExpand from "assets/IS_icons/IS_expand.svg";
import ISCollapse from "assets/IS_icons/IS_collapse.svg";
import ScenarioBreakdownDetailExpand from "./ScenarioBreakdownDetailExpand";
import PackAndSizeDetailsPanel from "./PackAndSizeDetailsPanel";
import {
  ensureTrendSafeColumns,
  renderTrendSafeCell,
} from "./trendCellUtils";
import {
  isPackCountRow,
  getPackCountRowStyle,
} from "./packCountRowUtils";

const BREAKDOWN_OPTIONS = [
  { label: "By Store", value: "by_store" },
  { label: "By Size", value: "by_size" },
];

const DC_BREAKDOWN_METRIC_KEYS = [
  "allocated_quantity",
  "opening_inventory",
  "remaining_dc_ata",
];

/**
 * Build a DC-scoped column tree:
 * Size | Metric → pack/eaches/total leaves (skip DC name level).
 */
const buildDcBreakdownColumnConfig = (tableConfig, dcLabel) => {
  if (!Array.isArray(tableConfig) || !dcLabel) return [];

  const columns = [];
  const sizeCol = tableConfig.find((col) => col.column_name === "size");
  if (sizeCol) {
    columns.push({
      ...sizeCol,
      is_hidden: false,
      is_editable: false,
    });
  }

  DC_BREAKDOWN_METRIC_KEYS.forEach((metricKey) => {
    const metricCol = tableConfig.find((col) => col.column_name === metricKey);
    if (!metricCol) return;

    const dcChild = (metricCol.sub_headers || []).find(
      (sub) =>
        sub.column_name === `${metricKey}__${dcLabel}` || sub.label === dcLabel
    );
    if (!dcChild) return;

    const leafHeaders = (dcChild.sub_headers || []).map((leaf) => ({
      ...leaf,
      is_hidden: false,
      is_editable: false,
      parent_id: [metricKey],
    }));

    if (!leafHeaders.length) return;

    columns.push({
      ...metricCol,
      is_hidden: false,
      is_editable: false,
      sub_headers: leafHeaders,
    });
  });

  return columns;
};

const DC_METRIC_CHIPS = [
  {
    key: "opening_inventory",
    label: "Opening Inv",
    borderColor: "#8C906A",
  },
  {
    key: "allocated_quantity",
    label: "Allocated Qty",
    borderColor: colours.easternBlue,
  },
  {
    key: "available_quantity",
    label: "Avl Qty",
    borderColor: colours.studio,
  },
];

const formatDcMetricValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }
  return Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(2));
};

const mapBreakdownRows = (rawTableData, { isStoreTab, breakdownView }) => {
  return (rawTableData || []).map((row, index) => {
    let rowKey;
    if (isStoreTab) {
      rowKey = row?.article;
    } else if (breakdownView === "by_store") {
      rowKey = row?.store_code;
    } else {
      rowKey = row?.size;
    }
    return {
      ...row,
      __rowId: row?.__rowId || `${rowKey ?? "row"}_${index}`,
    };
  });
};

const formatBreakdownColumns = ({
  rawConfig,
  tableData,
  isNewFlow,
  isProductTab,
  isStoreTab,
  breakdownView,
}) => {
  let tempColumnConfig = agGridColumnFormatter(rawConfig) || [];

  if (isNewFlow && tempColumnConfig.length && (isProductTab || isStoreTab)) {
    const expandColumnName = isStoreTab
      ? "article"
      : breakdownView === "by_store"
        ? "store_code"
        : "size";
    const hasExpandColumn = tempColumnConfig.some(
      (c) => c.column_name === expandColumnName
    );
    tempColumnConfig = tempColumnConfig.map((column, index) => {
      const isExpandColumn =
        column.column_name === expandColumnName ||
        (!hasExpandColumn && index === 0);
      if (isExpandColumn) {
        if (breakdownView === "by_size") {
          return {
            ...column,
            cellRendererSelector: (params) => {
              if (isPackCountRow(params?.data)) {
                return undefined;
              }
              return { component: "agGroupCellRenderer" };
            },
          };
        }
        return {
          ...column,
          cellRenderer: "agGroupCellRenderer",
        };
      }
      return column;
    });
  }

  if (isNewFlow) {
    tempColumnConfig = ensureTrendSafeColumns(
      tempColumnConfig,
      tableData[0]
    );
  }

  return tempColumnConfig;
};

const getDcMetricTrendIcon = (previous, current, iconClassName) => {
  const prevNum = Number(previous);
  const currNum = Number(current);
  if (Number.isNaN(prevNum) || Number.isNaN(currNum)) {
    return <TrendingEqualIconSvg className={iconClassName} />;
  }
  if (currNum > prevNum) {
    return <TrendingUpIconSvg className={iconClassName} />;
  }
  if (currNum < prevNum) {
    return <TrendingDownIconSvg className={iconClassName} />;
  }
  return <TrendingEqualIconSvg className={iconClassName} />;
};

const useStyles = makeStyles(() => ({
  card: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "12px",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    minHeight: "32px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  headerTitle: {
    color: "#0D152C",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 700,
    lineHeight: "21px",
    whiteSpace: "nowrap",
  },
  divider: {
    width: "1px",
    height: "12px",
    background: "#D9DDE7",
    flexShrink: 0,
  },
  styleColorLabel: {
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 700,
    lineHeight: "21px",
    whiteSpace: "nowrap",
  },
  styleColorValue: {
    color: "#31416E",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 700,
    lineHeight: "21px",
    whiteSpace: "nowrap",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  closeButton: {
    background: "#F5F6FA !important",
    border: "none !important",
    color: "#60697D !important",
  },
  dcDetailsSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    width: "100%",
  },
  dcDetailsRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    minWidth: 0,
    // Show only the first line; as many DCs as fit stay on row 1
    maxHeight: "40px",
    overflow: "hidden",
  },
  dcDetailsRowExpanded: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    minWidth: 0,
    width: "100%",
  },
  dcExpandButton: {
    border: "1px solid #C3C8D4",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    flexShrink: 0,
    marginTop: "4px",
    background: colours.white,
    "&:hover": {
      border: "1px solid #3649c6",
    },
  },
  dcChip: {
    display: "flex",
    width: "fit-content",
    padding: "4.284px 16px",
    alignItems: "center",
    gap: "8px",
    flex: "0 0 auto",
    borderRadius: "12.851px",
    background: colours.greys100,
    boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.12)",
    height: "40px",
    boxSizing: "border-box",
  },
  dcLabel: {
    color: colours.boldHeadingBlue,
    fontFamily: "Manrope",
    fontSize: "17.134px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "25.702px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  dcMetricChip: {
    display: "flex",
    minWidth: "185px",
    width: "fit-content",
    padding: "4.284px 8.567px",
    alignItems: "center",
    gap: "8.567px",
    borderRadius: "4.284px",
    background: colours.white,
    boxSizing: "border-box",
    flexShrink: 0,
  },
  dcMetricLabel: {
    color: colours.neutralGrey,
    fontFamily: "Manrope",
    fontSize: "12.851px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "125%",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  dcMetricValues: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    marginLeft: "auto",
    color: colours.lightNeutrals,
    textAlign: "right",
    fontFamily: "Manrope",
    fontSize: "14.993px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "21.418px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  dcTrendIcon: {
    width: "14px",
    height: "14px",
    flexShrink: 0,
  },
  breakdownLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    marginLeft: "25px",
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: colours.brightRoyalBlue,
    fontFamily: "Manrope",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "21px",
    whiteSpace: "nowrap",
    flexShrink: 0,
    "& svg": {
      width: "16px",
      height: "16px",
      display: "block",
    },
  },
  dcBreakdownBottomSheet: {
    "& .ia_modalBody": {
      paddingTop: "0 !important",
      paddingBottom: "24px !important",
      bottom: "0 !important",
    },
  },
  dcBreakdownSheetBody: {
    height: "400px",
    width: "100%",
    margin: 0,
    padding: 0,
  },
}));

const ProductAndStoreDetailsInRecommendation = (props) => {
  const classes = useStyles();
  const [detailsTableData, setDetailsTableData] = useState([]);
  const [tableColumnConfig, setTableColumnConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [breakdownView, setBreakdownView] = useState("by_store");
  const [showViewPackConfiguration, setShowViewPackConfiguration] =
    useState(false);
  const [dcDict, setDcDict] = useState([]);
  const [productSizeTableData, setProductSizeTableData] = useState([]);
  const [productSizeTableConfig, setProductSizeTableConfig] = useState([]);
  const [showDcBreakdownSheet, setShowDcBreakdownSheet] = useState(false);
  const [selectedDcForBreakdown, setSelectedDcForBreakdown] = useState(null);
  const [dcOverviewExpanded, setDcOverviewExpanded] = useState(false);
  const agGridInstance = useRef(null);
  // Keep latest values for detailCellRenderer (AG Grid may keep first renderer ref)
  const breakdownViewRef = useRef(breakdownView);
  const scenarioIdRef = useRef(props.scenarioId);
  const compareCodesRef = useRef(props.compareCodes);
  const articleRef = useRef(props.selectedDataDetails?.article);
  const storeCodeRef = useRef(props.selectedDataDetails?.store_code);
  const productSizeCacheRef = useRef({
    data: [],
    config: [],
    status: "idle",
  });

  const {
    scenarioId,
    compareCodes,
    selectedDataDetails,
    setSelectedDataDetails,
  } = props;
  const isProductTab = props.tabName === "product";
  const isStoreTab = props.tabName === "store";
  const isNewFlow =
    !props.isReadOnlyCompare &&
    (!!props.finalizeAllocationConfig?.scenarioRecommendationNewFlow ||
      !!props.scenarioRecommendationNewFlow);
  const article = selectedDataDetails?.article;

  const styleColorId = replaceSpecialCharacter(
    selectedDataDetails?.display_article ||
      selectedDataDetails?.style_colour_id ||
      selectedDataDetails?.article
  );

  breakdownViewRef.current = breakdownView;
  scenarioIdRef.current = scenarioId;
  compareCodesRef.current = compareCodes;
  articleRef.current = article;
  storeCodeRef.current = selectedDataDetails?.store_code;

  const applyProductSizeTableToDetails = (rawTableData, rawTableConfig) => {
    const tableData = mapBreakdownRows(rawTableData, {
      isStoreTab: false,
      breakdownView: "by_size",
    });
    setDetailsTableData(tableData);
    setTableColumnConfig(
      formatBreakdownColumns({
        rawConfig: rawTableConfig,
        tableData,
        isNewFlow: true,
        isProductTab: true,
        isStoreTab: false,
        breakdownView: "by_size",
      })
    );
    setIsLoading(false);
  };

  useEffect(() => {
    setBreakdownView("by_store");
    setDcOverviewExpanded(false);
    productSizeCacheRef.current = { data: [], config: [], status: "idle" };
  }, [selectedDataDetails?.article, selectedDataDetails?.store_code]);

  // Fetch DC overview chips from scenario-product-size-view on product click.
  // This is the only product-size call; By Size reuses the cached payload.
  useEffect(() => {
    if (
      !isNewFlow ||
      !isProductTab ||
      !article ||
      !shouldFetchScenarioRecommendation({ scenarioId, compareCodes })
    ) {
      productSizeCacheRef.current = { data: [], config: [], status: "idle" };
      setDcDict([]);
      setProductSizeTableData([]);
      setProductSizeTableConfig([]);
      return;
    }

    let cancelled = false;
    productSizeCacheRef.current = { data: [], config: [], status: "loading" };

    (async () => {
      try {
        const response = await props.getProductStoreDetailsInRecomendation(
          buildScenarioSimBody({
            scenarioId,
            compareCodes,
            extra: { article },
          }),
          "product-size"
        );
        if (cancelled) return;

        const payload =
          response?.data?.data?.data || response?.data?.data || {};
        const mappedTableData = mapBreakdownRows(
          Array.isArray(payload?.table_data) ? payload.table_data : [],
          { isStoreTab: false, breakdownView: "by_size" }
        );
        const tableConfig = Array.isArray(payload?.table_config)
          ? payload.table_config
          : [];

        productSizeCacheRef.current = {
          data: mappedTableData,
          config: tableConfig,
          status: "done",
        };
        setDcDict(Array.isArray(payload?.dc_dict) ? payload.dc_dict : []);
        setProductSizeTableData(mappedTableData);
        setProductSizeTableConfig(tableConfig);

        if (breakdownViewRef.current === "by_size") {
          applyProductSizeTableToDetails(mappedTableData, tableConfig);
        }
      } catch (error) {
        console.error("Error fetching DC inventory overview:", error);
        if (!cancelled) {
          productSizeCacheRef.current = {
            data: [],
            config: [],
            status: "error",
          };
          setDcDict([]);
          setProductSizeTableData([]);
          setProductSizeTableConfig([]);
          // By Size may already be selected and waiting on this request.
          if (breakdownViewRef.current === "by_size") {
            setDetailsTableData([]);
            setTableColumnConfig([]);
            setIsLoading(false);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNewFlow, isProductTab, scenarioId, compareCodes, article]);

  useEffect(() => {
    if (
      !shouldFetchScenarioRecommendation({ scenarioId, compareCodes }) ||
      !selectedDataDetails
    ) {
      return;
    }

    const isSizeView = isNewFlow && isProductTab && breakdownView === "by_size";
    const cachedSize = productSizeCacheRef.current;

    if (isSizeView && cachedSize.status === "done") {
      applyProductSizeTableToDetails(cachedSize.data, cachedSize.config);
      return;
    }
    if (isSizeView && cachedSize.status === "loading") {
      // Product click already requested product-size; wait for that response.
      return;
    }

    let cancelled = false;
    (async () => {
      setDetailsTableData([]);
      try {
        setIsLoading(true);
        const extra = {};
        if (isProductTab) {
          extra.article = selectedDataDetails?.article;
        } else {
          extra.store_code = selectedDataDetails?.store_code;
        }
        const body = buildScenarioSimBody({
          scenarioId,
          compareCodes,
          extra,
        });

        const viewType =
          isProductTab && breakdownView === "by_size"
            ? "product-size"
            : props.tabName;

        let productStoreDetailsInRecomendationResponse =
          await props.getProductStoreDetailsInRecomendation(body, viewType);
        if (cancelled) return;
        if (productStoreDetailsInRecomendationResponse?.data?.show_message) {
          displaySnackMessages(
            productStoreDetailsInRecomendationResponse?.data?.message,
            "success",
            props
          );
        }
        const rawTableData =
          productStoreDetailsInRecomendationResponse?.data?.data?.data
            ?.table_data || [];
        const tableData = mapBreakdownRows(rawTableData, {
          isStoreTab,
          breakdownView,
        });
        const tempColumnConfig = formatBreakdownColumns({
          rawConfig:
            productStoreDetailsInRecomendationResponse?.data?.data?.data
              ?.table_config,
          tableData,
          isNewFlow,
          isProductTab,
          isStoreTab,
          breakdownView,
        });

        if (isSizeView) {
          const rawConfig =
            productStoreDetailsInRecomendationResponse?.data?.data?.data
              ?.table_config || [];
          productSizeCacheRef.current = {
            data: tableData,
            config: rawConfig,
            status: "done",
          };
          setProductSizeTableData(tableData);
          setProductSizeTableConfig(rawConfig);
        }

        setDetailsTableData(tableData);
        setTableColumnConfig(tempColumnConfig);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching columns:", error);
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    scenarioId,
    compareCodes,
    selectedDataDetails,
    breakdownView,
    props.tabName,
    isNewFlow,
  ]);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const getTableHeader = () => {
    if (isProductTab) {
      // Product tab uses custom card header; keep Size Breakdown label when toggled
      return breakdownView === "by_size" ? "Size Breakdown" : null;
    }
    return "Product Breakdown";
  };

  const enableMasterDetail =
    isNewFlow && (isProductTab || isStoreTab);

  const handleCloseCard = () => {
    setShowViewPackConfiguration(false);
    setShowDcBreakdownSheet(false);
    setSelectedDcForBreakdown(null);
    setDcOverviewExpanded(false);
    setDcDict([]);
    setProductSizeTableData([]);
    setProductSizeTableConfig([]);
    productSizeCacheRef.current = { data: [], config: [], status: "idle" };
    setSelectedDataDetails(null);
  };

  const handleOpenDcBreakdown = (dc) => {
    setSelectedDcForBreakdown(dc);
    setShowDcBreakdownSheet(true);
  };

  const handleCloseDcBreakdown = () => {
    setShowDcBreakdownSheet(false);
    setSelectedDcForBreakdown(null);
  };

  const dcBreakdownColumns = useMemo(() => {
    if (
      !isNewFlow ||
      !selectedDcForBreakdown?.label ||
      !productSizeTableConfig.length
    ) {
      return [];
    }
    return ensureTrendSafeColumns(
      agGridColumnFormatter(
        buildDcBreakdownColumnConfig(
          productSizeTableConfig,
          selectedDcForBreakdown.label
        )
      ) || [],
      productSizeTableData[0]
    );
  }, [
    isNewFlow,
    selectedDcForBreakdown,
    productSizeTableConfig,
    productSizeTableData,
  ]);

  // Same pattern as CNA SizeViewDetailsTable — component (not useCallback JSX factory)
  const DetailCellRenderer = (detailProps) => {
    const parentRow = detailProps?.data || detailProps?.node?.data || {};

    if (isStoreTab) {
      // Store tab Product Breakdown expand → scenario-store-size-view-data
      return (
        <div style={{ padding: "8px 16px 16px" }}>
          <ScenarioBreakdownDetailExpand
            {...detailProps}
            scenarioId={scenarioIdRef.current}
            compareCodes={compareCodesRef.current}
            article={parentRow?.article}
            expandMode="by_store"
            parentRow={parentRow}
            store_code={storeCodeRef.current}
          />
        </div>
      );
    }

    const expandMode = breakdownViewRef.current;
    return (
      <div style={{ padding: "8px 16px 16px" }}>
        <ScenarioBreakdownDetailExpand
          {...detailProps}
          scenarioId={scenarioIdRef.current}
          compareCodes={compareCodesRef.current}
          article={articleRef.current || parentRow?.article}
          expandMode={expandMode}
          parentRow={parentRow}
          size={parentRow?.size}
          store_code={parentRow?.store_code}
        />
      </div>
    );
  };

  const isBySizeView = isNewFlow && isProductTab && breakdownView === "by_size";

  const table = (
    <AgGridComponent
      key={`breakdown-${props.tabName}-${breakdownView}`}
      selectAllHeaderComponent={false}
      pagination={false}
      columns={tableColumnConfig}
      loadTableInstance={loadTableInstance}
      rowdata={detailsTableData}
      tableHeader={getTableHeader()}
      closeButton={!isProductTab}
      sizeColumnsToFitFlag={true}
      handleCloseButtonClick={handleCloseCard}
      uniqueRowId={enableMasterDetail ? "__rowId" : undefined}
      suppressFieldDotNotation={true}
      {...(isBySizeView
        ? {
            getRowStyle: getPackCountRowStyle,
          }
        : {})}
      {...(isNewFlow
        ? {
            customCellRenderer: renderTrendSafeCell,
            noEditableCustomCellRender: (cellProps) =>
              renderTrendSafeCell(cellProps, cellProps?.colDef),
          }
        : {})}
      {...(enableMasterDetail
        ? {
            masterDetail: true,
            detailRowAutoHeight: true,
            detailCellRenderer: DetailCellRenderer,
            ...(isBySizeView
              ? {
                  isRowMaster: (data) =>
                    !isPackCountRow(data?.data ?? data),
                }
              : {}),
          }
        : {})}
      topCenterOptions={
        isNewFlow && isProductTab ? (
          <ButtonGroup
            options={BREAKDOWN_OPTIONS}
            selectedOption={breakdownView}
            onChange={(_event, newValue) => {
              if (newValue) {
                setBreakdownView(newValue);
              }
            }}
          />
        ) : null
      }
    />
  );

  return (
    <Loader loader={isLoading} minHeight={150}>
      {isProductTab && isNewFlow ? (
        <div className={classes.card}>
          <div className={classes.cardHeader}>
            <div className={classes.headerLeft}>
              <span className={classes.headerTitle}>DC Inventory Overview</span>
              <div className={classes.divider} />
              <span className={classes.styleColorLabel}>Style Color ID:</span>
              <span className={classes.styleColorValue}>
                {styleColorId || "N/A"}
              </span>
            </div>
            <div className={classes.headerRight}>
              <Button
                variant="tertiary"
                size="large"
                onClick={() => setShowViewPackConfiguration(true)}
              >
                View Pack & Size Details
              </Button>
              <div className={classes.divider} />
              <Button
                variant="tertiary"
                size="large"
                className={classes.closeButton}
                onClick={handleCloseCard}
                icon={<CloseIcon />}
                iconPlacement="right"
              >
                Close
              </Button>
            </div>
          </div>
          {dcDict.length > 0 && (
            <div className={classes.dcDetailsSection}>
              <div
                className={
                  dcOverviewExpanded
                    ? classes.dcDetailsRowExpanded
                    : classes.dcDetailsRow
                }
              >
                {dcDict.map((dc) => (
                  <div
                    key={dc?.value ?? dc?.label}
                    className={classes.dcChip}
                  >
                    <span className={classes.dcLabel}>{dc?.label}</span>
                    {DC_METRIC_CHIPS.map((metric) => {
                      const metricData = dc?.[metric.key] || {};
                      const previous = metricData?.previous;
                      const current = metricData?.current;
                      return (
                        <div
                          key={metric.key}
                          className={classes.dcMetricChip}
                          style={{
                            borderLeft: `1.606px solid ${metric.borderColor}`,
                          }}
                        >
                          <span className={classes.dcMetricLabel}>
                            {metric.label}
                          </span>
                          <span className={classes.dcMetricValues}>
                            {formatDcMetricValue(previous)}
                            {getDcMetricTrendIcon(
                              previous,
                              current,
                              classes.dcTrendIcon
                            )}
                            {formatDcMetricValue(current)}
                          </span>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      className={classes.breakdownLink}
                      onClick={() => handleOpenDcBreakdown(dc)}
                    >
                      Breakdown
                      <OpenIcon />
                    </button>
                  </div>
                ))}
              </div>
              {dcDict.length > 1 && (
                <div
                  className={classes.dcExpandButton}
                  onClick={() => setDcOverviewExpanded((prev) => !prev)}
                >
                  {dcOverviewExpanded ? <ISCollapse /> : <ISExpand />}
                </div>
              )}
            </div>
          )}
          {table}
          {showViewPackConfiguration && (
            <PackAndSizeDetailsPanel
              isOpen={showViewPackConfiguration}
              onClose={() => setShowViewPackConfiguration(false)}
              selectedArticle={article}
              allocationCodeProp={props.allocationCode}
            />
          )}
          {showDcBreakdownSheet && (
            <BottomSheet
              title={`${selectedDcForBreakdown?.label || "DC"} Breakdown`}
              size="medium"
              open={showDcBreakdownSheet}
              onClose={handleCloseDcBreakdown}
              withExpandIcon={false}
              className={classes.dcBreakdownBottomSheet}
            >
              <div className={classes.dcBreakdownSheetBody}>
                <AgGridComponent
                  key={`dc-breakdown-${selectedDcForBreakdown?.label || "dc"}`}
                  selectAllHeaderComponent={false}
                  pagination={false}
                  columns={dcBreakdownColumns}
                  rowdata={productSizeTableData}
                  sizeColumnsToFitFlag={false}
                  hideSelectCurrentPageRecords={true}
                  uniqueRowId="__rowId"
                  suppressFieldDotNotation={true}
                  cardContainer={false}
                  isInsideBottomSheet
                  tableHeader="Details"
                  showDownloadButton={true}
                  isBottomSheetExpanded={true}
                  height="400px"
                  customCellRenderer={renderTrendSafeCell}
                  noEditableCustomCellRender={(cellProps) =>
                    renderTrendSafeCell(cellProps, cellProps?.colDef)
                  }
                />
              </div>
            </BottomSheet>
          )}
        </div>
      ) : (
        table
      )}
    </Loader>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getColumnsAg: (params) => dispatch(getColumnsAg(params)),
    getProductStoreDetailsInRecomendation: (payload, tabName) =>
      dispatch(getProductStoreDetailsInRecomendation(payload, tabName)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductAndStoreDetailsInRecommendation);
