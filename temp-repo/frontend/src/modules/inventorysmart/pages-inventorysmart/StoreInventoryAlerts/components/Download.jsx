import { Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { downloadItemRequest } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";

function Download(props) {
  const [paddingBottom, setPaddingBottom] = useState("0.6rem");
  useEffect(() => {
    if (props.hidePaddingBottom) setPaddingBottom(0);
  }, [props.hidePaddingBottom]);

  const downloadItem = async () => {
    try {
      let excludeURLObject = null;

      if (props.includeExclusionFilter) {
        excludeURLObject = { ...props.excludeURLObject };
        excludeURLObject.url = props.url;
      }

      await props.downloadItemRequest(
        props.url,
        props.requestBody,
        props.includeExclusionFilter,
        excludeURLObject
      );
      displaySnackMessages(
        "Download Request is running in background. You will get a notification once it is ready to download",
        "info"
      );
    } catch (err) {
      displaySnackMessages("Error while downloading", "error");
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
        onClick={downloadItem}
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
    downloadItemRequest: (
      screenName,
      body,
      includeExclusionFilter,
      excludeURLObject
    ) =>
      dispatch(
        downloadItemRequest(
          screenName,
          body,
          includeExclusionFilter,
          excludeURLObject
        )
      ),
  };
};
export default connect(null, mapDispatchToProps)(Download);
