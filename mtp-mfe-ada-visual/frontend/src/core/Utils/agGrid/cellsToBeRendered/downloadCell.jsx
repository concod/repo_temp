// Edit Icon cell renderer
/*

    In the parent comp, defining onEditClick function is Required
    Props:  spread the instance and pass onEditClick function 

 */
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import IconButton from "@mui/material/IconButton";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const DownloadCell = (props) => {
  const classes = useStyles();
  return (
    <IconButton
      variant="text"
      color="primary"
      className={classes.actionIcon}
      onClick={() => {
        props.onDownloadClick(props);
      }}
      title="Download"
      disabled={props.data.disableDownload}
      size="large"
    >
      <FileDownloadIcon />
    </IconButton>
  );
};

export default DownloadCell;
