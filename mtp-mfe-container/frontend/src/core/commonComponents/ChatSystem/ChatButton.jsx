import { Button, Tooltip, useTranslation } from "impact-ui-v3";
import MessageIcon from "coreAssets/Chat.svg";
import { useDispatch, useSelector } from "react-redux";
import {
  createEventandChatConversation,
  setChatConversationOpenOrNot,
  setChatEventsData,
  setChatLoading,
} from "./services-chatsystem/custom-services-chat-system";
import { displaySnackMessages } from "core/Utils/utils";
import { isEmpty } from "lodash";
import { arrageChatConversationData } from "./utils";
import { setTableName } from "./services-chatsystem/custom-services-chat-system";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  iconWrapper: {
    width: 16,
    height: 16,
    flexShrink: 0,
    "& svg": {
      width: "100%",
      height: "100%",
      display: "block",
    },
  },
}));

const ChatButton = ({
  selectedRowsIDs: rowNode = [],
  tableName = "",
  uniqueRowId = "",
}) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const selectedRowsIDs = rowNode.map((item) => item.data);
  const isSelectedRowsAvailable = selectedRowsIDs && selectedRowsIDs?.length;

  const dispatch = useDispatch();
  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );

  const userName = localStorage.getItem("user");
  const userEmail = localStorage.getItem("name");

  const show = async () => {
    dispatch(setChatConversationOpenOrNot(true));
    dispatch(setChatLoading(true));
    dispatch(setTableName(tableName));
    const data = {
      component_type: tableName,
      comment: "",
      application_code: appDetails.applicationCode,
      screen_code: appDetails.screenCode,
      event_name: null,
      event_id: null,
      parent_comment_id: null,
      users_mentioned: null,
      created_by: {
        user_name: userName,
        email: userEmail,
      },
      components: selectedRowsIDs.map((item) => ({
        component_id: String(item[uniqueRowId]),
        sub_component_id: "",
      })),
    };
    const currentUserName = localStorage.getItem("user");

    try {
      const response = await createEventandChatConversation(data);
      let eventData = {};
      if (response.status) {
        const {
          chatList,
          starredList,
          resolvedList,
        } = arrageChatConversationData([response.data]);

        eventData = {
          tableName,
          uniqueRowId,
          selectedRowsIDs,
          currentUser: {
            user_name: currentUserName,
            user_Code: "",
            email: "",
          },
          chatList,
          starredList,
          resolvedList,
        };
      }
      dispatch(setChatLoading(false));
      displaySnackMessages(response.message, "success", dispatch);
      dispatch(setChatEventsData(eventData));
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error", dispatch);
      dispatch(setChatEventsData({}));
      dispatch(setChatConversationOpenOrNot(false));
      dispatch(setChatLoading(false));
    }
  };

  return (
    <Tooltip
      title={t("chat.chat")}
      orientation="top"
      variant="tertiary"
      style={{ display: !isSelectedRowsAvailable ? "none" : undefined }}
    >
      <Button
        onClick={() => show()}
        icon={
          <MessageIcon
            className={`${globalStyles.centerAlign} ${classes.iconWrapper}`}
          />
        }
        iconPlacement="center"
        className={globalStyles}
        style={{ display: !isSelectedRowsAvailable ? "none" : "flex" }}
        size="large"
        type="default"
        variant="tertiary"
        id="chat-system-btn"
      />
    </Tooltip>
  );
};

export default ChatButton;
