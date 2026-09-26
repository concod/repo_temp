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

const DeepDiveDownload = (props) => {
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);

  const downloadLink = useRef(null);

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

      const deepDiveFiltersPayload = props?.isCalledFromVendorToStore
        ? props?.deepDiveFiltersPayload?.filters
        : props?.orderManagementDeepDiveFiltersPayload?.filters;

      const appliedFilters = cloneDeep(
        deepDiveFiltersPayload ||
          filtersFromRedirection ||
          props?.filterDashboardConfiguration?.appliedFilterData
            ?.dependencyData ||
          []
      );

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

      const appliedProductFilters = appliedFilters?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
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
        const columnResponse = await props.getOmsDeepDiveDownloadTableConfiguration(
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
        const columnResponse = await props.getOmsDeepDiveDownloadTableConfiguration(
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
            payload = {
              filters: [...appliedProductFilters],
              transform_flag: true,
              ...(appliedDateFilters?.length
                ? { date_filter: appliedDateFilters }
                : {}),
            };
          }

          if (payload?.filters?.length > 0 || payload?.data?.length > 0) {
            const dataResponse = await props.getOmsDeepDiveDownloadTableData(
              payload,
              props?.isCalledFromVendorToStore
            );
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
    if (props?.isCalledFromVendorToStore) {
      return "vendor_store_deep_dive";
    }
    return props.isCreateScenarioDownload ? "Simulate Scenario" : "deep_dive";
  };

  return (
    <div>
      <Tooltip title="Download" variant="tertiary">
        <Button
          variant="text"
          onClick={downloadCsv}
          disabled={props.orderManagementDeepDiveDownloadTableConfigLoader}
        >
          <DownloadIcon />
        </Button>
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
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getOmsDeepDiveDownloadTableConfiguration: (payload) =>
    dispatch(getOmsDeepDiveDownloadTableConfiguration(payload)),
  getOmsDeepDiveDownloadTableData: (payload, isCalledFromVendorToStore) =>
    dispatch(
      getOmsDeepDiveDownloadTableData(payload, isCalledFromVendorToStore)
    ),
  getOmsCreateScenarioDownloadTableData: (payload, isCalledFromVendorToStore) =>
    dispatch(
      getOmsCreateScenarioDownloadTableData(payload, isCalledFromVendorToStore)
    ),
  setOrderManagementDeepDiveDownloadTableConfigLoader: (payload) =>
    dispatch(setOrderManagementDeepDiveDownloadTableConfigLoader(payload)),
  setOrderManagementDeepDiveDownloadTableConfig: (payload) =>
    dispatch(setOrderManagementDeepDiveDownloadTableConfig(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DeepDiveDownload);
