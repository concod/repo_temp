import { useStyles } from '../../styling.js';
import { useStyles as useChatStyles } from "core/commonComponents/smartBot/styling";
import { Typography } from "@mui/material";
import { TextRenderer } from "core/commonComponents/smartBot/components/TextRenderer";
import { parseResponse } from "core/commonComponents/smartBot/utlis";
import TextContent from "core/commonComponents/smartBot/components/message-template/components/message-content/TextContent.jsx";
import TableContent from "core/commonComponents/smartBot/components/message-template/components/message-content/TableContent.jsx";
import GraphContent from "core/commonComponents/smartBot/components/message-template/components/message-content/GraphContent.jsx";
import RadioContent from "core/commonComponents/smartBot/components/message-template/components/message-content/RadioContent.jsx";
import CheckboxContent from "core/commonComponents/smartBot/components/message-template/components/message-content/CheckboxContent.jsx";
import CheckboxGroupContent from "core/commonComponents/smartBot/components/message-template/components/message-content/CheckboxGroupContent.jsx";
import SelectContent from "core/commonComponents/smartBot/components/message-template/components/message-content/SelectContent.jsx";
import SliderContent from "core/commonComponents/smartBot/components/message-template/components/message-content/SliderContent.jsx";
import ButtonContent from "core/commonComponents/smartBot/components/message-template/components/message-content/ButtonContent.jsx";
import InputContent from "core/commonComponents/smartBot/components/message-template/components/message-content/InputContent.jsx";
import DatePickerContent from "core/commonComponents/smartBot/components/message-template/components/message-content/DatePickerContent.jsx";
import DateRangePickerContent from "core/commonComponents/smartBot/components/message-template/components/message-content/DateRangePickerContent.jsx";
import HtmlContent from "core/commonComponents/smartBot/components/message-template/components/message-content/HtmlContent.jsx";

const renderWidgetItem = (item, index, isFormDisabled) => {
  try {
    const parsedData = parseResponse(item, item.type, "", "", true);
    if (!parsedData) return null;
    const key = `streaming-widget-${index}`;
    switch (parsedData.bodyType) {
      case "text":
        return <TextContent key={key} bodyText={parsedData.bodyText} botData={parsedData} />;
      case "table":
        // Key on table_name so a different table never reuses a mounted grid.
        // ag-grid captures its fetch callback once at init, so a reused grid
        // would keep querying the previous table's table_name.
        return <TableContent key={parsedData.bodyText?.table_name || key} bodyText={parsedData.bodyText} />;
      case "graph":
        return <GraphContent key={key} bodyText={parsedData.bodyText} />;
      case "radio":
        return <RadioContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "checkbox":
        return <CheckboxContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "checkboxGroup":
        return <CheckboxGroupContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "select":
        return <SelectContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "slider":
        return <SliderContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "button":
        return <ButtonContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "input":
        return <InputContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "datePicker":
        return <DatePickerContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "dateRangePicker":
        return <DateRangePickerContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "html":
        return <HtmlContent key={key} bodyText={parsedData.bodyText} />;
      default:
        return null;
    }
  } catch (e) {
    console.error("[AgentResponse] renderWidgetItem error:", e);
    return null;
  }
};

const AgentResponse = (props) => {
  const { content, isStreaming, streamingWidgetData = [], isFormDisabled = false } = props;
  const classes = useStyles();
  const chatClasses = useChatStyles();

  const renderedWidgets = streamingWidgetData
    .map((item, index) => renderWidgetItem(item, index, isFormDisabled))
    .filter(Boolean);

  return (
    <div className={chatClasses.agentResponseContainer}>
      {content ? (
        <Typography className={chatClasses.bodyTextStyling}>
          <TextRenderer text={content} />
          {isStreaming && renderedWidgets.length === 0 && <span className={classes.cursor} />}
        </Typography>
      ) : null}
      {renderedWidgets.length > 0 && (
        <div className="streaming-widget-content">
          {renderedWidgets}
        </div>
      )}
      {isStreaming && (renderedWidgets.length > 0 || !content) && (
        <span className={classes.cursor} />
      )}
    </div>
  )
}

export default AgentResponse;