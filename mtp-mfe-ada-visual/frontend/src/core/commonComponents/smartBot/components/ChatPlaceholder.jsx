import { Typography, CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import Center3DIcon from "coreAssets/chatbot/center_3d.svg?url";
import Circular3DIcon from "coreAssets/chatbot/circular_3d.svg?url";
import Speaker3DIcon from "coreAssets/chatbot/speaker_3d.svg?url";
import Arrow3DIcon from "coreAssets/chatbot/arrow_3d.svg?url";
import NoiseTexture from "coreAssets/chatbot/noise.svg?url";
import { useAgentFlow } from "../hooks/useAgentFlow";
import { fetchBaseUrl } from "core/Utils/functions/utils";
import { fetchAgentsInfo } from "../services/chatbot-services";
import colours from "core/Styles/colours";
import { isEmpty } from "lodash";

export const useStyles = makeStyles((theme) => ({
  placeholderContainer: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: pxToRem(40),
    backgroundColor: "#FFFFFF",
  },
  centerIconContainer: {
    // width: pxToRem(80),
    // height: pxToRem(80),
    padding: pxToRem(9),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: pxToRem(10),
    background: "linear-gradient(323deg, rgba(255, 255, 255, 0.11) 5.06%, rgba(255, 255, 255, 0.56) 94.94%)",
    marginBottom: pxToRem(5),
  },
  centerIcon: {
    width: pxToRem(50),
    height: pxToRem(50),
    "& svg": {
      width: "100%",
      height: "100%",
    }
  },
  headingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: pxToRem(8),
    marginBottom: pxToRem(5),
  },
  heading: {
    fontFamily: "Manrope, sans-serif",
    fontSize: pxToRem(20),
    fontWeight: 800,
    lineHeight: pxToRem(30),
    color: colours.boldHeadingBlue,
    textAlign: "center",
  },
  alphaTag: {
    fontFamily: "Manrope, sans-serif",
    fontSize: pxToRem(11),
    fontWeight: 700,
    color: colours.denim,
    backgroundColor: colours.pattensBlue,
    borderRadius: pxToRem(4),
    padding: `${pxToRem(2)} ${pxToRem(8)}`,
    lineHeight: pxToRem(16),
  },
  headingHelperText: {
    fontFamily: "Manrope, sans-serif", 
    fontSize: pxToRem(14),
    fontWeight: 400,
    lineHeight: pxToRem(16),
    color: colours.boldHeadingBlue,
    marginBottom: pxToRem(44),
    // maxWidth: pxToRem(420),
    textAlign: "center",
  },
  rectanglesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: pxToRem(16),
    width: "100%",
    maxWidth: pxToRem(463),
  },
  loaderContainer: {
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: pxToRem(100),
  },
  loader: {
    color: "#D09BF3",
  },
}));

const useRectangleStyles = makeStyles((theme) => ({
  rectangle: {
    width: "100%",
    height: "4rem",
    borderRadius: pxToRem(12),
    padding: pxToRem(16),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between", // Changed to space-between
    gap: pxToRem(16),
    transition: "all 0.2s ease-in-out",
    position: "relative",
    overflow: "hidden",
  },
  rectangleHoverable: {
    cursor: "pointer",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
    },
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundImage: `url(${NoiseTexture})`,
      backgroundRepeat: "repeat",
      backgroundSize: "auto",
      opacity: 0.7,
      mixBlendMode: "overlay",
      pointerEvents: "none",
      zIndex: 1,
    },
  },
  blue: {
    background: `linear-gradient(99.88deg, ${colours.zirconNew} 61.15%, ${colours.perano} 136.15%)`,
  },
  red: {
    background: `linear-gradient(99.88deg, ${colours.chablis} 61.15%, ${colours.geraldine} 136.15%);
`,
  },
  green: {
    background: `linear-gradient(99.88deg, ${colours.panacheNew} 61.15%, ${colours.oceanGreen} 136.15%);
`,
  },
  textContainer: {
    flex: 1,
    zIndex: 2,
    position: "relative",
    order: 1, // Text comes first (left side)
  },
  iconContainer: {
    width: pxToRem(56),
    height: pxToRem(56),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: pxToRem(12),
    backgroundColor: "transparent",
    flexShrink: 0,
    zIndex: 2,
    position: "relative",
    order: 2, // Icon comes second (right side)
  },
  icon: {
    width: pxToRem(36),
    height: pxToRem(36),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": {
      width: "100%",
      height: "100%",
      display: "block",
    }
  },
  title: {
    fontFamily: "Manrope, sans-serif",
    fontSize: pxToRem(14),
    fontWeight: 600,
    lineHeight: pxToRem(21),
    color: "#1F2B4D",
    marginBottom: pxToRem(2),
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  description: {
    fontFamily: "Manrope, sans-serif",
    fontSize: pxToRem(12),
    fontWeight: 500,
    lineHeight: pxToRem(16),
    color: "#60697D",
  },
}));

const Rectangle = ({ type, icon, title, description, onClick, hoverable }) => {
  const classes = useRectangleStyles();
  const titleRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    const el = titleRef.current;
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, []);

  useEffect(() => {
    checkTruncation();
  }, [title, checkTruncation]);

  return (
    <div 
      className={`${classes.rectangle} ${classes[type]} ${hoverable ? classes.rectangleHoverable : ''}`}
      onClick={onClick}
      title={isTruncated ? title : null}
    >
      <div className={classes.textContainer}>
        <Typography className={classes.title} ref={titleRef}>
          {title}
        </Typography>
        <Typography className={classes.description}>
          {description}
        </Typography>
      </div>
      <div className={classes.iconContainer}>
        <div className={classes.icon}>{icon}</div>
      </div>
    </div>
  );
};

const ChatPlaceholder = (props) => {
  const {
    dateFormat,
    chatDataRef,
    currentMode,
    setShowChatPlaceholder,
    setLoader,
    setCurrentAgentId,
    baseUrl,
    setBaseUrl,
    setCurrentSessionId,
    customChatConfig,
    chatDataInfoRef,
    setChatDataState,
    userInput,
    legacyAgentScreen,
    activeConversationId,
    chatBodyRef,
    chatbotContext,
    setInitValue,
    setSessionId,
    thinkingContent,
    setThinkingContent,
    isThinking,
    setIsThinking,
    chatId,
    setChatId,
    isStop,
    setIsStop,
    functionsRef,
    functionsState,
    setFunctionsState,
    thinkingHeaderMessage,
    setThinkingHeaderMessage,
    uniqueChatId,
    setUniqueChatId,
    fieldNumber,
    setFieldNumber,
    setAdditionalArgs,
    questions,
    displayQuestions,
    setActiveConversationId
  } = props;
  const classes = useStyles();
  const [cardList, setCardList] = useState([]);
  const [loading, setLoading] = useState(false);

  const { setAgentFlow } = useAgentFlow(
    dateFormat,
    chatDataRef,
    currentMode,
    setShowChatPlaceholder,
    setLoader,
    baseUrl,
    setCurrentSessionId,
    customChatConfig,
    chatDataInfoRef,
    {
      setChatDataState,
      runStreaming: true,
      activeConversationId,
      chatBodyRef,
      chatbotContext,
      setInitValue,
      setSessionId,
      thinkingContent,
      setThinkingContent,
      isThinking,
      setIsThinking,
      chatId,
      setChatId,
      isStop,
      setIsStop,
      functionsRef,
      functionsState,
      setFunctionsState,
      thinkingHeaderMessage,
      setThinkingHeaderMessage,
      uniqueChatId,
      setUniqueChatId,
      fieldNumber,
      setFieldNumber,
      setAdditionalArgs,
      setActiveConversationId
    }
  );

  const getBaseUrl = async () => {
    try {
      let basUrl = await fetchBaseUrl();
      setBaseUrl(basUrl);
      return basUrl;
    } catch (err) {
      console.error("Error loading base url:", err);
    }
  };

  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        const response = await fetchAgentsInfo(baseUrl);
        if (response?.data?.data) {
          setCardList(response.data.data);
        }
      } catch (err) {
        console.error("Error loading chat cards:", err);
      } finally {
        setLoading(false);
      }
    };
    if (baseUrl && legacyAgentScreen && !displayQuestions && isEmpty(cardList)) {
      loadCards();
    }
    if (questions && Array.isArray(questions) && questions.length > 0 && displayQuestions) {
      setCardList(questions);
    }
  }, [baseUrl, questions, displayQuestions]);

  useEffect(() => {
    getBaseUrl();
  }, []);

  const handleRectangleClick = (agentId, title) => {
    if (legacyAgentScreen || displayQuestions) {
      setCurrentAgentId(agentId);
      const initiateAgentPayload = {
        agent_id: agentId,
        session_id: null,
        user_input: title,
        init: true,
        delay: 0.3,
      };
      setAgentFlow(initiateAgentPayload, "", baseUrl);
    }
    // setAgentFlow(initiateAgentPayload, "", baseUrl);
  };

  if (loading) {
    return (
      <div className={classes.loaderContainer}>
        <CircularProgress className={classes.loader} size={50} thickness={4} />
      </div>
    );
  }

  // Rectangle data matching the exact Figma design
  const rectangleData = [
    {
      type: "blue",
      icon: <img src={Circular3DIcon} alt="Circular 3D" />,
      title: "Fetch Stockout Articles",
      description: "Fetch Stockout Articles allows you to quickly identify.",
      agentId: cardList[0]?.agentId || "1"
    },
    {
      type: "red", 
      icon: <img src={Speaker3DIcon} alt="Speaker 3D" />,
      title: "Risk of Stockouts",
      description: "Fetch Stockout Articles allows you to quickly identify.",
      agentId: cardList[1]?.agentId || "2"
    },
    {
      type: "green",
      icon: <img src={Arrow3DIcon} alt="Arrow 3D" />,
      title: "Opportunities", 
      description: "Fetch Stockout Articles allows you to quickly identify.",
      agentId: cardList[2]?.agentId || "3"
    }
  ];

  // Transform cardList for legacy agent screen
  const transformedCardList = cardList.map((card) => ({
    type: "blue",
    icon: <img src={Circular3DIcon} alt="Circular 3D" />,
    title: card.name || card.title || "Agent",
    description: card.description || card.helpText || "",
    agentId: card.agentId || card.id
  }));

  const dataToMap = (legacyAgentScreen || displayQuestions)  ? transformedCardList : rectangleData;

  return (
    <div className={classes.placeholderContainer}>
      <div className={classes.centerIconContainer}>
        <img src={Center3DIcon} alt="Alan AI Assistant" className={classes.centerIcon} />
      </div>
      
      <div className={classes.headingContainer}>
        <Typography variant="h1" className={classes.heading}>
          Alan's Capabilities
        </Typography>
        <span className={classes.alphaTag}>Alpha</span>
      </div>
      
      <Typography variant="body1" className={classes.headingHelperText}>
        Discover potential issues & opportunities Alan can help you with!
      </Typography>
      
      <div className={classes.rectanglesContainer}>
        {dataToMap.map((item, index) => (
          <Rectangle
            key={index}
            type={item.type}
            icon={item.icon}
            title={item.title}
            description={item.description}
            onClick={() => handleRectangleClick(item?.agentId, item?.title)}
            hoverable={legacyAgentScreen || displayQuestions}
          />
        ))}
      </div>
    </div>
  );
};

export default ChatPlaceholder;
