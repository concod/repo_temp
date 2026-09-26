import { Popper } from "@mui/material";
import { makeStyles } from "@mui/styles";
import {
  getFormattedApplicationName,
  pxToRem,
} from "core/Utils/functions/utils";
import SendIcon from "assets/send.png";
import SendIconDisabled from "assets/sendDisabled.png";
import globalStyles from "core/Styles/globalStyles";
import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  createComment,
  setActiveApplicationInfo,
  setIsAddCommentPopupOpen,
} from "./cell-comment-services";
import { isNull } from "lodash";
import { displaySnackMessages, getBaseUrl } from "core/Utils/utils";
import ChatSystemUserList from "core/commonComponents/ChatSystem/ChatSystemUserList/ChatSystemUserList";
import { handleCommentInputChange } from "./utils";
import { ClickAwayListener } from "@mui/base/ClickAwayListener";

const useStyles = makeStyles((theme) => ({
  popoverBody: {
    width: pxToRem(286),
    minHeight: pxToRem(32),
    border: `1px solid ${theme.palette.colours.commentPopoverBorder}`,
    background: theme.palette.common.white,
    borderRadius: pxToRem(8),
    boxShadow: "none",
    padding: `${pxToRem(3)} ${pxToRem(12)}`,
    overflow: "hidden",
    zIndex: 1302,
  },
  popoverInput: {
    width: pxToRem(228),
    minHeight: pxToRem(20),
    border: "none",
    "& .MuiOutlinedInput-input": {
      height: "unset",
      padding: 0,
    },
    "& .MuiOutlinedInput-notchedOutline": {
      border: "none",
    },
    zIndex: 1310,
  },
  sendIcon: {
    maxWidth: pxToRem(34),
    height: pxToRem(32),
    padding: pxToRem(8),
    borderRadius: pxToRem(8),
    "& img": {
      width: pxToRem(18),
      height: pxToRem(18),
    },
  },
  highlight: {
    display: "inline",
    color: theme.palette.colours.brightRoyalBlue,
    cursor: "pointer",
    fontSize: "1em",
    fontWeight: 500,
    lineHeight: "1.25rem",
    wordBreak: "break-word",
  },
  closeIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    cursor: "pointer",
  },
  dropdownLabel: {
    fontWeight: 400,
    fontSize: pxToRem(14),
    lineHeight: pxToRem(20),
    color: theme.palette.textColours.slateGrayLight,
  },
}));
const CellComment = ({ props }) => {
  const { ref } = props?.showComment;
  const { uniqueRowId } = props;
  const {
    isAddCommentPopupOpen,
    activeTableInfo,
    activeApplicationInfo,
    refreshTableState,
    tableCommentsData,
  } = useSelector((state) => state.cellCommentReducer);
  const classes = useStyles();
  const globalClasses = globalStyles();
  const inputFieldRef = useRef();
  const [commentInputValue, setCommentInputValue] = useState(null);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [usersMentioned, setUserMentioned] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const dispatch = useDispatch();
  const appDetails = useSelector((state) => state.commonChatReducer?.appDetails);
  // Function to add comment thread
  const handleAddComment = async () => {
    if (isNull(commentInputValue)) {
      displaySnackMessages("Please add a comment", "error", dispatch);
      return;
    }
    const data = tableCommentsData?.[activeTableInfo?.tableId];
    let eventId = null;
    if (data?.hasOwnProperty([activeTableInfo?.rowId])) {
      Object.entries(data?.[activeTableInfo?.rowId]?.sub_components).forEach(
        ([colName, columnData]) => {
          if (columnData?.hasOwnProperty([activeTableInfo?.columnName])) {
            eventId = columnData?.[activeTableInfo?.columnName]?.event_id;
          }
        }
      );
    }
    try {
      setDisabled(true)
      let payload = {
        component_type: activeTableInfo?.tableId,
        comment: commentInputValue,
        application_code: activeApplicationInfo.applicationCode,
        screen_code: activeApplicationInfo.screenCode,
        event_id: eventId,
        event_name: null,
        parent_comment_id: null,
        users_mentioned: usersMentioned,
        created_by: {
          email: localStorage.getItem("name"),
          user_name: localStorage.getItem("user"),
        },
        components: [
          {
            component_id: String(activeTableInfo.rowId),
            sub_component_id: activeTableInfo.columnName,
            unique_column: uniqueRowId,
          },
        ],
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
        redirect_url: getBaseUrl(false,true),
        unique_column: uniqueRowId,
      };
      const response = await createComment(payload);
      if (response?.data?.status) {
        setCommentInputValue(null);
        dispatch(setIsAddCommentPopupOpen(false));
        displaySnackMessages(response?.data?.message, "success", dispatch);
      }
    } catch (err) {
      displaySnackMessages("Something went wrong!", "error", dispatch);
      console.error("handleAddComment: Error adding comment -> ", err);
    } finally{
      setDisabled(false)
    }
  };
  useEffect(() => {
    (async () => {
      let currentApp = sessionStorage.getItem("currentApp");
      let currentScreenName = localStorage.getItem("currentScreenName");
      let applicationCodeList = JSON.parse(
        localStorage.getItem("applicationCodesList")
      );
      let applicationName = getFormattedApplicationName(
        window.location.pathname.split("/")?.[1]
      );
      const matchedApp = applicationCodeList.find(
        (app) => app.name.toLowerCase() === applicationName.toLowerCase()
      );
      let currentScreenCode = appDetails?.screenCode;
      let applicationInfo = {
        applicationCode: matchedApp.application_code,
        name: matchedApp.name,
        currentApp: currentApp,
        screenCode: currentScreenCode,
        screenName: currentScreenName,
      };

      dispatch(setActiveApplicationInfo(applicationInfo));
    })();
  }, [window.location.pathname]);

  return (
    <ClickAwayListener onClickAway={(e)=>{
      if (
        document?.activeElement?.id !== "cellComment" &&
        isAddCommentPopupOpen
      ) {
        dispatch(setIsAddCommentPopupOpen(false));
      }
    }}>
    <div style={{ position: "relative" }}>
      {hasSuggestions && (
        <ChatSystemUserList
          hasSuggestions={hasSuggestions}
          setHasSuggestions={setHasSuggestions}
          setInputValue={setCommentInputValue}
          usersMentioned={usersMentioned}
          classes={classes}
          setUserMentioned={setUserMentioned}
          comment={commentInputValue}
          currentWordIndex={currentWordIndex}
          customClass="cell-comment-suggestions"
          id={"cell-comment-input"}
        />
      )}
      <Popper
        anchorEl={ref}
        open={isAddCommentPopupOpen}
        placement="right-start"
        className={`${classes.popoverBody} popoverBody ${globalClasses.flexAlignBetweenCenter}`}
        id="popoverBody"
        disablePortal
        modifiers={[
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport",
            },
          },
        ]}
      >
        <div
          data-placeholder={"Add Comment"}
          onInput={(e) => {
            handleCommentInputChange(
              e,
              setCommentInputValue,
              setCurrentWordIndex,
              setHasSuggestions
            );
          }}
          id="cell-comment-input"
          role="textbox"
          contentEditable={true}
          aria-expanded="true"
          className={`${classes.popoverInput} comment-popover-input`}
        ></div>
          {disabled ? (
            <div
              className={`${classes.sendIcon} ${globalClasses.cursorDefault}`}
            >
              <img src={SendIconDisabled} />
            </div>
          ) : (
            <div
              className={`${classes.sendIcon} ${globalClasses.cursorPointer}`}
              onClick={handleAddComment}
            >
          <img src={SendIcon} />
        </div>
          )}
      </Popper>
    </div>
    </ClickAwayListener>
  );
};

export default CellComment;
