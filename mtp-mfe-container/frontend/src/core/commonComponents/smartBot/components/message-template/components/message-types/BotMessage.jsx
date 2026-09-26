import { useMemo, useState, useEffect } from "react";
import { Typography } from "@mui/material";
import { useStyles } from "../../../../styling";
import globalStyles from "core/Styles/globalStyles";
import { dateFormat, formatTime } from "../../utils.js";
import LikeDislikeActions from "../message-actions/LikeDislikeActions";
import TextContent from "../message-content/TextContent";
import ChipsContent from "../message-content/ChipsContent";
import QuestionsContent from "../message-content/QuestionsContent";
import ButtonContent from "../message-content/ButtonContent.jsx";
import AgGridComponent from "core/Utils/agGrid";
import { getDynamicFunction } from "core/commonComponents/smartBot/utlis";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { isString } from "lodash";
import TableContent from "../message-content/TableContent";
import GraphContent from "../message-content/GraphContent";
import SelectableChips from "../message-content/SelectableChips";
import StreamedContent from "./streamed-content/StreamedContent";
import SliderContent from "../message-content/SliderContent";
import SelectContent from "../message-content/SelectContent";
import DatePickerContent from "../message-content/DatePickerContent";
import DateRangePickerContent from "../message-content/DateRangePickerContent";
import CheckboxContent from "../message-content/CheckboxContent";
import CheckboxGroupContent from "../message-content/CheckboxGroupContent";
import RadioContent from "../message-content/RadioContent";
import InputContent from "../message-content/InputContent";
import CombinedContent from "../message-content/CombinedContent";
import ImageContent from "../message-content/ImageContent";
import HtmlContent from "../message-content/HtmlContent";

const BotMessage = ({ botData, state, handleLikeDislike, props }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const time = botData?.timeStamp ? formatTime(botData?.timeStamp) : "";
  const userName = botData?.userName ? botData?.userName : "";
  const likeDislikeKey = `${
    botData?.response_heading || botData?.screen_name
  }_${botData?.timeStamp}`;

  const [customRenderer, setCustomRenderer] = useState(null);
  const [isLoadingRenderer, setIsLoadingRenderer] = useState(false);
  const [renderError, setRenderError] = useState(null);

  // Load custom renderer if needed
  useEffect(() => {
    const loadCustomRenderer = async () => {
      if (botData.bodyType === "dynamic" && botData.rendererInfo) {
        setIsLoadingRenderer(true);
        try {
          const renderer = await getDynamicFunction(
            botData.rendererInfo.path,
            botData.rendererInfo.functionName
          );
          setCustomRenderer(() => renderer);
        } catch (error) {
          console.error("Failed to load custom renderer:", error);
          setRenderError("Could not load custom content renderer");
        } finally {
          setIsLoadingRenderer(false);
        }
      }
    };

    loadCustomRenderer();
  }, [botData.bodyType, botData.rendererInfo]);

  const renderContent = (botData, props) => {
    switch (botData.bodyType) {
      case "text":
        return <TextContent bodyText={botData.bodyText} botData={botData} />;
      case "stream":
        return <StreamedContent botData={botData} botProps={props} />;
      case "chips":
        if (botData.isMultiSelect) {
          return (
            <SelectableChips
              bodyText={botData.bodyText}
              utilityData={botData.utilityData}
              props={props}
            />
          );
        } else {
          return <ChipsContent bodyText={botData.bodyText} props={props} />;
        }
      case "questions":
        return <QuestionsContent bodyText={botData.bodyText} props={props} />;
      case "table":
        return <TableContent bodyText={botData.bodyText} />;
      case "graph":
        return <GraphContent bodyText={botData.bodyText} />;
      case "slider":
        return <SliderContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} messageIndex={botData.messageIndex} />;
      case "select":
        return <SelectContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} messageIndex={botData.messageIndex} />;
      case "datePicker":
        return <DatePickerContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} messageIndex={botData.messageIndex} />;
      case "dateRangePicker":
        return <DateRangePickerContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} messageIndex={botData.messageIndex} />;
      case "checkbox":
        return <CheckboxContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} messageIndex={botData.messageIndex} />;
      case "checkboxGroup":
        return <CheckboxGroupContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} messageIndex={botData.messageIndex} />;
      case "radio":
        return <RadioContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} messageIndex={botData.messageIndex} />;
      case "button":
        return <ButtonContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} />;
      case "input":
        return <InputContent bodyText={botData.bodyText} isFormDisabled={botData.isFormDisabled} messageIndex={botData.messageIndex} />;
      case "image":
        return <ImageContent bodyText={botData.bodyText} />;
      case "html":
        return <HtmlContent bodyText={botData.bodyText} />;
      case "combined":
        return <CombinedContent botData={botData} props={props} />;
      case "dynamic":
        if (isLoadingRenderer) {
          return <div>Loading custom content...</div>;
        }
        if (renderError) {
          return <div>{renderError}</div>;
        }
        return customRenderer ? (
          customRenderer(botData, props)
        ) : (
          <TextContent
            bodyText={
              botData.bodyText?.response ||
              "Custom content could not be rendered"
            }
          />
        );
      default:
        return null;
    }
  };
  return (
    <>
      {userName || time ? (
        <div
          className={`${globalClasses.flexRow} ${classes.BotMessage} bgWhite`}
        >
          {botData?.bodyType !== "questions" && (
            // <span className={classes.botTitleView}>{userName}</span>
            <></>
          )}
        </div>
      ) : (
        <></>
      )}
      <div className={`${classes.BotMessage} "bgWhite"`}>
        <div
          className={`${classes.botViewBlock} ${globalClasses.flexRow} ${
            globalClasses.flexColumn
          } bgWhite`}
        >
          {botData?.bodyType !== "questions" &&
            !botData?.noShowHeaderTitle &&
            Boolean(botData.headerTitle?.length) && (
              <Typography
                className={`${classes.chatbotText} ${classes.boldText}`}
              >
                {botData.headerTitle}
              </Typography>
            )}
          <div className={classes.contentContainer}>
            {renderContent(botData, props)}
          </div>
        </div>
        <LikeDislikeActions
          botData={botData}
          state={state}
          likeDislikeKey={likeDislikeKey}
          handleLikeDislike={handleLikeDislike}
        />
      </div>
    </>
  );
};

export default BotMessage;
