import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import CheckIcon from "@mui/icons-material/Check";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import ThreadCommentBody from "./ThreadCommentBody";
import { useDispatch } from "react-redux";
import {
  createComment,
  updateComment,
  resetThreadPopupInfo,
} from "../cell-comment-services";
import {
  getRandomProfileColor,
  handleMenuOpen,
  handleMenuClose,
  handleCommentInputChange,
  scrollIntoView,
} from "../utils";
import { Button } from "impact-ui-v3";
import { isEmpty, isNull, isUndefined } from "lodash";
import { useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { fetchCommentsForActiveCell } from "./cellCommentThreadActions";
import { Loader as ImpactLoader } from "impact-ui-v3";
import { displaySnackMessages } from "core/Utils/utils";
import ChatSystemUserList from "core/commonComponents/ChatSystem/ChatSystemUserList/ChatSystemUserList";
import { addUsersMentioned } from "core/commonComponents/ChatSystem/utils";

const useStyles = makeStyles((theme) => ({
  cellThreadBody: {
    width: pxToRem(397),
    maxHeight: pxToRem(451),
    borderRadius: `0 ${pxToRem(16)} ${pxToRem(16)} ${pxToRem(16)}`,
    boxShadow: `0px 0px 4px 0px #0000001F`,
    marginLeft: pxToRem(4),
    background: theme.palette.common.white,
    border: `1px solid  ${theme.palette.background.separaterColor}`,
    position: "fixed",
  },
  cellThreadHeader: {
    padding: pxToRem(8),
    height: pxToRem(48),
    borderBottom: `1px solid  ${theme.palette.background.separaterColor}`,
  },
  cellThreadHeaderTitle: {
    fontWeight: 800,
    fontSize: pxToRem(14),
    lineHeight: pxToRem(21),
    color: theme.palette.text.black,
    fontFamily: "Manrope",
  },
  headerActionWrapper: {
    gap: pxToRem(8),
    "& .MuiSvgIcon-root:nth-child(1)": {
      fill: theme.palette.colours.neutralGrey,
      width: pxToRem(32),
      aspectRatio: "1/1",
      cursor: "pointer",
    },
    "& .MuiSvgIcon-root:nth-child(2)": {
      fill: theme.palette.colours.brightRoyalBlue,
      borderRadius: "50%",
      border: `1px solid ${theme.palette.colours.brightRoyalBlue}`,
      width: pxToRem(18),
      aspectRatio: "1/1",
      padding: pxToRem(2),
      cursor: "pointer",
      cursor: "pointer",
    },
    "& .MuiSvgIcon-root:nth-child(3)": {
      fill: theme.palette.colours.brightRoyalBlue,
      width: pxToRem(18),
      aspectRatio: "1/1",
      cursor: "pointer",
    },
  },
  menuBody: {
    width: pxToRem(150),
    borderRadius: pxToRem(12),
    border: `1px solid  ${theme.palette.colours.menuBorder}`,
    boxShadow: "0px 1px 6px 0px #1A277C24",
    cursor: "pointer",
    padding: `${pxToRem(8)} ${pxToRem(6)}`,
    "& .MuiList-root": {
      padding: 0,
    },
  },
  menuItem: {
    width: pxToRem(138),
    height: pxToRem(36),
    padding: `${pxToRem(8)} ${pxToRem(12)}`,
  },
  conversationWrapper: {
    maxHeight: pxToRem(356),
    minHeight: pxToRem(70),
    padding: pxToRem(8),
    gap: pxToRem(16),
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  profileIcon: {
    width: pxToRem(36),
    aspectRatio: "1/1",
    borderRadius: pxToRem(12),
    border: `1px solid ${theme.palette.common.white}`,
    color: theme.palette.common.white,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(30),
    fontFamily: "Manrope",
    fontWeight: 800,
  },
  replyTextInput: {
    width: pxToRem(291),
    height: pxToRem(32),
    flexGrow: 1,
    border: `1px solid ${theme.palette.colours.commentPopoverBorder} `,
    borderRadius: pxToRem(8),
    padding: `${pxToRem(5.5)} ${pxToRem(12)}`,
    "& .MuiFormControl-root": {
      display: "unset",
    },
  },
  replyWrapper: {
    justifyContent: "space-between",
    gap: pxToRem(10),
    padding: `${pxToRem(8)}`,
    height: pxToRem(44),
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
}));

const CellCommentThread = ({ props }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState(null);
  const [isEditComment, setIsEditComment] = useState({
    isActive: false,
    activeCommentID: null,
    comment: null,
    usersMentioned: [],
  });
  const {
    activeTableInfo,
    activeApplicationInfo,
    tableCommentsData,
    threadPopupInfo,
  } = useSelector((state) => ({
    activeTableInfo: state?.cellCommentReducer?.activeTableInfo ?? {},
    activeApplicationInfo: state?.cellCommentReducer?.activeApplicationInfo ?? {},
    tableCommentsData: state?.cellCommentReducer?.tableCommentsData ?? {},
    threadPopupInfo: state?.cellCommentReducer?.threadPopupInfo ?? { open: false, eventId: null, isPanelRedirect: false }
  }));
  const [commentList, setCommentList] = useState([]);
  const [actionsMenu, setActionsMenu] = useState({
    isMenuOpen: false,
    anchorEl: null,
  });
  const [eventId, setEventId] = useState(null);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [usersMentioned, setUserMentioned] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const threadbodyRef = useRef();
  const textFieldRef = useRef();
  const commentListEndRef = useRef();

  const updateCellCommentsData = async () => {
    if (
      tableCommentsData &&
      threadPopupInfo &&
      activeTableInfo &&
      activeTableInfo?.tableId
    ) {
      let cellEventID = null;
      if (
        isNull(threadPopupInfo.eventId) ||
        isUndefined(threadPopupInfo.eventId)
      ) {
        cellEventID = props?.eventId;
      } else {
        cellEventID = threadPopupInfo?.eventId;
      }
      setEventId(cellEventID);
      if (
        threadPopupInfo?.open ===
        `${activeTableInfo?.columnName}_${activeTableInfo?.rowId}`
      ) {
        const request = await fetchCommentsForActiveCell(cellEventID, dispatch);
        if (request.status) {
          if (request?.data?.length > 0) {
            setCommentList(request?.data);
          } else {
            dispatch(resetThreadPopupInfo());
          }
        } else {
          dispatch(resetThreadPopupInfo());
        }
      }
    }
  };

  useEffect(() => {
    updateCellCommentsData();
  }, [
    threadPopupInfo,
    activeTableInfo,
    tableCommentsData?.[activeTableInfo?.tableId],
  ]);

  const handleConversationClose = () => {
    dispatch(resetThreadPopupInfo());
    props?.props?.cellData?.api?.setPinnedTopRowData([]);
  };

  const handleAddReply = async () => {
    if (isNull(inputValue) || isEmpty(inputValue)) {
      displaySnackMessages("Please add a comment", "error", dispatch);
      return;
    }
    setDisabled(true);
    let payload = {
      component_type: activeTableInfo?.tableId,
      comment: inputValue,
      application_code: activeApplicationInfo.applicationCode,
      screen_code: activeApplicationInfo.screenCode,
      event_id: eventId || null,
      event_name: null,
      parent_comment_id: null, // ParentID to be popupated based on reponse
      users_mentioned: usersMentioned,
      created_by: {
        email: localStorage.getItem("name"),
        user_name: localStorage.getItem("user"),
      },
      components: [
        {
          component_id: String(activeTableInfo.rowId),
          sub_component_id: activeTableInfo.columnName,
        },
      ],
    };
    let response;
    // Flow to Edit a comment
    if (isEditComment?.isActive) {
      const request = await updateComment(
        payload,
        isEditComment?.activeCommentID
      );
      response = await request;
    }
    //Flow to add a reply
    else {
      const request = await createComment(payload);
      response = await request;
    }
    if (response?.data?.status) {
      setCommentList([]);
      setInputValue("");
      textFieldRef.current.innerHTML = "";
      setUserMentioned([]);
      setIsEditComment({
        isActive: false,
        activeCommentID: null,
      });
      displaySnackMessages(response?.data?.message, "success", dispatch);
    }
    setDisabled(false);
  };

  useEffect(() => {
    if (threadbodyRef.current) {
      const threadBody = threadbodyRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const end = threadBody.height + threadBody.top;
      if (end > windowHeight) {
        threadbodyRef.current.style.marginTop = `-${end - windowHeight}px`;
      }
    }
    if (commentListEndRef.current) {
      scrollIntoView(commentListEndRef);
    }
  }, [commentList]);

  useEffect(() => {
    if (isEditComment?.isActive) {
      const content = addUsersMentioned(
        isEditComment?.comment,
        isEditComment?.usersMentioned,
        classes.highlight
      );
      textFieldRef.current.innerHTML = content;
      setUserMentioned(isEditComment?.usersMentioned);
    }
  }, [isEditComment]);
  return (
    <>
      <div className={classes.cellThreadBody} ref={threadbodyRef}>
        <div
          className={`${classes.cellThreadHeader} ${globalClasses.flexAlignBetweenCenter}`}
        >
          <Typography variant="text" className={classes.cellThreadHeaderTitle}>
            Comments
          </Typography>
          <div
            className={`${globalClasses.flexAlignBetweenCenter} ${classes.headerActionWrapper}`}
          >
            {/* Disabling the menu containing copy link option  */}
            {/* <MoreHorizIcon
              onClick={(event) => handleMenuOpen(event, setActionsMenu)}
            />
            <Menu
              anchorEl={actionsMenu?.anchorEl}
              open={actionsMenu?.isMenuOpen}
              onClose={() => handleMenuClose(setActionsMenu)}
              classes={{ paper: classes.menuBody }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
            >
              <MenuItem
                classes={{ root: classes.menuItem }}
                onClick={() => handleMenuClose(setActionsMenu)}
              >
                Copy link
              </MenuItem>
            </Menu> */}
            <Button
              size="large"
              variant="url"
              icon={<span class="material-symbols-outlined">close</span>}
              onClick={handleConversationClose}
            />
          </div>
        </div>
        <div className={`${classes.conversationWrapper}`}>
          {commentList?.length > 0 ? (
            <>
              {commentList?.map((comment) => (
                <ThreadCommentBody
                  props={{
                    comment,
                    setIsEditComment,
                    updateCellCommentsData,
                    eventId,
                  }}
                />
              ))}
              <span ref={commentListEndRef}></span>
            </>
          ) : (
            <ImpactLoader size="small" />
          )}
        </div>
        {commentList?.length > 0 && (
          <div
            className={`${globalClasses.layoutAlignStart} ${globalClasses.verticalAlignCenter} ${classes.replyWrapper}`}
          >
            <Typography
              variant="text"
              className={`${globalClasses.centerAlign}  ${classes.profileIcon}`}
              sx={{
                backgroundColor: getRandomProfileColor(
                  localStorage.getItem("user")
                ),
              }}
            >
              {commentList?.[0]?.created_by?.user_name?.slice(0, 1)}
            </Typography>
            {hasSuggestions && (
              <ChatSystemUserList
                hasSuggestions={hasSuggestions}
                setHasSuggestions={setHasSuggestions}
                setInputValue={setInputValue}
                usersMentioned={usersMentioned}
                classes={classes}
                setUserMentioned={setUserMentioned}
                comment={inputValue}
                currentWordIndex={currentWordIndex}
                customClass="cell-comment-suggestions"
                id={"cell-comment-input"}
              />
            )}
            <div className={classes.replyTextInput} id="popoverBody">
              <div
                ref={textFieldRef}
                data-placeholder={"Add Comment"}
                id="cell-comment-input"
                className={"comment-popover-input-thread"}
                role="textbox"
                contentEditable={true}
                aria-expanded="true"
                onInput={(e) => {
                  handleCommentInputChange(
                    e,
                    setInputValue,
                    setCurrentWordIndex,
                    setHasSuggestions
                  );
                }}
              ></div>
            </div>
            <Button
              icon={<SendIcon />}
              disabled={disabled}
              onClick={handleAddReply}
              variant="primary"
              size="large"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default CellCommentThread;
