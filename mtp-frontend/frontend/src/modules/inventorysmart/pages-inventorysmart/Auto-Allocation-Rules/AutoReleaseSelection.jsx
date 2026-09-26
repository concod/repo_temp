import { Paper } from "@mui/material";
import globalStyles from "Styles/globalStyles";
import classNames from "classnames";
import Form from "core/Utils/form";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { useMemo } from "react";
import { AUTO_RELEASE_OPTIONS } from "./autoAllocationConstant";

const AutoReleaseSelection = ({ ruleData, setFormData }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const handleChange = (data, field, accessor, item) => {
    let updatedAutoRelease = { autoRelease: item };
    setFormData((prev) => {
      return { ...prev, ...updatedAutoRelease };
    });
  };

  const getDefaultValues = useMemo(
    () => () => {
      let defaultValues = { autoRelease: [] };
      if (ruleData) {
        AUTO_RELEASE_OPTIONS.forEach((item) => {
          defaultValues[item.accessor] = ruleData.auto_release_type;
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
      >
        <div className={classes.autoFlexRow}>
          <div style={{ width: "20%" }}>Rule 2: Set Auto Release</div>
          <Form
            layout={"vertical"}
            maxFieldsInRow={5}
            handleChange={handleChange}
            fields={AUTO_RELEASE_OPTIONS}
            updateDefaultValue={false}
            defaultValues={getDefaultValues}
            labelWidthSpan={6}
            fieldTypeWidthSpan={10}
          ></Form>
        </div>
      </Paper>
    </>
  );
};

export default AutoReleaseSelection;
