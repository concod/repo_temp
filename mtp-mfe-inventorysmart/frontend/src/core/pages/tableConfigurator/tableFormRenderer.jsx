import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Typography } from "@mui/material";
import { Switch, Input } from "impact-ui-v3";
import { capitalize } from "lodash";
import globalStyles from "core/Styles/globalStyles";

const TableFormRenderer = (props) => {
  const globalClasses = globalStyles();
  const { onChange, value = false, formKey, disableForm = false } = {
    ...props,
  };
  const [formValue, setFormValue] = useState(null);

  useEffect(() => {
    setFormValue(value);
  }, [value]);

  /**
   * @function
   * @description Handle form changes and update local states
   * @param {Object} event
   */
  const handleChange = (event) => {
    if (event.target.type === "checkbox") {
      setFormValue(event.target.checked);
      onChange({ [formKey]: event.target.checked });
    } else if (event.target.type === "number") {
      const inputValue = event.target.value;// Handle number inputs
      const numberValue = inputValue === "" ? 0 : parseInt(inputValue, 10);// Allow user to clear field temporarily, but treat as 0
      setFormValue(numberValue);
      onChange({ [formKey]: numberValue });
    } else {
      let inputValue = event.target.value.replace(/\s+/g, " ");
      setFormValue(inputValue);
      onChange({ [formKey]: inputValue });
    }
  };

  const renderForm = () => {
    switch (typeof formValue) {
      case "string":
        const inputLabel =
          formKey === "label"
            ? "Label"
            : formKey === "column_name"
              ? "Mapping column"
              : formKey?.includes("_")
                ? capitalize(formKey.split("_").join(" "))
                : capitalize(formKey) || "";
        return (
          <Input
            label={inputLabel}
            placeholder="Column Name"
            value={formValue}
            onChange={handleChange}
            isDisabled={disableForm}
          />
        );
        break;
      case "number":
        return (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignCenter} ${globalClasses.gap}`}
          >
            <Typography variant="h6">
              {formKey?.includes("_")
                ? capitalize(formKey.split("_").join(" "))
                : capitalize(formKey) || ""}
            </Typography>
            <Input
              type="number"
              value={formValue || ""}
              placeholder="0"
              onChange={handleChange}
              isDisabled={disableForm}
              min={0}
              style={{ width: "70px" }}
            />
          </div>
        );
        break;
      case "boolean":
        return (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignCenter}`}
          >
            <Typography variant="h6">
              {formKey?.includes("_")
                ? capitalize(formKey.split("_")[1])
                : capitalize(formKey) || ""}
            </Typography>
            <Switch
              checked={formValue}
              onChange={handleChange}
              isDisabled={disableForm}
            />
          </div>
        );
    }
  };

  return (
    <div>{formValue !== undefined && formValue !== null && renderForm()}</div>
  );
};

const mapStateToProps = (state) => {
  return {
    enableHeaderEdit: state.tableConfiguratorReducer?.enableHeaderEdit,
  };
};

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(TableFormRenderer);
