import LoadingOverlay from "core/Utils/Loader/loader";
import { Preview } from "core/Utils/preview/preview";
import { getTicketCommentInfo } from "modules/ticketing-system/services/ticketActions";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AttachmentGreyIcon from "assets/attachmentsGreyIcon.svg";
import { chipConfig } from "modules/ticketing-system/constants";
import {
  formatDate,
  getFirstNameAndLastNameInitials,
  getFullFirstNameAndLastNameInitials,
  getTimeDifferenceInDays,
} from "modules/ticketing-system/utils";
import { useEffect, useState } from "react";
import CommentCard from "./components/comment-card/comment-card";
import CommentCardInfo from "./components/comment-card-info/comment-card-info";
import { useStyles as sharedStyles } from "modules/ticketing-system/styles-ticketing";
import { Panel, Badge, useTranslation } from "impact-ui-v3";
import { Typography } from "@mui/material";
import "../../ticketing-styles.css";
import globalStyles from "core/Styles/globalStyles";

/**
 * TransactionHistory is the component which
 * will show all details of the single
 * ticket with comments made on them
 * @param {object} props
 * @returns
 */
const TransactionHistory = (props) => {
  const {
    ticketId,
    updatedOn,
    setShowTransactionHistory,
    showTransactionHistory,
  } = props;
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [commentData, setCommentData] = useState([]);
  const [ticketData, setTicketData] = useState([]);
  const [noOfAttachments, setNoOfAttachments] = useState(0);
  const [imagesObject, setImagesObject] = useState({});
  const sharedClasses = sharedStyles();
  const globalClasses = globalStyles();
  /**
   * getCommentDetails function will be
   * called whenever a ticket link
   * will be clicked and will get all
   * the details of the ticket and set
   * it to their respective state
   */
  const getCommentDetails = async () => {
    try {
      setIsLoading(true);
      let payload = {
        id: ticketId,
        updated_on: updatedOn,
      };
      const data = await getTicketCommentInfo(payload)();
      setIsLoading(false);
      setTicketData(data?.data?.data);
      setCommentData(data?.data?.data?.comments);
      let comments = data?.data?.data?.comments;
      let attachmentCount = 0;
      let imgObject = {};
      comments?.forEach((comment, index) => {
        if (comment.attachments.length > 0) {
          attachmentCount++;
          comment.attachments.forEach((attachment) => {
            if (imgObject.hasOwnProperty(index)) {
              imgObject[index] = [
                ...imgObject[index],
                <Preview file={attachment} type="image" />,
              ];
            } else {
              imgObject[index] = [<Preview file={attachment} type="image" />];
            }
          });
        }
      });
      setImagesObject(imgObject);
      setNoOfAttachments(attachmentCount);
    } catch (error) {
      console.error("getCommentDetails error:", error);
      setIsLoading(false);
    }
  };

  const getPanelTitle = () => (
    <>
      {t("ticketing.transactionHistory.title")} -{" "}
      <a
        href={`https://impactanalytics.mojohelpdesk.com/mc/tickets/${ticketId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {ticketId}
      </a>
    </>
  );

  useEffect(() => {
    getCommentDetails();
  }, [ticketId]);

  return (
    <Panel
      anchor="right"
      size="large"
      title={getPanelTitle()}
      open={showTransactionHistory}
      setIsOpen={setShowTransactionHistory}
      className="ticket-info-panel"
    >
      <LoadingOverlay loader={isLoading} spinner>
        <Typography
          variant="text"
          className={`${sharedClasses.transactionHistoryHeader}`}
        >
          {ticketData?.title}
        </Typography>
        <div className={sharedClasses.transactionHistoryCard}>
          <div
            className={`${globalClasses.flexAlignBetweenCenter} ${sharedClasses.transactionHistoryCardHeader}`}
          >
            <Typography className={sharedClasses.THCardTitle}>
              {ticketData?.module}
            </Typography>
            <div className={`${sharedClasses.gap_12} ${globalClasses.flexRow}`}>
              <Typography variant="text" className={sharedClasses.THCardLabel}>
                {t("ticketing.transactionHistory.status")}
              </Typography>
              {ticketData?.status && (
                <Badge
                  label={
                    ticketData?.status?.charAt(0)?.toUpperCase() +
                    ticketData?.status?.slice(1)
                  }
                  color={chipConfig?.[ticketData?.status]}
                  variant={"subtle"}
                />
              )}
              <Typography variant="text" className={sharedClasses.THCardLabel}>
                {t("ticketing.transactionHistory.priority")}
              </Typography>
              {ticketData?.priority && (
                <Badge
                  label={
                    ticketData?.priority.charAt(0).toUpperCase() +
                    ticketData?.priority.slice(1)
                  }
                  color={chipConfig?.[ticketData?.status]}
                  variant={"subtle"}
                />
              )}
            </div>
          </div>
          <div className={sharedClasses.transactionHistoryCardBody}>
            <CommentCardInfo keyInfo={t("ticketing.transactionHistory.module")} value={ticketData?.module} />
            <CommentCardInfo keyInfo={t("ticketing.transactionHistory.banner")} value={ticketData?.banner} />
            <CommentCardInfo
              keyInfo={t("ticketing.transactionHistory.firstAssigned")}
              value={formatDate(ticketData?.first_assigned_on)}
            />
            <CommentCardInfo
              keyInfo={t("ticketing.transactionHistory.lastUpdated")}
              value={formatDate(ticketData?.last_updated)}
            />
          </div>
        </div>
        <Typography
          variant="text"
          className={`${sharedClasses.transactionHistoryModalTitle} ${globalClasses.flexRow}`}
        >
          {t("ticketing.transactionHistory.conversations")} - {ticketData?.total_comments}
          <Badge
            label={`${t("ticketing.transactionHistory.attachments")} - ${noOfAttachments}`}
            variant="subtle"
            color="info"
            icon={<AttachFileIcon />}
            isIcon
          />
        </Typography>
            <div
              className={`${sharedClasses.transactionHistoryCommentCards} comments-wrapper`}
              style={{
                maxHeight: `calc(100vh - ${
                  document
                    ?.querySelector(".comments-wrapper")
                    ?.getBoundingClientRect()?.y +32
                }px)`,
              }}
            >
              {commentData?.map((comment, index) => (
                <CommentCard
                  nameInitials={getFirstNameAndLastNameInitials(comment?.user)}
                  name={getFullFirstNameAndLastNameInitials(comment?.user)}
                  time={getTimeDifferenceInDays(comment?.time, t)}
                  subject=""
                  description={comment?.comment}
                  icon={<AttachmentGreyIcon viewBox="0 0 8 16" />}
                  images={
                    comment?.attachments.length > 0 ? imagesObject[index] : ""
                  }
                />
              ))}
        </div>
      </LoadingOverlay>
    </Panel>
  );
};

export default TransactionHistory;
