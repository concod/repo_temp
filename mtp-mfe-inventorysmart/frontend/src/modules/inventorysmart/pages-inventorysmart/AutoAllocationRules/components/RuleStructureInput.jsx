import { Input, RadioButtonGroup, Select } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import { addSnack } from "core/actions/snackbarActions";
import { isUndefined } from "lodash";
import { setCreateRulesFormData } from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/create-auto-allocation-rules-service";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";

const useStyles = makeStyles(() => ({
  groupFields: {
    display: "flex",
    alignItems: "center",
    gap: "23px",
    "& .MuiSelect-select": {
      width: "100%",
      paddingTop: "0.5rem",
      paddingBottom: "0.5rem",
    },
  },
  // Label sits to the LEFT of the field (matches Figma), compact 32px row
  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  fieldLabel: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    color: "#60697d",
    whiteSpace: "nowrap",
  },
}));

const BOOLEAN_OPTIONS = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

// Self-contained impact-ui Select for a rule dropdown (manages its own open/options state)
const RuleSelect = ({ label, options, value, onChange, disabled }) => {
  const transformedOptions = useMemo(
    () =>
      (options || []).map((obj) => {
        const [val, lbl] = Object.entries(obj)[0];
        return { value: val, label: lbl };
      }),
    [options]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(transformedOptions);
  const [selectedOptions, setSelectedOptions] = useState(
    transformedOptions.find((opt) => opt.value === value) || null
  );

  useEffect(() => {
    setCurrentOptions(transformedOptions);
    setSelectedOptions(
      transformedOptions.find((opt) => opt.value === value) || null
    );
  }, [transformedOptions, value]);

  return (
    <Select
      label={label}
      labelOrientation="left"
      placeholder="Select"
      isClearable={false}
      isMulti={false}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      initialOptions={transformedOptions}
      currentOptions={currentOptions}
      setCurrentOptions={setCurrentOptions}
      selectedOptions={selectedOptions}
      setSelectedOptions={setSelectedOptions}
      handleChange={(option) => {
        setSelectedOptions(option || null);
        onChange(option?.value);
      }}
      withPortal={true}
      minWidth="250px"
      width="250px"
      isDisabled={disabled}
    />
  );
};

const RuleStructureInput = ({
  rule_key,
  structure,
  default_value,
  formData,
  setFormData,
  disabledDefaultRule,
}) => {
  const [defaultJson, setDefaultJson] = useState({ ...formData[rule_key] });
  const [initialJsonFetch, setInitialJsonFetch] = useState(true);
  const classes = useStyles();
  const type = structure?.value?.type || null;

  useEffect(() => {
    setFormData({ ...formData, [rule_key]: defaultJson });
  }, [defaultJson]);

  useEffect(() => {
    if (initialJsonFetch && formData[rule_key]) {
      setDefaultJson(formData[rule_key]);
      setInitialJsonFetch(false);
    }
  }, [formData]);

  const handleChange = (key, value) => {
    setDefaultJson((prev) => ({ ...prev, [key]: value }));
  };

  // Yes/No radio (matches Figma) — keeps the underlying boolean value in formData
  const renderRadioGroup = (sub_rule_key, checked, onChange) => (
    <RadioButtonGroup
      name={`${rule_key}-${sub_rule_key}-radio`}
      orientation="row"
      options={BOOLEAN_OPTIONS}
      selectedOption={checked ? "yes" : "no"}
      onChange={(e) => onChange(e.target.value === "yes")}
      isDisabled={disabledDefaultRule}
    />
  );

  const renderSwitchForNested = (sub_rule_key) =>
    renderRadioGroup(sub_rule_key, !!defaultJson?.[sub_rule_key], (val) =>
      setDefaultJson((prev) => ({ ...prev, [sub_rule_key]: val }))
    );

  const renderTextFieldForNested = (sub_rule_key, label, index, type, min, max) => (
    <div className={classes.fieldRow}>
      {!isUndefined(label) && label !== "" ? (
        <span className={classes.fieldLabel}>{label}</span>
      ) : null}
      <div className="rule-number-input-wrapper">
        <Input
          type="number"
          inputType={type}
          label=""
          placeholder=""
          min={min}
          max={max}
          onChange={(e) => {
            var value = isNaN(parseFloat(e.target.value))
              ? 0
              : parseFloat(e.target.value);
            // Prevent negative numbers
            if (value < 0) return;
            if (value > max) value = max;
            if (value < min) value = min;
            handleChange(sub_rule_key, value);
          }}
          value={defaultJson[sub_rule_key]}
          name={sub_rule_key}
          isDisabled={disabledDefaultRule}
        />
      </div>
    </div>
  );

  const renderSelectForNested = (sub_rule_key, label, options) => (
    <RuleSelect
      label={label}
      options={options}
      value={defaultJson[sub_rule_key]}
      onChange={(val) => handleChange(sub_rule_key, val)}
      disabled={disabledDefaultRule}
    />
  );

  const renderSwitch = (sub_rule_key) =>
    renderRadioGroup(sub_rule_key, !!formData?.[sub_rule_key], (val) =>
      setFormData({ ...formData, [sub_rule_key]: val })
    );

  const renderTextField = (sub_rule_key, label, index, type, min, max) => (
    <div className={classes.fieldRow}>
      {!isUndefined(label) && label !== "" ? (
        <span className={classes.fieldLabel}>{label}</span>
      ) : null}
      <div className="rule-number-input-wrapper">
        <Input
          type="number"
          inputType={type}
          label=""
          placeholder=""
          min={min}
          max={max}
          onChange={(e) => {
            const inputValue = e.target.value;
            let value;
            if (type === "float") {
              value = parseFloat(inputValue);
            } else {
              value = parseInt(inputValue, 10);
            }
            // Prevent negative numbers
          if (value < 0) return;
          if (value > max) value = max;
          if (value < min) value = min;
          setFormData({
            ...formData,
            [sub_rule_key]: value,
          });
        }}
        value={formData[sub_rule_key]?.toString()} // We store numbers in formData (using parseInt/parseFloat), Input's value prop expects a string
        name={sub_rule_key}
        isDisabled={disabledDefaultRule}
      />
      </div>
    </div>
  );

  const renderSelect = (sub_rule_key, label, options) => (
    <RuleSelect
      label={label}
      options={options}
      value={formData[sub_rule_key]}
      onChange={(val) => setFormData({ ...formData, [sub_rule_key]: val })}
      disabled={disabledDefaultRule}
    />
  );

  const getRenderElement = (sub_rule_key, sub_rule_structure, index) => {
    const subType = sub_rule_structure?.type
      ? sub_rule_structure?.type
      : sub_rule_structure?.value?.type || null;
    const label =
      structure.value && sub_rule_structure.label
        ? sub_rule_structure.label + " :"
        : sub_rule_structure.label;
    const { min, max } = sub_rule_structure;

    const options = sub_rule_structure?.value?.value || [];

    switch (subType) {
      case "boolean":
        return renderSwitchForNested(sub_rule_key);
      case "int":
      case "float":
        return renderTextFieldForNested(
          sub_rule_key,
          label,
          index,
          subType,
          min,
          max
        );
      case "dropdown":
        return renderSelectForNested(sub_rule_key, label, options);
      default:
        return !isUndefined(label) && label ? (
          <span className={classes.fieldLabel}>{label}</span>
        ) : null;
    }
  };

  const renderMainElement = () => {
    const label =
      structure.value && structure.label ? structure.label + " :" : structure.label;
    const options = structure.value?.value || [];
    const { min, max } = structure;
    switch (type) {
      case "boolean":
        return renderSwitch(rule_key);
      case "int":
      case "float":
        return renderTextField(rule_key, label, null, type, min, max);
      case "dropdown":
        return renderSelect(rule_key, label, options);
      default:
        return !isUndefined(label) && label ? (
          <span className={classes.fieldLabel}>{label}</span>
        ) : null;
    }
  };

  return structure?.label ? (
    renderMainElement()
  ) : (
    <div className={classes.groupFields}>
      {Object.entries(structure).map(
        ([sub_rule_key, sub_rule_structure], index) => (
          <Fragment key={sub_rule_key + JSON.stringify(sub_rule_structure)}>
            {getRenderElement(sub_rule_key, sub_rule_structure, index)}
          </Fragment>
        )
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const createAutoAllocationRulesService =
    inventorysmartReducer.createAutoAllocationRulesService;
  return {
    formData: createAutoAllocationRulesService.formData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setFormData: (payload) => dispatch(setCreateRulesFormData(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(RuleStructureInput);
