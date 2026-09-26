import PropTypes from "prop-types";
import FolderIcon from "@mui/icons-material/Folder";
import { IconButton, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
const useStyles = makeStyles((theme) => ({
  folderIcon: {
    "& svg": {
      fontSize: "6rem",
    },
  },
  columnFlex: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
}));
const FolderCard = (props) => {
  const classes = useStyles();
  const { folderName, folderTag, path } = props;
  return (
    <>
      <div className={classes.columnFlex}>
        <IconButton
          onClick={() => props.onClick(path)}
          className={classes.folderIcon}
          disableRipple
          disableFocusRipple
          size="large"
        >
          <FolderIcon color="primary" />
        </IconButton>
        <Typography align="center">{folderName}</Typography>
        <Typography variant="subtitle1" align="center">
          {folderTag}
        </Typography>
      </div>
    </>
  );
};

FolderCard.propTypes = {
  folderName: PropTypes.string,
  folderTag: PropTypes.string,
};
export default FolderCard;
