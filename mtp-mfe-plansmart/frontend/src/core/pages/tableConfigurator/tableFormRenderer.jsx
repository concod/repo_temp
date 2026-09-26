import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Switch, Typography, TextField } from "@mui/material";
import { capitalize } from "lodash";
import globalStyles from "core/Styles/globalStyles";

const TableFormRenderer = (props) => {
  const globalClasses = globalStyles();
  const { onChange, value = false, formKey, disableForm = false  } = { ...props };
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
    } else {
      let inputValue = event.target.value.replace(/\s+/g, " ");
      setFormValue(inputValue);
      onChange({ [formKey]: inputValue });
    }
  };

  const renderForm = () => {
    switch (typeof formValue) {
      case "string":
        return (
          <TextField
            id="outlined-basic"
            placeholder="Column Name"
            variant="outlined"
            value={formValue}
            size="small"
            onChange={handleChange}
            className={globalClasses.fullWidth}
            disabled={!props.enableHeaderEdit || disableForm}
          />
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
              color="primary"
              checked={formValue}
              onChange={handleChange}
              disabled={disableForm}
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
    enableHeaderEdit: state.tableConfiguratorReducer.enableHeaderEdit,
  }
}

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(TableFormRenderer);
