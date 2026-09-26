import React, { useEffect, useState, useRef } from "react";
import StatusCard from "./StatusCard";
import globalStyles from "core/Styles/globalStyles";
import { makeStyles } from "@mui/styles";
import { Button, Typography } from "@mui/material";
import UTurnLeftIcon from "@mui/icons-material/UTurnLeft";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import {
  fileValidationStatus,
  getKeyToLabelMapping,
  getModuleCodes,
} from "./file-upload-service";
import { addSnack } from "core/actions/snackbarActions";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { isEmpty } from "lodash";
import { useDispatch } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import { MAIN_ROUTE } from "./constants";

const useStyles = makeStyles((theme) => ({
  headerText: {
    fontWeight: 600,
    fontSize: "1.125rem",
    lineHeight: theme.typography.pxToRem(27),
  },
  divider: {
    border: `1px solid ${theme.palette.colours.disabledSelectBackground}`,
    margin: "0.875rem 0",
  },
  rotatedIcon: {
    transform: "rotate(90deg)",
  },
  backButton: {
    padding: 0,
    fontSize: "1rem",
    lineHeight: "1.5rem",
    "& span": {
      marginRight: "0.625rem",
    },
  },
  downloadButton: {
    fontWeight: 400,
    lineHeight: theme.typography.pxToRem(21),
    padding: "0.5rem 1.5rem",
    marginLeft: "auto",
  },
  downloadButtonWrapper: {
    marginTop: "0.75rem",
  },
}));

const FileUploadValidation = ({ isCustomAPI, customAPIHandler }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [validationData, setValidationData] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { state } = location || {};
  const reportCode = state?.reportCode || "";
  const moduleCode = state?.moduleCode || "";
  const moduleNameRef = useRef("");

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  // Using report code, fetch the validation data
  const fetchValidationData = async () => {
    try {
      setLoading(true);
      const [responseData, responseLabel, allModuleCodes] = isCustomAPI
        ? await customAPIHandler(reportCode)
        : await Promise.all([
            fileValidationStatus(reportCode),
            getKeyToLabelMapping(),
            getModuleCodes(),
          ]);

      // call the function to map key to label when both the promises are resolved
      mapKeyToLabel(responseData?.data, responseLabel?.data);
      getModuleName(allModuleCodes?.data?.data);
      setLoading(false);
    } catch (error) {
      const errMsg = !isEmpty(error?.response?.data.message)
        ? error.response?.data?.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
      setLoading(false);
    }
  };

  //add description and label to the data
  const mapKeyToLabel = (mappingData, mappingLabel) => {
    if (mappingData && mappingLabel) {
      const mappedData = { ...mappingData };

      Object.keys(mappingData?.data?.value_counts).forEach((key) => {
        const desc = mappingLabel?.data[0]?.attribute_value[key] || "";
        mappedData.data.value_counts[key].label = key;
        mappedData.data.value_counts[key].description = desc;
      });

      setValidationData(mappedData);
    }
  };

  const getModuleName = (allModuleCodes) => {
    if (allModuleCodes?.length) {
      const moduleName = allModuleCodes[0]?.filter(
        (moduleData) => moduleData.module_code == moduleCode
      );

      if (moduleName?.length) {
        moduleNameRef.current = moduleName[0].module;
        if (moduleNameRef.current === "Create Allocation Article Table") {
          moduleNameRef.current = "Create Allocation";
        }
      }
    }
  };

  // Fetch initial data when component mounts
  useEffect(() => {
    //trigger the function call only when "location.state" changes and the route contains "upload-validations"
    //if this function is called and reportcode is not present in location.state then an error will be thrown
    if (location?.pathname?.includes(MAIN_ROUTE)) {
      fetchValidationData();
    }
  }, [location?.state]);

  //download validated file
  const handleDownload = async () => {
    const downloadUrl = validationData?.data?.url;
    if (downloadUrl) {
      let a = document.createElement("a");
      a.href = downloadUrl;
      a.download = validationData?.data?.file_name;
      a.click();
    }
  };

  return (
    <>
      {state ? (
        <>
          <HeaderBreadCrumbs
            options={[
              {
                label: "Home",
                id: 1,
                action: () => {
                  navigate("/home");
                },
              },
              {
                label: "Upload",
                id: 2,
              },
            ]}
          />
          <Loader loader={loading}>
            <div className={globalClasses.marginAround}>
              <div className={globalClasses.layoutAlignSpaceBetween}>
                <Typography className={classes.headerText}>
                  {moduleNameRef.current} Upload Validation Summary
                </Typography>
                <Button
                  variant="text"
                  startIcon={<UTurnLeftIcon className={classes.rotatedIcon} />}
                  className={classes.backButton}
                  disableRipple
                  onClick={() => navigate(-1)}
                >
                  Back
                </Button>
              </div>
              {/* <hr className={classes.divider} /> */}
              {Object.keys(validationData)?.length > 0 && (
                <StatusCard initialData={validationData} />
              )}
              <div
                className={`${globalClasses.flexRow} ${classes.downloadButtonWrapper}`}
              >
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.downloadButton}
                  disableRipple
                  onClick={handleDownload}
                >
                  Download
                </Button>
              </div>
            </div>
          </Loader>
        </>
      ) : (
        <div />
      )}
    </>
  );
};

export default FileUploadValidation;
