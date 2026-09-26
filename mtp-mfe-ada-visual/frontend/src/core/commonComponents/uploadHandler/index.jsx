import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { read, utils, write } from "xlsx-js-style";
import { Modal, FileUpload, Prompt } from "impact-ui-v3";
import { Typography } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import makeStyles from "@mui/styles/makeStyles";
import { downloadExcelLink } from "core/Utils/csv-download";
import { upperFirst } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import { saveAs } from "file-saver";
import { getModuleCodes } from "./uploadHandlerService";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";

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
    templateTableName,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState([]);
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

  useEffect(() => {
    const setModuleCodesData = async () => {
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
    };
    setModuleCodesData();

    // Cleanup function
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
      props.handleUpload(parsedExcelData, files);
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
    setFiles([]);
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
      let data;
      if(props?.allowBlankRows){
         data = utils.sheet_to_json(ws, { blankRows: false, defval: "" });
      }else{
         data = utils.sheet_to_json(ws);
      }
      setParsedExcelData(data);
    };
    reader.readAsBinaryString(files[0].file);
  };

  /**
   * @function
   * @description Update local state objects on input change
   * @param {Object} event
   */
  const changeHandler = (event) => {
    if (event.length) {
      setFiles(event);
      setIsFilePicked(true);
      setFileName && setFileName(event[0].file?.name);
    } else {
      setFiles([]);
      setIsFilePicked(false);
      setFileName && setFileName("");
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

  const downloadTemplateFromConfig = async (tableName) => {
    try {
      const columns = await getColumnsAg(`table_name=${tableName}`)();
      const configToUse = columns?.length > 0 ? columns : null; // Fallback to templateConfig if DB columns are empty
      if (configToUse) {
        const headers = configToUse
          .filter((col) => !col.is_hidden)
          .sort(
            (a, b) => (a.order_of_display || 0) - (b.order_of_display || 0)
          )
          .map((col) => col.label || col.Header || col.column_name);
        const worksheet = utils.json_to_sheet([], { header: headers });
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Template");
        const workbookArray = write(workbook, {
          bookType: "xlsx",
          type: "array",
        });
        const blob = new Blob([workbookArray], {
          type: "application/octet-stream",
        });
        saveAs(blob, `${templateName}.xlsx`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to fetch template config:", error);
      return false;
    }
  };
  const downloadExcelWithValidations = () => {
    if (props?.templateConfig && props.templateConfig.length > 0) {
      const headers = props.templateConfig.map(
        (col) => col.label || col.key || String(col)
      );
      const worksheet = utils.json_to_sheet([], { header: headers });
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Template");
      // Add Instructions sheet if uploadInstructions are provided
      if (
        Array.isArray(props.uploadInstructions) &&
        props.uploadInstructions.length > 0
      ) {
        const instructionsData = props.uploadInstructions.map(
          (item) => item.text
        );
        const instructionsSheet = utils.aoa_to_sheet(instructionsData);
        // Apply bold styling for rows where style.fontWeight is "bold"
        props.uploadInstructions.forEach((item, rowIndex) => {
          const isBold = item?.style?.fontWeight === "bold";
          if (!isBold) return;
          const rowArray = Array.isArray(item?.text) ? item.text : [item?.text];
          for (let colIndex = 0; colIndex < rowArray.length; colIndex += 1) {
            const cellAddress = utils.encode_cell({ r: rowIndex, c: colIndex });
            const cell = instructionsSheet[cellAddress];
            if (!cell) continue;
            instructionsSheet[cellAddress] = {
              ...cell,
              s: {
                ...(cell.s || {}),
                font: { ...(cell.s?.font || {}), bold: true },
              },
            };
          }
        });
        // Set a single column width to fit the longest instruction
        const maxLen = props.uploadInstructions.reduce((max, item) => {
          const textStr = Array.isArray(item?.text)
            ? item.text[0]
            : typeof item === "string"
            ? item
            : String(item?.text ?? "");
          const len = textStr.length;
          return Math.max(max, len);
        }, 0);
        instructionsSheet["!cols"] = [
          { wch: Math.max(10, Math.min(maxLen + 2, 100)) },
        ];
        utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
      }
      const workbookArray = write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([workbookArray], {
        type: "application/octet-stream",
      });
      saveAs(blob, `${templateName}.xlsx`);
      return;
    }
  };

  const handleDownloadTemplate = async () => {
    // Template with validation instructions
    if (props.attachValidationsInTemplate) {
      downloadExcelWithValidations();
    } 
    // DB-driven
    else if (templateTableName) {
      const success = await downloadTemplateFromConfig(templateTableName);
      if (!success) {
        downloadTemplateBtn.current?.link?.click();
      }
    } 
    // Fallback: Default template
    else {
      downloadTemplateBtn.current?.link?.click();
    }
    setShowUploadModal(false);
  };
  return (
    <Modal
      open={isOpen}
      onClose={handleModalClose}
      title="Media Upload"
      aria-labelledby="file-upload-modal"
      primaryButtonLabel={
        !props?.hideDownloadTemplateButton && "Download Template"
      }
      onPrimaryButtonClick={() => setShowUploadModal(true)}
    >
      <>
        <div className={`${classes.uploadBody} ${globalClasses.paddingAround}`}>
          <LoadingOverlay loader={isLoading} spinner>
          <FileUpload
            fileList={files}
            numberOfFiles={1}
            isDisabled={!isFilePicked || isLoading}
            onFileListChange={changeHandler}
            validFileTypes={[
              {
                fileType: "xlsx",
                templateDownloader: undefined,
                typeOverride: false,
              },
              {
                fileType: "csv",
                templateDownloader: undefined,
                typeOverride: false,
              },
            ]}
            onPrimaryButtonClick={() =>
              props.jsonUpload
                ? invokeReader()
                : (setIsLoading(true), props.handleUpload(files))
            }
            onCancelClick={() => handleModalClose()}
            primaryButtonLabel="Upload"
          />
          {showFileValidation && buildErrorReport()}
          <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
            {!props?.hideDownloadTemplateButton && (
              <>
                {downloadExcelLink(
                  props.templateBody || [],
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
          </div>
          </LoadingOverlay>
        </div>
        <Prompt
          isOpen={showUploadModal}
          title="File upload validations:"
          primaryButtonLabel="Download"
          onPrimaryButtonClick={handleDownloadTemplate}
          secondaryButtonLabel="Cancel"
          onSecondaryButtonClick={() => setShowUploadModal(false)}
        >
          <ul>
            {props.uploadInstructions.map((item) => {
              let text;
              if (typeof item === "object") {
                text = item.text;
                text = text.join(" ");
              } else {
                text = item;
              }
              return <li key={text}>{text}</li>;
            })}
          </ul>
          {/* Need to add this if you got this */}
          {/* children={[
            ...(!isEmpty(props.tenantUploadConfig?.validations)
              ? Object.keys(props.tenantUploadConfig?.validations)
                  .map((key) => props.tenantUploadConfig?.validations[key])
                  .flat()
              : []),
          ]} */}
        </Prompt>
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
