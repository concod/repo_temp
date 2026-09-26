import { useState } from "react";
import { TextArea } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  sectionWrapper:{
    width:"100%",
    "& .impact_textarea_layout":{
      width:"100%"
    }
  },
  textAreaBody:{
    width:"100% !important"
  }
}))
const FilterClipBoardSection = () => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [value, setValue] = useState("");
  return (
    <span className={`${classes.sectionWrapper}`}>
      <TextArea
        className={classes.textAreaBody}
        characterLimit={null}
        label="Please paste your details here"
        maxRows={5}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter Text"
        value={value}
      />
    </span>
  );
};

export default FilterClipBoardSection;
