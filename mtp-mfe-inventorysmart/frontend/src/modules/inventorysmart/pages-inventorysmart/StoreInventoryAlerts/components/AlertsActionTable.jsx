import React, { useState, useEffect, useRef, forwardRef } from "react";
import { connect } from "react-redux";

import {
  getAlertsActionTableConfiguration,
  getServerSideAlertsData,
  setAlertsActionTableConfigLoader,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/alerts-actions-service";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import DownloadButton from "./Download";
import AiIcon from "../../../../../assets/IS_icons/IS_AI.svg";
import {
  defaultTableData,
  ERROR_MESSAGE,
  STORE_INVENTORY_ALERT_ACTION_CONFIG,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { addSnack } from "core/actions/snackbarActions";
import {
  getFilterDependencyProductAndStoreAttributes,
  getServerSidePaginationAPIPayload,
} from "../../inventorysmart-utility";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import colours from "core/Styles/colours";
import { downloadFinalizeSummary } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import makeStyles from "@mui/styles/makeStyles";
import { Badge, Button, Tooltip, useTranslation } from "impact-ui-v3";
import {
  moveToOrderBatching,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import globalStyles from "core/Styles/globalStyles";
import { setRefetchAlerts } from "../../../services-inventorysmart/StoreInventoryAlerts/store-inventory-alerts-service";
import FilterPlansModal from "./FilterPlansModal";
import AlanSummaryPanel from "../../Decision-Dashboard/AISummaryData/AlanSummaryPanel";
import SummarizePanel from "./SummarizePanel";
import SkusBadgeCell from "./SkusBadgeCell";
import SkusSidePanel from "./SkusSidePanel";
import AlanSummaryDemoPanel from "../../Decision-Dashboard/AISummaryData/AlanSummaryDemoPanel";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import {
  AI_SMART_FILTER_AUTO_ALLOCATION,
  AI_SMART_FILTER_STOCKOUT_PRODUCTS,
  AI_SMART_FILTER_SHORTFALL_PRODUCTS,
  AI_SMART_FILTER_NEW_PRODUCTS,
  AI_SMART_FILTER_PO_ASN_TO_ALLOCATE,
  AI_SMART_FILTER_ASN_TO_ALLOCATE,
} from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";


export const AI_SMART_FILTER_CONFIG_BY_ALERT = {
  "auto allocation": AI_SMART_FILTER_AUTO_ALLOCATION,
  stockout: AI_SMART_FILTER_STOCKOUT_PRODUCTS,
  "stockout products": AI_SMART_FILTER_STOCKOUT_PRODUCTS,
  shortfall: AI_SMART_FILTER_SHORTFALL_PRODUCTS,
  "shortfall products": AI_SMART_FILTER_SHORTFALL_PRODUCTS,
  "launch products": AI_SMART_FILTER_NEW_PRODUCTS,
  "new products": AI_SMART_FILTER_NEW_PRODUCTS,
  // "PO/ASN to Allocate" (primark) / "PO to Allocate" (other tenants, e.g.
  // swarovski, briscoes, tapestry_asia, tillys)
  "po/asn to allocate": AI_SMART_FILTER_PO_ASN_TO_ALLOCATE,
  "po to allocate": AI_SMART_FILTER_PO_ASN_TO_ALLOCATE,
  "asn to allocate": AI_SMART_FILTER_ASN_TO_ALLOCATE,
};
const useStyles = makeStyles({
  finalizeSummaryDownloadBtn: {
    position: "absolute",
    right: "180px",
  },
  inventoryDetailsBtnContainer: {
    borderRadius: "8px",
    padding: "1px",
    background:
      "linear-gradient(136.31deg, #2AC2EE 12.23%, #6962EF 49.23%, #F26921 88.52%)",

    "& .inventory-details-btn": {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "6px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      background: "#FFF",
      transition: "all 0.3s ease",
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px",
      position: "relative",
      overflow: "hidden",
      animation: "none",
      color: "#1F2B4D",

      "& svg": {
        width: 18,
        height: 18,
      },
      "&:hover": {
        color: "#1F2B4D",
        background: "#FFF",
        animation: "none",
        "& path": {
          fill: "currentColor",
        },
      },
    },
  },
});

const AlertsActionTable = (props) => {
  // This is were Custom Alerts Table show up.
  const { showTotalAllocatedUnits, totalAllocated } = props;
  const { t } = useTranslation();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const aiChips = useAiSmartFilterChips();
  const [
    alertsActionTableTableConfig,
    setAlertsActionTableTableConfig,
  ] = useState([]);
  const [
    alertsActionDownloadAllTableConfig,
    setAlertsActionDownloadAllTableConfig,
  ] = useState([]);
  const [alertsActionTableData, setAlertsActionTableData] = useState([]);
  const [alertsActionTableDataCount, setAlertsActionTableDataCount] = useState(
    0
  );
  const [downloadRequestBody, setDownloadRequestBody] = useState({});
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [showFilterPlansModal, setShowFilterPlansModal] = useState(false);
  const [alanSummaryPanelStatus, setAlanSummaryPanelStatus] = useState(false);
  const [showSummarizePanel, setShowSummarizePanel] = useState(false);
  const [showSkusPanel, setShowSkusPanel] = useState(false);
  const [skusPanelData, setSkusPanelData] = useState([]);
  const [
    alanSummaryDemoPanelStatus,
    setAlanSummaryDemoPanelStatus,
  ] = useState(false);
  const agGridInstance = useRef(null);

  const openSkusPanel = (skus) => {
    setSkusPanelData(skus);
    setShowSkusPanel(true);
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const onReviewClick = (data, isAlertPaginated) => {
    props.onReviewClick(data, isAlertPaginated);
    if (isAlertPaginated) {
      agGridInstance.current?.api?.redrawRows();
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setShowTableLoader(true);
      let excludedFilterValues = props.excludedFilterValues
        ? props.excludedFilterValues
        : [];
      if (dynamicLabelsBasedOnTenant("article") === "SKU") {
        excludedFilterValues = [];
      }
      const filters = getFilterDependencyProductAndStoreAttributes([
        ...props.selectedFilters,
      ]);

      let payload = getServerSidePaginationAPIPayload(
        props.alertTableLink,
        filters,
        manualbody,
        pageIndex,
        props.includeExclusionFilter,
        props.excludeURLObject,
        params,
        props.pageSize
      );
      setDownloadRequestBody(payload?.data);
      let response = await props.getServerSideAlertsData(payload);
      response.data.data = response.data.data.map((dataItem, index) => {
        dataItem.index = index;
        dataItem.action = "Review";
        return dataItem;
      });

      if (response.data.status) {
        if (response.data?.data?.length) {
          let formattedData = agGridRowFormatter(
            response.data.data,
            params?.api?.checkConfiguration,
            props.uniqueKey
          );

          props.setShowTableLoader(false);
          setAlertsActionTableData(formattedData);
          setAlertsActionTableDataCount(response.data.total);
          return { data: formattedData, totalCount: response.data.total };
        } else {
          if (response.data?.show_message)
            displaySnackMessages(response.data?.message, "success");
          props.setShowTableLoader(false);
          return defaultTableData;
        }
      }
    } catch (e) {
      handleErrorMessage(e);
      props.setShowTableLoader(false);
      return defaultTableData;
    }
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setAlertsActionTableConfigLoader(true);

      let columns;
      if (props.tableConfigName) {
        const payload = {
          tableConfigName: props.tableConfigName,
        };
        let response = await props.getAutoRecommendationTableConfiguration(
          payload
        );
        columns = cloneDeep(response);
      } else if (props.tableConfig) {
        columns = {
          data: {
            data: cloneDeep(props.tableConfig),
          },
        };
      }

      if (props?.downloadAllLink && props?.downloadAllTableConfigName) {
        const downloadAllTableConfigPayload = {
          tableConfigName: props.downloadAllTableConfigName,
        };

        const downloadAllTableColumns = await props.getAutoRecommendationTableConfiguration(
          downloadAllTableConfigPayload
        );
        let formattedDownloadAllColumns = agGridColumnFormatter(
          downloadAllTableColumns?.data?.data
        );
        setAlertsActionDownloadAllTableConfig(formattedDownloadAllColumns);
      }

      let reviewRecommendationColumn = STORE_INVENTORY_ALERT_ACTION_CONFIG[0];
      reviewRecommendationColumn.order_of_display =
        columns.data.data.length + 1;
      reviewRecommendationColumn.tc_code = columns.data.data[0]?.tc_code;
      reviewRecommendationColumn.tc_mapping_code =
        columns.data.data[0]?.tc_mapping_code;

      columns.data.data.push(reviewRecommendationColumn);

      let formattedColumns;

      if (reviewRecommendationColumn.tc_code === 325) {
        formattedColumns = agGridColumnFormatter([...columns?.data?.data]);
      } else {
        formattedColumns = agGridColumnFormatter(columns?.data?.data);
      }

      formattedColumns.forEach((col) => {
        if (col.column_name === "skus") {
          col.valueGetter = (params) => params?.data?.skus;
          col.cellRenderer = (cellProps) => (
            <SkusBadgeCell
              skus={cellProps?.data?.skus}
              onOpenPanel={openSkusPanel}
            />
          );
        }
        if (col.column_name === "inventory_source") {
          col.cellRenderer = (cellProps) => {
            const source = cellProps?.data?.inventory_source;
            return source ? (
              <Badge
                color={source.toUpperCase() === "PO" ? "success" : "info"}
                label={source.toUpperCase()}
                size="small"
                variant="stroke"
              />
            ) : null;
          };
        }
        if (col.column_name === "exclusion_reason") {
          col.cellRenderer = (cellProps) => {
            const reason = cellProps?.data?.exclusion_reason;
            if (!reason) {
              return null;
            }
            const normalizedReason = reason.toUpperCase();
            if (normalizedReason === "MULTI_SOURCE") {
              return (
                <Badge
                  color="info"
                  label="Multi-Source (DC+PO)"
                  size="small"
                  variant="stroke"
                />
              );
            }
            if (normalizedReason === "MULTIPLE_PO_IDS") {
              return (
                <Badge
                  color="default"
                  label="Multiple PO IDs"
                  size="small"
                  variant="stroke"
                />
              );
            }
            return (
              <Badge
                color="default"
                label={reason}
                size="small"
                variant="stroke"
              />
            );
          };
        }
        if (col.column_name === "dc_allocation_status") {
          col.cellRenderer = (cellProps) => {
            const status = cellProps?.data?.dc_allocation_status;
            return status ? (
              <Badge
                color={
                  status.toLowerCase() === "completed" ? "success" : "error"
                }
                label={status}
                size="small"
                variant="stroke"
              />
            ) : null;
          };
        }
      });

      setAlertsActionTableTableConfig(formattedColumns);
      props.setAlertsActionTableConfigLoader(false);
    };
    fetchColumnConfig();

    return () => {
      setAlertsActionTableTableConfig([]);
      setAlertsActionTableData([]);
      setAlertsActionTableDataCount(0);
    };
  }, []);

  useEffect(() => {
    if (props.tableData?.length > 0) {
      const data = props.tableData.map((item, index) => {
        item.index = index;
        item.action = "Review";
        return item;
      });

      setAlertsActionTableData(data);
      agGridInstance.current?.api?.redrawRows();
    }
  }, [props.tableData]);

  
  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const getColorForVB = (params) => {
    let l_popupData = params?.data?.pop_up_data;
    let l_totalArticles = l_popupData?.length;
    let l_articleAllocatedOnce = 0;
    let l_articleAllocatedMoreThanOnce = 0;
    let l_articlesWithNoAllocation = 0;
    l_popupData?.forEach((article) => {
      if (article?.number_of_allocations === 1) {
        l_articleAllocatedOnce++;
      } else if (article?.number_of_allocations > 1) {
        l_articleAllocatedMoreThanOnce++;
      } else {
        l_articlesWithNoAllocation++;
      }
    });

    if (
      l_totalArticles ===
      l_articleAllocatedOnce + l_articleAllocatedMoreThanOnce
    ) {
      if (l_totalArticles === l_articleAllocatedMoreThanOnce) {
        // return light yelloow
        return { background: colours.pantone };
      } else {
        // return light green
        return { background: colours.lightMint };
      }
    } else if (l_articlesWithNoAllocation !== l_totalArticles) {
      // return light blue
      return { background: colours.lightBlue };
    }
  };

  useEffect(() => {
    if (props.totalModelStockData) {
      alertsActionTableData?.forEach((item) => {
        if (
          item.index === props.totalModelStockData.index &&
          (item.sku === props.totalModelStockData.skuId ||
            item.article === props.totalModelStockData.skuId ||
            item.product_code === props.totalModelStockData.skuId)
        ) {
          item[`${props.reviewPrefix}_model_stock`] =
            props.totalModelStockData.sum;
        }
      });

      agGridInstance.current?.api?.redrawRows();
    }
  }, [props.totalModelStockData]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const downloadFinalizeSummary = async () => {
    let tableData = cloneDeep(alertsActionTableData);
    let allocationCodes = tableData.map((item) => item.plan_code);
    props
      .downloadFinalizeSummary({
        allocation_code: allocationCodes,
      })
      .then(() => {
        displaySnackMessages(
          "Download Request is running in background. You will get a notification once it is ready to download",
          "info"
        );
      });
  };

  const moveToOrderBatching = async () => {
    let allocation_codes = selectedPlans.map((thisPLan) => {
      return thisPLan.plan_code;
    });
    let payload = {
      allocation_codes,
      status: 2,
    };
    try {
      props?.setAlertsActionTableConfigLoader(true);
      let savedResponse = await props?.moveToOrderBatching(payload);
      let successCount = 0;
      savedResponse?.data?.data?.forEach((thisData) => {
        if (thisData.status) {
          successCount += 1;
        }
      });
      if (successCount === savedResponse?.data?.data?.length) {
        displaySnackMessages(
          t("inventorysmart.allPlansMovedToOrderBatching", {
            module_label: props?.orderBatchingModuleLabel || "Order Batching",
          }),
          "success"
        );
      } else {
        displaySnackMessages("Some plans failed to move", "error");
      }
      props?.setRefetchAlerts(true);
      setSelectedPlans([]);
      props?.setAlertsActionTableConfigLoader(false);
    } catch (error) {
      props?.setAlertsActionTableConfigLoader(false);
      handleErrorMessage(error);
    }
  };

  const onSelectionChanged = (params) => {
    let selections = params.api.getSelectedRows();
    setSelectedPlans(selections);
  };

  // Filter the values into the plan_code column's existing floating filter search bar
  const applyPlanCodeFilter = (values) => {
    if (values.length > 0) {
      agGridInstance.current?.api?.setFilterModel({
        plan_code: {
          filterType: "text",
          type: "contains",
          filter: values.join(","),
        },
      });
    } else {
      agGridInstance.current?.api?.setFilterModel(null);
    }
  };

  const resolveAutoAllocationColumnName = (columnName) => {
    const normalize = (value) =>
      (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
    const isPlanCodeVariant =
      normalize(columnName).replace(/[\s_]+/g, "") === "plancode";
    if (props?.alertInfo?.name !== "Auto Allocation" || !isPlanCodeVariant) {
      return columnName;
    }
    const columnsConfig = alertsActionTableTableConfig || [];
    const allocationNameColumn = columnsConfig.find(
      (col) =>
        normalize(col?.headerName || col?.label || col?.originalLabel) ===
        "allocation name"
    );
    const resolvedField =
      allocationNameColumn?.field ||
      allocationNameColumn?.column_name ||
      allocationNameColumn?.name ||
      columnsConfig[0]?.field ||
      columnsConfig[0]?.column_name;
    return resolvedField || columnName;
  };

  const applyAiSmartFilterToColumn = (columnNameFromAi, values) => {
    const columnName = resolveAutoAllocationColumnName(columnNameFromAi);
    if (!columnName) return;
    const api = agGridInstance.current?.api;
    if (!api) return;

    if (Array.isArray(values) && values.length > 0) {
      api.setFilterModel({
        [columnName]: {
          filterType: "text",
          type: "contains",
          filter: values.join(","),
        },
      });
    } else {
      const currentModel = api.getFilterModel() || {};
      if (Object.prototype.hasOwnProperty.call(currentModel, columnName)) {
        const { [columnName]: _removed, ...rest } = currentModel;
        api.setFilterModel(rest);
      }
    }
  };

  const getTopRightOptions = () => {
    let options = [];

    if (showTotalAllocatedUnits) {
      options.push(totalAllocated);
    }

    if (
      selectedPlans.length >= 1 &&
      props?.vapToOb &&
      props?.uniqueKey === "plan_code"
    ) {
      const buttonLabel = t("inventorysmart.moveToOrderBatching", {
        module_label: props?.orderBatchingModuleLabel || "Order Batching",
      });
      options.push(
        <Button
          variant="primary"
          id="move-ob"
          onClick={() => moveToOrderBatching()}
        >
          {buttonLabel}
        </Button>
      );
    }

    if (props.downloadAllLink) {
      options.push(
        <DownloadButton
          url={props.downloadAllLink}
          requestBody={downloadRequestBody}
          disable={
            !alertsActionTableDataCount &&
            alertsActionDownloadAllTableConfig.length === 0
          }
          includeExclusionFilter={props.includeExclusionFilter}
          excludeURLObject={props.excludeURLObject}
          columns={alertsActionTableTableConfig}
        />
      );
    }

    if (props.ddScreenConfigs.dashboard.drillDown?.downloadFinalizeSummary) {
      options.push(
        <Button variant="tertiary" onClick={downloadFinalizeSummary}>
          Download Summary
        </Button>
      );
    }

    if (props?.alertInfo?.name === "Auto Allocation" && props?.advanceFilter) {
      options.push(
        <div className={classes.inventoryDetailsBtnContainer}>
          <Tooltip title="" variant="secondary">
            <div
              className={`inventory-details-btn`}
              onClick={() => setShowFilterPlansModal(true)}
              role="button"
            >
              <AiIcon />
              Filter Plans
            </div>
          </Tooltip>
        </div>
      );
      if (selectedPlans?.length === 0 && props?.advanceFilter) {
        options.push(
          <div className={classes.inventoryDetailsBtnContainer}>
            <Tooltip title="" variant="secondary">
              <div
                className={`inventory-details-btn`}
                onClick={() => setShowSummarizePanel(true)}
                role="button"
              >
                <AiIcon />
                Summarize
              </div>
            </Tooltip>
          </div>
        );
      }
    }

    const aiSmartFilterConfig =
      AI_SMART_FILTER_CONFIG_BY_ALERT[
        props?.alertInfo?.name?.trim()?.toLowerCase()
      ];
    if (
      aiSmartFilterConfig &&
      props?.ddScreenConfigs?.dashboard?.drillDown?.enableSmartFilter
    ) {
      options.push(
        <AiSmartFilterButton
          key="ai-smart-filter-btn"
          columns={alertsActionTableTableConfig}
          filters={props?.selectedFilters}
          screenName={aiSmartFilterConfig.screenName}
          tableId={aiSmartFilterConfig.tableId}
          onFilterApplied={applyAiSmartFilterToColumn}
          onAppliedFilterChange={aiChips.onAppliedFilterChange}
          onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
          hideSuggestions
        />
      );
    }
    if (
      props?.alertInfo?.name === "Auto Allocation" &&
      props?.ddScreenConfigs?.dashboard?.drillDown?.enableSummarize
    ) {
      options.push(
        <div className={classes.inventoryDetailsBtnContainer} key="alan-summary-demo-btn">
          <Tooltip title="" variant="tertiary">
            <div
              onClick={() => setAlanSummaryDemoPanelStatus(true)}
              className={`inventory-details-btn`}
            >
              <AiIcon />
              AI Summary
            </div>
          </Tooltip>
        </div>
      );
    }

    // Alan Summary Button - Show if any rows selected and enableSummaryPlan is true
    if (props?.summaryPlan && selectedPlans?.length === 1 && props?.alertInfo?.name === "Auto Allocation") {
      options.push(
        <div className={classes.inventoryDetailsBtnContainer}>
          <Tooltip title="" variant="tertiary">
            <div
              onClick={() => setAlanSummaryPanelStatus(true)}
              className={`inventory-details-btn`}
            >
              <AiIcon />
              Auto Allocation Summary
            </div>
          </Tooltip>
        </div>
      );
    }

    return options.length > 0 ? options : null;
  };

  return (
    <>
      <Loader
        loader={
          (props.alertsActionTableConfigLoader || props.loading) &&
          !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "dashboard"
          )
        }
        size="medium"
        minHeight={"188px"}
      >
        <AgGridComponent
          height={"300px"}
          closeButton
          handleCloseButtonClick={() => {
            props?.setSelectedAlertIndex(-1);
          }}
          tableHeader="Review Recommendation"
          topLeftOptions={
            <AiSmartFilterChips
              chips={aiChips.chips}
              onChipClick={(chip) =>
                aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
              }
              onChipRemove={(chip) =>
                aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
              }
            />
          }
          topRightOptions={getTopRightOptions()}
          selectAllHeaderComponent={
            props?.summaryPlan 
              ? true 
              : props?.vapToOb && props?.uniqueKey === "plan_code"
          }
          onSelectionChanged={onSelectionChanged}
          columns={alertsActionTableTableConfig}
          rowdata={!props.isPaginatedTableApi ? alertsActionTableData : null}
          {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "dashboard"
          )
            ? {
                pagination: false,
                rowModelType: props.isPaginatedTableApi && "infinite",
                cacheOverflowSize: 2,
                hideSelectCurrentPageRecords: true,
                // props.isPaginatedTableApi,
              }
            : {
                rowModelType: props.isPaginatedTableApi && "serverSide",
                serverSideStoreType: props.isPaginatedTableApi && "partial",
              })}
          manualCallBack={
            props.isPaginatedTableApi &&
            ((body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params))
          }
          onReviewClick={(tableInfo) =>
            onReviewClick(tableInfo.data, props.isPaginatedTableApi)
          }
          uniqueRowId={"index"}
          loadTableInstance={loadAlertsTableInstance}
          allowCustomStyling={true}
          getRowStyle={(params) => {
            if (params?.data?.[`${props.reviewPrefix}_is_resolved`]) {
              return { background: "rgb(57 255 20 / 20%)" };
            } else {
              return getColorForVB(params);
            }
          }}
          totalCount={alertsActionTableDataCount} // to set the total count once received from BE
          cacheBlockSize={props.pageSize}
          paginationPageSize={props.pageSize}
          skipAutoSizeColumn
          sizeColumnsToFitFlag
          onFirstDataRender={(params) =>
            params.columnApi.autoSizeColumns(["skus"], false)
          }
          processCellCallbackForExcel={props?.downloadAllLink ? false : true}
          {...(props.alertInfo?.clientSideDownload
            ? {
                downloadAsExcel: alertsActionTableData?.length,
              }
            : {})}
        />
      </Loader>
      <FilterPlansModal
        open={showFilterPlansModal}
        onClose={() => setShowFilterPlansModal(false)}
        filters={props?.selectedFilters}
        summaryPlan={props?.summaryPlan}
        FilterPlan={props?.advanceFilter}
        onFilterTable={(_columnName, values) => {
          applyPlanCodeFilter(values);
        }}
      />
      {alanSummaryPanelStatus && (
        <AlanSummaryPanel
          open={alanSummaryPanelStatus}
          onClose={setAlanSummaryPanelStatus}
          selectedRows={selectedPlans}
          summaryPlan={props?.summaryPlan}
        />
      )}
      {alanSummaryDemoPanelStatus && (
        <AlanSummaryDemoPanel
          open={alanSummaryDemoPanelStatus}
          onClose={setAlanSummaryDemoPanelStatus}
          filters={props?.selectedFilters}
        />
      )}
      {showSummarizePanel && (
        <SummarizePanel
          open={showSummarizePanel}
          onClose={() => setShowSummarizePanel(false)}
          filters={props?.selectedFilters}
          summaryPlan={props?.summaryPlan}
          FilterPlan={props?.advanceFilter}
        />
      )}
      {showSkusPanel && (
        <SkusSidePanel
          open={showSkusPanel}
          onClose={() => setShowSkusPanel(false)}
          title="All Styles"
          skus={skusPanelData}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    alertsActionTableConfigLoader:
      store.inventorysmartReducer.inventorySmartAlertsActionService
        .alertsActionTableConfigLoader,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    excludedFilterValues:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .filter_attribute_exclusion_values,
    vapToOb:
      store.inventorysmartReducer.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.drillDown?.vapToOb,
    refetchAlert:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .refetchAlert,
    advanceFilter:
      store.inventorysmartReducer.inventorySmartDashboardService?.advanceFilter,
    summaryPlan:
      store.inventorysmartReducer.inventorySmartDashboardService?.setSummaryPlan,
    orderBatchingModuleLabel:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.module_label,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getAutoRecommendationTableConfiguration: (payload) =>
    dispatch(getAlertsActionTableConfiguration(payload)),
  setAlertsActionTableConfigLoader: (payload) =>
    dispatch(setAlertsActionTableConfigLoader(payload)),
  getServerSideAlertsData: (payload) =>
    dispatch(getServerSideAlertsData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  downloadFinalizeSummary: (payload) =>
    dispatch(downloadFinalizeSummary(payload)),
  moveToOrderBatching: (payload) => dispatch(moveToOrderBatching(payload)),
  setRefetchAlerts: (payload) => dispatch(setRefetchAlerts(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AlertsActionTable);
