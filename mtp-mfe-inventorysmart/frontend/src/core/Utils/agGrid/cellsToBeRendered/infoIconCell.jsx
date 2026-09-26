import Info from "@mui/icons-material/Info";
import { IconButton } from "@mui/material";

import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const InfoIconCell = (props) => {
  const classes = useStyles();

  const handleIconClick = () => {
    if (props.onInfoClick) {
      props.onInfoClick(props.data || {});
    }
  };

  return (
    <IconButton
      variant="text"
      color="primary"
      className={classes.actionIcon}
      onClick={handleIconClick}
      title="Info"
      size="large"
    >
      <Info fontSize="small" />
    </IconButton>
  );
};

export default InfoIconCell;
