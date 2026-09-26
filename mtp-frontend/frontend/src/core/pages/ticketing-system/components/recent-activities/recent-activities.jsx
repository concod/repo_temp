import globalStyles from "core/Styles/globalStyles";
import { getRecentActivitiesData } from "core/actions/ticketActions";
import { getFirstNameAndLastNameInitials } from "core/pages/ticketing-system/utils";
import { useEffect, useState } from "react";
import { getTimeDifference } from "./utils";
import CrossCalendar from "assets/crossCalendar.svg";
import { AllRecentActivitiesDiv, useStyles as sharedStyles } from "../../styles-ticketing";
import { Tooltip } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useSelector } from "react-redux";

export const RecentActivities = () => {
  const [recentActivitiesData, setRecentActivitiesData] = useState([]);
  const [ticketIds, setTicketIds] = useState([]);
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const sharedClasses = sharedStyles();
  const isWeekToDateRowMaximized = useSelector((state) => state?.ticketingReducer?.isWeekToDateRowMaximized)

  /**
   * getRecentActivities this function is called
   * initially to get all the recent activities
   */
  const getRecentActivities = async () => {
    try {
      let payload = {};
      let response = await getRecentActivitiesData(payload)();
      let ticketIdData = response?.data?.data?.map((data) => data?.id);
      setTicketIds(ticketIdData);
      setRecentActivitiesData(response.data.data);
    } catch (error) {
      console.error("getRecentActivities error:", error);
    }
  };

  const goToDetailedView = () => {
    try {
      navigate(
        `/ticketing-system/detailed-view/data-id/recent/data-category/recent`,
        {
          state: {
            prevScr: location.pathname,
            ticketIds: [...ticketIds],
          },
        }
      );
    } catch (error) {
      console.error("goToDetailedView error", error);
    }
  };

  useEffect(() => {
    getRecentActivities();
  }, []);

  return (
    <div
      className={`${sharedClasses.card} ${sharedClasses.recentActivity} ${sharedClasses.mt27}`}
    >
      <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
        <div className={sharedClasses.flexContainerHeaderIcon}>
          <p className={sharedClasses.recentActivityHeader}>
            Recent Activities
          </p>
          <CrossCalendar viewBox="0 0 24 24" />
        </div>
        {recentActivitiesData.length !== 0 && (
          <p
            className={sharedClasses.recentActivityLink}
            onClick={goToDetailedView}
          >
            View All Tickets
          </p>
        )}
      </div>
      <AllRecentActivitiesDiv isWeekToDateRowMaximized={isWeekToDateRowMaximized} className={sharedClasses.allRecentActivites}>
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
                    <p className={sharedClasses.activityBoxInfoHeader}>
                      {activity.module_type}- {activity.issue_type}
                    </p>
                  </Tooltip>
                  <p className={sharedClasses.activityBoxInfoId}>
                    <span>[#{activity.id}] </span>
                    <Tooltip
                      title={
                        activity?.update_details?.split(" ")?.length > 4
                          ? activity.update_details
                          : ""
                      }
                      arrow
                      placement="top"
                    >
                      <span
                        className={sharedClasses.activityBoxInfoTicketStatus}
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
      </AllRecentActivitiesDiv>
    </div>
  );
};
