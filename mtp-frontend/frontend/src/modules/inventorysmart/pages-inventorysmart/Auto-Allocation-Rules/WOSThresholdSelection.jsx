import { Paper, IconButton } from "@mui/material";
import globalStyles from "Styles/globalStyles";
import classNames from "classnames";
import Form from "core/Utils/form";
import CloseIcon from "@mui/icons-material/Close";
import { THRESHOLD_SELECTION_OPTIONS } from "./autoAllocationConstant";
import { useMemo } from "react";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles(() => ({
  ruleThreeWrapper: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  child1: {
    width: "15%",
  },
  child2: {
    width: "85%",
  },
}));

const WOSThresholdSelection = ({
  setFormData,
  handleThresholdShow,
  ruleData,
}) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const handleChange = (data) => {
    setFormData((prev) => {
      return { ...prev, ...data };
    });
  };

  const getDefaultValues = useMemo(
    () => () => {
      let defaultValues = { condition: "", threshold: 0.7 };
      if (ruleData) {
        THRESHOLD_SELECTION_OPTIONS.forEach((item) => {
          defaultValues[item.accessor] = ruleData[item.accessor];
        });
      }
      return defaultValues;
    },
    [ruleData]
  );

  return (
    <>
      <Paper
        elevation={4}
        className={classNames(
          globalClasses.paperWrapper,
          globalClasses.marginAround
        )}
        style={{ position: "relative" }}
      >
        <div style={{ position: "absolute", top: 0, right: 0 }}>
          <IconButton aria-label="delete" onClick={handleThresholdShow}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className={classes.ruleThreeWrapper}>
          <div className={classes.child1}>Rule 3: Add Threshold Rule</div>
          <div className={`${globalClasses.marginAround} ${classes.child2}`}>
            <Form
              layout={"vertical"}
              maxFieldsInRow={5}
              handleChange={handleChange}
              fields={THRESHOLD_SELECTION_OPTIONS}
              updateDefaultValue={false}
              defaultValues={getDefaultValues}
              labelWidthSpan={2}
              fieldTypeWidthSpan={6}
            ></Form>
          </div>
        </div>
      </Paper>
    </>
  );
};

export default WOSThresholdSelection;
