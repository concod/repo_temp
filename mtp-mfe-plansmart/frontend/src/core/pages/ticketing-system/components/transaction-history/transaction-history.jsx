import LoadingOverlay from "core/Utils/Loader/loader";
import { Preview } from "core/Utils/preview/preview";
import { getTicketCommentInfo } from "core/actions/ticketActions";
import AttachmentBlueIcon from "assets/attachmentsBlueIcon.svg";
import AttachmentGreyIcon from "assets/attachmentsGreyIcon.svg";
import CrossIcon from "assets/crossIcon.svg";
import { openStatus } from "core/pages/ticketing-system/constants";
import {
  formatDate,
  getFirstNameAndLastNameInitials,
  getFullFirstNameAndLastNameInitials,
  getTimeDifferenceInDays,
} from "core/pages/ticketing-system/utils";
import { useEffect, useState } from "react";
import CommentCard from "./components/comment-card/comment-card";
import CommentCardInfo from "./components/comment-card-info/comment-card-info";
import { useStyles as sharedStyles } from "core/pages/ticketing-system/styles-ticketing";

/**
 * TransactionHistory is the component which
 * will show all details of the single
 * ticket with comments made on them
 * @param {object} props
 * @returns
 */
const TransactionHistory = (props) => {
  const { ticketId, updatedOn, setShowTransactionHistory } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [commentData, setCommentData] = useState([]);
  const [ticketData, setTicketData] = useState([]);
  const [noOfAttachments, setNoOfAttachments] = useState(0);
  const [imagesObject, setImagesObject] = useState({});
  const sharedClasses = sharedStyles();

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

  useEffect(() => {
    getCommentDetails();
  }, [ticketId]);

  return (
    <div className={sharedClasses.transactionHistory}>
      <LoadingOverlay loader={isLoading} spinner>
        <div className={sharedClasses.transactionHistoryHeader}>
          <p className={sharedClasses.transactionHistoryHeaderLabel}>
            Transaction History
          </p>
          <div
            className={sharedClasses.transactionHistoryHeaderClose}
            onClick={() => setShowTransactionHistory(false)}
          >
            <CrossIcon viewBox="0 0 12 12" />
          </div>
        </div>
        <div className={sharedClasses.transactionHistoryBody}>
          <div className={sharedClasses.transactionHistoryTitle}>
            <div className={sharedClasses.transactionHistoryTitleCircleId}>
              <div
                className={`${sharedClasses.transactionHistoryTitleCircle} ${
                  openStatus.includes(ticketData.status) ? "open" : "close"
                }`}
              />
              <p className={sharedClasses.transactionHistoryTitleId}>
                #{ticketId}
              </p>
            </div>
            <div className={sharedClasses.transactionHistoryTitleInfo}>
              {ticketData?.title}
            </div>
          </div>
          <div className={sharedClasses.transactionHistoryCard}>
            <div className={sharedClasses.transactionHistoryCardHeader}>
              <p className={sharedClasses.transactionHistoryCardHeaderTitle}>
                {ticketData?.module}
              </p>
              <div
                className={
                  sharedClasses.transactionHistoryCardHeaderKeyBadgeBlock
                }
              >
                <CommentCardInfo
                  keyInfo="Status :"
                  value={
                    <div
                      className={`${
                        sharedClasses.transactionHistoryCardHeaderBadge
                      } ${ticketData?.status?.replace(" ", "")}`}
                    >
                      {ticketData?.status}
                    </div>
                  }
                />
                <CommentCardInfo
                  keyInfo="Priority :"
                  value={
                    <div
                      className={`${sharedClasses.transactionHistoryCardHeaderBadge} ${ticketData?.priority}`}
                    >
                      {ticketData?.priority}
                    </div>
                  }
                />
              </div>
            </div>
            <div className={sharedClasses.transactionHistoryCardBody}>
              <CommentCardInfo keyInfo="Module :" value={ticketData?.module} />
              <CommentCardInfo keyInfo="Banner :" value={ticketData?.banner} />
              <CommentCardInfo
                keyInfo="First assigned :"
                value={formatDate(ticketData?.first_assigned_on)}
              />
              <CommentCardInfo
                keyInfo="Last updated on :"
                value={formatDate(ticketData?.last_updated)}
              />
            </div>
          </div>
          <div className={sharedClasses.transactionHistorySummary}>
            <div
              className={sharedClasses.transactionHistorySummaryIconNameCount}
            >
              <p className={sharedClasses.transactionHistorySummaryName}>
                Conversations
              </p>{" "}
              <div className={sharedClasses.transactionHistorySummaryCount}>
                {ticketData?.total_comments}
              </div>
            </div>
            <div
              className={`${sharedClasses.transactionHistorySummaryIconNameCount} ${sharedClasses.noGap}`}
            >
              {" "}
              <p
                className={`${sharedClasses.transactionHistorySummaryIcon} mr-6`}
              >
                <AttachmentBlueIcon viewBox="0 0 8 16" />
              </p>{" "}
              <p
                className={`${sharedClasses.transactionHistorySummaryName} mr-8`}
              >
                Attachments
              </p>{" "}
              <div className={sharedClasses.transactionHistorySummaryCount}>
                {noOfAttachments}
              </div>
            </div>
          </div>
          <div className={sharedClasses.transactionHistoryCommentCards}>
            {commentData?.map((comment, index) => (
              <CommentCard
                nameInitials={getFirstNameAndLastNameInitials(comment?.user)}
                name={getFullFirstNameAndLastNameInitials(comment?.user)}
                time={getTimeDifferenceInDays(comment?.time)}
                subject=""
                description={comment?.comment}
                icon={<AttachmentGreyIcon viewBox="0 0 8 16" />}
                images={
                  comment?.attachments.length > 0 ? imagesObject[index] : ""
                }
              />
            ))}
          </div>
        </div>
      </LoadingOverlay>
    </div>
  );
};

export default TransactionHistory;
