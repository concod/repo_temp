import { Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { reportDownloadRequest, checkDownload } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/lost-sales-service";
import { isEmpty } from "lodash";
import { getExtraParamsFromColumns,getExtrakeyParamsFromColumns } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { DOWNLOAD_LIMIT_CONSTANT } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { DOWNLOAD_LIMIT_EXCEED_ERR_MSG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";


function ReportDownload(props) {
  const {
    requestBody,
    downloadLimitExceedErrMsg = DOWNLOAD_LIMIT_EXCEED_ERR_MSG,
  } = props;
  const globalClasses = globalStyles();

  const [paddingBottom, setPaddingBottom] = useState("0.6rem");
  useEffect(() => {
    if (props.hidePaddingBottom) setPaddingBottom(0);
  }, [props.hidePaddingBottom]);

  const downloadReport = async () => {
    //  TODO: If this function is being updated please make sure to add
    //  the same logic in file: src/modules/inventorysmart/pages-inventorysmart/StoreInventoryAlerts/components/Download.jsx
    if (props.checkValidationOnDownload) {
      displaySnackMessages(props.throwValidationMessage, "warning");
    } else {
      try {
        // For server side download with limits, columns config must be present
        if (!isEmpty(props.columns)) {
          let extraItems = getExtraParamsFromColumns(props.columns)?.[0];
          if (extraItems?.isLevelPresent) {
            const currentLevel = extraItems?.levelName;
            const reportType = extraItems?.report_type ? extraItems?.report_type : "";
            let checkDownloadReq = { ...requestBody, level: currentLevel, report_type: reportType };
            let api = props.isCustomDownloadCheckRequired ? props.customDownloadCheckAPI : props.checkDownload;
            let response = await api(checkDownloadReq);
            if (response.data?.data?.[0].status === false) {
                displaySnackMessages(downloadLimitExceedErrMsg, "error");
                return;
            }
            if (response.data?.data?.[0].total_count < (props.maxRecordCountForDownload || DOWNLOAD_LIMIT_CONSTANT)) {
              if (props.downloadUrl) {
                await props.downloadUrl();
              } else {
                await props.reportDownloadRequest(
                  props.screenName,
                  props.requestBody
                );
              }
              displaySnackMessages(
                "Download Request is running in background. You will get a notification once it is ready to download",
                "info"
              );
            } else {
              displaySnackMessages(
                downloadLimitExceedErrMsg,
                "error"
              );
            }
          } else {
            // Levels are not present so call the regular download.
            //extrakey is available when we dont want snack alert of download size limit
          let extrakey = getExtrakeyParamsFromColumns(props.columns)?.[0];
          if (!extrakey?.NoDownloadEstimationMessage) {
            displaySnackMessages(
              "Download size limit is not applied to this table.",
              "info"
            );
          }
            if (props.downloadUrl) {
              await props.downloadUrl();
            } else {
              await props.reportDownloadRequest(
                props.screenName,
                props.requestBody
              );
            }
            displaySnackMessages(
              "Download Request is running in background. You will get a notification once it is ready to download",
              "info"
            );
          }
        } else {
          // columns is not provided by the calling component.
          displaySnackMessages(
            "Download size limit is not applied to this table.",
            "info"
          );
          if (props.downloadUrl) {
            await props.downloadUrl();
          } else {
            await props.reportDownloadRequest(
              props.screenName,
              props.requestBody
            );
          }
          displaySnackMessages(
            "Download Request is running in background. You will get a notification once it is ready to download",
            "info"
          );
        }
      } catch (err) {
        displaySnackMessages("Error while downloading", "error");
      }
    }
  };

  const downloadReportWithoutCheck = async () => {
    if (props.checkValidationOnDownload) {
      displaySnackMessages(props.throwValidationMessage, "warning");
    } else {
      try {
        if (props.downloadUrl) {
          await props.downloadUrl();
        } else {
          await props.reportDownloadRequest(
            props.screenName,
            props.requestBody
          );
        }
        displaySnackMessages(
          "Download Request is running in background. You will get a notification once it is ready to download",
          "info"
        );
      } catch (err) {
        displaySnackMessages("Error while downloading", "error");
      }
    }
  };
  
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  return (
    <div style={{ textAlign: "right", paddingBottom: `${paddingBottom}` }}>
      <Button
        variant="outlined"
        onClick={ props.inventorysmartScreenConfig?.isDownloadCheckEnable ? downloadReport : downloadReportWithoutCheck}
        startIcon={<DownloadIcon />}
        disabled={props?.disable}
      >
        Download
      </Button>
    </div>
  );
}

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    reportDownloadRequest: (screenName, body) =>
      dispatch(reportDownloadRequest(screenName, body)),
    checkDownload: (screenName, body) =>
      dispatch(checkDownload(screenName, body)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(ReportDownload);
