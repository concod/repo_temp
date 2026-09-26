import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { useStyles } from "../../../../styling.jsx";
// import globalStyles from "../../../../../../../../core/Styles/globalStyles.js";
import { Button } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles.js";
import colours from "core/Styles/colours.js";

const SelectableChips = ({ bodyText, chipType, props, utilityData }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [selectedChips, setSelectedChips] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [sessionId, setSessionId] = useState("");

  // Handle chip selection/deselection
  const handleChipSelection = (chip) => {
    setSelectedChips((prevSelected) => {
      // Check if the chip is already selected by comparing IDs
      const isSelected = prevSelected.find(selected => selected.id === chip.id);
      if (isSelected) {
        // If selected, remove it from the array
        return prevSelected.filter(selected => selected.id !== chip.id);
      } else {
        // If not selected, add it to the array
        return [...prevSelected, chip];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (selectedChips.length > 0) {
    let selectData = selectedChips.map(chip => chip.displayText);
    let chatInput = selectedChips.map(chip => chip.displayText).join(",");
      const selectedData = {
        agentId: agentId,
        sessionId: sessionId,
        userInput: selectData,
        chatInput: chatInput,
        actionType: "direct",
        displayText: selectData,
        baseUrl: utilityData?.baseUrl
      };
      if (utilityData?.prepareDataAndSendToAgent) {
        utilityData.prepareDataAndSendToAgent(selectedData);
      }
      setSelectedChips([]);
    }
  };

  useEffect(() => {
    // Extract agentId and sessionId from bodyText if available
    if (bodyText && bodyText.length > 0) {
      bodyText.forEach((data) => {
        if(data.agentId && data.sessionId){
          setAgentId(data.agentId);
          setSessionId(data.sessionId);
        }
      });
    }
  }, [bodyText]);

  return (
    <div className={globalClasses.flexColumn}>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.flexWrap} ${globalClasses.gap} ${globalClasses.verticalAlignCenter}`}
      >
        {bodyText.map((data, index) => {
          // Check if this specific chip is selected by comparing IDs
          const isSelected = selectedChips.find(
            (selected) => selected.id === data.id
          );

          return (
            <Typography
              key={index}
              component="span"
              variant="body1"
              className={`${classes.gptChips} ${globalClasses.cursorPointer} ${
                isSelected ? classes.selectedChip : ""
              }`}
              style={{
                backgroundColor: isSelected ? colours.cornflowerBlueDark : "",
                border: isSelected ? `1px solid ${colours.titanWhite}` : "",
                fontWeight: isSelected ? "bold" : "normal",
                color: isSelected ? colours.titanWhite : "",
              }}
              onClick={() => handleChipSelection(data)}
            >
              {data.displayText}
            </Typography>
          );
        })}
      </div>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.marginTop1} ${classes.selectionButtonChip}`}
      >
        <Button
          variant="url"
          onClick={handleConfirmSelection}
          size="small"
          disabled={selectedChips.length === 0}
        >
          Confirm Selection ({selectedChips.length})
        </Button>
      </div>
    </div>
  );
};

export default SelectableChips;