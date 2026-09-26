import { Box } from "@mui/material";
import {Button} from "impact-ui-v3";
import React, { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { downloadItemRequest } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { isEmpty } from "lodash";
import { getExtraParamsFromColumns } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import IA_DOWNLOAD from "assets/IA_DOWNLOAD.svg";

function Download(props) {
  const classes = useStyles();
  const globalClasses = globalStyles();
  let { requestBody } = props;
  
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    if (!isEmpty(requestBody)) {
      requestBody = {
        ...requestBody,
        meta: {
          ...requestBody?.meta,
          limit: { ...requestBody?.meta?.limit, page: 1 },
        },
      };
    }
  }, [requestBody]);

  const downloadItem = async () => {
    try {
      let excludeURLObject = null;

      if (props.includeExclusionFilter && props.excludeURLObject) {
        excludeURLObject = { ...props.excludeURLObject };
        excludeURLObject.url = props.url;
      }

      if (!isEmpty(props.columns)) {
          await props.downloadItemRequest(
            props.url,
            requestBody,
            props.includeExclusionFilter,
            excludeURLObject
          );
          displaySnackMessages(
            "Download Request is running in background. You will get a notification once it is ready to download",
            "info"
          );
      }
    } catch (err) {
      handleErrorMessage(err);
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
