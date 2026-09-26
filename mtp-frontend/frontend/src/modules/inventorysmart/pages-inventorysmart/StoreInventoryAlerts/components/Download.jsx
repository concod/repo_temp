import { Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { downloadItemRequest } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { isEmpty } from "lodash";
import { getExtraParamsFromColumns, getExtrakeyParamsFromColumns } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { DOWNLOAD_LIMIT_CONSTANT } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { DOWNLOAD_LIMIT_EXCEED_ERR_MSG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

function Download(props) {
  const { requestBody } = props;
  const [paddingBottom, setPaddingBottom] = useState("0rem");
  useEffect(() => {
    if (props.hidePaddingBottom) setPaddingBottom(0);
  }, [props.hidePaddingBottom]);

  const downloadItem = async () => {
    //  TODO: If this function is being updated please make sure to add
    //  the same logic in file: src/modules/inventorysmart/pages-inventorysmart/Allocation-Reporting/report-download.jsx
    try {
      let excludeURLObject = null;

      if (props.includeExclusionFilter && props.excludeURLObject) {
        excludeURLObject = { ...props.excludeURLObject };
        excludeURLObject.url = props.url;
      }

      if (!isEmpty(props.columns)) {
        let extraItems = getExtraParamsFromColumns(props.columns)?.[0];

        if (extraItems?.isLevelPresent) {
          const { levelName, report_type } = extraItems;
          const currentLevel = levelName;
          const reportType = report_type ? report_type : "";

          let checkDownloadReq = {
            ...requestBody,
            level: currentLevel,
            report_type: reportType,
          };
          let api = props.isCustomDownloadCheckRequired
            ? props.customDownloadCheckAPI
            : props.checkDownload;
          let response = await api(checkDownloadReq);

          if (response.data?.data?.[0].status === false) {
            displaySnackMessages(DOWNLOAD_LIMIT_EXCEED_ERR_MSG, "error");
            return;
          }

          if (response.data?.data?.[0].total_count < DOWNLOAD_LIMIT_CONSTANT) {
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
          } else {
            displaySnackMessages(
              DOWNLOAD_LIMIT_EXCEED_ERR_MSG,
              "error"
            );
          }
        } else {
          //extrakey is available when we dont want snack alert of download size limit
          let extrakey = getExtrakeyParamsFromColumns(props.columns)?.[0];
          if (!extrakey?.NoDownloadEstimationMessage) {
            displaySnackMessages(
              "Download size limit is not applied to this table.",
              "info"
            );
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
        }
      } else {
        displaySnackMessages(
          "Download size limit is not applied to this table.",
          "info"
        );
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
      }
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
