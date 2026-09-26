import React, { useRef, useState } from "react";
import { Button, Tooltip } from "impact-ui-v3";
import DownloadIcon from "assets/IA_DOWNLOAD.svg";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import {
  FILE_DOWNLOADING_MESSAGE,
  ERROR_MESSAGE,
} from "modules/oms/constants-oms/stringConstants";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

import {
  getOmsDeepDiveDownloadTableConfiguration,
  getOmsDeepDiveDownloadTableData,
  setOrderManagementDeepDiveDownloadTableConfigLoader,
  setOrderManagementDeepDiveDownloadTableConfig,
  getOmsCreateScenarioDownloadTableData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { fetchCreateScenarioDeepDiveV3 } from "modules/oms/pages-oms/OrderManagement/CreateScenario/api/createScenarioDeepDive.api.js";
import { fetchDeepDiveTableDataV3 } from "modules/oms/pages-oms/OrderManagement/ProductDetails/api/deepDiveTableData.api.js";
import { addSelectedHierarchyToFilters } from "../components/Product-Details-Screen/Style-Order-Summary/utils";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import { getExpediteOrdersDeepDiveDownloadConfiguration } from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import { getHighLevelSummaryHierarchyFilter } from "../VendorStore/utils/utils";
import makeStyles from "@mui/styles/makeStyles";
import {
  getExpediteActiveArticles,
  ensureExpediteArticleScope,
  EXPEDITE_LS_KEYS,
} from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";

const useStyles = makeStyles((theme) => ({
  customSystemButton: {
    borderWidth: "0 !important",
    backgroundColor: "#f5f6fa !important",
    width: "32px !important",
    padding: "6px !important",
  },
}));

const DeepDiveDownload = (props) => {
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const classes = useStyles();

  const downloadLink = useRef(null);

  const IS_V2_DEEP_DIVE_DOWNLOAD = props?.forceLegacyDownload
    ? false
    : props?.screenConfig?.is_v2_deep_dive_download || false;

  const DEFAULT_WEEKS_TO_SHOW = props?.screenConfig?.default_weeks || 26;

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getAppliedFilters = () => {
    try {
      const redirectionDetails = JSON.parse(
        localStorage.getItem("omsRedirectionDetails")
      );
      const filtersFromRedirection = redirectionDetails?.isRedirection
        ? redirectionDetails?.selectedFilters
        : [];

      // Expedite flow writes `deepDiveFiltersPayload` into its own reducer
      // (`expediteOrdersService`), NOT into `orderManagementService` or
      // `orderManagementVendorToStoreService`. Route the payload source based
      // on the caller so the download carries the correct filter set.
      let deepDiveFiltersPayload;
      if (props?.isCalledFromExpediteOrders) {
        deepDiveFiltersPayload = props?.expediteDeepDiveFiltersPayload?.filters;
      } else if (props?.isCalledFromVendorToStore) {
        deepDiveFiltersPayload = props?.deepDiveFiltersPayload?.filters;
      } else {
        deepDiveFiltersPayload =
          props?.orderManagementDeepDiveFiltersPayload?.filters;
      }

      let appliedFilters = cloneDeep(
        deepDiveFiltersPayload ||
          filtersFromRedirection ||
          props?.filterDashboardConfiguration?.appliedFilterData
            ?.dependencyData ||
          []
      );

      if (
        !props?.isCalledFromExpediteOrders &&
        !props?.isCalledFromVendorToStore
      ) {
        appliedFilters = mergeOmsDcIntoFilters(
          appliedFilters,
          props?.selectedDcs || []
        );
      }

      if (appliedFilters?.length) {
        const redirectedRows = redirectionDetails?.selectedRowIds;
        appliedFilters.find((filter) => {
          if (
            filter.attribute_name ===
            props?.selectedRowsFromMatrixSummary?.attribute_name
          ) {
            if (filter.values.length === 0) {
              filter.values = redirectedRows?.length
                ? redirectedRows
                : props?.selectedRowsFromMatrixSummary?.values;
            }
          }
        });
      }

      // Expedite scope enforcement (see rule 23): guarantee the `article`
      // filter stays within the active article set (simulation subset on
      // step 2, alert-picked `choiceDcCombinations` on step 1). Also seeds
      // the `article` entry if the caller's filters array is empty so the
      // download endpoint never receives an unbounded article universe.
      if (props?.isCalledFromExpediteOrders) {
        let choiceDcCombinations = [];
        try {
          const alertPayloadRaw = localStorage.getItem(
            EXPEDITE_LS_KEYS.ALERT_PAYLOAD
          );
          if (alertPayloadRaw) {
            const parsedAlertPayload = JSON.parse(alertPayloadRaw);
            choiceDcCombinations = Array.isArray(
              parsedAlertPayload?.choiceDcCombinations
            )
              ? parsedAlertPayload.choiceDcCombinations
              : [];
          }
        } catch {
          // ignore — fall back to empty; ensureExpediteArticleScope guards.
        }
        const activeArticles = getExpediteActiveArticles(
          choiceDcCombinations,
          props?.expediteGeneratedOrders
        );
        const scopedFilters = ensureExpediteArticleScope(
          appliedFilters,
          activeArticles
        );
        appliedFilters.length = 0;
        appliedFilters.push(...scopedFilters);
      }

      const appliedDateFilters = [];
      if (!isEmpty(props?.ropDate)) {
        appliedDateFilters.push(props?.ropDate);
      }
      if (!isEmpty(props?.recommRecieptDate)) {
        appliedDateFilters.push(props?.recommRecieptDate);
      }
      if (props?.weekRange?.attribute_name) {
        appliedDateFilters.push(props?.weekRange);
      }
      if (
        redirectionDetails?.isRedirection &&
        redirectionDetails?.dateFilters?.length
      ) {
        appliedDateFilters.push(redirectionDetails?.dateFilters);
      }

      const appliedGlobalFilters = appliedFilters?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
      );

      const appliedProductFilters = addSelectedHierarchyToFilters(
        props?.highLevelSummaryState,
        appliedGlobalFilters
      );
      return { appliedDateFilters, appliedProductFilters };
    } catch (error) {
      console.error("Error in Fetching Filters", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderManagementDeepDiveDownloadTableConfigLoader(false);
    }
  };

  const getFormattedDataForDownload = (dataResponse) => {
    const data = dataResponse.map((obj) =>
      Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          typeof value === "string" ? replaceSpecialCharacter(value) : value,
        ])
      )
    );
    return data;
  };

  const downloadCsv = async () => {
    displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");
    try {
      if (props?.isCreateScenarioDownload) {
        props.setOrderManagementDeepDiveDownloadTableConfigLoader(true);
        const columnResponse = props?.isCalledFromExpediteOrders
          ? await props.getExpediteOrdersDownloadConfig()
          : await props.getOmsDeepDiveDownloadTableConfiguration(
              props?.isCalledFromVendorToStore
            );
        const columnConfig = columnResponse?.data?.data;
        if (columnResponse?.data?.status && columnConfig?.length) {
          props.setOrderManagementDeepDiveDownloadTableConfig(columnConfig);
          const dataResponse = await props.getOmsCreateScenarioDownloadTableData(
            props?.simulateDownloadData,
            props?.isCalledFromVendorToStore
          );
          if (dataResponse?.data?.status) {
            const csvDownloadData = getFormattedDataForDownload(
              dataResponse.data.data?.deep_dive_scenario
            );
            setCsvData(cloneDeep(csvDownloadData));
            setCsvHeaders(getHeaderForExcel(cloneDeep(columnConfig)));
            downloadLink.current.link.click();
          } else {
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
        props.setOrderManagementDeepDiveDownloadTableConfigLoader(false);
      } else {
        props.setOrderManagementDeepDiveDownloadTableConfigLoader(true);
        const columnResponse = props?.isCalledFromExpediteOrders
          ? await props.getExpediteOrdersDownloadConfig()
          : await props.getOmsDeepDiveDownloadTableConfiguration(
              props?.isCalledFromVendorToStore
            );
        const columnConfig = columnResponse?.data?.data;
        if (columnResponse?.data?.status && columnConfig?.length) {
          props.setOrderManagementDeepDiveDownloadTableConfig(columnConfig);

          const {
            appliedDateFilters,
            appliedProductFilters,
          } = getAppliedFilters();

          let payload = {};

          if (props?.isCreateScenarioDeepDive) {
            payload = {
              data: [...props?.chartFilterData],
              ...(appliedDateFilters?.length
                ? { date_filter: appliedDateFilters }
                : {}),
            };
          } else {
            const hierarchyInfo = props?.highLevelSummaryState || {};
            const hierarchyFilter = getHighLevelSummaryHierarchyFilter(
              hierarchyInfo
            );
            if (hierarchyFilter && props?.isCalledFromVendorToStore) {
              appliedProductFilters.push(hierarchyFilter);
            }

            payload = {
              filters: [...appliedProductFilters],
              transform_flag: true,
              default_weeks: DEFAULT_WEEKS_TO_SHOW,
              is_download: true,
              ...(appliedDateFilters?.length
                ? { date_filter: appliedDateFilters }
                : {}),
            };
          }

          if (props?.useV3DeepDiveTable && !props?.isCreateScenarioDeepDive) {
            const selectedHierarchies = Array.isArray(
              props?.matrixHandoff?.selectedHierarchies
            )
              ? props.matrixHandoff.selectedHierarchies
              : [];
            payload = {
              ...payload,
              selected_hierarchies: selectedHierarchies,
              is_v3:
                typeof props?.isV3Schema === "boolean"
                  ? props.isV3Schema
                  : typeof props?.matrixHandoff?.isV3Schema === "boolean"
                  ? props.matrixHandoff.isV3Schema
                  : false,
            };
          }

          if (payload?.filters?.length > 0 || payload?.data?.length > 0) {
            let dataResponse;
            if (
              props?.isCreateScenarioDeepDive &&
              props?.useV3CreateScenarioStep2Apis
            ) {
              dataResponse = await fetchCreateScenarioDeepDiveV3(payload, {
                isDownload: true,
                isV3Schema: props?.isV3Schema === true,
              });
            } else if (props?.useV3DeepDiveTable) {
              dataResponse = await fetchDeepDiveTableDataV3(payload);
            } else {
              dataResponse = await props.getOmsDeepDiveDownloadTableData(
                payload,
                props?.isCalledFromVendorToStore,
                IS_V2_DEEP_DIVE_DOWNLOAD
              );
            }
            if (
              dataResponse?.data?.status &&
              dataResponse?.data?.data?.length > 0
            ) {
              const csvDownloadData = getFormattedDataForDownload(
                dataResponse.data.data
              );
              setCsvData(cloneDeep(csvDownloadData));
              setCsvHeaders(getHeaderForExcel(cloneDeep(columnConfig)));
              downloadLink.current.link.click();
            } else {
              displaySnackMessages(ERROR_MESSAGE, "error");
            }
          } else {
            displaySnackMessages("No filters applied for download.");
          }
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
        props.setOrderManagementDeepDiveDownloadTableConfigLoader(false);
      }
    } catch (error) {
      console.error("Error downloading CSV:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderManagementDeepDiveDownloadTableConfigLoader(false);
    }
  };

  const getDownloadFilename = () => {
    if (props?.isCalledFromExpediteOrders) {
      return "expedite_orders_deep_dive";
    }
    if (props?.isCalledFromVendorToStore) {
      return "vendor_store_deep_dive";
    }
    if (props?.isCreateScenarioDownload) {
      return "Simulate Scenario";
    }
    return "deep_dive";
  };
  return (
    <div>
      <Tooltip title="Download" variant="tertiary">
        <Button
          variant="text"
          sx={{ mr: 0 }}
          onClick={downloadCsv}
          icon={<DownloadIcon />}
          disabled={props.orderManagementDeepDiveDownloadTableConfigLoader}
          className={props.showAsCustomButton ? classes.customSystemButton : ""}
        ></Button>
      </Tooltip>
      {csvData.length > 0 &&
        csvHeaders.length > 0 &&
        downloadExcelLink(
          csvData,
          getDownloadFilename(),
          downloadLink,
          csvHeaders,
          "",
          "",
          true
        )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderManagementDeepDiveFiltersPayload:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersPayload,
    deepDiveFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveFiltersPayload,
    expediteDeepDiveFiltersPayload:
      store.omsReducer.expediteOrdersService.deepDiveFiltersPayload,
    expediteGeneratedOrders:
      store.omsReducer.expediteOrdersService.generatedOrders,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ],
    selectedRowsFromMatrixSummary:
      store.omsReducer.orderManagementService.selectedRowsFromMatrixSummary,
    selectedRowsFromOrderDetails:
      store.omsReducer.orderManagementVendorToStoreService
        .selectedRowsFromOrderDetails,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    orderManagementDeepDiveDownloadTableConfigLoader:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveDownloadTableConfigLoader,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    selectedDcs: store.omsReducer.orderManagementService.selectedDcs,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.oms_dashboard?.deep_dive,
    matrixHandoff:
      store.omsReducer.orderManagementTableService?.matrixHandoff,
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getOmsDeepDiveDownloadTableConfiguration: (payload) =>
    dispatch(getOmsDeepDiveDownloadTableConfiguration(payload)),
  getOmsDeepDiveDownloadTableData: (
    payload,
    isCalledFromVendorToStore,
    isV2DeepDive
  ) =>
    dispatch(
      getOmsDeepDiveDownloadTableData(
        payload,
        isCalledFromVendorToStore,
        isV2DeepDive
      )
    ),
  getOmsCreateScenarioDownloadTableData: (payload, isCalledFromVendorToStore) =>
    dispatch(
      getOmsCreateScenarioDownloadTableData(payload, isCalledFromVendorToStore)
    ),
  setOrderManagementDeepDiveDownloadTableConfigLoader: (payload) =>
    dispatch(setOrderManagementDeepDiveDownloadTableConfigLoader(payload)),
  setOrderManagementDeepDiveDownloadTableConfig: (payload) =>
    dispatch(setOrderManagementDeepDiveDownloadTableConfig(payload)),
  getExpediteOrdersDownloadConfig: () =>
    dispatch(getExpediteOrdersDeepDiveDownloadConfiguration()),
});

export default connect(mapStateToProps, mapDispatchToProps)(DeepDiveDownload);
