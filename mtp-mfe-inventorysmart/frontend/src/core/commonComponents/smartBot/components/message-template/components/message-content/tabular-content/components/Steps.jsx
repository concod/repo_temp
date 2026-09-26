import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
import { useEffect, useState } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ReasoningIcon from "coreAssets/chatbot/reasoningIcon.svg";
import StepFormContent from "../../StepFormContent";
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
  },
  progressBarContainer: {
    display: "flex",
    flexDirection: "column",
    background: colours.white,
    marginTop: pxToRem(12),
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
    transition: "background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease",
    border: "none",
    "&.completed": {
      width: pxToRem(10),
      height: pxToRem(10),
      marginTop: pxToRem(2.5),
      background: "#4CAF50",
      border: `${pxToRem(3)} solid #C8E6C9`,
      boxSizing: "content-box",
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
    transition: "max-height 0.3s ease, opacity 0.3s ease",
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
 * Determines the overall status of a question based on its steps.
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
const ProgressBarItem = ({ question, questionSteps, isLast, classes, formData, showSavedFilters = true, preSelectedFilters = null, isFormDisabled, isRestreaming = false }) => {
  const baseStatus = getQuestionStatus(questionSteps);
  // When restreaming and this is the last item, show as in-progress
  const status = (isRestreaming && isLast) ? "in-progress" : baseStatus;
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
            style={{ maxHeight: isExpanded ? "500px" : "0", opacity: isExpanded ? 1 : 0 }}
          >
            {questionSteps.map((step, idx) => (
              <div key={idx} className={classes.progressSubItem}>
                <SubStepRenderer text={`${step.header}${step.sub_header ? ` - ${step.sub_header}` : ""}`} />
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

const Steps = ({ steps, questions = [], questionsStepsMap = {}, stepFormDataMap = {}, isFormDisabled = false, activeFormIntent = null, isRestreaming = false }) => {
  const classes = useStyles();
  const [isFinished, setIsFinished] = useState(false);

  const hasQuestions = questions.length > 0;

  if (!hasQuestions) {
    if (steps.length > 0) {
      const fallbackQuestion = "Processing Request";
      return (
        <div className={classes.progressBarContainer}>
          <ProgressBarItem
            question={fallbackQuestion}
            questionSteps={steps}
            isLast={true}
            classes={classes}
            formData={null}
            isFormDisabled={isFormDisabled}
            isRestreaming={isRestreaming}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div className={classes.progressBarContainer}>
      {questions.map((question, index) => {
        const questionData = questionsStepsMap[question];
        const questionSteps = questionData || [
          {
            header: "Processing Request",
            sub_header: "Analyzing the current request",
            step_status: "completed",
          },
        ];
        const formEntry = stepFormDataMap[question] || null;
        // Support both old array format and new object format { widgets, showSavedFilters }
        const formData = formEntry ? (Array.isArray(formEntry) ? formEntry : formEntry.widgets) : null;
        const showSavedFilters = formEntry && !Array.isArray(formEntry) ? formEntry.showSavedFilters : true;
        const preSelectedFilters = formEntry && !Array.isArray(formEntry) ? formEntry.preSelectedFilters : null;
        // If activeFormIntent is set, only the matching form is enabled; all others stay disabled
        const formDisabledForThis = activeFormIntent
          ? question !== activeFormIntent
          : isFormDisabled;
        return (
          <ProgressBarItem
            key={index}
            question={question}
            questionSteps={questionSteps}
            isLast={index === questions.length - 1}
            classes={classes}
            formData={formData}
            showSavedFilters={showSavedFilters}
            preSelectedFilters={preSelectedFilters}
            isFormDisabled={formDisabledForThis}
            isRestreaming={isRestreaming}
          />
        );
      })}
    </div>
  );
};

export default Steps;