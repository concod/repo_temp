import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import {
  fetchFoldersInBucketAPI,
  generateDownloadLink,
  uploadSkuFile,
} from "modules/marksmart/services-marksmart/dashboard/dashboard-service";
import { addSnack } from "core/actions/snackbarActions";
import { Container, Paper, Typography, Grid, Button } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { formatFileHierarchy } from "modules/marksmart/utils-marksmart";
import { useHistory } from "react-router";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";
import makeStyles from "@mui/styles/makeStyles";
import { useStyles as sharedStyles } from "./styles-marksmart";
import BackupIcon from "@mui/icons-material/Backup";
import AgGridTable from "core/Utils/agGrid";
const useStyles = makeStyles((theme) => ({
  filesViewWrapper: {
    flexDirection: "column",
  },
  filesViewMaxWidth: {
    maxWidth: "46.875rem",
  },
  reUploadButton: {
    alignSelf: "flex-start",
  },
}));
const DirectoryView = (props) => {
  const classes = useStyles();
  const sharedClasses = sharedStyles();
  const markSmartFileView = [
    "SKU Input list",
    "IA Price recommendation",
    "Post Event Reports",
  ];
  const [defaultDirectoryView, setDefaultDirectoryView] = useState(
    "uploadView"
  );
  const [directoryFiles, setdirectoryFiles] = useState([]);
  const [directoryFilesTableColumns, setdirectoryFilesTableColumns] = useState(
    []
  );
  const [directoryName, setdirectoryName] = useState("");
  const [fileHierarchy, setfileHierarchy] = useState([]);
  const [fileViewTableColumnsLoader, setfileViewTableColumnsLoader] = useState(
    false
  );
  const [fileViewTableDataLoader, setfileViewTableDataLoader] = useState(false);
  const [loadingText, setloadingText] = useState("loading...");
  const history = useHistory();
  const globalClasses = globalStyles();
  const fileUploadRef = useRef(null);

  useEffect(() => {
    const getFileViewTableColumns = async () => {
      setfileViewTableColumnsLoader(true);
      let columns = await props.getColumnsAg("table_name=marksmart-file-view");
      columns = columns.filter((column) => column.column_name !== "created_by");
      setdirectoryFilesTableColumns(columns);
      setfileViewTableColumnsLoader(false);
    };
    getFileViewTableColumns();
  }, []);

  /**
   * @function
   * @description Function to get the list of directories under the selected month
   */
  const fetchDirectoryData = async () => {
    setfileViewTableDataLoader(true);
    const folderResponse = await props.fetchFoldersInBucketAPI(
      props?.match?.params?.year && props?.match?.params?.month
        ? `${props.match.params["year"]}/${props.match.params["month"]}`
        : props.match.params[0]
    );

    if (
      folderResponse?.data.data?.client_uploads?.length ||
      folderResponse?.data.data?.ia_recommends?.length ||
      folderResponse?.data.data?.post_event_reports?.length
    ) {
      //If the SKU recommendation file is uploaded or the IA recommend file is uploaded, the show the file view
      setDefaultDirectoryView("directoryTableView");

      setdirectoryFiles(folderResponse?.data.data);
    }

    const fileLevels = (props?.match?.params?.year &&
    props?.match?.params?.month
      ? `${props.match.params["year"]}/${props.match.params["month"]}`
      : props.match.params[0]
    ).split("/");
    setdirectoryName(fileLevels[fileLevels.length - 1]);

    let updatedfileHierarchy = [];
    updatedfileHierarchy.push(
      formatFileHierarchy("Home", () => history.push(`/mark-smart/dashboard`))
    );
    let parentPath = "";
    fileLevels.forEach((fileName, idx) => {
      let currentPath = parentPath + "/" + fileName;
      parentPath += currentPath;
      updatedfileHierarchy.push(
        formatFileHierarchy(
          fileName,
          () =>
            idx === fileLevels.length - 1
              ? null
              : history.push(`/mark-smart${currentPath}`),
          null
        )
      );
    });
    setfileHierarchy(updatedfileHierarchy);
    setfileViewTableDataLoader(false);
  };

  useEffect(() => {
    fetchDirectoryData();
  }, [props.location]);

  /**
   * @function
   * @description Function gets triggered on excel upload of SKU list value
   */
  const fileSelectedHandler = async (event) => {
    if (event.target.files?.length > 0) {
      const filePath =
        props?.match?.params?.year && props?.match?.params?.month
          ? `${props.match.params["year"]}/${props.match.params["month"]}`
          : props.match.params[0];

      const formData = new FormData();
      formData.append("file", event.target.files?.[0]);
      formData.append("path", filePath);
      setfileViewTableDataLoader(true);
      let uploadSkuFileResponse = await props.uploadSkuFile(formData, filePath);

      if (uploadSkuFileResponse?.data?.status) {
        displayMessage("File uploaded successfully", "success");

        fetchDirectoryData();
      } else {
        displayMessage("Error in uploading file", "error");
      }
      setfileViewTableDataLoader(false);
    }
  };

  const displayMessage = (msg, type, onClose) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  /**
   * @function
   * @description Trigger API to download file based on its relative path
   */

  const onFileDownload = async (tableData) => {
    setfileViewTableDataLoader(true);
    setloadingText("Download in progress...");
    try {
      const relativeFilePath =
        tableData.data.parent_path + "/" + tableData.data.name;
      const downloadFileResponse = await props.generateDownloadLink(
        relativeFilePath
      );
      if (downloadFileResponse?.data?.data?.download_link?.length) {
        let a = document.createElement("a");
        a.href = downloadFileResponse?.data?.data?.download_link;
        a.download = "SampleFile.xlsx";
        a.click();
        displayMessage("File downloaded successfully", "success");
      } else {
        displayMessage("Error in downloading file", "error");
      }
    } catch (error) {
      displayMessage("Error in downloading file", "error");
    }
    setfileViewTableDataLoader(false);
    setloadingText("loading...");
  };

  const fileUploadView = () => {
    return (
      <span className={sharedClasses.browseButton}>
        <input
          multiple
          ref={fileUploadRef}
          id="fileUploadRef"
          type="file"
          accept=".xls,.xlsx , .csv"
          onChange={(e) => fileSelectedHandler(e)}
          onClick={(e) => {
            e.target.value = null;
          }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            fileUploadRef?.current?.click();
          }}
          for="fileUploadRef"
        >
          Browse
        </Button>
        <span>{fileUploadRef?.currentTarget?.value}</span>
      </span>
    );
  };

  const handleBrowse = () => {};

  return (
    <>
      <HeaderBreadCrumbs options={fileHierarchy} />
      <Container maxWidth={false}>
        <LoadingOverlay
          loader={fileViewTableColumnsLoader || fileViewTableDataLoader}
          spinner
          text={loadingText}
        >
          <Paper className={globalClasses.paper}>
            <Container>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
                onDrop={fileSelectedHandler}
              >
                <Typography
                  className={globalClasses.marginLeft1rem}
                  variant="h3"
                >
                  {directoryName}
                </Typography>
                {defaultDirectoryView === "uploadView" ? (
                  <p className={sharedClasses.dragAndDropDiv}>
                    <BackupIcon
                      variant="filled"
                      color="primary"
                      style={{ padding: 5, width: 60, height: 60 }}
                    ></BackupIcon>
                    <Typography variant={"h6"}>
                      Drag and drop .xslx file here or click below-
                      {fileUploadView()}
                    </Typography>
                  </p>
                ) : (
                  directoryFilesTableColumns.length > 0 && (
                    <div>
                      {markSmartFileView.map((viewType, index) => {
                        return (
                          <div
                            className={`${classes.filesViewWrapper} ${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginAround}`}
                          >
                            <Container
                              className={`${classes.filesViewMaxWidth}`}
                            >
                              <Grid
                                container
                                direction="row"
                                className={`${classes.filesViewMaxWidth} ${globalClasses.layoutAlignBetweenCenter}`}
                              >
                                <Typography
                                  variant="h4"
                                  className={globalClasses.marginBottom}
                                >
                                  {viewType}
                                </Typography>
                                {index === 0 ? (
                                  <div className={classes.reUploadButton}>
                                    {fileUploadView()}
                                  </div>
                                ) : null}
                              </Grid>
                            </Container>
                            <Container
                              className={`${classes.filesViewMaxWidth}`}
                            >
                              <AgGridTable
                                rowdata={
                                  (index === 0
                                    ? directoryFiles?.client_uploads
                                    : index === 1
                                    ? directoryFiles?.ia_recommends
                                    : directoryFiles.post_event_reports) || []
                                }
                                columns={directoryFilesTableColumns}
                                onDownloadClick={onFileDownload}
                              />
                            </Container>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </Container>
          </Paper>
        </LoadingOverlay>
      </Container>
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    filesInCurrentPath:
      store.marksmartReducer.dashboardReducer.filesInCurrentPath,
  };
};
const mapActionsToProps = {
  fetchFoldersInBucketAPI,
  addSnack,
  generateDownloadLink,
  uploadSkuFile,
  getColumnsAg,
};
export default connect(mapStateToProps, mapActionsToProps)(DirectoryView);
