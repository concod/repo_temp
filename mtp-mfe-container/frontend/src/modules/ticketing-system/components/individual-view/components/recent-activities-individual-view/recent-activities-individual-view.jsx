import globalStyles from "core/Styles/globalStyles";
import { getRecentActivitiesData } from "modules/ticketing-system/services/ticketActions";
import { useEffect, useState } from "react";
import CrossCalendar from "assets/crossCalendar.svg";
import CrossIcon from "assets/crossIcon.svg";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";
import { useStyles } from "./styles-recent-activities";
import { getFirstNameAndLastNameInitials } from "modules/ticketing-system/utils";
import { getTimeDifference } from "../../../recent-activities/utils";
import { useTranslation } from "impact-ui-v3";

const RecentActivitiesIndividualView = () => {
  const { t } = useTranslation();
  const [recentActivitiesData, setRecentActivitiesData] = useState([]);
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const classes = useStyles();
  const sharedClasses = sharedStyles();
  const globalClasses = globalStyles();

  /**
   * getRecentActivities this function is called
   * initially to get all the recent activities
   */
  const getRecentActivities = async () => {
    try {
      let payload = { fetch_for_current_user: true };
      let response = await getRecentActivitiesData(payload)();
      setRecentActivitiesData(response.data.data);
    } catch (error) {
      console.error("getRecentActivities error:", error);
    }
  };

  useEffect(() => {
    getRecentActivities();
  }, []);

  return (
    <div className={classes.recentActivityContainer}>
      <p className={classes.recentActivityTotalCount}>
        {recentActivitiesData.length > 0 ? recentActivitiesData.length : "0"}
      </p>
      <p className={classes.recentActivityTitle}>
        {recentActivitiesData.length > 0
          ? t("ticketing.recentActivities")
          : t("ticketing.noRecentActivities")}
      </p>
      {recentActivitiesData.length > 0 && (
        <p
          className={classes.recentActivityViewText}
          onClick={() => setShowRecentActivity(true)}
        >
          {t("ticketing.recentActivities.view")}
        </p>
      )}
      {showRecentActivity && (
        <div
          className={`${sharedClasses.card} ${sharedClasses.recentActivity} ${classes.recentActivityAbsoluteContainer}`}
        >
          <div
            className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignCenter}`}
          >
            <div className={sharedClasses.flexContainerHeaderIcon}>
              <p className={sharedClasses.recentActivityHeader}>
                {t("ticketing.recentActivities")}
              </p>
              <CrossCalendar viewBox="0 0 24 24" />
            </div>
            <div
              className={classes.recentActivityHeaderClose}
              onClick={() => setShowRecentActivity(false)}
            >
              <CrossIcon viewBox="0 0 12 12" />
            </div>
          </div>
          <div
            className={`${sharedClasses.allRecentActivites} ${classes.mh100}`}
          >
            {recentActivitiesData.length === 0 ? (
              <div className={sharedClasses.allRecentActivitiesEmpty}>
                {t("ticketing.noRecentActivities")}
              </div>
            ) : (
              recentActivitiesData.map((activity) => (
                <div className={sharedClasses.recentActivityContainer}>
                  <div className={sharedClasses.activityBox}>
                    <div className={sharedClasses.activityBoxName}>
                      <p className={sharedClasses.activityBoxNameText}>
                        {getFirstNameAndLastNameInitials(activity.user_name)}
                      </p>
                    </div>
                    <div className={sharedClasses.activityBoxInfo}>
                      <p className={sharedClasses.activityBoxInfoHeader}>
                        {activity.module_type}- {activity.issue_type}
                      </p>
                      <p className={sharedClasses.activityBoxInfoId}>
                        [#{activity.id}]
                      </p>
                      <div
                        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} mt-3`}
                      >
                        <p
                          className={`${sharedClasses.activityBoxInfoBadge} ${activity.priority}`}
                        >
                          {activity.priority}
                        </p>
                        <p className={sharedClasses.activityBoxInfoTime}>
                          {getTimeDifference(activity.updated_on)} {t("ticketing.ago")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <hr />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivitiesIndividualView;
