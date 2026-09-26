import * as React from "react";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import TaskIcon from "@mui/icons-material/Task";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Typography, LinearProgress, Button } from "@mui/material";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  progress_bar: {
    width: "100%",
    margin: theme.spacing(1, 0),
  },
  error_container: {
    display: "flex",
    alignItems: "center",
    minWidth: theme.spacing(4),
  },
  icon_style: {
    fontSize: "2.8rem",
    marginRight: theme.spacing(1),
  },
  file_icon_style: {
    color: theme.palette.textColours.slateGrayLight,
  },
  cancel_icon_style: {
    fontSize: "1rem",
  },
  file_upload_text_style: {
    fontWeight: theme.typography.fontWeightMedium,
    marginBottom: theme.spacing(2),
  },
  error_description: {
    paddingLeft: theme.spacing(1),
    fontSize: theme.typography.body2.fontSize,
    textAlign: "center",
  },
}));

export default function ClusterPlanPercentageLoader(props) {
  const classes = useStyles();
  const globalClasses = globalStyles();
  return (
    <>
      <Box className={`${globalClasses.fullWidth} ${globalClasses.flexRow}`}>
        {props.selectedClusterFile.length && props.isClusterUploaded ? (
          <TaskIcon color="success" className={classes.icon_style} />
        ) : (
          <InsertDriveFileIcon
            className={`${classes.icon_style} ${classes.file_icon_style}`}
          />
        )}
        <Box className={globalClasses.fullWidth}>
          <p className={classes.file_upload_text_style}>
            {props.selectedClusterFile.length &&
            props.isClusterUploaded === true
              ? "File Uploaded"
              : "File Uploading..."}
          </p>
          <p>{props.fileName}</p>
          <Box className={classes.progress_bar} sx={{ mr: 1 }}>
            <LinearProgress
              color={
                props.selectedClusterFile.length && props.isClusterUploaded
                  ? "success"
                  : props.isClusterUploaded === false
                  ? "error"
                  : "primary"
              }
              variant="determinate"
              value={props.progress}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="body2"
              color={`${
                !props.isClusterUploaded && props.progress === 100
                  ? "error"
                  : "text.secondary"
              }`}
            >
              {!props.isClusterUploaded && props.progress === 100
                ? "Failed!"
                : `${props.progress}% completed`}
            </Typography>
          </Box>
          {props.progress === 100 && (
            <>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<RefreshIcon />}
                onClick={props.handleReUpload}
              >
                Upload Again
              </Button>
              {!props.isClusterUploaded && (
                <Box sx={{ mt: 2 }} className={classes.error_container}>
                  <CancelIcon
                    className={classes.cancel_icon_style}
                    size="small"
                    color="error"
                  />
                  <span className={classes.error_description}>
                    Error description:{" "}
                    {props.errorMessage || "Something went wrong!"}
                  </span>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </>
  );
}
