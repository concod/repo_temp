import React from "react";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import { Box } from "@mui/material";
import { fontSizesArray, numericValuesArray } from "../constants";
import makeStyles from "@mui/styles/makeStyles";
import { useDispatch } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { defaultToolPanelFormat } from "../table-functions";
const useStyles = makeStyles((theme) => ({
  lineSeperator: {
    borderTop: `2px solid ${theme.palette.colours.toolPanelLineBreak}`,
    padding: "0.5rem",
  },
  alignListItem: {
    paddingLeft: "0.5rem",
    height: "2rem",
  },
}));

const FormatColumns = ({ setTableFontSize, setNumericFormat }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const handleFontSize = (event) => {
    setTableFontSize(event.target.value);
  };
  const handleNumericFormat = (event) => {
    setNumericFormat(event.target.value);
  };
  const renderFontList = () =>
    fontSizesArray.map((elem) => (
      <FormControlLabel
        className={classes.alignListItem}
        value={elem.value}
        control={<Radio />}
        label={elem.label}
      />
    ));
  const renderNumericFormat = () =>
    numericValuesArray.map((elem) => (
      <FormControlLabel
        className={classes.alignListItem}
        value={elem.value}
        control={<Radio />}
        label={elem.label}
      />
    ));
  return (
    <Box
      className={`${globalClasses.evenPaddingAround} ${globalClasses.toolPanel.fontSize}`}
    >
      <FormControl>
        <FormLabel
          className={globalClasses.toolPanel.fontWeight}
          id="font-radio-buttons-group-label"
        >
          Font Size
        </FormLabel>
        <RadioGroup
          aria-labelledby="font-radio-buttons-group-label"
          defaultValue={defaultToolPanelFormat.DEFAULT_FONT_SIZE}
          className={globalClasses.marginBottom}
          name="radio-buttons-group"
          onChange={handleFontSize}
        >
          {renderFontList()}
        </RadioGroup>
      </FormControl>
      <div className={classes.lineSeperator}></div>
      <FormControl>
        <FormLabel
          className={globalClasses.toolPanel.fontWeight}
          id="nums-radio-buttons-group-label"
        >
          Numeric Values
        </FormLabel>
        <RadioGroup
          aria-labelledby="nums-radio-buttons-group-label"
          defaultValue={defaultToolPanelFormat.DEFAULT_NUMBER_FORMAT}
          name="radio-buttons-group"
          onChange={handleNumericFormat}
        >
          {renderNumericFormat()}
        </RadioGroup>
      </FormControl>
    </Box>
  );
};
export default FormatColumns;
