import React, { useEffect, useState } from "react";
import { Panel } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep } from "lodash";
import { useDispatch } from "react-redux";
import { getCommentHistory } from "modules/oms/services-oms/Order-Repository/order-repository-service";

const customStyles = makeStyles({
  avatarIcon: {
    width: "40px",
    height: "40px",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    borderRadius: "8px",
    fontSize: "18px",
    marginRight: "15px",
  },
  commentItem: {
    display: "flex",
    alignItems: "flex-start",
    marginBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "20px",
  },

  commentItemTitle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },

  commentStatus: {
    fontSize: "12px",
    padding: "2px 10px",
    borderRadius: "10px",
  },
});

const statusColors = {
  "Sent for approval": {
    backgroundColor: "#d2f8d2",
    color: "#1a7f37",
  },

  "Sent to review": {
    backgroundColor: "#e4e7fb",
    color: "#4c6ef5",
  },
};

const avatarColors = ["#B983FF", "#6ACFC7", "#F4C542"];

function CommentHistoryPanel(props) {
  const customClasses = customStyles();
  const dispatch = useDispatch();

  const [comments, setComments] = useState([]);

  const getAvatarIconBg = (index) => {
    const colorId = index % avatarColors?.length;
    return avatarColors[colorId];
  };

  const getStatusChipStyles = (status) => {
    return statusColors[status];
  };

  useEffect(() => {
    const fetchCommentHistory = async () => {
      const VIEW_API_KEYS = props?.VIEW_API_KEYS || [];
      const orderRow = cloneDeep(props?.rowData);
      const body = {};
      VIEW_API_KEYS.forEach((key) => {
        body[key] = orderRow.hasOwnProperty(key) ? orderRow[key] : undefined;
      });

      const comments_data = await dispatch(getCommentHistory(body));
      let formattedComments = cloneDeep(comments_data?.data?.data);
      formattedComments?.forEach((comment, index) => {
        comment["statusColor"] = comment.status
          ? statusColors[comment.status]
          : statusColors[0];
      });

      setComments(formattedComments);
    };

    fetchCommentHistory();
  }, []);

  return (
    <div>
      <Panel
        anchor="right"
        open={true}
        size="large"
        title="History"
        onClose={() => props?.onClose()}
      >
        <ul style={{ listStyle: "none", padding: 0 }}>
          {comments.map((comment, index) => (
            <li key={index} className={customClasses.commentItem}>
              <div
                className={customClasses.avatarIcon}
                style={{ backgroundColor: getAvatarIconBg(index) }}
              >
                {comment.name.charAt(0)}
              </div>

              <div style={{ flex: 1 }}>
                <div className={customClasses.commentItemTitle}>
                  <strong>{comment.name}</strong>
                  <span
                    className={customClasses.commentStatus}
                    style={getStatusChipStyles(comment.status)}
                  >
                    {comment.status}
                  </span>
                </div>

                <div style={{ fontSize: "12px", color: "#888" }}>
                  {comment.updated_at}
                </div>
                <p style={{ marginTop: "8px", fontSize: "12px" }}>
                  {comment.comment}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export default CommentHistoryPanel;
