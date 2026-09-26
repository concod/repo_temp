import { Typography } from "@mui/material";
import { getFirstNameAndLastNameInitials } from "modules/ticketing-system/utils";
import { Badge, useTranslation } from "impact-ui-v3";
import { getTimeDifference } from "./utils";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { chipConfig } from "../../constants";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  cardWrapper: {
    gap: pxToRem(9),
  },
  profileIcon: {
    width: pxToRem(68),
    fontWeight: 600,
    fontSize: pxToRem(20),
    aspectRatio: "1/1",
    background: theme?.palette?.colours?.blue_01,
    color: theme?.palette?.common?.white,
    borderRadius: pxToRem(4)
  },
  ticketTitle: {
    fontWeight: 600,
    fontSize: pxToRem(14),
    color: theme?.palette?.textColours?.lightNeutrals,
  },
  ticketInfoText: {
    fontWeight: 500,
    fontSize: pxToRem(14),
    color: theme.palette.colours.neutralGrey,
    margin: `${pxToRem(2)} 0rem ${pxToRem(8)}`
  },
  dateText: {
    fontWeight: 500,
    fontsize: pxToRem(12),
    color: theme?.palette?.textColours?.neutralText,
  },
}));
const RecentActivitesCard = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const { t } = useTranslation();
  const activity = props;
  return (
    <div className={`${globalClasses.flexRow} ${classes.cardWrapper}`}>
      <Typography
        className={`${classes.profileIcon} ${globalClasses.centerAlign}`}
      >
        {getFirstNameAndLastNameInitials(activity.user_name)}
      </Typography>
      <div className={globalClasses.fullWidth}>
        <Typography className={classes.ticketTitle}>
          {activity.module_type}- {activity.issue_type}
        </Typography>
        <Typography className={classes.ticketInfoText}>
          {`[#${activity.id}]`} {activity.update_details}
        </Typography>
        <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
          <Badge
            label={activity.priority}
            color={chipConfig?.[activity.priority]}
            variant="subtle"
          />
          <Typography variant="text" className={classes.dateText}>
            {getTimeDifference(activity.updated_on)} {t("ticketing.ago")}
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default RecentActivitesCard;
