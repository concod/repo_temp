import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { read, utils } from "xlsx";
import { Button, Card, Prompt } from "impact-ui";
import { Typography, ListItem } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { useHistory } from "react-router-dom";
import makeStyles from "@mui/styles/makeStyles";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import LoadingOverlay from "core/Utils/Loader/loader";
import { downloadExcelLink } from "core/Utils/csv-download";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import {
  FILE_UPLOAD_INSTRUCTIONS,
  CSV_CONFIG,
} from "../grouping-contants/stringConstants";
import {
  uploadStoreGroups,
  setTenantUploadConfig,
} from "core/pages/store-grouping/services-store-grouping/custom-store-group-service";
import { isEmpty, upperFirst } from "lodash";
import {
  replaceSpecialCharToCharCode,
  replaceSpecialCharacter,
} from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  cardWrapper: {
    minHeight: "10rem",
  },
  errorText: {
    color: theme.palette.error.main,
  },
  uploadBody: {
    display: "block",
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  },
  uploader: {
    display: "none",
  },
}));

const UploadStoreGroup = (props) => {
  const [files, setFiles] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [isFilePicked, setIsFilePicked] = useState(false);
  const [parsedExcelData, setParsedExcelData] = useState(null);
  const downloadTemplateBtn = useRef(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFileValidation, setShowFileValidation] = useState(false);
  const [fileValidations, setFileValidations] = useState([]);
  const globalClasses = globalStyles();
  const fileUploadRef = useRef();
  const history = useHistory();
  const classes = useStyles();

  useEffect(async () => {
    if (isEmpty(props.tenantUploadConfig)) {
      let tenantData = await props.getTenantConfigApplicationLevel(1, {
        attribute_name: "store_group_upload_instructions",
      })();
      props.setTenantUploadConfig(tenantData.data?.data[0]?.attribute_value);
    }
    return () => {
      setFiles(null);
      setIsFilePicked(false);
      setParsedExcelData(null);
      setIsLoading(false);
    };
  }, []);

  useEffect(() => {
    isFilePicked && initiateUpload();
  }, [parsedExcelData]);

  useEffect(() => {
    setShowFileValidation(Boolean(fileValidations?.length));
  }, [fileValidations]);

  /**
   * @function
   * @description Create error HTML Object from error report
   * @returns {HTMLObjectElement}
   */
  const buildErrorReport = () => {
    return fileValidations.map((reports, index) => (
      <div
        key={`error-${reports.length - index}`}
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.marginBottom}`}
      >
        {reports.map((data) => (
          <Typography
            className={classes.errorText}
            variant="body1"
            component="span"
            key={data}
          >
            {data}
          </Typography>
        ))}
      </div>
    ));
  };

  /**
   * @function
   * @description Validate parcedExcelData, create payload using CSV_CONFIG and call file upload api
   */
  const initiateUpload = async () => {
    if (parsedExcelData && parsedExcelData.length > 0 && isFilePicked) {
      setIsLoading(true);
      try {
        const regex = /^\s*$/;
        const storeGroups = [];
        let isInValidUpload = parsedExcelData
          ?.filter((eachRow) => Object.keys(eachRow)[0] != eachRow[0])
          .some((data) => {
            const values = Object.values(data);
            let isInvalid = false;
            const groupData = {};
            let index = 0;
            CSV_CONFIG.forEach((item) => {
              groupData[item.key] =
                typeof values[index] != "number"
                  ? replaceSpecialCharToCharCode(values[index] || "")
                  : values[index] || "";
              isInvalid =
                isInvalid || regex.test(values[index]) || !values[index];
              index++;
            });
            props.tenantUploadConfig?.extraColumns?.forEach((key) => {
              groupData[key] = replaceSpecialCharToCharCode(
                values[index] || ""
              );
              index++;
            });
            storeGroups.push(groupData);
            return isInvalid;
          });
        if (isInValidUpload) {
          props.addSnack({
            message:
              "File contains empty cells, please re-upload files with non-empty cells.",
            options: {
              variant: "error",
            },
          });
          setIsLoading(false);
          return;
        }
        console.log(storeGroups);
        const res = await props.uploadStoreGroups({
          store_groups: storeGroups,
        });
        setIsLoading(false);
        props.addSnack({
          message: res.message || "Uploaded Successfully",
          options: {
            variant: "success",
            autoHideDuration: 3000,
            onClose: () => history.goBack(),
          },
        });
      } catch (error) {
        if (error.response?.data?.data?.length) {
          handleErrorValidationData(error.response?.data?.data);
        } else {
          props.addSnack({
            message: error?.data?.message || "Something went wrong.",
            options: {
              variant: "error",
            },
          });
        }
        setIsLoading(false);
      }
    } else {
      props.addSnack({
        message:
          "File doesn't contain any data. Please re-upload correct file.",
        options: {
          variant: "error",
        },
      });
      setIsLoading(false);
    }
  };

  /**
   * @function
   * @description Handle error data and create error repport
   * @param {Array} errorData
   */
  const handleErrorValidationData = (errorData) => {
    let errorDescriptions = [];
    errorData?.forEach((error) => {
      props.addSnack({
        message: error.message,
        options: {
          variant: "error",
        },
      });
      if (error.validation_error) {
        const newErrorDescriptions = error.validation_error.map((data) =>
          data.split(",").map((str) => replaceSpecialCharacter(str))
        );
        errorDescriptions = [...errorDescriptions, ...newErrorDescriptions];
      }
    });
    setFileValidations(errorDescriptions);
  };

  /**
   * @function
   * @description Read and parse CSV data from uploaded file
   */
  const invokeReader = () => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const targetFile = e.target.result;
      // Use read function from xlxs to read the data from a csv file.
      // The data is read in an array format where commas "," behave as a seperator
      // The second seperator is each row and the final one is every single page
      // When data is read it is in a form of three dimentional matrix.
      let readedData = read(targetFile, { type: "binary" });
      const wsname = readedData.SheetNames[0];
      const ws = readedData.Sheets[wsname];
      /* Convert array of arrays */
      const data = utils.sheet_to_json(ws);
      setParsedExcelData(data);
    };
    reader.readAsBinaryString(files);
  };

  /**
   * @function
   * @description Update local state objects on input change
   * @param {Object} event
   */
  const changeHandler = (event) => {
    if (event.target.files.length) {
      setFiles(event.target.files[0]);
      setIsFilePicked(true);
    }
    setFileValidations([]);
    setShowFileValidation(false);
  };

  return (
    <div className={classes.bodyWrapper}>
      <div className={`${classes.uploadBody} ${globalClasses.paddingAround}`}>
        <Card>
          <LoadingOverlay loader={isLoading} spinner>
            <div
              className={`${globalClasses.flexColumn} ${classes.cardWrapper} ${globalClasses.gap} ${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
            >
              <input
                type="file"
                id="docpicker"
                multiple={false}
                accept=".csv,.xlsx"
                onChange={changeHandler}
                className={classes.uploader}
                ref={fileUploadRef}
              />
              <Button
                icon={FileUploadIcon}
                variant="primary"
                onClick={() => {
                  fileUploadRef.current?.click();
                }}
              ></Button>
              {isFilePicked ? (
                <Typography variant="body1">Filename: {files.name}</Typography>
              ) : (
                <Typography variant="body1">
                  Select a file. (.xlsx/.csv)
                </Typography>
              )}
            </div>
            {showFileValidation && buildErrorReport()}
            <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
              <Button
                variant="primary"
                id="downloadTemplate"
                onClick={() => {
                  setShowUploadModal(true);
                }}
              >
                Download Template
              </Button>
              {downloadExcelLink(
                [],
                "StoreGroupTemplate",
                downloadTemplateBtn,
                [
                  ...CSV_CONFIG,
                  ...(props.tenantUploadConfig?.extraColumns?.map((columns) => {
                    return {
                      label: upperFirst(columns.replace("_", " ")),
                      key: columns,
                    };
                  }) || []),
                ],
                "",
                "",
                true
              )}
              <div
                className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap}`}
              >
                <Button
                  variant="secondary"
                  onClick={() => {
                    history.goBack();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={!isFilePicked || isLoading}
                  onClick={() => invokeReader()}
                >
                  Upload
                </Button>
              </div>
            </div>
          </LoadingOverlay>
        </Card>
      </div>
      <Prompt
        isOpen={showUploadModal}
        title="File upload validations:"
        subHeading={``}
        infoList={[
          ...FILE_UPLOAD_INSTRUCTIONS,
          ...(!isEmpty(props.tenantUploadConfig?.validations)
            ? Object.keys(props.tenantUploadConfig?.validations)
                .map((key) => props.tenantUploadConfig?.validations[key])
                .flat()
            : []),
        ]}
        primaryButtonProps={{
          children: "Download",
          onClick: () => {
            downloadTemplateBtn.current.link.click();
            setShowUploadModal(false);
          },
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => setShowUploadModal(false),
        }}
      />
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    tenantUploadConfig: state.storeGroupReducer.tenantUploadConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  uploadStoreGroups,
  setTenantUploadConfig: (payload) => dispatch(setTenantUploadConfig(payload)),
  getTenantConfigApplicationLevel,
});

export default connect(mapStateToProps, mapDispatchToProps)(UploadStoreGroup);
