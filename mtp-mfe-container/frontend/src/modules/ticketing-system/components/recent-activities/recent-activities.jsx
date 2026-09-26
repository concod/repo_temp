import globalStyles from "core/Styles/globalStyles";
import { getRecentActivitiesData } from "modules/ticketing-system/services/ticketActions";
import { getFirstNameAndLastNameInitials } from "modules/ticketing-system/utils";
import { useEffect, useState } from "react";
import { getTimeDifference } from "./utils";
import { useStyles as sharedStyles } from "../../styles-ticketing";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { Button, useTranslation } from "impact-ui-v3";
import { Typography } from "@mui/material";
import RecentActivitesCard from "./recentActivitiesCard";

export const RecentActivities = () => {
  const { t } = useTranslation();
  const [recentActivitiesData, setRecentActivitiesData] = useState([]);
  const [ticketIds, setTicketIds] = useState([]);
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const sharedClasses = sharedStyles();

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
    <div className={`${sharedClasses.recentActivity}`}>
      <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
        <Typography
          variant="text"
          className={sharedClasses.recentActivityHeader}
        >
          {t("ticketing.recentActivities")}
        </Typography>
        {recentActivitiesData.length !== 0 && (
          <Button variant="url" onClick={goToDetailedView}>
            {t("ticketing.viewAllTickets")}
          </Button>
        )}
      </div>
      <div
        className={`${sharedClasses.allRecentActivites} ${globalClasses.flexRow}  ${globalClasses.flexColumn}  ${sharedClasses.gap_18}`}
      >
        {recentActivitiesData.length === 0 ? (
          <div className={sharedClasses.allRecentActivitiesEmpty}>
            {t("ticketing.noRecentActivities")}
          </div>
        ) : (
          recentActivitiesData.map((activity, index) => (
            <>
              <RecentActivitesCard {...activity} />
              {index !== recentActivitiesData?.length - 1 && (
                <div className={sharedClasses.horizontalSeparator}></div>
              )}
            </>
          ))
        )}
      </div>
    </div>
  );
};
