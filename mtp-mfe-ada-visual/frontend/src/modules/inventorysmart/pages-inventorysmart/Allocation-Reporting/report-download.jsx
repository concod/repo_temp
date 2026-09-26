import { Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { reportDownloadRequest } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/lost-sales-service";

function ReportDownload(props) {
  const globalClasses = globalStyles();

  const [paddingBottom, setPaddingBottom] = useState("0.6rem");
  useEffect(() => {
    if (props.hidePaddingBottom) setPaddingBottom(0);
  }, [props.hidePaddingBottom]);

  const downloadReport = async () => {
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
        onClick={downloadReport}
        startIcon={<DownloadIcon />}
        disabled={props?.disable}
      >
        Download
      </Button>
    </div>
  );
}
const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    reportDownloadRequest: (screenName, body) =>
      dispatch(reportDownloadRequest(screenName, body)),
  };
};
export default connect(null, mapDispatchToProps)(ReportDownload);
