import { Button, useTranslation } from "impact-ui-v3";
import { Box } from "@mui/material";
import React, { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { downloadItemRequest } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import IA_DOWNLOAD from "assets/IA_DOWNLOAD.svg";

function Download(props) {
  const { t } = useTranslation();
  const [paddingBottom, setPaddingBottom] = useState("0rem");
  const globalClasses = globalStyles();
  useEffect(() => {
    if (props.hidePaddingBottom) setPaddingBottom(0);
  }, [props.hidePaddingBottom]);

  const downloadItem = async () => {
    try {
      let excludeURLObject = null;

      if (props.includeExclusionFilter) {
        if(props.excludeURLObject){
          excludeURLObject = { ...props.excludeURLObject };
          excludeURLObject.url = props.url;  
        }
      }

      await props.downloadItemRequest(
        props.url,
        props.requestBody,
        props.includeExclusionFilter,
        excludeURLObject
      );
      displaySnackMessages(
        t("inventorysmart.downloadRequestRunningInBackground"),
        "info"
      );
    } catch (err) {
      displaySnackMessages(t("inventorysmart.errorWhileDownloading"), "error");
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

    <Box className={globalClasses.layoutAlignEnd}>
      <Button
        icon = {<IA_DOWNLOAD/>}
        id="lsDownloadBtn"
        onClick={downloadItem}
        title={"Download"}
        disabled={props?.disable}
        type="default"
        variant="tertiary"
        sx = {{background:'#f5f6fa !important', border:'none !important'}}
      >
      </Button>
    </Box>
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
