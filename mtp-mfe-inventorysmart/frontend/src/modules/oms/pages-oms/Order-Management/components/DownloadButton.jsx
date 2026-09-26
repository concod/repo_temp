import React from "react";
import { useState, useRef } from "react";
import { connect } from "react-redux";
import { Tooltip, Button } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { Prompt } from "impact-ui";
import { downloadExcelLink } from "core/Utils/csv-download";
import {
  getOmsSkuSummaryTableConfiguration,
  getOmsSkuSummaryTableData,
  getOmsSkuSummaryUploadTableConfig,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  INVALID_DATE,
  TENANT_DATE_FORMAT,
  OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
  OMS_FILE_UPLOAD_INSTRUCTIONS,
} from "modules/oms/constants-oms/stringConstants";
import moment from "moment";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  tableArticleFilter,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";

function DownloadButton(props) {
  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const classes = useStyles();

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getFormattedData = (downloadData) => {
    const data = downloadData.map((obj) =>
      Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          typeof value === "string" ? replaceSpecialCharacter(value) : value,
        ])
      )
    );
    data.forEach((val) => {
      let notBeforeDate = moment(val?.editable_not_before_date).format(
        DATE_FORMAT
      );
      let notAfterDate = moment(val?.editable_not_after_date).format(
        DATE_FORMAT
      );
      if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
        val[
          NOT_BEFORE_AFTER_DATE_COLUMN
        ] = `${notBeforeDate} - ${notAfterDate}`;
      } else {
        val[NOT_BEFORE_AFTER_DATE_COLUMN] = "";
      }
    });

    return data;
  };

  const downloadCsv = async () => {
    let columns = [];
    if (props?.isCalledForDownload)
      columns = await props.getOmsSkuSummaryUploadTableConfig();
    else columns = await props.getOmsSkuSummaryUploadTableConfig();
    let formattedColumns = agGridColumnFormatter(columns?.data?.data);
    if (props.isRedirectedFromDifferentPage) {
      var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
      skuFilter.values = [...props.selectedOmsSku];
    }
    if (props?.totalCount > 0) {
      let body = {
        filters: props.isRedirectedFromDifferentPage
          ? [...props.selectedFilters, skuFilter]
          : [...props.selectedFilters],
        date_filter: [props.ropDate, props.recommRecieptDate],
        is_recommended: props?.isRecommended,
        include_custom_order: false,
        current_cycle_order: true,
        order_status: OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
        meta: props?.manualBodyData?.sort
          ? {
              ...props.manualBodyData,
              limit: { limit: props.totalCount, page: 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: props.totalCount, page: 1 },
            },
        selection: props?.selectionDataFromSetAll,
        isSelectAllRecords: props?.disableButtonForSetAll,
      };
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");
      let response = await props.getOmsSkuSummaryTableData(body);
      if (response.data.status) {
        var downloadData = agGridRowFormatter(response.data.data);
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
        const csvDownloadData = getFormattedData(downloadData);
        setCsvData(cloneDeep(csvDownloadData));
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  };

  const handleDownload = async () => {
    if (props?.isCalledForDownload) {
      await downloadCsv();
      downloadLink.current.link.click();
    } else {
      setShowUploadModal(true);
    }
  };

  const downloadTemplate = async () => {
    await downloadCsv();
    downloadLink.current.link.click();
    setShowUploadModal(false);
  };

  return (
    <>
      <Tooltip title="Download">
        <Button
          variant="contained"
          onClick={handleDownload}
          startIcon={<DownloadIcon />}
          className={classes.button}
        >
          {props?.isCalledForDownload ? "Download" : "Download Template"}
        </Button>
      </Tooltip>
      {downloadExcelLink(
        csvData,
        "sku_summary",
        downloadLink,
        csvHeaders,
        "",
        "",
        true
      )}

      <Prompt
        isPortal={true}
        isOpen={showUploadModal}
        title="File upload validations:"
        subHeading={``}
        infoList={[...OMS_FILE_UPLOAD_INSTRUCTIONS]}
        primaryButtonProps={{
          children: "Download",
          onClick: () => {
            downloadTemplate();
          },
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => setShowUploadModal(false),
        }}
      />
    </>
  );
}

const mapStateToProps = (store) => {
  return {
    selectedOmsSku: store.omsReducer.orderManagementService.selectedSku,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsSkuSummaryTableConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryTableConfiguration(payload)),
  getOmsSkuSummaryUploadTableConfig: (payload) =>
    dispatch(getOmsSkuSummaryUploadTableConfig(payload)),
  getOmsSkuSummaryTableData: (payload) =>
    dispatch(getOmsSkuSummaryTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DownloadButton);
