import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Typography, Tooltip } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { common } from "core/Utils/constants/assortSmart-constants";
import { filterView } from "core/Utils/utils";
import {
  createComment,
  deleteComment,
  editComment,
  fetchComment,
  getScreenMaster,
} from "core/actions/commentActions";
import { setApplicationCodesList } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getApplicationMaster } from "core/actions/tenantConfigActions";
import { setUserManagementList } from "core/actions/userAccessActions";
import { Panel, Prompt, useTranslation } from "impact-ui-v3";
import { groupBy } from "lodash";
import { getUserDetails } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Management/user-management-service";
import CommentingMainSection from "./CommentingMainSection";
import CommentingReplySection from "./CommentingReplySection";
import TextInputFieldSection from "./TextInputFieldSection";
import { isTextInputValid } from "core/Utils/form/form-helpers.js";
import { setCommonApplicationCode } from "../ChatSystem/services-chatsystem/custom-services-chat-system";
import { fetchApplicationCode } from "core/Utils/functions/utils";
const useStyles = makeStyles((theme) => ({
  commentIcon: {
    padding: "0.6rem",
    cursor: "pointer",
    borderLeft: "1px solid rgba(0, 0, 0, 0.12)",
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
}));

const CommentBar = (props) => {
  const { t } = useTranslation();
  const { showCommentScreenNameOption = true, commentBarPlaceholder } = props;
  const [commentLoader, setCommentLoader] = useState(false);
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
      try {
        let response = await props.getUserDetails(postBody);
        if (response?.data?.status) {
          await props.setUserManagementList(response.data.data);
          const currentUserInfo = response?.data?.data?.filter(
            (item) => item?.email === localStorage.getItem("name")
          );
          localStorage.setItem("user", currentUserInfo?.[0]?.user_name);
        }
      } catch (error) {
        console.error("Error fetching user management list:", error);
      }
    };
    fetchUserManagementList();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const {
        applicationCode,
        applicationCodesList,
      } = await fetchApplicationCode(props.getApplicationMaster);
      props.setApplicationCodesList(applicationCodesList);
      setApplicationCode(applicationCode);
      props.setCommonApplicationCode(applicationCode)
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

  /**
   * Retrieve data of screen master
   */

  const fetchScreenCode = async () => {
    try{
      let payload = {
        application: [applicationCode],
      };
      let getUserRole = await props.getScreenMaster(payload);
      if (getUserRole?.data?.status) {
        setUserRoleDetails(getUserRole.data.data);
        let options = [{ label: "All", value: "all", id: "all" }];
        getUserRole.data.data.forEach((obj) => {
          if (obj.screen_name === sessionStorage.getItem("activeScreenName")) {
            setScreenCode(obj.screen_code);
            setSelectedPlanStep({
              label: obj.screen_name,
              value: obj.screen_code,
              id: obj.screen_code,
            });
          }
          options.push({
            label: obj.screen_name,
            value: obj.screen_code,
            id: obj.screen_code,
          });
        });
        setPlanStepOptions(options);
      }
    } catch(err){
      console.error("Error fetching screen code", err);
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
          document.getElementById(`${type}TextBoxField`).innerText,
          4,
          200,
          props.addSnack
        )
      ) {
        setCommentLoader(false);
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
        payload = {
          ...payload,
          parent_code: String(selectedComment.note_code),
        };
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
    let userMentionedCodes = [];
    usersMentioned.forEach((user) => {
      if (payload.html_msg.includes(user.user_name)) {
        userMentionedCodes.push(user.user_code);
      }
      payload = {
        ...payload,
        html_msg: payload.html_msg.replace(
          `@${user.user_name}`,
          `<mark class=${classes.highlight} contenteditable="false">@${user.user_name}</mark>`
        ),
      };
    });
    payload = {
      ...payload,
      users_mentioned: userMentionedCodes,
      redirect_url: window.location.href,
    };
    return payload;
  };

  const closeComment = (type) => {
    setComment(null);
    document.getElementById(`${type}TextBoxField`).innerText = "";
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
        html_msg: document.getElementById("editTextBoxField").innerHTML,
      };
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
    options.value !== "all"
      ? fetchCommentListData(options.value)
      : fetchCommentListData();
  };

  return sessionStorage.getItem("activeScreenName") ? (
    <>
      <Panel
        open={props.isComment}
        setIsOpen={props.setIsComment}
        size="medium"
        anchor="right"
      >
        {
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
                      <section key={key}>
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
                          {commentList.data[key].map((commentData, commentIndex) => {
                            return (
                              <li key={commentData.note_code || commentIndex} className={classes.commentRow}>
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
                    {t("chat.noData")}
                  </Typography>
                )}
              </div>
            </LoadingOverlay>
          </div>
        }
      </Panel>
      <Prompt
        isOpen={showDeleteDialog}
        title={t("chat.confirmDelete")}
        children={t("chat.deleteCommentMessage")}
        onPrimaryButtonClick={() => {
          deleteComment();
          setShowDeleteDialog(false);
        }}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        primaryButtonLabel={common.__ConfirmBtnText}
        secondaryButtonLabel={common.__RejectBtnText}
        variant="error"
      />
    </>
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
  setCommonApplicationCode: (payload) =>
    dispatch(setCommonApplicationCode(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CommentBar);
