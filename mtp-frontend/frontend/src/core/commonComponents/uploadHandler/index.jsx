import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import Modal from "@mui/material/Modal";
import { read, utils } from "xlsx";
import { Button, Card, Prompt, Modal as ImpactModal } from "impact-ui";
import { Typography } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import makeStyles from "@mui/styles/makeStyles";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import LoadingOverlay from "core/Utils/Loader/loader";
import { downloadExcelLink } from "core/Utils/csv-download";
import { isEmpty, upperFirst } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import { MACROS_FILE_DETAILS } from "core/pages/store-grouping/grouping-contants/stringConstants";
import { saveAs } from "file-saver";
import { getModuleCodes } from "./uploadHandlerService";

const useStyles = makeStyles((theme) => ({
  cardWrapper: {
    minHeight: "10rem",
  },
  errorText: {
    color: theme.palette.error.main,
  },
  uploadBody: {
    background: theme.palette.common.white,
    display: "block",
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  },
  uploader: {
    display: "none",
  },

  validationList: {
    listStyle:"disc",
    padding:"1rem",

    "& li": {
      color: 'rgb(57, 73, 96)',
      marginBottom: "4px",
      marginLeft: "20px",
      listStyle:"disc",
    }
  },
}));

const UploadHandler = (props) => {
  const {
    isModalOpen = false,
    attachCallBacks,
    templateName = "Template",
    macroIdPath,
    setFileName,
    moduleName,
    moduleCodeRef,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
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
  const classes = useStyles();

  useEffect(async () => {
    if (attachCallBacks) {
      attachCallBacks(handleErrorValidationData);
    }

    if (moduleCodeRef) {
      const allModuleCodes = await getModuleCodes();
      if (allModuleCodes?.length) {
        const currentModuleCode = allModuleCodes[0]?.filter(
          (moduleData) => moduleData.module === moduleName
        );

        if (currentModuleCode?.length) {
          moduleCodeRef.current = currentModuleCode[0].module_code;
        }
      }
    }
    return () => {
      resetStates();
    };
  }, []);

  useEffect(() => {
    setIsOpen(isModalOpen);
    if (!isModalOpen) {
      resetStates();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isFilePicked) {
      setIsLoading(true);
      props.handleUpload(parsedExcelData);
    }
  }, [parsedExcelData]);

  useEffect(() => {
    setShowFileValidation(Boolean(fileValidations?.length));
  }, [fileValidations]);

  /**
   * @function
   * @description Reset local states
   */
  const resetStates = () => {
    setFiles(null);
    setIsFilePicked(false);
    setParsedExcelData(null);
    setFileValidations([]);
    setIsLoading(false);
    setFileName && setFileName("");
  };

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
   * @description Handle error data and create error repport
   * @param {Array} errorData
   */
  const handleErrorValidationData = (errorData) => {
    let errorDescriptions = [];
    errorData?.forEach((error) => {
      props.addSnack({
        message: replaceSpecialCharacter(error.message),
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
    setIsLoading(false);
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
      setFileName && setFileName(event.target.files[0]?.name);
    }
    setFileValidations([]);
    setShowFileValidation(false);
  };

  /**
   * downloadMacros function will import
   * our excel file first then pass that
   * imported file to saveAs function of 'file-saver'
   * to download the respective excel file
   * @param {object} fileDetails contains the name and path of the file
   */
  const downloadMacros = async (fileDetails) => {
    try {
      const { filePath, fileName } = fileDetails;
      // Trigger the file download
      let fileToBeDownloaded = await import(
        `../../../assets/macros/${filePath}`
      );
      saveAs(fileToBeDownloaded.default, fileName);
    } catch (error) {
      console.error("downloadMacros error:", error);
    }
  };

  /**
   * @function
   * @description Handle states on Modal close
   */
  const handleModalClose = () => {
    setIsOpen(false);
    if (props.setIsModalOpen) {
      props.setIsModalOpen(false);
    }
    resetStates();
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleModalClose}
      aria-labelledby="file-upload-modal"
    >
      <>
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
                  accept={props.allFormatUpload ? ".csv,.xlsx,.xlsm" : ".xlsm"}
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
                  <Typography variant="body1">
                    Filename: {files.name}
                  </Typography>
                ) : (
                  <Typography variant="body1">
                    Select a file.
                      {props?.onlyShowCSVUpload ? " (.csv)" : props.allFormatUpload ? " (.xlsx/.csv/.xlsm)" : "(.xlsm)"}
                  </Typography>
                )}
              </div>
              {showFileValidation && buildErrorReport()}
              <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
                {!props?.hideDownloadTemplateButton && (
                  <>
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
                      templateName,
                      downloadTemplateBtn,
                      [
                        ...(props.templateConfig || []),
                        ...(props.tenantUploadConfig?.extraColumns?.map(
                          (columns) => {
                            return {
                              label: upperFirst(columns.replace("_", " ")),
                              key: columns,
                            };
                          }
                        ) || []),
                      ],
                      "",
                      "",
                      true
                    )}
                  </>
                )}

                {props?.customButtons}

                <div
                  className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap}`}
                >
                  <Button
                    variant="secondary"
                    onClick={() => handleModalClose()}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!isFilePicked || isLoading}
                    onClick={() =>
                      props.jsonUpload
                        ? invokeReader()
                        : (setIsLoading(true), props.handleUpload(files))
                    }
                  >
                    Upload
                  </Button>
                </div>
              </div>
            </LoadingOverlay>
          </Card>
        </div>
        {/* <Prompt
        className={`${globalClasses.flexRow}`}
          isOpen={showUploadModal}
          title="File upload validations:"
          subHeading={``}
          infoList={[
            ...props.uploadInstructions,
            ...(!isEmpty(props.tenantUploadConfig?.validations)
              ? Object.keys(props.tenantUploadConfig?.validations)
                  .map((key) => props.tenantUploadConfig?.validations[key])
                  .flat()
              : []),
          ]}
          primaryButtonProps={{
            children: "Download",
            onClick: () => {
              downloadMacros(
                macroIdPath
                  ? MACROS_FILE_DETAILS[macroIdPath[0]][[macroIdPath[1]]]
                  : downloadTemplateBtn.current.link.click()
              );
              setShowUploadModal(false);
            },
          }}
          tertiaryButtonProps={{
            children: "Cancel",
            onClick: () => setShowUploadModal(false),
          }}
        /> */}
        {/* Component changed to implement vertical scroll for upload handler */}
        <ImpactModal
          size="medium"
          heading="File upload validations"
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          primaryButtonProps={{
            children: "Download", onClick: () => {
              downloadMacros(
                macroIdPath ?
                  MACROS_FILE_DETAILS[macroIdPath]
                  :
                  downloadTemplateBtn.current.link.click()
              );
              setShowUploadModal(false);
            },
          }}
          tertiaryButtonProps={{ children: "Cancel", onClick: () => setShowUploadModal(false) }}
        >
          <ul className={`${classes.validationList}`}>
            {[
              ...props.uploadInstructions,
              ...(!isEmpty(props.tenantUploadConfig?.validations)
                ? Object.keys(props.tenantUploadConfig?.validations)
                    .map((key) => props.tenantUploadConfig?.validations[key])
                    .flat()
                : []),
            ].map(instruction => <li ><Typography variant="text" component="span">{instruction}</Typography></li>)}
          </ul>
        </ImpactModal>
      </>
    </Modal>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(UploadHandler);