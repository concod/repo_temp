import React, { useState } from "react";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { useSelector } from "react-redux";
import InfoIcon from "@mui/icons-material/Info";
import { Button, Grid, Typography, List, ListItem } from "@mui/material";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import DragDropFileUpload from "core/commonComponents/dragDropFileUpload";
import { Panel } from "impact-ui";
import { DOWNLOAD_TEMPLATE_FILENAME } from "modules/ada/constants-ada/stringContants";
import { uploadForecastDeepDiveData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
// import DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH_LOCAL from "../../../../../../assets/macros/rl_eu/ADA_Visual_Bulk_Upload_Template.xlsm";
import DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH_NA_LOCAL from "../../../../../../assets/macros/ADA_Visual_Bulk_Upload_Template.xlsm";

import { adaVisualForecastUploadValidations } from "modules/ada/utils-ada/utilityFunctions";

function UploadForecast() {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [open, setOpen] = useState(false);

  const handleCancelUpload = () => {
    setOpen(false);
  };

  const handleSaveUpload = () => {
    setOpen(false);
  };

  const filePath = () => {
    const client = adaReducer?.clientConfig?.attribute_value?.client;
    if (client === "Ralph Lauren") {
      return DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH_NA_LOCAL;
    }
    if (client === "Ralph Lauren EU") {
      // return DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH_LOCAL;
    }
  };

  return (
    <div className={classNames(globalClasses.verticalAlignCenter)}>
      <Button
        className={classes.uploadForecast}
        variant="contained"
        onClick={() => {
          setOpen(true);
        }}
        startIcon={<FileUploadIcon />}
      ></Button>

      <div
        className={`${globalClasses.panelWrapper} ${classes.panelContainer}`}
      >
        <Panel
          size="medium"
          isOpen={open}
          onClose={handleCancelUpload}
          primaryButtonProps={{
            children: "Cancel",
            onClick: handleSaveUpload,
          }}
        >
          <DragDropFileUpload
            fileName={DOWNLOAD_TEMPLATE_FILENAME}
            filePath={filePath()}
            templateHeaders={
              adaReducer?.clientConfig?.attribute_value?.upload_file_header
            }
            fileValidationList={adaVisualForecastUploadValidations(
              adaReducer?.clientConfig?.attribute_value?.upload_date_format
            )}
            uploadBulkData={uploadForecastDeepDiveData}
            acceptedFileTypes={[".xlsm"]}
            downloadExcelFile={true}
            downloadStaticMacrosFile={true}
            downloadStaticExcelFile={false}
            fileTypeValidationRequired={true}
            fileTypeFormat="xlsm"
          />
        </Panel>
      </div>
    </div>
  );
}

export default UploadForecast;

const useStyles = makeStyles((theme) => ({
  dialog: {
    "& .MuiPaper-root": {
      padding: "0.5rem 4rem",
    },
  },
  title: {
    alignSelf: "center",
  },
  infoContainer: {
    background: theme.palette.background.warningInfo,
    padding: "0.6rem 0 1rem 1rem",
    marginTop: "1.5rem",
    border: `1px solid ${theme.palette.warning.main}`,
  },
  dialogContentText: {
    padding: "0 3rem",
  },
  uploadForecast: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px",
    paddingLeft: "18px",
    marginTop: "10px",
    marginRight: "10px",
  },
  panelContainer: {
    "& .panel-container": {
      top: `calc(${theme.customVariables.headerHeight} + 2rem)`,
    },
  },
}));
