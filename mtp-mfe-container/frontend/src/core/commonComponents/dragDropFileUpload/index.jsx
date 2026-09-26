import { useRef } from "react";
import UploadDropZone from "./UploadDropZone";
import UploadPercentageLoader from "./UploadPercentageLoader";
import { useState } from "react";
import { useEffect } from "react";
import { cloneDeep } from "lodash";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import globalStyles from "Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTranslation } from "impact-ui-v3";

const acceptedFileTypes = [".xlsx", ".csv"];

function DragDropFileUpload(props) {
  const { t } = useTranslation();
  const [selectedUploadFile, setSelectedUploadFile] = useState([]);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [isFileUploaded, setIsFileUploaded] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const downloadTemplateRef = useRef(null);

  const globalClasses = globalStyles();
  const classes = useStyles();

  const onFileUpload = (files) => {
    setSelectedUploadFile(files);
  };

  const handleReupload = () => {
    setSelectedUploadFile([]);
    setIsFileUploaded(null);
    setFileUploadProgress(0);
  };

  useEffect(() => {
    setCsvHeaders(getHeaderForExcel(cloneDeep(props?.templateHeaders)));
  }, [props?.templateHeaders]);

  useEffect(() => {
    if (props?.templateRows) {
      var formattedRows = agGridRowFormatter(props?.templateRows);
      setCsvData(cloneDeep(formattedRows), csvHeaders);
    }
  }, [props?.templateRows]);

  useEffect(() => {
    if (selectedUploadFile[0]) {
      (async () => {
        try {
          const formData = new FormData();
          formData.append("upload_file", selectedUploadFile[0]);
          if (props?.upload_filters) {
            formData.append("filters", JSON.stringify(props?.upload_filters));
          }
          let uploadResponse = await props?.uploadBulkData(formData);
          setFileUploadProgress(50);

          if (uploadResponse?.data?.status || uploadResponse?.status) {
            setFileUploadProgress(75);
            setIsFileUploaded(true);
            setErrorMessage(uploadResponse?.data?.message);
          } else {
            setErrorMessage(uploadResponse?.message);
            setFileUploadProgress(75);
            setIsFileUploaded(false);
          }
          setFileUploadProgress(100);
        } catch (error) {
          if (error?.response?.data?.message) {
            setErrorMessage(error?.response?.data?.message);
          }
          setFileUploadProgress(100);
          setIsFileUploaded(false);
        }
      })();
    }
  }, [selectedUploadFile]);

  return (
    <div>
      {!selectedUploadFile[0] && (
        <UploadDropZone
          onFileUpload={onFileUpload}
          downloadTemplateRef={downloadTemplateRef}
          fileName={props?.fileName ? props?.fileName : "download_template"}
          headerList={csvHeaders}
          data={csvData}
          downloadExcelFile={props?.downloadExcelFile}
          acceptedFileTypes={
            props?.acceptedFileTypes
              ? props?.acceptedFileTypes.toString()
              : acceptedFileTypes.toString()
          }
        />
      )}

      {selectedUploadFile[0] && (
        <UploadPercentageLoader
          progress={fileUploadProgress}
          fileName={selectedUploadFile[0]?.name}
          selectedUploadFile={selectedUploadFile}
          isFileUploaded={isFileUploaded}
          setSelectedUploadFile={setSelectedUploadFile}
          handleReUpload={handleReupload}
          errorMessage={errorMessage}
        />
      )}

      {props?.fileValidationList?.length > 0 && (
        <div className={globalClasses.evenPaddingAround}>
          <div className={classes.validationListHeader}>
            <div className={classes.validationListIcon}>
              <ErrorOutlineIcon fontSize="small" />
            </div>
            <h2 className={classes.validationListTitle}>
              {t("upload.fileUploadValidations")}
            </h2>
          </div>

          <ul>
            {props?.fileValidationList.map((instruction, index) => {
              return (
                <li className={classes.validationListItem} key={index}>
                  {instruction}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DragDropFileUpload;

const useStyles = makeStyles(() => ({
  validationListHeader: {
    padding: "2rem 1rem 1.5rem 0.5rem",
    display: "flex",
  },
  validationListTitle: {
    fontSize: "1rem",
    fontWeight: "500",
  },
  validationListIcon: {
    marginRight: "0.25rem",
    fontSize: "1rem",
    fontWeight: "500",
  },
  validationListItem: {
    listStyle: "disc",
    marginBottom: "0.5rem",
    marginLeft: "2rem",
  },
}));
