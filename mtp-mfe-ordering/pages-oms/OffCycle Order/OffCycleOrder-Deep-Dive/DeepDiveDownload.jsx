import React, { useRef, useState } from "react";
import { Button, Tooltip } from "impact-ui-v3";
import DownloadIcon from "assets/IA_DOWNLOAD.svg";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { cloneDeep } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  FILE_DOWNLOADING_MESSAGE,
  ERROR_MESSAGE,
} from "modules/oms/constants-oms/stringConstants";
import {
  getOffCycleOrderDeepDiveDownloadTableConfiguration,
  getOffCycleOrderDeepDiveDownloadTableData,
  setOffCycleOrderDeepDiveDownloadTableConfig,
  setOffCycleOrderDeepDiveDownloadTableConfigLoader,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";

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
        : props?.filtersPayload?.filters;

      const appliedFilters = cloneDeep(
        deepDiveFiltersPayload || filtersFromRedirection || []
      );

      const appliedDateFilters = [];
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
      props.setTableConfigLoader(false);
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
      props.setTableConfigLoader(true);
      const columnResponse = await props.getDownloadTableConfiguration(
        props?.isCalledFromVendorToStore
      );
      const columnConfig = columnResponse?.data?.data;
      if (columnResponse?.data?.status && columnConfig?.length) {
        props.setTableConfig(columnConfig);

        const {
          appliedDateFilters,
          appliedProductFilters,
        } = getAppliedFilters();

        const payload = {
          draft_id: props?.draftId,
          filters: [...appliedProductFilters],
          transform_flag: true,
          is_download: true,
          ...(appliedDateFilters?.length
            ? { date_filter: appliedDateFilters }
            : {}),
        };

        if (payload?.filters?.length > 0 || payload?.draft_id) {
          const dataResponse = await props.getDownloadTableData(
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
      props.setTableConfigLoader(false);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setTableConfigLoader(false);
    }
  };

  const getDownloadFilename = () => {
    if (props?.isCalledFromVendorToStore) {
      return "off_cycle_order_deep_dive_vendor_store";
    }
    return "off_cycle_order_deep_dive";
  };

  return (
    <div>
      <Tooltip title="Download">
        <Button
          variant="tertiary"
          sx={{ mr: 0 }}
          onClick={downloadCsv}
          disabled={props.tableConfigLoader}
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
    filtersPayload:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFiltersPayload,
    tableConfigLoader:
      store.omsReducer.offCycleOrderService
        .offCycleOrderDeepDiveDownloadTableConfigLoader,
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getDownloadTableConfiguration: (payload) =>
    dispatch(getOffCycleOrderDeepDiveDownloadTableConfiguration(payload)),
  getDownloadTableData: (payload, isCalledFromVendorToStore) =>
    dispatch(
      getOffCycleOrderDeepDiveDownloadTableData(
        payload,
        isCalledFromVendorToStore
      )
    ),
  setTableConfigLoader: (payload) =>
    dispatch(setOffCycleOrderDeepDiveDownloadTableConfigLoader(payload)),
  setTableConfig: (payload) =>
    dispatch(setOffCycleOrderDeepDiveDownloadTableConfig(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DeepDiveDownload);
