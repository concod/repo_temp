import { useEffect, useRef, useState } from "react";
import { Button, Avatar, useTranslation } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import SendIcon from "@mui/icons-material/Send";
// import AttachFileIcon from "@mui/icons-material/AttachFile";
// import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import { pxToRem } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { connect, useDispatch, useSelector } from "react-redux";
import { getApplicationMaster } from "core/actions/tenantConfigActions";
import { setApplicationCodesList } from "core/actions/filterAction";
import { isEmpty } from "lodash";
import ChatSystemUserList from "../ChatSystemUserList/ChatSystemUserList";
import { doesFirstLetterStartsWithASymbol } from "../utils";
import moment from "moment";
import { displaySnackMessages, getBaseUrl } from "core/Utils/utils";
import { isTextInputValid } from "core/Utils/form/form-helpers";
import { getTextFromHTML } from "../utils";
import { addUsersMentioned } from "../utils";
import "./Chat.scss";

const useStyles = makeStyles(() => ({
  input: {
    width: "93%",
  },
  iconRotate: {
    transform: "rotate(45deg)",
    marginRight: "0.25rem",
  },
  icon: {
    height: "1rem",
    width: "1rem",
    cursor: "pointer",
    color: "#758498",
  },
  highlight: {
    display: "inline",
    color: colours.darkBlue,
    cursor: "pointer",
    fontSize: "1em",
    fontWeight: 500,
    lineHeight: "1.25rem",
    wordBreak: "break-word",
  },
  textInputField: {
    whiteSpace: "initial",
    overflowX: "hidden",
    height: "2rem",
    width: "100%",
    border: `1px solid ${colours.chips}`,
    "&:hover": {
      borderColor: colours.darkBlue,
    },
    "&:focus": {
      borderColor: colours.darkBlue,
    },
    borderRadius: ".5rem",
    fontSize: pxToRem(14),
    padding: "5px 48px 5px 16px",
    lineHeight: "1.25rem",
    "&:empty::before": {
      content: "attr(data-placeholder)",
      color: colours.gray,
    },
  },
}));

const Chat = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const {
    activeEventId,
    isResolved,
    replyMessage,
    setReplayMessage,
    handleCommentChanges,
    editMessage,
    setEditMessage,
  } = props;
  const { t } = useTranslation();
  const disableInputRef = useRef(false)
  // const inputFileRef = useRef(null);
  // const planDetails = useRef({});
  const inputRef = useRef(null);
  const dispatch = useDispatch();

  // const [currentFiles, setCurrentFiles] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [usersMentioned, setUserMentioned] = useState([]);

  const tableName = useSelector(
    (state) => state.commonChatReducer.eventsData?.tableName
  );
  const selectedRowsIDs = useSelector(
    (state) => state.commonChatReducer.eventsData?.selectedRowsIDs
  );
  const uniqueRowId = useSelector(
    (state) => state.commonChatReducer.eventsData?.uniqueRowId
  );
  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );
  const activeTableInfo = useSelector(
    (state) => state.cellCommentReducer?.activeTableInfo
  );

  const userName = localStorage.getItem("user");
  const userEmail = localStorage.getItem("name");

  useEffect(() => {
    setInputValue(editMessage.comment || "");
    setUserMentioned(editMessage.users_mentioned || []);
    inputRef.current.innerHTML = editMessage.comment || "";
  }, [editMessage]);

  // const handleFileUpload = (event) => {
  //   if (event.target.files?.length) {
  //     setCurrentFiles(event.target.files);
  //   }
  // };

  const handleInputChange = (event) => {
    const sanitizedData = getTextFromHTML(event.currentTarget.innerHTML);
    setInputValue(sanitizedData.replace(/\s+/g, " ").trim());
    if (doesFirstLetterStartsWithASymbol(event, "@", setCurrentWordIndex)) {
      setHasSuggestions(true);
    } else {
      setHasSuggestions(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!inputValue) {
      displaySnackMessages(t("chatSystem.pleaseWriteMessageFirst"), "error", dispatch, {
        horizontal: "right",
        vertical: "top",
      });
      return;
    }


    const finalUserMentioned = usersMentioned.filter((user) =>
      inputValue.includes(user.user_name)
    );

    if (!isEmpty(editMessage)) {
      handleCommentChanges("edit", {
        commentId: editMessage.comment_id,
        comment: inputValue,
        usersMentioned: finalUserMentioned,
      });
      setEditMessage({});
    } else {
      const chatMessage = {
        component_type: tableName,
        comment: inputValue,
        application_code: appDetails.applicationCode,
        screen_code: appDetails.screenCode,
        event_name: null,
        event_id: activeEventId,
        parent_comment_id: !isEmpty(replyMessage)
          ? replyMessage.comment_id
          : null,
        created_by: {
          user_name: userName,
          email: userEmail,
        },
        users_mentioned: finalUserMentioned,
        components: selectedRowsIDs.map((item) => ({
          component_id: String(item[uniqueRowId]),
          sub_component_id: "",
          unique_column: uniqueRowId,
        })),
        request_metadata: {
          request_url: `${getBaseUrl(true)}/${activeTableInfo?.requestUrl}`,
          request_method: "POST",
          request_headers: {},
          request_body: {
            filters: activeTableInfo?.filters,
            meta: {
              search: [],
              range: [],
              sort: [],
              limit: {
                limit: 10,
                page: 1,
              },
            },
            headers: [],
            selection: {
              data: [],
              unique_columns: [uniqueRowId],
            },
          },
        },
        redirect_url: getBaseUrl(false, true),
        unique_column: uniqueRowId,
        replyMessage,
      };
      handleCommentChanges("add", chatMessage);
    }
    setInputValue("");
    inputRef.current.innerHTML = "";
    setReplayMessage({});
    setUserMentioned([]);
  };

  return (
    <form
      autoComplete="off"
      className={`chat-form ${!isEmpty(replyMessage) ? "reply-msg" : ""}`}
    >
      {!isEmpty(replyMessage) && (
        <div className="reply-message">
          <div className="user-details">
            <Avatar
              label={replyMessage.created_by.user_name?.charAt(0) || "U"}
              size="small"
            />
            <div className="user-name">{replyMessage.created_by.user_name}</div>
            <div className="time">
              {moment(replyMessage.updated_at).format("LT")}
            </div>
          </div>
          <div
            className="message"
            dangerouslySetInnerHTML={{
              __html: addUsersMentioned(
                replyMessage.comment,
                replyMessage.users_mentioned,
                classes.highlight
              ),
            }}
          />
        </div>
      )}
      <div
        className={`input ${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
      >
        {/* <input
          ref={inputFileRef}
          id="chat-file-upload"
          multiple
          type="file"
          onChange={handleFileUpload}
        /> */}
        <div
          ref={inputRef}
          id="chat-message-conversation"
          role="textbox"
          contentEditable={isResolved ? "false" : "true"}
          aria-expanded="true"
          onInput={(e) => {
            if(disableInputRef.current) return
            handleInputChange(e)
          }}
          onKeyDown={(e)=> {
            if(e.key === "Enter" && !e.shiftKey){
              disableInputRef.current = true
              handleSubmit(e)
            } else {
              disableInputRef.current = false
            }
          }}
          className={classes.textInputField}
          data-placeholder={t("chat.typeSomething")}
        ></div>
        {/* <div className="input-icon-container">
          <AttachFileIcon
            className={`${classes.iconRotate} ${classes.icon}`}
            onClick={() => inputFileRef.current?.click()}
          />
          <CameraAltOutlinedIcon className={classes.icon} />
        </div> */}
        <Button variant="primary" disabled={isResolved} onClick={handleSubmit}>
          <SendIcon fontSize="small" />
        </Button>
        {hasSuggestions && (
          <ChatSystemUserList
            hasSuggestions={hasSuggestions}
            setHasSuggestions={setHasSuggestions}
            setInputValue={setInputValue}
            classes={classes}
            usersMentioned={usersMentioned}
            setUserMentioned={setUserMentioned}
            comment={inputValue}
            currentWordIndex={currentWordIndex}
          />
        )}
      </div>
    </form>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getApplicationMaster: (payload) => dispatch(getApplicationMaster(payload)),
    setApplicationCodesList: (payload) =>
      dispatch(setApplicationCodesList(payload)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(Chat);
