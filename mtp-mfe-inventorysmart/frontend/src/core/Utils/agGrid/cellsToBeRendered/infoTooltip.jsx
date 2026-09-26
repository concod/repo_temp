import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Tooltip from "@mui/material/Tooltip";
import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import clsx from "clsx";
const useStyles = makeStyles((theme) => ({
  infoIcon: {
    color: theme.palette.primary.main,
    width: pxToRem(13.33),
  },
  actions: {
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  customTooltip: {
    backgroundColor: theme.palette.colours.tooltipColor,
  }
}));

const InfoTooltip = ({ props }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <>
      {props?.data?.info_tooltip ? (
        <div
          className={clsx(
            globalClasses.flexRow,
            globalClasses.verticalAlignCenter,
            globalClasses.gap
          )}
        >
          <p className={classes.actions}>{props?.data?.actions}</p>
          <Tooltip
            placement="right-start"
            title={props?.data?.info_tooltip}
            componentsProps={{
              tooltip: {
                className: classes.customTooltip,
              },
            }}
          >
            <InfoOutlinedIcon className={classes.infoIcon} />
          </Tooltip>
        </div>
      ) : (
        <>
          {props?.data?.actions}
        </>
      )}
    </>
  );
};

export default InfoTooltip;