import globalStyles from "core/Styles/globalStyles";
import { getRecentActivitiesData } from "core/actions/ticketActions";
import { useEffect, useState } from "react";
import CrossCalendar from "assets/crossCalendar.svg";
import CrossIcon from "assets/crossIcon.svg";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";
import { useStyles } from "./styles-recent-activities";
import { getFirstNameAndLastNameInitials } from "core/pages/ticketing-system/utils";
import { getTimeDifference } from "../../../recent-activities/utils";
import { Tooltip } from "@mui/material";

const RecentActivitiesIndividualView = () => {
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
          ? "Recent Activities"
          : "No Recent Activities"}
      </p>
      {recentActivitiesData.length > 0 && (
        <p
          className={classes.recentActivityViewText}
          onClick={() => setShowRecentActivity(true)}
        >
          View
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
                Recent Activities
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
            className={`${sharedClasses.allRecentActivites} individual-view`}
          >
            {recentActivitiesData.length === 0 ? (
              <div className={sharedClasses.allRecentActivitiesEmpty}>
                No Recent Activities
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
                      <Tooltip
                        title={
                          `${activity.module_type}- ${activity.issue_type}`?.split(
                            " "
                          )?.length > 4
                            ? `${activity.module_type}- ${activity.issue_type}`
                            : ""
                        }
                        arrow
                        placement="top"
                      >
                        <p
                          className={`${sharedClasses.activityBoxInfoHeader} individual-view`}
                        >
                          {activity.module_type}- {activity.issue_type}
                        </p>
                      </Tooltip>
                      <p className={sharedClasses.activityBoxInfoId}>
                        <span>[#{activity.id}] </span>
                        <Tooltip
                          title={
                            activity?.update_details?.split(" ")?.length >= 6
                              ? activity.update_details
                              : ""
                          }
                          arrow
                          placement="top"
                        >
                          <span
                            className={`${sharedClasses.activityBoxInfoTicketStatus} individual-view`}
                          >
                            : {activity.update_details}
                          </span>
                        </Tooltip>
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
                          {getTimeDifference(activity.updated_on)} ago
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
