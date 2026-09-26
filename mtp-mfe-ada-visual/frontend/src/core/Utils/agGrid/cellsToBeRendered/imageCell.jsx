import { useState } from "react";
import { Tooltip } from "@mui/material";
import { Avatar } from "impact-ui-v3";
import { Close } from "@mui/icons-material";
import { withStyles } from "@mui/styles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { useEffect } from "react";
import LoadingOverlay from "core/Utils/Loader/loader";

const CustomizedTooltip = withStyles({
  tooltip: {
    display: "table-caption",
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 0px 4px 4px rgba(0,0,0,0.2)",
    width: "15.6rem",
    "& .MuiSvgIcon-root": {
      color: "black",
    },
  },
})(Tooltip);

const ImageCell = (props) => {
  const [open, setOpen] = useState(false);
  const [loader, setLoader] = useState(true);
  const classes = useStyles();

  useEffect(() => {
    if (open) {
      let interval = setTimeout(() => {
        setLoader(false);
        clearInterval(interval);
      }, [2000]);
    } else {
      setLoader(true);
    }
  }, [open]);

  useEffect(() => {
    if (props.selectedImage && props.selectedImage !== props.data.choice_name) {
      setOpen(false);
    }
  }, [props.selectedImage]);
  return (
    <div>
      <CustomizedTooltip
        open={open}
        placement="right"
        arrow
        title={
          <LoadingOverlay loader={loader} width={250} minHeight={100}>
            <div>
              <Close
                className={classes.choiceBtnAlignRight}
                onClick={() => setOpen(false)}
              />
              <img src={props?.value} width={230} />
            </div>
          </LoadingOverlay>
        }
      >
        <Avatar
          onClick={() => {
            props.onImageClick(props.data.choice_name);
            setOpen(true);
          }}
          src={props?.value}
        />
      </CustomizedTooltip>
    </div>
  );
};
export default ImageCell;
