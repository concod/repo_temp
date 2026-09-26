import React, { useState } from "react";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { useSelector } from "react-redux";
import { Button, useTranslation } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import DragDropFileUpload from "core/commonComponents/dragDropFileUpload";
import { Panel } from "impact-ui-v3";
import {
  ADA_VISUAL_EDIT_FORECAST_UPLOAD_VALIDATIONS,
  DOWNLOAD_TEMPLATE_FILENAME,
} from "modules/ada/constants-ada/stringContants";
import { uploadForecastDeepDiveData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH_LOCAL from "../../../../../../assets/macros/rl_eu/ADA_Visual_Bulk_Upload_Template.xlsm";

function UploadForecast({ disabled }) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const { t } = useTranslation();
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

  return (
    <div className={classNames(globalClasses.verticalAlignCenter)}>
      <Button
        className={classes.uploadForecast}
        variant="primary"
        onClick={() => {
          setOpen(true);
        }}
        icon={<FileUploadIcon />}
        iconPlacement="left"
        disabled={disabled}
      >
        {t("ada.uploadForecast.uploadButton")}
      </Button>

      <div
        className={`${globalClasses.panelWrapper} ${classes.panelContainer}`}
      >
        {/* <Panel
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
            // filePath={DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH_LOCAL}
            templateHeaders={
              adaReducer?.clientConfig?.attribute_value?.upload_file_header
            }
            fileValidationList={ADA_VISUAL_EDIT_FORECAST_UPLOAD_VALIDATIONS}
            uploadBulkData={uploadForecastDeepDiveData}
            acceptedFileTypes={[".xlsm"]}
            downloadExcelFile={true}
            downloadStaticMacrosFile={true}
            downloadStaticExcelFile={false}
          />
        </Panel> */}
        <Panel
          size="medium"
          isOpen={open}
          primaryButtonLabel={t("ada.uploadForecast.saveChanges")}
          secondaryButtonLabel={t("ada.uploadForecast.cancel")}
          onPrimaryButtonClick={handleSaveUpload}
          onClose={handleCancelUpload}
        >
          <DragDropFileUpload
            fileName={DOWNLOAD_TEMPLATE_FILENAME}
            filePath={DOWNLOAD_TEMPLATE_FORECAST_DEEP_DIVE_FILEPATH_LOCAL}
            templateHeaders={
              adaReducer?.clientConfig?.attribute_value?.upload_file_header
            }
            fileValidationList={ADA_VISUAL_EDIT_FORECAST_UPLOAD_VALIDATIONS}
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
    marginTop: "10px",
    marginRight: "10px",
  },
  panelContainer: {
    "& .panel-container": {
      top: `calc(${theme.customVariables.headerHeight} + 2rem)`,
    },
  },
}));
