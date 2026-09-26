import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import clsx from "clsx";
import makeStyles from "@mui/styles/makeStyles";
import Drawer from "@mui/material/Drawer";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import { getApplicationMaster } from "core/actions/tenantConfigActions";
import { Typography, Tooltip } from "@mui/material";
import {
  createComment,
  deleteComment,
  editComment,
  fetchComment,
  getScreenMaster,
} from "core/actions/commentActions";
import { groupBy } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { common } from "core/Utils/constants/assortSmart-constants";
import { Close } from "@mui/icons-material";
import globalStyles from "core/Styles/globalStyles";
import CommentingMainSection from "./CommentingMainSection";
import TextInputFieldSection from "./TextInputFieldSection";
import CommentingReplySection from "./CommentingReplySection";
import { setUserManagementList } from "core/actions/userAccessActions";
import { getUserDetails } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Management/user-management-service";
import { getFormattedApplicationName } from "core/Utils/functions/utils";
import { filterView } from "core/Utils/utils";
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import { setApplicationCodesList } from "core/actions/filterAction";
import colours from "core/Styles/colours";
import { Prompt } from "impact-ui";
import { useLocation } from "react-router-dom";
import { isTextInputValid } from "core/Utils/form/form-helpers";

const useStyles = makeStyles((theme) => ({
  drawer: {
    width: theme.customVariables.commentDrawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
    backgroundColor: theme.palette.common.white,
    transition: "width 300ms ease-out",
  },
  drawerOverlay: {
    position: "absolute",
  },
  drawerOpen: {
    width: 300,
    overflowX: "hidden",
  },
  drawerClose: {
    overflowX: "hidden",
    width: theme.customVariables.commentDrawerWidth,
  },
  commentIcon: {
    padding: "0.6rem",
    cursor: "pointer",
  },
  wrapper: {
    padding: "0 0.6rem",
  },
  commentInputDiv: {
    padding: "0.6rem 0",
    marginBottom: "1rem",
    "& .MuiTextField-root": {
      width: "100%",
    },
  },
  editTextInput: {
    "& .MuiTextField-root": {
      width: "100%",
    },
  },
  actionBtn: {
    textAlign: "right",
    marginTop: "0.6rem",
  },
  commentRow: {
    listStyle: "none",
    paddingTop: "0.5rem",
  },
  commentList: {
    height: "100%",
    overflow: "hidden auto",
    position: "relative",
    "& ul": {
      padding: 0,
    },
  },
  commentHeading: {
    backgroundColor: theme.palette.background.primary,
    borderRadius: theme.typography.pxToRem(3),
    color: theme.palette.common.codGray,
    padding: "0.5rem 0.75rem",
    position: "sticky",
    top: "0",
    zIndex: "1",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  headerWrap: {
    display: "flex",
    padding: "0.5rem",
    "& .MuiButton-root": {
      padding: "0",
      minWidth: "0",
    },
  },
  userWrap: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  userName: {
    ...theme.typography.body2,
    fontWeight: theme.typography.fontWeightBold,
    display: "flex",
  },
  timeStamp: {
    color: theme.palette.textColours.slateGrayLight,
    ...theme.typography.body1,
  },
  contentWrapper: {
    backgroundColor: theme.palette.background.chipBackground,
    padding: "0.6rem",
    borderRadius: theme.shape.borderRadius,
    "& .MuiFormControl-root": {
      padding: "0 0.6rem",
    },
    "& .MuiOutlinedInput-root": {
      width: "14rem",
    },
  },
  editTextDiv: {
    ...theme.typography.body1,
    padding: "0.5rem",
    whiteSpace: "initial",
  },
  replyWrapper: {
    "& li": {
      listStyle: "none",
    },
  },
  downArrowIcon: {
    transform: "rotate(90deg)",
    transition: "transform 225ms linear",
    marginRight: "0.6rem",
  },
  rightArrowIcon: {
    transform: "rotate(0deg)",
    transition: "transform 225ms linear",
  },
  textInputField: {
    whiteSpace: "initial",
    overflowX: "hidden",
    height: "6.25rem",
    border: `0.06rem solid ${theme.palette.colours.disabledBorder}`,
    "&:hover": {
      borderColor: theme.palette.primary.main,
    },
    "&:focus": {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 3px ${theme.palette.primary.lighter}`,
    },
    borderRadius: theme.shape.borderRadius,
    fontSize: "0.75rem",
    padding: "0.93rem",
    lineHeight: "1.25rem",
    "&:empty::before": {
      content: "attr(data-placeholder)",
      color: colours.gray,
    },
    width: "100%",
    resize: "none",
  },
  highlight: {
    display: "inline",
    border: "0.06rem solid transparent",
    background: theme.palette.colours.accordionBorder,
    color: theme.palette.textColours.codGray,
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    padding: "0 0.3em 0.12rem 0.23em",
    lineHeight: 1.714,
    fontSize: "1em",
    fontWeight: "normal",
    wordBreak: "break-word",
  },
  customLabel: theme.typography.h4,
  parentContainer: {
    background: theme.palette.background.tagBackground,
  },
  arrowForwardIosIcon: {
    fontSize: "small",
  },
  menu: {
    "& .MuiPaper-root": {
      boxShadow: "0px 0px 3px #00000029",
    },
  },
}));

const CommentBar = (props) => {
  const { showCommentScreenNameOption = true, commentBarPlaceholder } = props;
  const [commentLoader, setCommentLoader] = useState(false);
  const [isActive, setisActive] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [comment, setComment] = useState(null);
  const [commentList, setCommentList] = useState([]);
  const [applicationCode, setApplicationCode] = useState(null);
  const [screenCode, setScreenCode] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [isCommentEditable, setCommentEditable] = useState(false);
  const [editCommentTextInput, setEditCommentTextInput] = useState(null);
  const [openCommentDropdown, setOpenCommentDropdown] = useState(null);
  const [openChilCommentdDropDown, setOpenChildCommentDropDown] = useState(
    null
  );
  const [userRoleDetails, setUserRoleDetails] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReplySection, setShowReplySection] = useState(false);
  const [showReplyTextInput, setShowReplyTextInput] = useState(false);
  const [childComment, setChildComment] = useState(null);
  const [deleteCommentData, setDeleteCommentData] = useState(null);
  const [usersMentioned, setUserMentioned] = useState([]);
  const [planStepOptions, setPlanStepOptions] = useState([]);
  const [selectedPlanStep, setSelectedPlanStep] = useState(null);

  const classes = useStyles();
  const globalClasses = globalStyles();
  const location = useLocation();
  let planDetails = useRef({});
  const postBody = {
    meta: {
      search: [],
      range: [],
      sort: [],
    },
  };

  // Check for valid JSON
  useEffect(() => {
    try {
      planDetails.current = JSON.parse(sessionStorage.getItem("planData"));
    } catch (e) {
      planDetails.current = {};
    }
  }, [sessionStorage.getItem("planData")]);

  useEffect(() => {
    const fetchUserManagementList = async () => {
      let response = await props.getUserDetails(postBody);
      const loggedInUser = localStorage.getItem("name");
      const user = response.data?.data?.filter((item) => {
        return item.email === loggedInUser;
      });
      const username = user[0]?.user_name;
      localStorage.setItem("user", username);
      if (response?.data?.status) {
        await props.setUserManagementList(response.data.data);
      }
    };
    fetchUserManagementList();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      // Fetching application Name from url
      let applicationURL = window.location.pathname.split("/")?.[1];
      let applicationName = getFormattedApplicationName(applicationURL);
      if (applicationName === "workflow input center") {
        applicationName = "Workflow Input Center";
      }
      // compare and find code for application name in the url
      let getApplicationMasterList = await props.getApplicationMaster();
      props.setApplicationCodesList(getApplicationMasterList?.data?.data);
      localStorage.setItem(
        "applicationCodesList",
        JSON.stringify(getApplicationMasterList?.data?.data)
      );
      getApplicationMasterList?.data?.data.forEach(async (app) => {
        if (app.name === applicationName) {
          setApplicationCode(app.application_code);
        }
      });
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (applicationCode) {
      fetchScreenCode();
    }
  }, [applicationCode, sessionStorage.getItem("activeScreenName")]);

  useEffect(() => {
    if (applicationCode && screenCode) {
      fetchCommentListData(screenCode);
    }
  }, [screenCode, planDetails?.current?.data?.plan_code]);

  useEffect(() => {
    //disabling comment section for home page
    if (location.pathname === "/home") {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
      closeCommentBarHandler();
    }
  }, [location]);

  /**
   * Retrieve data of screen master
   */

  const fetchScreenCode = async () => {
    let payload = {
      application: [applicationCode],
    };
    let getUserRole = await props.getScreenMaster(payload);
    if (getUserRole?.data?.status) {
      setUserRoleDetails(getUserRole.data.data);
      let options = [];
      getUserRole.data.data.forEach((obj) => {
        if (obj.screen_name === sessionStorage.getItem("activeScreenName")) {
          setScreenCode(obj.screen_code);
          setSelectedPlanStep({
            label: obj.screen_name,
            value: obj.screen_code,
            id: obj.screen_code,
          });
        }
        if((obj.screen_name).toLowerCase() !== "workflow input center")
        options.push({
          label: obj.screen_name,
          value: obj.screen_code,
          id: obj.screen_code,
        });
      });
      setPlanStepOptions(options);
    }
  };

  /**
   * Fetches all the comments based on screen and application code
   */

  const fetchCommentListData = async (code) => {
    setCommentLoader(true);
    let planCode = planDetails?.current?.data?.plan_code;
    let payload = {
        body: [
          {
            attribute_name: "application_code",
            attribute_value: applicationCode,
            operator: "eq",
          },
          {
            attribute_name: "screen_code",
            attribute_value: code,
            operator: "eq",
          },
          {
            attribute_name: "search_context->>'plan_code'",
            attribute_value: planCode,
            operator: "eq",
          },
        ],
      },
      formattedGetCommentPayload = payload;

    if (!planCode) {
      formattedGetCommentPayload = {
        body: payload.body.filter((item) => {
          return item.attribute_name !== "search_context->>'plan_code'";
        }),
      };
    }

    if (!code) {
      formattedGetCommentPayload = {
        body: payload.body.filter((item) => {
          return item.attribute_name !== "screen_code";
        }),
      };
    }

    let commentDataResponse = await props.fetchComment(
      formattedGetCommentPayload
    );
    if (commentDataResponse?.status) {
      let parentComments = commentDataResponse?.data?.data.filter(
        (obj) => !obj.parent_code
      );
      // Grouping child comments with the parent
      parentComments.forEach((parentData, index) => {
        let repliesArray = [];
        commentDataResponse?.data?.data.forEach((childData) => {
          if (parentData.note_code === childData.parent_code) {
            repliesArray.push(childData);
            parentComments[index].repliesArray = repliesArray;
          }
        });
      });
      commentDataResponse.data.data = parentComments;
      // Group by screen codes
      let tempGroupedData = groupBy(
        commentDataResponse.data.data,
        "screen_code"
      );

      // Setting screen name
      userRoleDetails.forEach((obj) => {
        if (tempGroupedData[obj.screen_code]) {
          tempGroupedData[obj.screen_name] = tempGroupedData[obj.screen_code];
          delete tempGroupedData[obj.screen_code];
        }
      });
      commentDataResponse.data.data = tempGroupedData;
      // Closing reply section after success
      setShowReplySection(false);
      setShowReplyTextInput(false);
      setCommentList(commentDataResponse.data);
    }
    setCommentLoader(false);
  };

  const toggleSideBarExpansionHandler = () => {
    setisActive(!isActive);
  };

  const closeCommentBarHandler = () => {
    try {
      setisActive(false);
    } catch (error) {
      console.error("closeCommentBarHandler error:", error);
    }
  };

  const handleOpenDropdown = (event, type) => {
    type === "child"
      ? setOpenChildCommentDropDown(event.currentTarget)
      : setOpenCommentDropdown(event.currentTarget);
  };

  const handleCloseDropdown = (type) => {
    type === "child"
      ? setOpenChildCommentDropDown(null)
      : setOpenCommentDropdown(null);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  /**
   * Calls action to add comment
   */
  const saveComment = async (type) => {
    setCommentLoader(true);
    try {
      // Validation for string entered in the comment box
      if (
        !isTextInputValid(
          document.getElementById(`${type}TextBoxField`).value,
          4,
          200,
          props.addSnack
        )
      ) {
        return;
      }
      let planCode = planDetails?.current?.data?.plan_code;
      let payload = {
        application_code: applicationCode,
        screen_code: screenCode,
        html_msg: document.getElementById(`${type}TextBoxField`).value,
        search_context: planCode
          ? [
              {
                key: "plan_code",
                value: planCode,
              },
            ]
          : [],
      };
      if (type === "reply") {
        payload = { ...payload, parent_code: selectedComment.note_code };
      }
      if (usersMentioned?.length) {
        payload = getUserMentionedPayload(payload);
      }

      let addedCommentResponse = await props.createComment(payload);
      if (addedCommentResponse?.data?.status) {
        fetchCommentListData(screenCode);
        displaySnackMessages(addedCommentResponse.data.message, "success");
        closeComment(type);
        setUserMentioned([]);
      } else {
        setCommentLoader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    } catch (err) {
      setCommentLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const getUserMentionedPayload = (payload) => {
    let userMentionedCodes = payload.users_mentioned || [];
    usersMentioned.forEach((user) => {
      if (payload.html_msg.includes(user.user_name)) {
        userMentionedCodes.push(user.user_code);
      }
      payload = {
        ...payload,
      };
    });
    payload = {
      ...payload,
      users_mentioned: [...new Set(userMentionedCodes)],
      redirect_url: location.pathname,
    };
    return payload;
  };

  const closeComment = (type) => {
    setComment(null);
    document.getElementById(`${type}TextBoxField`).value = "";
  };

  /**
   * Calls action to delete comment
   * @param {string} data - selected comment to be deleted
   */

  const deleteComment = async () => {
    setCommentLoader(true);
    let deleteResponse = await props.deleteComment(deleteCommentData.note_code);
    if (deleteResponse?.data?.status) {
      setShowDeleteDialog(false);
      setDeleteCommentData(null);
      fetchCommentListData(screenCode);
      displaySnackMessages(deleteResponse.data.message, "success");
    } else {
      displaySnackMessages("Something went wrong", "error");
    }
  };

  /**
   * Calls action to edit comment
   * @param {string} data - selected comment for edit
   */

  const editCommentFn = async (data) => {
    setCommentLoader(true);
    try {
      let payload = {
        note_id: data.note_code,
        html_msg: document.getElementById("editTextBoxField").value,
      };
      commentList?.data?.[`${localStorage.getItem("currentScreenName")}`]?.forEach((comment) => {
        if (comment?.note_code === data.note_code && comment?.users_mentioned) {
          payload = {
            ...payload,
            users_mentioned: comment?.users_mentioned,
            redirect_url: location.pathname,
          };
        }
      });
      if (usersMentioned?.length) {
        payload = getUserMentionedPayload(payload);
      }

      let editResponse = await props.editComment(payload);
      if (editResponse?.data?.status) {
        fetchCommentListData(screenCode);
        displaySnackMessages(editResponse.data.message, "success");
        setCommentEditable(false);
        setUserMentioned([]);
      } else {
        setCommentLoader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    } catch (err) {
      setCommentLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const onChangeDropOption = (options) => {
    setSelectedPlanStep(options);
    setScreenCode(options?.value)
    fetchCommentListData(options.value)
  };

  return sessionStorage.getItem("activeScreenName") ? (
    <div className={globalClasses.flexRow}>
      <Drawer
        variant="permanent"
        anchor="right"
        className={clsx(classes.drawer,classes.drawerOverlay, {
          [classes.drawerOpen]: isActive,
          [classes.drawerClose]: !isActive,
        })}
        classes={{
          paper: clsx(
            {
              [classes.drawerOpen]: isActive,
              [classes.drawerClose]: !isActive,
            },
            classes.drawer
          ),
        }}
      >
        <div
          className={classes.commentIcon}
          onClick={() => (!isDisabled ? toggleSideBarExpansionHandler() : null)}
        >
          {isActive ? (
            <Close />
          ) : (
            <ChatBubbleIcon color={!isDisabled ? "primary" : "disabled"} />
          )}
        </div>
        {isActive && (
          <div className={classes.wrapper}>
            <div className={classes.commentInputDiv}>
              {/* onclick making text field row as 5 */}
              <TextInputFieldSection
                type={"create"}
                comment={comment}
                setComment={setComment}
                saveComment={() => saveComment("create")}
                closeComment={() => closeComment("create")}
                classes={classes}
                setUserMentioned={setUserMentioned}
                usersMentioned={usersMentioned}
                placeholder={commentBarPlaceholder}
              />
            </div>
            <LoadingOverlay loader={commentLoader} spinner>
              {showCommentScreenNameOption && planStepOptions?.length > 1 && (
                <div>
                  {filterView(
                    "Screen Name",
                    "screen_name",
                    planStepOptions,
                    onChangeDropOption,
                    selectedPlanStep,
                    globalClasses.marginBottom,
                    classes.customLabel
                  )}
                </div>
              )}
              <div className={classes.commentList}>
                {commentList?.data && Object.keys(commentList.data)?.length ? (
                  Object.keys(commentList.data).map((key) => {
                    return (
                      <section>
                        {showCommentScreenNameOption && (
                          <Tooltip
                            classes={{ tooltip: globalClasses.customTooltip }}
                            placement="bottom-start"
                            arrow
                            title={key}
                          >
                            <h4 className={classes.commentHeading}>{key}</h4>
                          </Tooltip>
                        )}
                        <ul>
                          {commentList.data[key].map((commentData) => {
                            return (
                              <li className={classes.commentRow}>
                                <div className={classes.contentWrapper}>
                                  <CommentingMainSection
                                    commentData={commentData}
                                    handleOpenDropdown={handleOpenDropdown}
                                    setSelectedComment={setSelectedComment}
                                    isCommentEditable={
                                      isCommentEditable &&
                                      commentData.note_code ===
                                        selectedComment?.note_code
                                    }
                                    openCommentDropdown={openCommentDropdown}
                                    handleCloseDropdown={handleCloseDropdown}
                                    userData={props.userData}
                                    selectedComment={selectedComment}
                                    setCommentEditable={setCommentEditable}
                                    setEditCommentTextInput={
                                      setEditCommentTextInput
                                    }
                                    setShowDeleteDialog={setShowDeleteDialog}
                                    setDeleteCommentData={setDeleteCommentData}
                                    type="parent"
                                    classes={classes}
                                    editCommentFn={editCommentFn}
                                    editCommentTextInput={editCommentTextInput}
                                    setUserMentioned={setUserMentioned}
                                    usersMentioned={usersMentioned}
                                  />
                                  <CommentingReplySection
                                    commentData={commentData}
                                    classes={classes}
                                    showReplySection={showReplySection}
                                    setShowReplySection={setShowReplySection}
                                    selectedComment={selectedComment}
                                    handleOpenDropdown={handleOpenDropdown}
                                    openChilCommentdDropDown={
                                      openChilCommentdDropDown
                                    }
                                    handleCloseDropdown={handleCloseDropdown}
                                    setChildComment={setChildComment}
                                    setShowReplyTextInput={
                                      setShowReplyTextInput
                                    }
                                    editCommentFn={editCommentFn}
                                    setEditCommentTextInput={
                                      setEditCommentTextInput
                                    }
                                    setShowDeleteDialog={setShowDeleteDialog}
                                    saveComment={saveComment}
                                    childComment={childComment}
                                    showReplyTextInput={showReplyTextInput}
                                    setDeleteCommentData={setDeleteCommentData}
                                    editCommentTextInput={editCommentTextInput}
                                    userData={props.userData}
                                    setSelectedComment={setSelectedComment}
                                    setUserMentioned={setUserMentioned}
                                    usersMentioned={usersMentioned}
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })
                ) : (
                  <Typography
                    align="center"
                    component="p"
                    variant="body1"
                    mt={5}
                  >
                    No Data
                  </Typography>
                )}
              </div>
            </LoadingOverlay>
          </div>
        )}
      </Drawer>
      <Prompt
        isOpen={showDeleteDialog}
        title="Confirm Delete"
        subHeading="Are you sure you want to delete comment?"
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            deleteComment();
            setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowDeleteDialog(false),
        }}
        variant="error"
      />
    </div>
  ) : null;
};

const mapStateToProps = (state) => {
  return {
    userData: state.authReducer.user,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getApplicationMaster: (payload) => dispatch(getApplicationMaster(payload)),
  createComment: (payload) => dispatch(createComment(payload)),
  fetchComment: (payload) => dispatch(fetchComment(payload)),
  deleteComment: (payload) => dispatch(deleteComment(payload)),
  editComment: (payload) => dispatch(editComment(payload)),
  getScreenMaster: (payload) => dispatch(getScreenMaster(payload)),
  getUserDetails: (payload) => dispatch(getUserDetails(payload)),
  setUserManagementList: (payload) => dispatch(setUserManagementList(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setApplicationCodesList: (payload) =>
    dispatch(setApplicationCodesList(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CommentBar);
