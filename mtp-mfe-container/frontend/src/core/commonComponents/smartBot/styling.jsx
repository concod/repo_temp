import RefreshIcon from "@mui/icons-material/Refresh";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import styled from "styled-components";

export const useStyles = makeStyles((theme) => ({
  botTitle: {
    fontFamily: "Manrope",
    fontSize: "16px",
    fontWeight: 800,
    lineHeight: "normal",
    color: colours.darkBlack,
  },
  ml12: {
    marginLeft: pxToRem(12),
  },
  BotMessage: {
    // paddingLeft: "16px",
    "&.bgWhite": {
      background: theme.palette.common.white,
    }
  },
  botViewBlock: {
    background: colours.appBackground,
    // width: "88%",
    // padding: "10px 12px",
    borderRadius: "10px",

    // marginLeft: pxToRem(12),BotMessage
    "&.bgWhite": {
      background: theme.palette.common.white,
    }
  },
  botTitleView: {
    //  background: theme.palette.common.white,
    color: colours.lighGrey,
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: "14px",
    marginRight: "7px",
  },
  userViewBlock: {
    display: "inline-flex", // Automatically adjust width to fit content
    alignSelf: "flex-end", // Align message bubble to the right
    background: theme.palette.grey[300], // Grey background for the message bubble
    padding: "0.75rem", // Padding around the message
    borderRadius: "0.5rem",
    marginBottom: "0.5rem",
    maxWidth: "80%", // Cap the width for long messages
    minWidth: "20%", // Ensure small messages like "Hi" take minimal space
    wordWrap: "break-word", // Wrap long words or URLs
    textAlign: "left",
    width: "fit-content",
  },
  firstRow: {
    display: "flex",
    alignItems: "center", // Align time and double ticks vertically
    gap: "0.5rem", // Add spacing between time and double ticks
  },
  doubleTicks: {
    fontSize: "0.75rem",
    color: theme.palette.success.main,
  },
  messageRow: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: colours.backgroundChat,
    marginTop: "0.5rem", // Add space between the first row and message text
    padding: "10px 12px 10px 12px",
    borderRadius: "10px",
  },
  messageText: {
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
  },
  time: {
    fontFamily: "Manrope",
    color: colours.timeColor,
    //  background: theme.palette.common.white,
    fontWeight: 500,
    fontSize: "12px",
    marginTop: "1.5px",
  },
  chatbotText: {
    fontFamily: "Manrope",
    fontWeight: 400,
    fontSize: "14px",
    lineHeight: "21px",
  },
  boldText: {
    fontWeight: 600,
  },
  combinedBlockHeaderTitle: {
    marginBottom: "0.5rem",
  },
  botViewHeader: {
    color: theme.palette.textColours.botDateChipText,
  },
  headerGap: {
    gap: "8px", // to be confirmed from UI/UX
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
    borderRadius: "1.25rem",
    background: colours.appBackground,
    color: colours.darkGrey,
    display: "flex",
    lineHeight: "normal",
    minWidth: "4rem",
    padding: "2px 8px 2px 8px",
    position: "sticky",
    textAlign: "center",
    top: 0,
    zIndex: 1,
    border: `1px solid ${colours.borderDarkGray}`,
    fontFamily: "Manrope",
    fontsize: "14px !important",
    fontWeight: 500,
  },
  fixedBotPanel: {
    position: "fixed",
    height: "100%",
    right: 0,
    background: theme.palette.common.white,
    zIndex: 1201,
    display: "flex",
    flexDirection: "column",
    transition: "width 0.3s ease",
    boxShadow: `0px 10px 0px ${theme.palette.colours.panelShadow}`,
  },
  extendedState: {
    width: "1266px", // Width when extended content is visible
  },
  collapsedState: {
    width: "840px", // Width when extended content is hidden
  },

  moduleContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center", // Align vertically in the center
    flexWrap: "nowrap", // Prevent wrapping to the next line
    padding: `${pxToRem(12)} ${pxToRem(16)}`,
    marginTop: "-8px",
  },
  showMode: {
    borderRadius: "0px 0px 12px 12px",
    boxShadow: "0px 0px 4px 0px rgba(0, 0, 0, 0.12)",
  },
  moduleText: {
    fontWeight: 600,
    color: colours.darkBlack,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem", // Add spacing between "Module:" and its value
    flexShrink: 0, // Prevent shrinking of the text
    fontFamily: "Manrope",
    fontSize: "14px",
    "& strong": {
      color: colours.lighGrey, // Style for "Module:"
    },
    "& span": {
      color: colours.lightPurple, // Style for "{selectedModule}"
    },
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "70px", // Adjusted width for 3/4th
    background: colours.appBackground,
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
    gap: "4px",
    alignItems: "center",
    zIndex: 1202, // Ensure the sidebar stays above other elements
    transition: "width 0.3s ease", // Smooth transition for width changes
    borderRight: `1px solid  ${theme.palette.background.separaterColor}`,
  },
  tooltipStyling: {
    background: theme.palette.common.white,
    color: theme.palette.text.primary,
  },
  extendedContent: {
    position: "absolute",
    top: 0,
    left: "4.5rem", // Position next to the sidebar
    height: "100%",
    width: "415px", // Remaining 3/4th width
    background: theme.palette.common.white,
    // padding: "0.25rem",
    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.1)`,
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    zIndex: 1203, // Ensure it stays behind the main sidebar
  },
  sidebarButton: {
    border: "none",
    background: colours.appBackground,
    cursor: "pointer",
  },
  toggleButton: {
    padding: "0.5rem 1rem",
    background: "transparent",
    color: colours.lightPurple,
    border: "none",
    borderRadius: "0.25rem",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "Manrope",
    fontWeight: "500",
  },
  card: {
    padding: "1rem",
    background: "transparent",
    border: `1px solid ${theme.palette.grey[300]}`,
    borderRadius: "0.25rem",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
  },
  expandableCardWrapper: {
    position: "absolute", // Position the card below the row
    top: "3rem", // Adjust based on button height
    left: 0,
    width: "100%",
    zIndex: 1000, // Ensure it's on top of other elements
    borderRadius: "0px 0px 12px 12px",
    boxShadow: "0px 8px 10px 0px #0000000F",
    paddingBottom: pxToRem(12),
    background: theme.palette.common.white,
  },
  option: {
    flex: "1 1 calc(50% - 1rem)", // Two items per row
    background: theme.palette.common.white,
    border: `1px solid ${theme.palette.grey[300]}`,
    borderRadius: "0.25rem",
    padding: "0.75rem",
    textAlign: "center",
    cursor: "pointer",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    "&:hover": {
      background: theme.palette.action.hover,
    },
  },
  footerButtonsLayout: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 0 ${pxToRem(8)}`,
  },
  footerButtonGroup: {
    display: "flex",
    gap: theme.spacing(1), // Use theme spacing for consistency
  },
  modeButtons: {
    border: "none",
  },
  footNote: {
    fontSize: "0.65rem",
    color: "#646CE7",
    marginBottom: "0.25rem",
  },
  mt2: {
    marginTop: pxToRem(2),
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
  // svgStyle: {
  //   "& path": {
  //     fill: colours.slateGrayLight,
  //   },
  // },
  gptQuestionBlock: {
    gap: "0.75rem",
    "&.highLightingStyles": {
      width: "fit-content",
      background: "red",
      color: "white",
    },
    background: "linear-gradient(90deg, rgba(239, 242, 250, 0.40) 0%, #EFF2FA 100%)",
  },
  gptQuestionContainer: {
    gap: pxToRem(4),
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
  iconBtn: {
    "& .material-symbols-outlined": {
      fontSize: pxToRem(16),
    },
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
    paddingLeft: "16px",
    paddingRight: "16px",
    paddingTop: "14px",
    paddingBottom: "1px",
    borderBottom: `1px solid ${colours.separaterColor}`,
    transition: "margin-left 0.3s ease",
    height: "56px",
  },
  modalBody: {
    flexGrow: 1,
    // overflow: "scroll",
    position: "relative",
    gap: theme.typography.pxToRem(10),
    transition: "margin-left 0.3s ease",
    overflowY: "auto",
    "&::-webkit-scrollbar": {
      display: "none",
    },
    scrollbarWidth: "none",
    "-ms-overflow-style": "none",
  },
  modalFooter: {
    paddingLeft: "16px",
    paddingRight: "16px",
    paddingBottom: "8px",
    marginTop: "8px",
    transition: "margin-left 0.3s ease",
    "& .input-container": {
      flexGrow: 1,
      fontSize: pxToRem(14),
      "& input": {
        border: `1px solid ${theme.palette.colours.commentPopoverBorder}`,
        height: pxToRem(32),
        borderRadius: pxToRem(8),
      },
    },
  },
  expandedMargin: {
    marginLeft: "30.5rem", // Margin in expanded state
  },
  collapsedMargin: {
    marginLeft: "4.3rem", // Margin in collapsed state
    marginTop: "8px",
  },
  sendButton: {
    border: "none",
    borderRadius: "8px",
    background: colours.lightPurple,
    cursor: "pointer",
    height: "32px",
    paddingLeft: "8px",
    paddingRight: "8px",
    paddingTop: "4.5px",
    paddingBottom: "8px",

    "&:disabled": {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.textColours.codGray,
      cursor: "default",
    },
  },
  bodyTextStyling: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "24px",
    color: colours.lightNeutrals,
    // marginBottom: pxToRem(16), // Add smaller spacing between paragraphs
    "&:last-child": {
      marginBottom: 0, // Remove margin from last paragraph
    }
  },
  userViewBlock: {
    alignSelf: "flex-end",
    background: theme.palette.colours.botDateChipBackground,
    gap: "0.5rem",
    width: "88%",
    padding: "0.625rem 1rem",
  },
  messageActionWrapper: {
    width: "88%",
    gap: pxToRem(16),
    marginTop: pxToRem(8),
    "& .MuiSvgIcon-root": {
      width: pxToRem(16),
      aspectRatio: "1/1",
      color: `${theme.palette.textColours.slateGrayLight}`,
      cursor: "pointer",
    },
    "& .activeIcon": {
      color: `${theme.palette.colours.lightPurple}`,
    },
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
  boldText: {
    fontWeight: 700,
  },
  pb10: {
    paddingBottom: pxToRem(16),
  },
  disableUndoButton: {
    "& .ia-styles.ia-alert .MuiAlert-message button:not(:last-child)": {
      display: "none",
    },
  },
  placeholderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    height: "100%",
    padding: "2rem",
    textAlign: "center",
  },
  placeholderTitle: {
    marginBottom: "1rem",
    color: theme.palette.primary.main,
    fontWeight: 600,
  },
  placeholderText: {
    color: theme.palette.text.secondary,
    maxWidth: "600px",
  },
  agentMode: {
    "& $botViewBlock": {
      background: theme.palette.primary.light,
    },
  },
  memoryModalIconDiv: {
    width: 24,
    height: 24,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshIconDiv: {
    width: 24,
    height: 24,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshIconDivLoading: {
    animation: "$spin 1s linear infinite",
  },
  "@keyframes spin": {
    "0%": {
      transform: "rotate(0deg)",
    },
    "100%": {
      transform: "rotate(360deg)",
    },
  },
  uploadModalInnerSec: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    height: "150px",
    flexDirection: "column"
  },
  hideBotStyle: {
    "& .chatbot-component-container": {
      width: "0px !important",
      height: "0px !important",
      opacity: "0 !important",
      position: "fixed !important",
      pointerEvents: "none !important",
    }
  },
  radioGrpLabel: {
    margin: "8px 0",
    fontWeight: 500,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(16),
    color: theme.palette.colours.neutralGrey,
  },
  agentResponseContainer: {
    marginTop: "20px !important",
  },
  agentStyleOverride: {
    "& .assistant_main_container": {
      boxShadow: "0 0 4px 0 rgba(174, 87, 234, 0.30) !important",
      padding: "20px !important",
      borderRadius: "8px !important",
    },
    "& .ia-styles.ia-tabContainer .ia-tabPanel": {
      padding: "0px !important",
    }
   },
}));

export const StyledRefreshIcon = styled(RefreshIcon)`
  & path {
    fill: ${(props) =>
      props.loading
        ? colours.slateGrayLight
        : colours.endavour}; // Change fill color of the path based on loading prop
  }
`;
