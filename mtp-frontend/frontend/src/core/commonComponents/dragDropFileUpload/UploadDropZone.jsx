import * as React from "react";
import { Box, Paper, Typography, IconButton } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { makeStyles } from "@mui/styles";
import globalStyles from "Styles/globalStyles";
import { downloadExcelLink } from "core/Utils/csv-download";
import { downloadXlsxLink } from "./xlsx-download";

const useStyles = makeStyles((theme) => ({
  file_drag_and_drop_container: {
    padding: theme.spacing(2.5),
    textAlign: "center",
    cursor: "pointer",
    border: `2px dashed ${theme.palette.grey[400]}`,
    background: theme.palette.common.white,
  },
  file_container_on_drag_over: {
    border: `2px dashed ${theme.palette.grey[600]}`,
    background: theme.palette.grey[300],
  },
  cloud_icon: {
    fontSize: "2.5rem",
  },
  hyperlink_text: {
    color: theme.palette.primary.main,
    textDecoration: "underline",
    cursor: "pointer",
  },
}));

const UploadDropZone = (props) => {
  const [dragOver, setDragOver] = React.useState(false);
  const classes = useStyles();
  const globalClasses = globalStyles();

  const handleDragOver = React.useCallback((event) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = React.useCallback((event) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = React.useCallback(
    (event) => {
      event.preventDefault();
      setDragOver(false);
      if (event.dataTransfer.files && event.dataTransfer.files[0]) {
        props.onFileUpload(event.dataTransfer.files);
      }
    },
    [props.onFileUpload]
  );

  const handleChange = React.useCallback(
    (event) => {
      if (event.target.files?.length) {
        props.onFileUpload(event.target.files);
      }
    },
    [props.onFileUpload]
  );

  return (
    <Paper
      variant="outlined"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${classes.file_drag_and_drop_container} ${
        dragOver && classes.file_container_on_drag_over
      }`}
    >
      <input
        accept={props.acceptedFileTypes}
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
            aria-label="upload picture"
            component="span"
          >
            <CloudUploadIcon className={classes.cloud_icon} />
          </IconButton>
          <Typography>
            Drag and drop files here or{" "}
            <a className={classes.hyperlink_text}>Browse File</a>
          </Typography>
        </label>
        <br />
        <Typography>
          {`Uploading required format: ${props.acceptedFileTypes} | `}
          {props?.downloadExcelFile ? (
            <>
              {downloadXlsxLink(
                props?.fileName,
                props?.headerList,
                classes.hyperlink_text,
                true,
                props?.filePath,
                props?.downloadStaticMacrosFile
              )}
            </>
          ) : (
            <>
              <a
                className={classes.hyperlink_text}
                onClick={() => {
                  props.downloadTemplateRef.current.link.click();
                }}
              >
                Download Template
              </a>
              {downloadExcelLink(
                props.data,
                props.fileName,
                props.downloadTemplateRef,
                props.headerList,
                "",
                "",
                false,
                false,
                false
              )}
            </>
          )}
        </Typography>
      </Box>
    </Paper>
  );
};

export default UploadDropZone;
