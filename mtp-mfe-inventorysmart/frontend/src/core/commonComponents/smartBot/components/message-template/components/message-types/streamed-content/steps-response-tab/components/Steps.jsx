import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import { useEffect, useState, useRef } from "react";
import { cloneDeep } from "lodash";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ReasoningIcon from "coreAssets/chatbot/reasoningIcon.svg";
import StepFormContent from "../../../../message-content/StepFormContent";
import SubStepRenderer from "core/commonComponents/smartBot/components/SubStepRenderer";

const useStyles = makeStyles((theme) => ({
  "@global": {
    "@keyframes progressDotPulse": {
      "0%": {
        boxShadow: `0 0 0 0 ${colours.coralShade50}`,
      },
      "50%": {
        boxShadow: `0 0 0 6px transparent`,
      },
      "100%": {
        boxShadow: `0 0 0 0 transparent`,
      },
    },
    "@keyframes reasoningShimmer": {
      "0%": {
        backgroundPosition: "200% center",
      },
      "100%": {
        backgroundPosition: "-200% center",
      },
    },
    "@keyframes completedPop": {
      "0%": {
        transform: "scale(1)",
      },
      "50%": {
        transform: "scale(1.4)",
      },
      "100%": {
        transform: "scale(1)",
      },
    },
    "@keyframes thinkingFadeIn": {
      "0%": {
        opacity: 0,
        transform: "translateY(-8px)",
      },
      "100%": {
        opacity: 1,
        transform: "translateY(0)",
      },
    },
    "@keyframes slideDown": {
      "0%": {
        opacity: 0,
        transform: "translateY(-12px)",
      },
      "100%": {
        opacity: 1,
        transform: "translateY(0)",
      },
    },
  },
  progressBarContainer: {
    display: "flex",
    flexDirection: "column",
    background: colours.white,
    marginTop: pxToRem(12),
    animation: "slideDown 0.4s ease-out forwards",
  },
  progressItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
    position: "relative",
    minHeight: pxToRem(32),
  },
  progressTrack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: pxToRem(20),
    flexShrink: 0,
    position: "relative",
  },
  progressDot: {
    width: pxToRem(10),
    height: pxToRem(10),
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: pxToRem(5),
    position: "relative",
    zIndex: 1,
    background: colours.greyscale250,
    transition: "background 0.4s ease, border 0.4s ease, box-shadow 0.4s ease, transform 0.3s ease",
    border: "none",
    "&.completed": {
      width: pxToRem(10),
      height: pxToRem(10),
      background: "#4CAF50",
      border: `${pxToRem(3)} solid #C8E6C9`,
      boxSizing: "content-box",
      marginTop: pxToRem(2.5),
      animation: "completedPop 0.4s ease",
    },
    "&.in-progress": {
      background: colours.coralReef,
      animation: "progressDotPulse 1.5s ease-in-out infinite",
    },
    "&.error": {
      background: colours.errorRed,
    },
  },
  progressLine: {
    width: pxToRem(2),
    flexGrow: 1,
    background: colours.greyscale250,
    transition: "background 0.3s ease",
    "&.completed": {
      background: colours.greyscale150,
    },
  },
  progressContent: {
    display: "flex",
    flexDirection: "column",
    paddingLeft: pxToRem(8),
    paddingBottom: pxToRem(14),
    flex: 1,
    minWidth: 0,
  },
  progressHeader: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(2),
    cursor: "pointer",
    userSelect: "none",
  },
  progressHeaderText: {
    fontFamily: "Manrope",
    fontSize: pxToRem(13),
    fontWeight: 600,
    lineHeight: pxToRem(20),
    color: colours.darkBlack,
    transition: "color 0.4s ease",
    "&.in-progress": {
      color: colours.darkBlack,
    },
    "&.not-started": {
      color: colours.greyscale250,
    },
    "&.error": {
      color: colours.errorRed,
    },
  },
  progressChevron: {
    width: pxToRem(16),
    height: pxToRem(16),
    color: colours.neutrals,
    transition: "transform 0.3s ease",
    "&.not-started": {
      color: colours.greyscale250,
    },
    "&.expanded": {
      transform: "rotate(90deg)",
    },
  },
  progressSubItems: {
    display: "flex",
    flexDirection: "column",
    gap: pxToRem(12),
    marginTop: pxToRem(6),
    transition: "opacity 0.3s ease",
    overflow: "auto",
    maxHeight: pxToRem(300),
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
  reasoningLabel: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(4),
    fontFamily: "Manrope",
    fontSize: pxToRem(14),
    fontWeight: 500,
    lineHeight: pxToRem(20),
    marginTop: pxToRem(4),
    marginBottom: pxToRem(2),
    background: "linear-gradient(90deg, #4648FF 0%, #FF7262 30%, #FFAEA5 50%, #FF7262 70%, #4648FF 100%)",
    backgroundSize: "400% 100%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: "reasoningShimmer 3s linear infinite",
    "& svg": {
      width: pxToRem(16),
      height: pxToRem(16),
      flexShrink: 0,
    },
  },
  progressSubItem: {
    fontFamily: "Manrope",
    fontSize: pxToRem(12),
    fontWeight: 600,
    lineHeight: pxToRem(18),
    color: "#888",
  },
  stepFormContainer: {
    marginTop: pxToRem(8),
  },
}));

/**
 * Typewriter effect component — reveals text character by character.
 * Tracks already-animated text so the effect only plays once (survives remounts).
 */
const animatedTexts = new Set();

const TypewriterText = ({ text, speed = 17, onComplete }) => {
  const alreadyAnimated = animatedTexts.has(text);
  const [displayed, setDisplayed] = useState(alreadyAnimated ? text : "");
  const indexRef = useRef(alreadyAnimated ? text?.length || 0 : 0);
  const prevTextRef = useRef(text || "");

  useEffect(() => {
    if (!text) return;
    // If already animated, show full text immediately
    if (animatedTexts.has(text)) {
      setDisplayed(text);
      onComplete && onComplete();
      return;
    }
    // If text changed, reset
    if (text !== prevTextRef.current) {
      prevTextRef.current = text;
      indexRef.current = 0;
      setDisplayed("");
    }
    const interval = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        animatedTexts.add(text);
        clearInterval(interval);
        onComplete && onComplete();
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  // If text contains markdown, render via SubStepRenderer (animation not suitable for markdown)
  const hasMarkdown = text && (/\*\*|^\s*[-*]\s|^#{1,6}\s|\n/m.test(text));
  if (hasMarkdown) {
    return <SubStepRenderer text={displayed} />;
  }
  return <>{displayed}</>;
};

/**
 * Determines the overall status of a question based on its steps.
 * - "completed": all steps are completed
 * - "in-progress": at least one step is not-completed (loading)
 * - "error": at least one step has error
 * - "not-started": no steps or all pending
 */
const getQuestionStatus = (questionSteps) => {
  if (!questionSteps) return "not-started";
  if (questionSteps.length === 0) return "completed";
  const hasError = questionSteps.some((s) => s.step_status === "error");
  if (hasError) return "error";
  const allCompleted = questionSteps.every((s) => s.step_status === "completed");
  if (allCompleted) return "completed";
  const hasLoading = questionSteps.some((s) => s.step_status === "not-completed");
  if (hasLoading) return "in-progress";
  return "not-started";
};

/**
 * Renders a single progress bar item (main point + sub-items)
 */
const ProgressBarItem = ({ question, questionSteps, isLast, classes, formData, showSavedFilters = true, preSelectedFilters = null, isFormDisabled, onAllSubItemsAnimated = undefined }) => {
  const status = getQuestionStatus(questionSteps);
  const animatedCountRef = useRef(0);
  const [isExpanded, setIsExpanded] = useState(true);

  const dotClass = status === "completed"
    ? "completed"
    : status === "in-progress"
    ? "in-progress"
    : status === "error"
    ? "error"
    : "";

  const lineClass = status === "completed" ? "completed" : "";

  const textClass = status === "completed" || status === "in-progress"
    ? status
    : status === "error"
    ? "error"
    : "not-started";

  const isProcessingRequest = question === "Processing Request";
  const hasSubItems = (questionSteps && questionSteps.length > 0) || !!formData;

  const handleToggle = () => {
    if (hasSubItems) {
      setIsExpanded((prev) => !prev);
    }
  };

  useEffect(() => {
    if (status === "in-progress" || status === "error" || formData) {
      setIsExpanded(true);
    }
  }, [status, formData]);

  return (
    <div className={classes.progressItem}>
      <div className={classes.progressTrack}>
        <div className={`${classes.progressDot} ${dotClass}`} />
        {!isLast && <div className={`${classes.progressLine} ${lineClass}`} />}
      </div>
      <div className={classes.progressContent}>
        <div className={classes.progressHeader} onClick={handleToggle}>
          <span className={`${classes.progressHeaderText} ${textClass}`}>
            {question}
          </span>
          {hasSubItems && (
            <ChevronRightIcon
              className={`${classes.progressChevron} ${textClass} ${isExpanded ? "expanded" : ""}`}
            />
          )}
        </div>
        {hasSubItems && isExpanded && status === "in-progress" && (
          <div className={classes.reasoningLabel}>
            <ReasoningIcon />
            Working on the next step...
          </div>
        )}
        {hasSubItems && isExpanded && !isProcessingRequest && (
          <div
            className={classes.progressSubItems}
            style={{ opacity: isExpanded ? 1 : 0 }}
          >
            {questionSteps.filter((step) => step.header).map((step, idx, arr) => (
              <div key={idx} className={classes.progressSubItem}>
                <TypewriterText
                  text={`${step.header}${step.sub_header ? ` - ${step.sub_header}` : ""}`}
                  onComplete={() => {
                    animatedCountRef.current += 1;
                    if (animatedCountRef.current >= arr.length && onAllSubItemsAnimated) {
                      onAllSubItemsAnimated();
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {formData && isExpanded && (
          <div className={classes.stepFormContainer}>
            <StepFormContent formData={formData} isFormDisabled={isFormDisabled} showSavedFilters={showSavedFilters} preSelectedFilters={preSelectedFilters} />
          </div>
        )}
      </div>
    </div>
  );
};

const Steps = ({
  steps,
  setSteps,
  done,
  setTabValue,
  setDone,
  finalStepDone,
  setFinalStepDone,
  stepChange,
  currentMode,
  questions = [],
  questionsStepsMap = {},
  stepFormDataMap = {},
  isFormDisabled = false,
}) => {
  const classes = useStyles();
  const [isFinished, setIsFinished] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  // Determine if last question is fully completed (all sub-steps done)
  const lastQuestion = questions[questions.length - 1];
  const lastQuestionSteps = questionsStepsMap[lastQuestion];
  const lastQuestionCompleted = lastQuestionSteps &&
    lastQuestionSteps.length > 0 &&
    lastQuestionSteps.every((s) => s.step_status === "completed");

  const hasStepFormData = Object.keys(stepFormDataMap).length > 0;

  useEffect(() => {
    if (done) {
      // Don't auto-switch to agent_response tab when there's a step form pending user interaction
      if (hasStepFormData) {
        setFinalStepDone(true);
        return;
      }
      if (!finalStepDone) {
        if(currentMode === "navigation") {
        let updatedSteps = steps.map((step) => ({
          ...step,
          step_status: "completed",
        }));
        updatedSteps = [...updatedSteps, {
          header: "Finished",
          sub_header: "Analysis complete",
          step_status: "not-completed",
        }];
        setSteps(cloneDeep(updatedSteps));
        setTimeout(() => {
         updatedSteps = updatedSteps.map((step) => ({
          ...step,
          step_status: "completed",
        }));
        setSteps(cloneDeep(updatedSteps));
        setFinalStepDone(true);
        }, 300);
        setTimeout(() => {
        setTabValue("agent_response");
        }, 500);
      }
      else {
        setFinalStepDone(true);
        setTabValue("agent_response");
      }
      }
    }
  }, [done]);

  // Reset showThinking when a new question arrives or stream finishes
  useEffect(() => {
    if (done || !lastQuestionCompleted) {
      setShowThinking(false);
    }
  }, [done, questions.length, lastQuestionCompleted]);

  const hasQuestions = questions.length > 0;

  if (!hasQuestions) {
    const fallbackQuestion = "Processing Request";
    const fallbackSteps = steps.length > 0
      ? steps
      : [
          {
            header: "Processing Request",
            sub_header: "Analyzing the current request",
            step_status: "not-completed",
          },
        ];
    return (
      <div className={classes.progressBarContainer}>
        <ProgressBarItem
          question={fallbackQuestion}
          questionSteps={fallbackSteps}
          isLast={true}
          classes={classes}
          formData={null}
          isFormDisabled={isFormDisabled}
        />
      </div>
    );
  }

  return (
    <div className={classes.progressBarContainer}>
      {questions.map((question, index) => {
        const questionData = questionsStepsMap[question];
        const questionSteps = questionData || [
          {
            header: "Processing Request",
            sub_header: "Analyzing the current request",
            step_status: "not-completed",
          },
        ];
        const formEntry = stepFormDataMap[question] || null;
        const formData = formEntry ? (Array.isArray(formEntry) ? formEntry : formEntry.widgets) : null;
        const showSavedFilters = formEntry && !Array.isArray(formEntry) ? formEntry.showSavedFilters : true;
        const preSelectedFilters = formEntry && !Array.isArray(formEntry) ? formEntry.preSelectedFilters : null;
        const isLast = index === questions.length - 1;
        return (
          <ProgressBarItem
            key={index}
            question={question}
            questionSteps={questionSteps}
            isLast={isLast && !showThinking}
            classes={classes}
            formData={formData}
            showSavedFilters={showSavedFilters}
            preSelectedFilters={preSelectedFilters}
            isFormDisabled={isFormDisabled}
            onAllSubItemsAnimated={
              isLast && lastQuestionCompleted && !done
                ? () => setShowThinking(true)
                : undefined
            }
          />
        );
      })}
      {showThinking && !done && (
        <div
          style={{
            animation: "thinkingFadeIn 0.4s ease forwards",
          }}
        >
          <ProgressBarItem
            question="Thinking"
            questionSteps={[{ header: "", sub_header: "", step_status: "not-completed" }]}
            isLast={true}
            classes={classes}
            formData={null}
            isFormDisabled={isFormDisabled}
          />
        </div>
      )}
    </div>
  );
};

export default Steps;