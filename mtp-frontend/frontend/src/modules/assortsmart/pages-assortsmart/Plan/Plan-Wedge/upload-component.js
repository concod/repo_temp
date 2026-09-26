import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Button,
  Box,
  Paper,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoadingOverlay from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { bindActionCreators } from "redux";
import { filterView } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { displaySnackMessage } from "./plan-wedge-functions";
import { addSnack } from "core/actions/snackbarActions";
import {
  set2_3_Loader,
  uploadWedgeData,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { wedgeFileOptions } from "modules/assortsmart/constants-assortsmart/stringContants";
import globalStyles from "core/Styles/globalStyles";

const DepthMultiplierComponent = (props) => {
  const [selectedType, setSelectedType] = useState(wedgeFileOptions?.[0]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedWedgeFile, setSelectedWedgeFile] = useState([]);
  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    const uploadWedgeFile = async () => {
      props.setShowUploadPopup(false);
      props.set2_3_Loader(true);
      const formData = new FormData();
      formData.append("upload_file", selectedWedgeFile[0]);
      formData.append("plan_code", props.planDetails?.data.plan_code);
      formData.append("user_id", 1); //To be actualised later
      formData.append("action_type", selectedType?.value);
      if (
        props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
      ) {
        formData.append("wedge_level", "choice_level");
      }
      let uploadWedgeResponse = await props.uploadWedgeData(
        formData,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (uploadWedgeResponse?.data?.status) {
        if (uploadWedgeResponse?.data?.message === "4") {
          setSelectedWedgeFile([]);
          props.setCallWedge(true);
          if (props.statusImageMap) {
            props.callImageWedgeMap();
          }
          return displaySnackMessage(
            "Wedge color and style value is not correct",
            "warning",
            props.addSnack
          );
        } else if (uploadWedgeResponse?.data?.message === "3") {
          setSelectedWedgeFile([]);
          props.setCallWedge(true);
          if (props.statusImageMap) {
            props.callImageWedgeMap();
          }
          return displaySnackMessage(
            "No Scaling: update successful",
            "success",
            props.addSnack
          );
        } else if (uploadWedgeResponse?.data?.message !== "1") {
          setSelectedWedgeFile([]);
          props.set2_3_Loader(false);
          return displaySnackMessage(
            "Invalid file upload",
            "error",
            props.addSnack
          );
        }
        setSelectedWedgeFile([]);
        props.setCallWedge(true);
        if (props.statusImageMap) {
          props.callImageWedgeMap();
        }
        displaySnackMessage(
          "Wedge data uploaded successfully",
          "success",
          props.addSnack
        );
      } else {
        props.set2_3_Loader(false);
        displaySnackMessage("Failed to upload wedge", "error", props.addSnack);
      }
    };
    if (selectedWedgeFile[0]) {
      uploadWedgeFile();
    }
  }, [selectedWedgeFile]);

  const onFileUpload = (files) => {
    setSelectedWedgeFile(files);
  };

  const handleChange = useCallback(
    (event) => {
      if (event.target.files && event.target.files[0]) {
        event.preventDefault();
        onFileUpload(event.target.files);
      }
    },
    [onFileUpload]
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setDragOver(false);
      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        onFileUpload(event.dataTransfer.files);
      }
    },
    [onFileUpload]
  );

  const downloadTemplate = () => {
    if (selectedType?.value) {
      props.downloadWedgeRollUp(selectedType);
      props.setShowUploadPopup(false);
      displaySnackMessage(
        "Preparing the Download file",
        "warning",
        props.addSnack
      );
    } else {
      displaySnackMessage("Select File Type", "error", props.addSnack);
    }
  };

  return (
    <Dialog
      maxWidth={"sm"}
      aria-labelledby="customized-dialog-title"
      open={props?.showUploadPopup}
      fullWidth={true}
      onClose={() => props.setShowUploadPopup(false)}
    >
      <LoadingOverlay>
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            Upload/Download
            <IconButton
              aria-label="close"
              size="large"
              onClick={() => props.setShowUploadPopup(false)}
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div>
            {filterView(
              "File Type",
              "type",
              wedgeFileOptions,
              setSelectedType,
              selectedType,
              classes.formContainer,
              classes.inputLabel
            )}
            <div className={classes.dialogGrid}>
              <Paper
                variant="outlined"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: dragOver ? "2px dashed #000" : "2px dashed #aaa",
                  padding: 20,
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "#eee" : "#fafafa",
                }}
              >
                <input
                  accept=".xlsx, .csv"
                  className={globalClasses.displayNone}
                  id="raised-button-file"
                  multiple
                  type="file"
                  onChange={handleChange}
                />
                <Box display="flex" flexDirection="column" alignItems="center">
                  <label htmlFor="raised-button-file">
                    <IconButton
                      color="primary"
                      aria-label="upload file"
                      component="span"
                    >
                      <CloudUploadIcon style={{ fontSize: 40 }} />
                    </IconButton>
                    <Typography>
                      Drag and drop .xlsx or .csv file here or
                      <Button component="span">Browse File</Button>
                    </Typography>
                  </label>
                  <br />
                  <Typography>
                    Uploading requires .xlsx or .csv format{" "}
                    <Button
                      className={classes.hyperlink_text}
                      onClick={() => {
                        downloadTemplate();
                      }}
                    >
                      Download Wedge data
                    </Button>
                  </Typography>
                </Box>
              </Paper>
            </div>
          </div>
        </DialogContent>
      </LoadingOverlay>
    </Dialog>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      uploadWedgeData,
      set2_3_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DepthMultiplierComponent));
