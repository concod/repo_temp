import { parseResponse } from "core/commonComponents/smartBot/utlis.js";
import TextContent from "./TextContent.jsx";
import ChipsContent from "./ChipsContent.jsx";
import QuestionsContent from "./QuestionsContent.jsx";
import ButtonContent from "./ButtonContent.jsx";
import TableContent from "./TableContent.jsx";
import GraphContent from "./GraphContent.jsx";
import SelectableChips from "./SelectableChips.jsx";
import SliderContent from "./SliderContent.jsx";
import SelectContent from "./SelectContent.jsx";
import DatePickerContent from "./DatePickerContent.jsx";
import CheckboxContent from "./CheckboxContent.jsx";
import RadioContent from "./RadioContent.jsx";
import InputContent from "./InputContent.jsx";
import ImageContent from "./ImageContent.jsx";
import TabularContent from "./tabular-content/index.js";
import DateRangePickerContent from "./DateRangePickerContent.jsx";
import HtmlContent from "./HtmlContent.jsx";

const CombinedContent = ({ botData, props }) => {
  const isFormDisabled = botData?.isFormDisabled || false;
  const isTabEnabled = botData?.utilityData?.isTabEnabled;
  // Get the array of content items from bodyText
  const contentItems = Array.isArray(botData.bodyText) ? botData.bodyText : [];

  // Function to render individual content based on its type
  const renderIndividualContent = (parsedData, index) => {
    const key = `combined-content-${index}`;
    
    switch (parsedData.bodyType) {
      case "text":
        return <TextContent key={key} bodyText={parsedData.bodyText} botData={parsedData} />;
      case "chips":
        if (parsedData.isMultiSelect) {
          return (
            <SelectableChips
              key={key}
              bodyText={parsedData.bodyText}
              chipType="selectable"
              utilityData={parsedData.utilityData}
              props={props}
            />
          );
        } else {
          return <ChipsContent key={key} bodyText={parsedData.bodyText} props={props} />;
        }
      case "questions":
        return <QuestionsContent key={key} bodyText={parsedData.bodyText} props={props} />;
      case "table":
        return <TableContent key={key} bodyText={parsedData.bodyText} />;
      case "graph":
        return <GraphContent key={key} bodyText={parsedData.bodyText} />;
      case "slider":
        return <SliderContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} messageIndex={botData.messageIndex} />;
      case "select":
        return <SelectContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} messageIndex={botData.messageIndex} />;
      case "datePicker":
        return <DatePickerContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} messageIndex={botData.messageIndex} />;
      case "dateRangePicker":
        return <DateRangePickerContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} messageIndex={botData.messageIndex} />;
      case "checkbox":
        return <CheckboxContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} messageIndex={botData.messageIndex} />;
      case "radio":
        return <RadioContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} messageIndex={botData.messageIndex} />;
      case "button":
        return <ButtonContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} />;
      case "input":
        return <InputContent key={key} bodyText={parsedData.bodyText} isFormDisabled={isFormDisabled} messageIndex={botData.messageIndex} />;
      case "image":
        return <ImageContent key={key} bodyText={parsedData.bodyText} />;
      case "html":
        return <HtmlContent key={key} bodyText={parsedData.bodyText} />;
      default:
        return null;
    }
  };

  // Parse each content item and render them
  const renderedContent = contentItems.map((item, index) => {
    try {
      // Parse each item using the parseResponse function
      const parsedData = parseResponse(
        item,
        item.type,
        botData.agentId || "",
        botData.currentMode || "",
        true, // disableTimeAndName = true for individual items in combined content
        botData.sessionId || "",
        botData.utilityData || {}
      );

      if (!parsedData) {
        return null;
      }

      // Render the parsed content
      return renderIndividualContent(parsedData, index);
    } catch (error) {
      console.error(`Error parsing combined content item at index ${index}:`, error);
      return (
        <div key={`error-${index}`} style={{ color: 'red', padding: '8px' }}>
          Error rendering content item {index + 1}
        </div>
      );
    }
  });

  // Filter out null values and return the combined content
  const validContent = renderedContent.filter(content => content !== null);

  const renderCombinedContent = () => (
    <div className="combined-content-container">
      {validContent.length > 0 ? (
        validContent.map((content, index) => (
          <div key={`wrapper-${index}`} className="combined-content-item">
            {content}
          </div>
        ))
      ) : (
        <div>No valid content to display</div>
      )}
    </div>
  );

  if (isTabEnabled) {
    return (
      <TabularContent
        steps={botData?.utilityData?.steps || []}
        currentTabValue={botData?.utilityData?.currentTabValue || "steps"}
        questions={botData?.utilityData?.questions || []}
        questionsStepsMap={botData?.utilityData?.questionsStepsMap || {}}
        stepFormDataMap={botData?.utilityData?.stepFormDataMap || {}}
        isFormDisabled={isFormDisabled}
        sessionId={botData?.sessionId || ""}
      >
        {renderCombinedContent()}
      </TabularContent>
    );
  }

  return renderCombinedContent();
};

export default CombinedContent; 