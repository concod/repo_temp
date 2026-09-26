import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import globalStyles from "core/Styles/globalStyles";
import BotFace from "assets/botFace.svg";
import CloseIcon from "assets/chatbot/CloseIcon.svg";
import MinimiseIcon from "assets/chatbot/MinimiseIcon.svg";
import CloseRoundIcon from "assets/closeRoundIcon.svg";
import Menu from "assets/chatbot/Menu.svg";
import DoubleTicks from "assets/chatbot/DoubleTicks.svg";
import Navigation from "assets/chatbot/Navigation.svg";
import Insights from "assets/chatbot/Insights.svg";
import InsightsSelected from "assets/chatbot/InsightsSelected.svg";
import NavigationSelected from "assets/chatbot/NavigationSelected.svg";
import { Input } from "impact-ui";
import { Alert } from "./impact-ui-components/Alert";
import { Tooltip } from "./impact-ui-components/Tooltip";
import { Button } from "./impact-ui-components/Button";
import {
  navigationOptions,
  insightsOptions,
  toBoldUnicode,
} from "./smartBotConstants";
import moment from "moment";
import { Divider, Typography } from "@mui/material";
import {
  resolveChatQuery,
  fetchScreensForModule,
  fetchRelatedQuestions,
  refreshAndUpdateUserManualApi,
} from "./smartBotservices";
import { cloneDeep, isEmpty, isNull, throttle } from "lodash";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import RedirectLink from "./redirect-link";
import HighlightedRenderer from "./highlighted-renderer";
import { addSnack } from "core/actions/snackbarActions";
import { useDispatch } from "react-redux";
import { StyledRefreshIcon } from "./styled";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import SelectedModule from "./SelectedModule";
import ChatHistory from "./chatHistory";
import { useStyles } from "./smartBotStyling";
import { getUserName } from "core/Utils/functions/utils";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import { handleMessageLike } from "./smartBotActions";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import { TextRenderer } from "./text-renderer";

const MessageTemplate = (props) => {
  const {
    templateData,
    chatMode,
    endCurrentSession,
    clearChatSession,
    screenName,
    currentAppLink,
    screenLinkData,
    selectedModule,
    displaySnackMessages,
  } = { ...props };
  const globalClasses = globalStyles();
  const classes = useStyles();
  const dateFormat = "DD-MM-YYYY HH:mm:ss";
  const [loadingState, setLoadingState] = useState({
    like: null,
    dislike: null,
  });

  const renderActionableCTA = () => {
    return (
      <>
        {screenLinkData?.[chatMode]?.screenName && (
          <div className={`${globalClasses.layoutAlignStart} ${classes.ml12}`}>
            <RedirectLink to={screenLinkData?.[chatMode]?.currentAppLink} screenName={screenLinkData?.[chatMode]?.screenName} />
          </div>
        )}
      </>
    );
  };

  const renderDateChip = (dateString) => {
    return <Typography className={classes.dateChip}>{dateString}</Typography>;
  };

  const botView = (botData, state) => {
    let time = moment(botData.timeStamp, dateFormat).format("HH:mm A");
    const likeDislikeKey = `${
      botData?.response_heading || botData?.screen_name
    }_${botData?.timeStamp}`;
    return (
      <>
        <div className={`${globalClasses.flexRow} ${classes.BotMessage}`}>
          <span className={classes.botTitleView}>{botData.userName}</span>
          <span className={classes.time}>{time}</span>
        </div>
        <div className={classes.BotMessage}>
          <div
            className={`${classes.botViewBlock} ${globalClasses.flexRow} ${globalClasses.flexColumn} `}
          >
            {botData?.noShowHeaderTitle ? (
              <></>
            ) : (
              Boolean(botData.headerTitle?.length) && (
                <Typography className={classes.chatbotText}>
                  {botData.headerTitle}
                </Typography>
              )
            )}
            {parseBody(botData)}
          </div>
          {botData?.enableLikes && (
            <div
              className={`${globalClasses.layoutAlignEnd} ${classes.messageActionWrapper}`}
            >
              {botData?.extra?.hasOwnProperty("status") ? (
                <>
                  {botData?.extra?.status === "liked" ? (
                    <ThumbUpIcon className="activeIcon" />
                  ) : (
                    <ThumbDownIcon className="activeIcon" />
                  )}
                </>
              ) : (
                <>
                  {state?.like === likeDislikeKey ? (
                <>
                  <ThumbUpIcon className="activeIcon" />
                </>
              ) : (
                <>
                  <ThumbUpAltOutlinedIcon
                    onClick={() => {
                      setLoadingState({
                        ...state,
                            like: likeDislikeKey,
                      });
                          useCallback(
                            throttle(
                        handleMessageLike(
                                likeDislikeKey,
                          true,
                          setLoadingState,
                                displaySnackMessages,
                                templateData
                              ),
                              5000,
                              { trailing: false }
                            ),
                            []
                        );
                    }}
                  />
                </>
              )}
                  {state?.dislike === likeDislikeKey ? (
                <>
                  <ThumbDownIcon className="activeIcon" />
                </>
              ) : (
                <>
                  <ThumbDownAltOutlinedIcon
                    onClick={() => {
                      setLoadingState({
                        ...state,
                            dislike: likeDislikeKey,
                      });
                          useCallback(
                            throttle(
                        handleMessageLike(
                                likeDislikeKey,
                          false,
                          setLoadingState,
                                displaySnackMessages,
                                templateData
                              ),
                              5000,
                              { trailing: false },
                              []
                            )
                        );
                    }}
                  />
                </>
              )}
                </>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  const parseBody = (botData) => {
    switch (botData.bodyType) {
      case "text":
        const string = botData?.bodyText?.includes("IA Smart Platform");
        return Boolean(botData.bodyText.includes("\n")) ? (
          <div>
            {botData.bodyText.split("\n").map((text) => (
              <>
                <Typography className={classes.bodyTextStyling}>
                  {text.indexOf("**") > -1 ? (
                    <TextRenderer text={text} />
                  ) : (
                    text
                  )}
                </Typography>
                <br />
              </>
            ))}
          </div>
        ) : (
          <>
            {string ? (
              <Typography variant="div" className={classes.chatbotText}>
                {botData?.bodyText.slice(
                  0,
                  botData?.bodyText.indexOf("IA Smart Platform")
                )}
                <Typography variant="span" sx={{ fontWeight: 600 }}>
                  {botData?.bodyText.slice(
                    botData?.bodyText.indexOf("IA Smart Platform"),
                    botData?.bodyText.indexOf("IA Smart Platform") + 18
                  )}
                </Typography>
                {botData?.bodyText.slice(
                  botData?.bodyText.indexOf("IA Smart Platform") + 18,
                  botData?.bodyText?.length
                )}
              </Typography>
            ) : (
              <Typography className={classes.chatbotText}>
                <TextRenderer text={botData.bodyText} />
              </Typography>
            )}
          </>
        );
      case "chips":
        return (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.flexWrap} ${globalClasses.gap} ${globalClasses.verticalAlignCenter}`}
          >
            {botData.bodyText.map((data) => {
              const callBack = data.interactable
                ? Object.entries(props).filter(
                    (entry) => entry[0] === data.actionName
                  )?.[0]?.[1]
                : null;

              return (
                <Typography
                  component="span"
                  variant="body1"
                  className={`${classes.gptChips} ${
                    data.interactable ? globalClasses.cursorPointer : ""
                  }`}
                  onClick={() => {
                    callBack && callBack(data);
                  }}
                >
                  {data.displayText}
                </Typography>
              );
            })}
          </div>
        );
      case "questions":
        return (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${classes.gptQuestionContainer}`}
          >
            {botData.bodyText.map((data) => {
              const callBack = data.interactable
                ? Object.entries(props).filter(
                    (entry) => entry[0] === data.actionName
                  )?.[0]?.[1]
                : null;

              return (
                <div
                  className={`${globalClasses.layoutAlignStart} ${classes.gptQuestionBlock}`}
                >
                  <Typography
                    component="span"
                    variant="button"
                    className={classes.maxWidthFitContent}
                  >
                    Ques{" " + data.question_index}
                  </Typography>
                  <Typography
                    component="span"
                    variant="body1"
                    className={`${classes.gptQuestions} ${
                      data.interactable ? globalClasses.cursorPointer : ""
                    }`}
                    onClick={() => {
                      callBack && callBack(data);
                    }}
                  >
                    <HighlightedRenderer sentence={data.displayText} />
                  </Typography>
                </div>
              );
            })}
          </div>
        );
    }
  };

  const userView = (userData) => {
    let time = moment(userData.timeStamp, dateFormat).format("HH:mm A");

    // Determine message bubble width based on content length
    const getBubbleWidth = (text) => {
      const length = text?.length;
      if (length <= 20) return "30%"; // Small messages
      if (length <= 50) return "50%"; // Medium messages
      return "70%"; // Large messages
    };
    const bubbleWidth = getBubbleWidth(userData.bodyText);
    return (
      <div
        className={classes.userViewBlock}
        style={{ width: bubbleWidth }} // Apply dynamic width
      >
        {/* First row: Time and Double Ticks */}
        <div className={`${classes.firstRow}`}>
          <Typography className={classes.time}>{time}</Typography>
          <DoubleTicks />
        </div>
        {/* Second row: Message Text */}
        <div className={`${classes.messageRow}`}>
          {Boolean(userData.bodyText.includes("\n")) ? (
            userData.bodyText.split("\n").map((text, index) => (
              <Typography key={index} className={classes.messageText}>
                {text}
              </Typography>
            ))
          ) : (
            <Typography className={classes.messageText}>
              {userData.bodyText}
            </Typography>
          )}
        </div>
      </div>
    );
  };

  const getLoader = (botData) => {
    let time = moment(botData.timeStamp, dateFormat).format("HH:mm A");
    return (
      <div
        className={`${classes.botViewBlock} ${globalClasses.flexRow} ${globalClasses.flexColumn} `}
      >
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
        >
          <Typography variant="text" className={classes.botViewHeader}>
            {botData.userName}
          </Typography>
          <Typography variant="text" className={classes.botViewHeader}>
            {time}
          </Typography>
        </div>
        <div className={`${globalClasses.positionRelative}`}>
          <div className={classes.loader}></div>
        </div>
      </div>
    );
  };

  const renderChats = useMemo(() => {
    if (!templateData[chatMode]?.length) {
      return <></>;
    }
    let dayData;
    return templateData[chatMode]?.map((data, index) => {
      let currentDayData;
      if (data.timeStamp) {
        currentDayData = moment(data.timeStamp, dateFormat).format(
          "DD MMM YYYY"
        );
      }

      let dateChip;
      if (currentDayData != dayData) {
        dayData = currentDayData;
        dateChip = renderDateChip(currentDayData);
      }

      let chatCTA;
      if (
        ["bot", "loader"].includes(data.userType) &&
        templateData[chatMode]?.length === index + 1
      ) {
        chatCTA = renderActionableCTA();
      }
      switch (data.userType) {
        case "bot":
          return (
            <>
              {dateChip}
              {botView(data, loadingState)}
              {chatCTA}
            </>
          );
        case "user":
          return (
            <>
              {dateChip}
              {userView(data)}
            </>
          );
        case "loader":
          return (
            <>
              {getLoader(data)}
              {chatCTA}
            </>
          );
        default:
          return <></>;
      }
    });
  }, [templateData[chatMode], chatMode, selectedModule, loadingState]);

  return <>{renderChats}</>;
};

const SmartBot = (props) => {
  const [showModal, setShowModal] = useState(false);
  const [minimizedMode, setMinimizedMode] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [position, setPosition] = useState(null);
  const [flowType, setFlowType] = useState(null);
  const [screenName, setScreenName] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentAppLink, setCurrentAppLink] = useState("");
  const [loader, setLoader] = useState(false);
  const [enableRefreshAction, setEnableRefreshAction] = useState(false);
  const [refreshLoader, setRefreshLoader] = useState(false);
  const grabPositionRef = useRef(null);
  const [chatDataState, setChatDataState] = useState({});
  const chatDataRef = useRef({
    insights: [],
    navigation: []
  });
  const chatBodyRef = useRef({});
  const isDraggingRef = useRef(null);
  const minimizedBtnRef = useRef();
  const globalClasses = globalStyles();
  const classes = useStyles({ position, minimizedBtnRef });
  const navigate = useNavigate();
  const location = useLocation();
  const dateFormat = "DD-MM-YYYY HH:mm:ss";
  const dispatch = useDispatch();
  const [showExtendedContent, setShowExtendedContent] = useState(false);
  const [currentMode, setCurrentMode] = useState("navigation"); // Default mode is insights
  const [selectedModule, setSelectedModule] = useState("None");
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [templateData, setTemplateData] = useState([]);
  const [showAlert, setShowAlert] = useState(false); // State for managing alert visibility
  const chatDataScreenLinkRef = useRef({
    insights: {
      screenName: "",
      currentAppLink: ""
    },
    navigation: {
      screenName: "",
      currentAppLink: ""
    }
  })

  // Update the selected module when an option is clicked
  const handleModuleSelect = (option, applicationCode) => {
    setSelectedModule(option);
    setIsCardVisible(false);
    // const newMessage = {
    //   timeStamp: moment().format("DD-MM-YYYY HH:mm:ss"),
    //   userType: "user",
    //   bodyText: `${option}`,
    // };
    // chatDataRef.current[currentMode] = [...chatDataRef.current[currentMode], newMessage];
    let dataObject = {
      actionName: "setUserScreenAndFlow",
      actionType: "direct",
      application_code: applicationCode,
      displayText: option,
      flow_type: currentMode,
      interactable: true,
      screen_name: option,
    }
    fetchUserResultsFromQuery(dataObject, true)
    setScreenName(option);
    setLink(option);
    // setTemplateData([...chatDataRef.current]);
  };

  const handleButtonClick = (mode) => {
    setCurrentMode(mode);
    if (mode === "insights") {
      // Reset selectedModule when switching to insights mode
      setSelectedModule(selectedModule);
    }
    // initiateNewChat(mode); // Initialize chat based on mode
  };

  const parseSavedFlow = (savedChatSession) => {
    try {
      if (
        !savedChatSession?.length ||
        savedChatSession[savedChatSession?.length - 1].userType === "bot"
      ) {
        chatDataRef.current[currentMode] = savedChatSession;
      } else {
        const userType =
          savedChatSession[savedChatSession?.length - 1].userType;
        const lastIndex = userType === "loader" ? 2 : 1;
        const savedUserInput =
          savedChatSession[savedChatSession?.length - lastIndex];
        chatDataRef.current[currentMode] = savedChatSession.slice(
          0,
          savedChatSession?.length - lastIndex
        );
        if (!savedUserInput?.hasDirectActionType && currentMode === "insights") {
          initiateNewChat(currentMode)
          return;
        }
        if (savedUserInput?.hasDirectActionType) {
          fetchUserResultsFromQuery(savedUserInput, true);
        } else {
          setFlowType(savedUserInput?.flow_type);
          setScreenName(savedUserInput?.screen_name);
          setUserInput(savedUserInput?.screen_name);
        }
      }
      setChatDataState(chatDataRef.current);
    } catch (error) {
      console.error("parseSavedFlow error:", error);
    }
  };

  const saveCurrentChanges = () => {
    const chatData = JSON.stringify(chatDataRef.current);
    localStorage.setItem("chatData", chatData);
    localStorage.setItem("currentModeData", currentMode);
    localStorage.setItem("currentSelectedModuleData", selectedModule);
  };

  const endCurrentSession = () => {
    // Reset states to initial values
    setFlowType(null);
    setUserInput("");
    setScreenName("");
    setTemplateData([]);
    chatDataRef.current[currentMode] = [];
    chatDataScreenLinkRef.current[currentMode] = {
      screenName: "",
      currentAppLink: ""
    }
    const chatData = JSON.stringify(chatDataRef.current);
    localStorage.setItem("chatData", chatData);
    localStorage.setItem("chatDataScreenLinkRef", JSON.stringify(chatDataScreenLinkRef.current));
    // Close modal
    setShowModal(false);
    setMinimizedMode(false);
    if(currentMode === "navigation") {
      setSelectedModule("None");
    }
    initiateNewChat(currentMode);
    props.closeBot(false);
  };
  const clearChatSession = () => {
    setFlowType(null);
    setUserInput("");
    setScreenName("");
    initiateNewChat();
  };

  const initiateNewChat = (mode) => {
    try {
      const initialGreet = [
        {
          timeStamp: getCurrentDateTimeString(),
          userType: "bot",
          userName: "Alan",
          headerTitle: `Hi ${getUserName()}!`,
          bodyType: "text",
          bodyText: `I am Alan, your virtual assistant. I am here to help you on anything you are looking for in IA Smart Platform`,
        },
      ];
      let chatDataInfo = cloneDeep(chatDataRef.current);
      for (const property in chatDataInfo) {
        initialGreet[0].flowType = property;
        if(isEmpty(chatDataRef.current[property])) {
          chatDataRef.current[property] = cloneDeep(initialGreet);
        }
      }
      setChatDataState(chatDataRef.current);
      // setTemplateData([...chatDataRef.current]);
      if (mode === "insights") {
        let data = {
          actionType: "direct",
          displayText: "Get Insights",
          displayUserText: "Getting Insights",
          flow_type: "insights",
          skipUserChat: true,
        };
        setUserFlow(data);
      }
    } catch (error) {
      console.error("initiateNewChat error", error);
    }
  };

  const setUserFlow = async (data) => {
    setLoader(true);
    const currentTimeString = getCurrentDateTimeString();
    let headerTitle;
    let screenOptions = {};
    const userChat = {
      timeStamp: currentTimeString,
      userType: "user",
      bodyText: data.displayUserText ? data.displayUserText : data.displayText,
      flow_type: data?.flow_type,
    };
    const loaderData = {
      userName: "Alan",
      timeStamp: currentTimeString,
      userType: "loader",
    };
    if (data.skipUserChat) {
      chatDataRef.current[currentMode] = [...chatDataRef.current[currentMode], loaderData];
    }
    else {
      chatDataRef.current[currentMode] = [...chatDataRef.current[currentMode], userChat, loaderData];
    }
    try {
      // Fetch options based on the current mode
      const options = await fetchScreensForModule(currentMode);
      if (options.data.data.screen_name?.length) {
        headerTitle = `Please select for which Modules you ${
          data?.flow_type === "navigation"
            ? "need help for."
            : "want insights for."
        }`;
        screenOptions = setScreens(
          options.data.data.screen_name,
          headerTitle,
          currentTimeString,
          currentMode
        );
        chatDataRef.current[currentMode] = [
          ...chatDataRef.current[currentMode]?.filter((data) => data.userType !== "loader"),
          screenOptions,
        ];
      } else {
        const failResponseText = {
          timeStamp: getCurrentDateTimeString(),
          userType: "bot",
          userName: "Alan",
          bodyText: options.data.data.message,
          enableLikes: false,
          headerTitle: "",
          noShowHeaderTitle: true,
          bodyType: "text",
        };
        chatDataRef.current[currentMode] = [
          ...chatDataRef.current[currentMode]?.filter((data) => data.userType !== "loader"),
          failResponseText,
        ];
      }
      setFlowType(data?.flow_type);
      setLoader(false);
    } catch (error) {
      const failResponseText = {
        timeStamp: getCurrentDateTimeString(),
        userType: "bot",
        userName: "Alan",
        bodyText: "Failed to fetch user screens. Please try again later.",
        headerTitle: "",
        enableLikes: false,
        noShowHeaderTitle: true,
        bodyType: "text",
      };
      chatDataRef.current[currentMode] = [
        ...chatDataRef.current[currentMode]?.filter((data) => data.userType !== "loader"),
        failResponseText,
      ];
      setLoader(false);
      console.error("error", error);
    }
  };

  const setScreens = (options = [], headerTitle, timeString, flow_type) => {
    return {
      timeStamp: timeString,
      userType: "bot",
      userName: "Alan",
      headerTitle: headerTitle,
      bodyType: "chips",
      bodyText: options.map((option) => {
        return {
          ...option,
          displayText: option.screen_name,
          flow_type: flow_type,
          interactable: true,
          actionType: "direct",
          actionName: "setUserScreenAndFlow",
        };
      }),
    };
  };

  const setLink = (screenNameInfo) => {
    try {
      let link;
      const typeOptions =
        currentMode === "navigation"
          ? [...navigationOptions]
          : [...insightsOptions];
      typeOptions.forEach((option) => {
        if (option.screen_name === screenNameInfo) {
          link = option.link;
        }
      });
      if (link) {
        setCurrentAppLink(link);
        localStorage.setItem("smartBotCurrentAppLink", link);
      } else {
        setCurrentAppLink(null);
        localStorage.removeItem("smartBotCurrentAppLink");
      }
    }
    catch(error) {
      console.error("setLink error: ", error);
    }
  }

  const setUserScreenAndFlow = (data) => {
    setFlowType(data?.flow_type);
    setScreenName(data?.screen_name);
    localStorage.setItem("smartBotScreenName", data?.screen_name);
    setQuestionIndex(data?.question_index);
    if (data?.link) {
      setCurrentAppLink(data?.link);
      localStorage.setItem("smartBotCurrentAppLink", data?.link);
    } else {
      setLink(data?.screen_name);
    }
    if (data.actionType === "indirect") {
      setUserInput(data.displayText);
    } else {
      fetchUserResultsFromQuery(data, true);
    }
  };

  const getCurrentDateTimeString = () => {
    const currentDateTime = moment();
    return currentDateTime.format(dateFormat);
  };

  const fetchUserResultsFromQuery = async (
    refObject,
    fetchQuestions = false
  ) => {
    setLoader(true);
    const currentTimeString = getCurrentDateTimeString();
    const input = fetchQuestions ? refObject?.screen_name : userInput;
    setUserInput("");
    const userChat = {
      timeStamp: currentTimeString,
      userType: "user",
      bodyText: input,
      screen_name: fetchQuestions ? refObject?.screen_name : screenName,
      flow_type: fetchQuestions ? refObject?.flow_type : currentMode,
      hasDirectActionType: fetchQuestions,
    };
    const loaderData = {
      userName: "Alan",
      timeStamp: currentTimeString,
      userType: "loader",
    };
    chatDataRef.current[currentMode] = [...chatDataRef.current[currentMode], userChat, loaderData];
    try {
      let queryResponse;
      let getUpdatedChat;
      let inCaseOfNoDataObject = {
        response_heading: "",
        response:
          "Sorry, but I can't help you with that. It's out of the scope of my knowledge base.",
      };
      if (fetchQuestions) {
        queryResponse = await fetchRelatedQuestions(
          refObject?.flow_type,
          refObject?.screen_name
        );
        if (isNull(queryResponse?.data?.data)) {
          getUpdatedChat = parseResponse(inCaseOfNoDataObject, "text");
        } else {
          getUpdatedChat = parseResponse(
            { ...queryResponse?.data?.data, enableLikes: true },
            "questions"
          );
        }
      } else {
        let body = {};
        if (currentMode === "insights") {
          body = {
            question_index: questionIndex,
            screen_name: screenName,
            question: input,
          };
        } else {
          body = {
            query: input,
          };
        }
        queryResponse = await resolveChatQuery(body, currentMode);
        if (isNull(queryResponse?.data?.data)) {
          getUpdatedChat = parseResponse(inCaseOfNoDataObject, "text");
        } else {
          getUpdatedChat = parseResponse(
            { ...queryResponse?.data?.data, enableLikes: true },
            "text"
          );
        }
      }
      if (chatDataRef.current[currentMode]?.length > 1) {
        chatDataRef.current[currentMode] = [
          ...chatDataRef.current[currentMode]?.filter(
            (data) => data?.userType != "loader"
          ),
          getUpdatedChat,
        ];
      }
      setLoader(false);
    } catch (error) {
      const failResponseText = {
        timeStamp: getCurrentDateTimeString(),
        userType: "bot",
        userName: "Alan",
        bodyText: error?.response?.data?.data?.error?.response ? error?.response?.data?.data?.error?.response : "Sorry, chatbot is not available now",
        headerTitle: "",
        noShowHeaderTitle: true,
        bodyType: "text",
      };
      chatDataRef.current[currentMode] = [
        ...chatDataRef.current[currentMode]?.filter((data) => data.userType !== "loader"),
        failResponseText,
      ];
      setLoader(false);
      console.error("error", error);
    }
  };

  const parseResponse = (data, type) => {
    const timeString = getCurrentDateTimeString();

    switch (type) {
      case "text":
        return {
          ...data,
          timeStamp: timeString,
          userType: "bot",
          userName: "Alan",
          bodyText: data.response,
          headerTitle: data.response_heading,
          noShowHeaderTitle: true,
          bodyType: "text",
        };
      case "questions":
        return {
          ...data,
          timeStamp: timeString,
          userType: "bot",
          userName: "Alan",
          headerTitle:
            "Here are few questions that users are typically interested in.",
          bodyType: "questions",
          bodyText: data[type].map((quesObj) => {
            return {
              ...quesObj,
              displayText: quesObj.question,
              interactable: true,
              actionType: "indirect",
              actionName: "setUserScreenAndFlow",
            };
          }),
        };
    }
  };

  const handleMouseDown = (e) => {
    grabPositionRef.current = {
      x: e.clientX - minimizedBtnRef.current.offsetLeft,
      y: e.clientY - minimizedBtnRef.current.offsetTop,
    };
    setPosition({
      x: minimizedBtnRef.current.offsetLeft,
      y: minimizedBtnRef.current.offsetTop,
    });
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (grabPositionRef.current) {
      isDraggingRef.current = true;
      setPosition({
        x: e.clientX - grabPositionRef.current.x,
        y: e.clientY - grabPositionRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    grabPositionRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const navigateToTheScreen = () => {
    try {
      navigate(currentAppLink);
    } catch (error) {
      console.error("navigateToTheScreen error", error);
    }
  };

  const displaySnackMessages = (message, variant) => {
    try {
      dispatch(
        addSnack({
          message: message,
          options: {
            variant: variant,
          },
        })
      );
    } catch (error) {
      console.error("displaySnackMessages error", error);
    }
  };

  const refreshAndUpdateUserManual = async () => {
    try {
      setRefreshLoader(true);
      let body = {
        document_id: "1n6Sh07Tqhq5R8OI5Smm3KDHka21-VwMxtD0DBT7GB1o",
      };
      let response = await refreshAndUpdateUserManualApi(body);
      if (response?.data?.data?.status) {
        displaySnackMessages("Refresh Successful", "success");
      } else {
        displaySnackMessages("Refresh Failed", "error");
      }
      setRefreshLoader(false);
    } catch (error) {
      displaySnackMessages("Refresh Failed", "error");
      console.error("refreshAndUpdateUserManual error", error);
      setRefreshLoader(false);
    }
  };

  const configureBotActions = async () => {
    try{
      const APP = "Workflow Input Center",
        MODULE = "Chatbot Module";
  
      let accessDataResponse = await getModuleLevelAccessUtility({
        app: APP,
        module: [MODULE],
        skipHierarchyCall: true,
      })();
      let rolesBasedModulesPermission = Object.fromEntries(
        Object.entries(accessDataResponse).map(([module, actions]) => [
          module,
          Object.keys(actions),
        ])
      );
      const actionEnabled = rolesBasedModulesPermission[
        "chatbot module"
      ]?.includes("edit");
      setEnableRefreshAction(actionEnabled);
    } catch(error){
      console.error("configureBotActions error", error);
    }
  };
  const clearAllChats = () => {
    // Reset chat data to the initial greet for the current mode
    if(currentMode === "navigation") {
      setSelectedModule("");
    }
    setUserInput("");
    // saveCurrentChanges();
    // Show the alert after clearing chat
    chatDataRef.current[currentMode] = [];
    chatDataScreenLinkRef.current[currentMode] = {
      screenName: "",
      currentAppLink: ""
    };
    localStorage.setItem("chatData", JSON.stringify(chatDataRef.current));
    localStorage.setItem("chatDataScreenLinkRef", JSON.stringify(chatDataScreenLinkRef.current));
    // setScreenName("");
    // setCurrentAppLink("");
    initiateNewChat(currentMode);
    setShowAlert(true);
  };
  const handleUndo = () => {
    setShowAlert(false); // Hide the alert after undo
  };

  const handleCloseAlert = () => {
    setShowAlert(false); // Hide the alert
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return; // Prevent empty messages

    const newMessage = {
      timeStamp: getCurrentDateTimeString(),
      userType: "user",
      bodyText: userInput.trim(),
    };

    chatDataRef.current[currentMode] = [...chatDataRef.current[currentMode], newMessage];
    // setTemplateData([...chatDataRef.current]);
    setUserInput("");
  };

  const isInputValid = () => {
    try {
      if (isEmpty(userInput.trim())) {
        setUserInput("");
        return false;
      } else {
        return true;
      }
    } catch (error) {
      console.error("isInputValid error", error);
    }
  };

  useEffect(() => {
    configureBotActions();
  }, []);

  useEffect(() => {
    if (props.invokeBot) {
      setMinimizedMode(!props.invokeBot);
      setShowModal(props.invokeBot);
    }
  }, [props.invokeBot]);

  useEffect(() => {
    let screenNameStored = localStorage.getItem("smartBotScreenName");
    let currentAppLinkStored = localStorage.getItem("smartBotCurrentAppLink");
    if (screenNameStored) {
      setScreenName(screenNameStored);
    }
    if (currentAppLinkStored) {
      setCurrentAppLink(currentAppLinkStored);
    }
  }, [location]);

  useEffect(() => {
    if (showModal) {
      const data = localStorage.getItem("chatData");
      let chatData = JSON.parse(data);
      if(chatData) {
        chatDataRef.current = chatData;
        if (Array.isArray(chatData[currentMode]) && chatData[[currentMode]]?.length > 0) {
          parseSavedFlow(chatData[currentMode]);
        }
      }
      else {
        initiateNewChat(currentMode);
      }
    }
  }, [showModal, currentMode]);

  useEffect(() => {
    if (showModal) {
      const currentModeData = localStorage.getItem("currentModeData");
      const currentSelectedModuleData = localStorage.getItem("currentSelectedModuleData");
      const chatScreenLinkData = localStorage.getItem("chatDataScreenLinkRef");
      let chatDataScreenLinkData = JSON.parse(chatScreenLinkData);
      if(chatDataScreenLinkData) {
        chatDataScreenLinkRef.current = chatDataScreenLinkData;
      }
      if (currentModeData) {
        setCurrentMode(currentModeData)
      }
      if (currentSelectedModuleData) {
        setSelectedModule(currentSelectedModuleData)
      }
    }
  }, [showModal])

  useEffect(() => {
    if (chatDataRef.current[currentMode]?.length > 0) {
      saveCurrentChanges();
      const scrollToPosition = Number(
        chatBodyRef.current?.lastElementChild?.offsetTop
      );
      chatBodyRef.current?.scrollTo({
        top: scrollToPosition,
        behavior: "smooth",
      });
    }
  }, [chatDataRef.current[currentMode], currentMode]);

  useEffect(() => {
    if (!isEmpty(screenName) && !isEmpty(currentAppLink) && showModal) {
      chatDataScreenLinkRef.current[currentMode].screenName = screenName;
      chatDataScreenLinkRef.current[currentMode].currentAppLink = currentAppLink;
      localStorage.setItem("chatDataScreenLinkRef", JSON.stringify(chatDataScreenLinkRef.current));
    }
  }, [screenName, currentAppLink])




  return (
    <>
      {!minimizedMode ? (
        <>
          {showModal && (
            <div
              className={`${classes.fixedBotPanel} ${
                showExtendedContent
                  ? classes.extendedState
                  : classes.collapsedState
              }`}
            >
              {showAlert && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 1000,
                  }}
                ></div>
              )}
              <div className={classes.sidebar}>
                <button
                  className={classes.sidebarButton}
                  // onClick={() => setShowExtendedContent(!showExtendedContent)}
                >
                  <Menu />
                </button>
                {/* <button
                  className={classes.sidebarButton}
                  onClick={() => handleButtonClick("insights")}
                >
                  {currentMode === "insights" ? (
                    <NavigationSelected />
                  ) : (
                    <Navigation />
                  )}
                </button> */}
                <button
                  className={classes.sidebarButton}
                  onClick={() => handleButtonClick("navigation")}
                >
                  {currentMode === "navigation" ? (
                    <InsightsSelected />
                  ) : (
                    <Insights />
                  )}
                </button>
              </div>

              {showExtendedContent && (
                <div className={classes.extendedContent}>
                  <ChatHistory mode={currentMode} />
                </div>
              )}
              <div
                className={`${classes.modalHeader} ${
                  showExtendedContent
                    ? classes.expandedMargin
                    : classes.collapsedMargin
                }`}
              >
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween}`}
                >
                  <Typography className={classes.botTitle} variant="h6">
                    Alan
                  </Typography>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${classes.headerGap}`}
                  >
                    {enableRefreshAction && (
                      <StyledRefreshIcon
                        className={globalClasses.cursorPointer}
                        onClick={
                          refreshLoader
                            ? () => {}
                            : () => refreshAndUpdateUserManual()
                        }
                        loading={refreshLoader}
                      />
                    )}
                    <MinimiseIcon
                      className={`${globalClasses.cursorPointer} ${classes.svgStyle}`}
                      onClick={() => setMinimizedMode(true)}
                    />
                    <CloseIcon
                      className={`${globalClasses.cursorPointer} ${classes.svgStyle}`}
                      onClick={() => {
                        setShowModal(false);
                        setMinimizedMode(false);
                        props.closeBot(false);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div
                ref={chatBodyRef}
                className={`${classes.modalBody} ${classes.pb10} ${
                  globalClasses.flexRow
                } ${globalClasses.flexColumn}
                ${
                  showExtendedContent
                    ? classes.expandedMargin
                    : classes.collapsedMargin
                }
                `}
              >
                {showAlert && (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      zIndex: 1000,
                    }}
                    className={classes.disableUndoButton}
                  >
                    <Alert
                      actionName="Undo"
                      onAction={handleUndo}
                      onClose={handleCloseAlert}
                      title="Chat cleared successfully"
                      severity="success"
                    />
                  </div>
                )}
                {currentMode === "navigation" && (
                  <>
                    <div
                      className={`${classes.moduleContainer} ${
                        !isCardVisible ? classes.showMode : ""
                      }`}
                    >
                      <div className={classes.moduleText}>
                        {selectedModule === "None" ? (
                          "Please select module"
                        ) : (
                          <>
                            <strong>Module:</strong>{" "}
                            <span>{selectedModule}</span>
                          </>
                        )}
                      </div>
                      <Button
                        label={isCardVisible ? "Hide" : "Show"}
                        size="large"
                        variant="url"
                        onClick={() => setIsCardVisible((prev) => !prev)}
                      >
                        {isCardVisible ? "Hide" : "Show"}
                      </Button>
                    </div>
                    {isCardVisible && (
                      <div className={classes.expandableCardWrapper}>
                        <SelectedModule
                          onSelect={handleModuleSelect}
                          selectedModule={selectedModule}
                          currentMode={currentMode}
                        />
                      </div>
                    )}
                  </>
                )}
                <MessageTemplate
                  templateData={chatDataRef.current}
                  chatMode={currentMode}
                  clearChatSession={clearChatSession}
                  endCurrentSession={endCurrentSession}
                  setUserFlow={setUserFlow}
                  setUserScreenAndFlow={setUserScreenAndFlow}
                  navigateToTheScreen={navigateToTheScreen}
                  screenName={screenName}
                  currentAppLink={currentAppLink}
                  screenLinkData={chatDataScreenLinkRef.current}
                  selectedModule={selectedModule}
                  displaySnackMessages={displaySnackMessages}
                />
              </div>
              <Divider />
              <div
                className={`${classes.modalFooter} ${
                  showExtendedContent
                    ? classes.expandedMargin
                    : classes.collapsedMargin
                }`}
              >
                <div className={classes.footerButtonsLayout}>
                  <div className={classes.footerButtonGroup}>
                    <Tooltip
                      title="End Chat"
                      orientation="top"
                      variant="secondary"
                    >
                      <div>
                        <Button
                          className={classes.iconBtn}
                          icon={
                            <span class="material-symbols-outlined">
                              chat_error
                            </span>
                          }
                          onClick={endCurrentSession}
                          variant="secondary"
                          size="large"
                        />
                      </div>
                    </Tooltip>
                    {/* <Tooltip
                      label={"Save Chat"}
                      orientation={"top"}
                      variant={"secondary"}
                    >
                      <Button
                        icon={<SaveOutlinedIcon />}
                        onClick={() =>
                          setShowExtendedContent(!showExtendedContent)
                        }
                        variant="secondary"
                        size={"large"}
                      />
                    </Tooltip> */}
                  </div>
                  <Button
                    onClick={clearAllChats}
                    variant="secondary"
                    size="small"
                  >
                    Clear all
                  </Button>
                </div>
                <Typography
                  className={classes.footNote}
                  variant=""
                  component="span"
                >
                  **I can make mistakes. Please re-check critical
                  information/steps. Though I am constantly learning and getting
                  better
                </Typography>
                <form
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${classes.headerGap}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    // fetchUserResultsFromQuery();   disabling it for now as this api is not working
                    if (isInputValid()) {
                      fetchUserResultsFromQuery();
                    }
                    // handleSendMessage();
                  }}
                  // disabled={!Boolean(flowType)}
                >
                  <Input
                    className={classes.userInput}
                    value={userInput}
                    onChange={(event) => {
                      setUserInput(event.target.value);
                    }}
                    placeholder="Type Something.."
                    // disabled={!Boolean(flowType)}
                  />
                  <Button
                    type="button" // Ensure this is a button, not submit
                    onClick={() => {
                      if (isInputValid()) {
                        fetchUserResultsFromQuery();
                      }
                    }}
                    variant={"primary"}
                    // disabled={
                    //   !userInput?.length || loader || !Boolean(flowType)
                    // }
                    icon={<span class="material-symbols-outlined">send</span>}
                  ></Button>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          className={classes.minimizedContainer}
          onMouseDown={handleMouseDown}
          ref={minimizedBtnRef}
        >
          <button
            className={`${classes.closeMinizeBtn} ${globalClasses.padding_0}`}
            onClick={() => {
              if (!isDraggingRef.current) {
                setShowModal(false);
                setMinimizedMode(false);
                props.closeBot(false);
              } else {
                isDraggingRef.current = null;
              }
            }}
          >
            <CloseRoundIcon />
          </button>
          <button
            className={classes.minimizedButton}
            onClick={() => {
              if (!isDraggingRef.current) {
                setShowModal(true);
                setMinimizedMode(false);
              } else {
                isDraggingRef.current = null;
              }
            }}
          >
            <BotFace />
            <Typography
              component="span"
              variant="h5"
              className={classes.minimizedButtonText}
            >
              Questions? I’m here to help
            </Typography>
          </button>
        </div>
      )}
    </>
  );
};

export default SmartBot;
