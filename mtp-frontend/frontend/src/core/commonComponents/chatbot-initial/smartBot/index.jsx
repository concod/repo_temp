import React, { useEffect, useState, useRef, useMemo } from "react";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import SendIcon from "assets/sendIcon.svg";
import BotFace from "assets/botFace.svg";
import CloseIcon from "@mui/icons-material/Close";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseRoundIcon from "assets/closeRoundIcon.svg";
import { Button, Input } from "impact-ui";
import { navigationOptions, insightsOptions } from "./smartBotConstants";
import moment from "moment";
import { Typography } from "@mui/material";
import {
  resolveChatQuery,
  fetchScreensForModule,
  fetchRelatedQuestions,
  refreshAndUpdateUserManualApi,
} from "./smartBotservices";
import { isNull } from "lodash";
import { getUserName } from "./utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import RedirectLink from "./redirect-link";
import { pxToRem } from "core/Utils/functions/utils";
import HighlightedRenderer from "./highlighted-renderer";
import colours from "core/Styles/colours";
import { addSnack } from "core/actions/snackbarActions";
import { useDispatch } from "react-redux";
import { StyledRefreshIcon } from "./styled";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";

const useStyles = makeStyles((theme) => ({
  botTitle: {
    fontWeight: 600,
    lineHeight: "normal",
  },
  botViewBlock: {
    background: theme.palette.colours.botBlockBackgroud,
    gap: "0.5rem",
    width: "88%",
    padding: "0.625rem 1rem",
  },
  botViewHeader: {
    color: theme.palette.textColours.botDateChipText,
  },
  closeMinizeBtn: {
    background: "none",
    border: "none",
    borderRadius: "50%",
    boxShadow: "0 -0.125px 0.25px 0 rgba(0, 0, 0, 0.16)",
    left: 0,
    lineHeight: 0,
    outline: "none",
    position: "absolute",
    top: 0,
    transform: "translateX(-20%)",
  },
  dateChip: {
    alignSelf: "center",
    borderRadius: "0.25rem",
    background: theme.palette.colours.botDateChipBackground,
    boxShadow: `0 0.125rem 0.25rem 0 rgba(0, 0, 0, 0.07)`,
    color: theme.palette.textColours.botDateChipText,
    display: "flex",
    lineHeight: "normal",
    minWidth: "9rem",
    padding: "0.25rem 1rem",
    position: "sticky",
    textAlign: "center",
    top: 0,
  },
  fixedBotPanel: {
    position: "fixed",
    top: "4rem",
    height: "calc(100vh - 3.5rem)",
    right: 0,
    background: theme.palette.common.white,
    boxShadow:
      "0 0.5rem 0.5rem 0 rgba(0, 0, 0, 0.16), inset 0 1px 0.5rem 0 rgba(0, 0, 0, 0.16)",
    width: "max(40%, 48rem)",
    zIndex: 1201,
    display: "flex",
    flexDirection: "column",
  },
  footNote: {
    fontSize: "0.65rem",
    color: "#646CE7",
    marginBottom: "0.25rem",
  },
  gptChips: {
    display: "inline-flex",
    color: "#646CE7",
    padding: "0.25rem 1rem",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "1rem",
    border: "1px solid #646CE7",
    background: "#F0F1FF",
  },
  svgStyle: {
    "& path": {
      fill: colours.slateGrayLight,
    },
  },
  gptQuestionBlock: {
    gap: "0.75rem",
    "&.highLightingStyles": {
      width: "fit-content",
      background: "red",
      color: "white",
    },
  },
  gptQuestionContainer: {
    gap: "0.625rem",
  },
  gptQuestions: {
    color: "#646CE7",
    lineHeight: pxToRem(20),
    "& span": {
      background: colours.portage,
      color: colours.white,
      padding: `${pxToRem(1)} ${pxToRem(4)}`,
      borderRadius: pxToRem(4),
    },
  },
  maxWidthFitContent: {
    width: "100%",
    maxWidth: "fit-content",
  },
  loader: {
    width: theme.typography.pxToRem(30),
    aspectRatio: 3,
    animation: `$animateDots 3s infinite linear`,
    ...((_props) => {
      let setting = `no-repeat radial-gradient(circle closest-side,${theme.palette.colours.botLoaderBackgroud} 90%,${theme.palette.colours.botBlockBackgroud})`;
      return {
        background: `${setting} 0% 50%, ${setting} 50%  50%, ${setting} 100% 50%`,
        backgroundSize: "0.5rem 70%",
      };
    })(),
    height: theme.typography.pxToRem(60),
  },
  minimizedButton: {
    background: `linear-gradient(137deg, ${theme.palette.colours.miniButtonBGPrimary} 27.69%, ${theme.palette.colours.miniButtonBGSecondary} 88.31%)`,
    border: "none",
    borderRadius: "2.5rem",
    boxShadow: `-0.125rem -0.125rem 0.25rem 0 rgba(0, 0, 0, 0.35) inset, 0.125rem 1px 0.1875rem 0 rgba(255, 255, 255, 0.45) inset, 0 0.25rem 0.25rem 0 rgba(0, 0, 0, 0.25)`,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1.25rem",
  },
  minimizedButtonText: {
    color: theme.palette.common.white,
  },
  minimizedContainer: {
    whiteSpace: "nowrap",
    left: (props) => {
      let xPos = props.position?.x
        ? theme.typography.pxToRem(props.position?.x)
        : `calc(100% - 2.5rem - ${
            props.minimizedBtnRef?.current?.offsetWidth || 0
          }px)`;
      return xPos;
    },
    top: (props) => {
      let yPos = props.position?.y
        ? theme.typography.pxToRem(props.position?.y)
        : `calc(100vh - 2.5rem - ${
            props.minimizedBtnRef?.current?.offsetHeight || 0
          }px)`;
      return yPos;
    },
    position: "fixed",
    zIndex: 1201,
  },
  modalHeader: {
    padding: "0.75rem 1.25rem",
    borderBottom: `1px solid ${theme.palette.colours.disabledSelectBackground}`,
  },
  modalBody: {
    flexGrow: 1,
    overflowY: "scroll",
    padding: "1.25rem",
    position: "relative",
    gap: theme.typography.pxToRem(10),
  },
  modalFooter: {
    padding: "0.75rem 1.25rem 1.25rem",
    marginTop: "auto",

    "& .input-container": {
      flexGrow: 1,
    },
  },
  sendButton: {
    border: "none",
    borderRadius: "0.25rem",
    background: theme.palette.colours.botbuttonBackground,
    cursor: "pointer",
    height: "2.3125rem",
    lineHeight: 1,
    padding: "0.5rem",

    "&:disabled": {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.textColours.codGray,
      cursor: "default",
    },
  },
  bodyTextStyling: {
    lineHeight: pxToRem(20),
  },
  userViewBlock: {
    alignSelf: "flex-end",
    background: theme.palette.colours.botDateChipBackground,
    gap: "0.5rem",
    width: "88%",
    padding: "0.625rem 1rem",
  },
  "@keyframes animateDots": {
    "0%": {
      backgroundPosition: "0% 50%, 50% 50%,100% 50%",
    },
    "13%": {
      backgroundPosition: "0% 50%, 50% 50%,100% 100%",
    },
    "25%": {
      backgroundPosition: "0% 50%, 50% 100%,100% 100%",
    },
    "38%": {
      backgroundPosition: "0% 100%, 50% 50%,100% 50%",
    },
    "50%": {
      backgroundPosition: "0% 50%, 50% 50%,100% 50%",
    },
    "63%": {
      backgroundPosition: "0% 50%, 50% 50%,100% 0%",
    },
    "75%": {
      backgroundPosition: "0% 50%, 50% 0%,100% 0%",
    },
    "87%": {
      backgroundPosition: "0% 0%, 50% 0%,100% 0%",
    },
    "100%": {
      backgroundPosition: "0% 50%, 50% 50%,100% 50%",
    },
  },
}));

const MessageTemplate = (props) => {
  const {
    templateData,
    endCurrentSession,
    clearChatSession,
    screenName,
    currentAppLink,
  } = { ...props };
  const globalClasses = globalStyles();
  const classes = useStyles();
  const dateFormat = "DD-MM-YYYY HH:mm:ss";

  const renderActionableCTA = () => {
    return (
      <>
        {screenName && (
          <div className={`${globalClasses.layoutAlignStart}`}>
            <RedirectLink to={currentAppLink} screenName={screenName} />
          </div>
        )}
        <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
          <Button variant="url" onClick={endCurrentSession}>
            End Chat
          </Button>
          <Button variant="url" onClick={clearChatSession}>
            Clear Chat
          </Button>
        </div>
      </>
    );
  };

  const renderDateChip = (dateString) => {
    return (
      <Typography variant="body1" component="span" className={classes.dateChip}>
        {dateString}
      </Typography>
    );
  };

  const botView = (botData) => {
    let time = moment(botData.timeStamp, dateFormat).format("HH:mm A");
    return (
      <div
        className={`${classes.botViewBlock} ${globalClasses.flexRow} ${globalClasses.flexColumn}`}
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
        {botData?.noShowHeaderTitle ? (
          <></>
        ) : (
          Boolean(botData.headerTitle?.length) && (
            <Typography>{botData.headerTitle}</Typography>
          )
        )}
        {parseBody(botData)}
      </div>
    );
  };

  const parseBody = (botData) => {
    switch (botData.bodyType) {
      case "text":
        return Boolean(botData.bodyText.includes("\n")) ? (
          <div>
            {botData.bodyText.split("\n").map((text) => (
              <>
                <Typography className={classes.bodyTextStyling}>
                  {text}
                </Typography>
                <br />
              </>
            ))}
          </div>
        ) : (
          <Typography>{botData.bodyText}</Typography>
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
    return (
      <div
        className={`${classes.userViewBlock} ${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.gap}`}
      >
        {Boolean(userData.bodyText.includes("\n")) ? (
          <div>
            {userData.bodyText.split("\n").map((text) => (
              <Typography>{text}</Typography>
            ))}
          </div>
        ) : (
          <Typography>{userData.bodyText}</Typography>
        )}
        <Typography variant="text" className={classes.botViewHeader}>
          {time}
        </Typography>
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
    if (!templateData?.length) {
      return <></>;
    }
    let dayData;
    return templateData?.map((data, index) => {
      let currentDayData;
      if (data.timeStamp) {
        let date = moment(data.timeStamp, dateFormat).date();
        let month = moment(data.timeStamp, dateFormat).format("MMMM");
        let year = moment(data.timeStamp, dateFormat).format("YYYY");
        currentDayData = `${date} ${month} ${year}`;
      }

      let dateChip;
      if (currentDayData != dayData) {
        dayData = currentDayData;
        dateChip = renderDateChip(currentDayData);
      }

      let chatCTA;
      if (
        ["bot", "loader"].includes(data.userType) &&
        templateData.length === index + 1
      ) {
        chatCTA = renderActionableCTA();
      }
      switch (data.userType) {
        case "bot":
          return (
            <>
              {dateChip}
              {botView(data)}
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
  }, [templateData]);

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
  const [currentAppLink, setCurrentAppLink] = useState("/home");
  const [loader, setLoader] = useState(false);
  const [enableRefreshAction, setEnableRefreshAction] = useState(false);
  const [refreshLoader, setRefreshLoader] = useState(false);
  const grabPositionRef = useRef(null);
  const chatDataRef = useRef();
  const chatBodyRef = useRef();
  const isDraggingRef = useRef(null);
  const minimizedBtnRef = useRef();
  const globalClasses = globalStyles();
  const classes = useStyles({ position, minimizedBtnRef });
  const navigate = useNavigate();
  const location = useLocation();
  const dateFormat = "DD-MM-YYYY HH:mm:ss";
  const dispatch = useDispatch();

  const parseSavedFlow = (savedChatSession) => {
    if (
      !savedChatSession.length ||
      savedChatSession[savedChatSession.length - 1].userType === "bot"
    ) {
      chatDataRef.current = savedChatSession;
    } else {
      const userType = savedChatSession[savedChatSession.length - 1].userType;
      const lastIndex = userType === "loader" ? 2 : 1;
      const savedUserInput =
        savedChatSession[savedChatSession.length - lastIndex];
      chatDataRef.current = savedChatSession.slice(
        0,
        savedChatSession.length - lastIndex
      );
      if (savedUserInput?.hasDirectActionType) {
        fetchUserResultsFromQuery(savedUserInput, true);
      } else {
        setFlowType(savedUserInput.flow_type);
        setScreenName(savedUserInput.screen_name);
        setUserInput(savedUserInput.screen_name);
      }
    }
  };

  const saveCurrentChanges = () => {
    const charData = JSON.stringify(chatDataRef.current);
    localStorage.setItem("chatData", charData);
  };

  const endCurrentSession = () => {
    clearChatSession();
    setShowModal(false);
    setMinimizedMode(false);
    setScreenName("");
    props.closeBot(false);
  };

  const clearChatSession = () => {
    setFlowType(null);
    setUserInput("");
    setScreenName("");
    initiateNewChat();
  };

  const initiateNewChat = () => {
    const initialGreet = [
      {
        timeStamp: getCurrentDateTimeString(),
        userType: "bot",
        userName: "Smart Sage - The smart bot assist",
        headerTitle: `Hi ${getUserName()}!`,
        bodyType: "text",
        bodyText: `I am SmartSage - your digital sherpa. I am here to help you with anything on IA smart Platform`,
      },
      {
        timeStamp: getCurrentDateTimeString(),
        userType: "bot",
        userName: "Smart Sage - The smart bot assist",
        headerTitle: "Please select what you want my help with!",
        bodyType: "chips",
        bodyText: [
          {
            displayText: "Insights",
            flow_type: "insights",
            interactable: true,
            actionType: "direct",
            actionName: "setUserFlow",
          },
          {
            displayText: "General Navigation",
            flow_type: "navigation",
            interactable: true,
            actionType: "direct",
            actionName: "setUserFlow",
          },
        ],
      },
    ];
    chatDataRef.current = initialGreet;
  };

  const setUserFlow = async (data) => {
    setLoader(true);
    const currentTimeString = getCurrentDateTimeString();
    let headerTitle;
    let screenOptions = {};
    const userChat = {
      timeStamp: currentTimeString,
      userType: "user",
      bodyText: data.displayText,
      flow_type: data.flow_type,
    };
    const loaderData = {
      userName: "Smart Sage",
      timeStamp: currentTimeString,
      userType: "loader",
    };
    chatDataRef.current = [...chatDataRef.current, userChat, loaderData];
    try {
      const options = await fetchScreensForModule(data.flow_type);
      if (options.data.data.screen_name?.length) {
        headerTitle = `Please select for which Modules you ${
          data.flow_type === "navigation"
            ? "need help for."
            : "want insights for."
        }`;
        screenOptions = setScreens(
          options.data.data.screen_name,
          headerTitle,
          currentTimeString,
          data.flow_type
        );
        chatDataRef.current = [
          ...chatDataRef.current?.filter((data) => data.userType != "loader"),
          screenOptions,
        ];
      } else {
        const failResponseText = {
          timeStamp: getCurrentDateTimeString(),
          userType: "bot",
          userName: "Smart Sage",
          bodyText: options.data.data.message,
          headerTitle: "",
          noShowHeaderTitle: true,
          bodyType: "text",
        };
        chatDataRef.current = [
          ...chatDataRef.current?.filter((data) => data.userType != "loader"),
          failResponseText,
        ];
      }
      setFlowType(data.flow_type);
      setLoader(false);
    } catch (error) {
      const failResponseText = {
        timeStamp: getCurrentDateTimeString(),
        userType: "bot",
        userName: "Smart Sage",
        bodyText: "Failed to fetch user screens. Please try again later.",
        headerTitle: "",
        noShowHeaderTitle: true,
        bodyType: "text",
      };
      chatDataRef.current = [
        ...chatDataRef.current?.filter((data) => data.userType != "loader"),
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
      userName: "Smart Sage",
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

  const setUserScreenAndFlow = (data) => {
    setFlowType(data?.flow_type);
    setScreenName(data?.screen_name);
    localStorage.setItem("smartBotScreenName", data?.screen_name);
    setQuestionIndex(data?.question_index);
    if (data?.link) {
      setCurrentAppLink(data?.link);
      localStorage.setItem("smartBotCurrentAppLink", data?.link);
    } else {
      let link;
      const typeOptions =
        data.flowType === "navigation"
          ? [...navigationOptions]
          : [...insightsOptions];
      typeOptions.forEach((option) => {
        if (option.screen_name == data?.screen_name) {
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
    const input = fetchQuestions ? refObject.screen_name : userInput;
    setUserInput("");
    const userChat = {
      timeStamp: currentTimeString,
      userType: "user",
      bodyText: input,
      screen_name: fetchQuestions ? refObject.screen_name : screenName,
      flow_type: fetchQuestions ? refObject.flow_type : flowType,
      hasDirectActionType: fetchQuestions,
    };
    const loaderData = {
      userName: "Smart Sage",
      timeStamp: currentTimeString,
      userType: "loader",
    };
    chatDataRef.current = [...chatDataRef.current, userChat, loaderData];
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
          refObject.flow_type,
          refObject.screen_name
        );
        if (isNull(queryResponse?.data?.data)) {
          getUpdatedChat = parseResponse(inCaseOfNoDataObject, "text");
        } else {
          getUpdatedChat = parseResponse(queryResponse.data.data, "questions");
        }
      } else {
        let body = {};
        if (flowType === "insights") {
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
        queryResponse = await resolveChatQuery(body, flowType);
        if (isNull(queryResponse?.data?.data)) {
          getUpdatedChat = parseResponse(inCaseOfNoDataObject, "text");
        } else {
          getUpdatedChat = parseResponse(queryResponse.data.data, "text");
        }
      }
      chatDataRef.current = [
        ...chatDataRef.current?.filter((data) => data.userType != "loader"),
        getUpdatedChat,
      ];
      setLoader(false);
    } catch (error) {
      setLoader(false);
      console.error("error", error);
    }
  };

  const parseResponse = (data, type) => {
    const timeString = getCurrentDateTimeString();

    switch (type) {
      case "text":
        return {
          timeStamp: timeString,
          userType: "bot",
          userName: "Smart Sage",
          bodyText: data.response,
          headerTitle: data.response_heading,
          noShowHeaderTitle: true,
          bodyType: "text",
        };
      case "questions":
        return {
          timeStamp: timeString,
          userType: "bot",
          userName: "Smart Sage",
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
      if (!chatDataRef?.current?.length) {
        const data = localStorage.getItem("chatData");
        let chatData = JSON.parse(data);
        if (chatData?.length > 0) {
          const savedChatSession = chatData;
          parseSavedFlow(savedChatSession);
        } else {
          initiateNewChat();
        }
      }
    }
  }, [showModal]);

  useEffect(() => {
    if (chatDataRef.current) {
      saveCurrentChanges();
      const scrollToPosition = Number(
        chatBodyRef.current?.lastChild?.offsetTop
      );
      chatBodyRef.current?.scrollTo({
        top: scrollToPosition,
        behavior: "smooth",
      });
    }
  }, [chatDataRef.current]);

  return (
    <>
      {!minimizedMode ? (
        <>
          {showModal && (
            <div className={classes.fixedBotPanel}>
              <div className={classes.modalHeader}>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween}`}
                >
                  <Typography className={classes.botTitle} variant="h6">
                    Smart Sage
                  </Typography>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.gap}`}
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
                    <RemoveIcon
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
                className={`${classes.modalBody} ${globalClasses.flexRow} ${globalClasses.flexColumn}`}
              >
                <MessageTemplate
                  templateData={chatDataRef.current}
                  clearChatSession={clearChatSession}
                  endCurrentSession={endCurrentSession}
                  setUserFlow={setUserFlow}
                  setUserScreenAndFlow={setUserScreenAndFlow}
                  navigateToTheScreen={navigateToTheScreen}
                  screenName={screenName}
                  currentAppLink={currentAppLink}
                />
              </div>
              <div className={classes.modalFooter}>
                {chatDataRef.current?.length > 3 ? (
                  <Typography
                    className={classes.footNote}
                    variant=""
                    component="span"
                  >
                    **I can make mistakes. Please re-check critical
                    information/steps. Though I am constantly learning and
                    getting better
                  </Typography>
                ) : (
                  <></>
                )}
                <form
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.gap}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    fetchUserResultsFromQuery();
                  }}
                  disabled={loader || !Boolean(flowType)}
                >
                  <Input
                    className={classes.userInput}
                    value={userInput}
                    onChange={(event) => {
                      setUserInput(event.target.value);
                    }}
                    placeholder="Type your question here.."
                    disabled={loader || !Boolean(flowType)}
                  />
                  <button
                    className={classes.sendButton}
                    disabled={
                      !userInput?.length || loader || !Boolean(flowType)
                    }
                    onClick={fetchUserResultsFromQuery}
                  >
                    <SendIcon />
                  </button>
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
