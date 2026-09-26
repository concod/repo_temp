import { FormControlLabel, MenuItem, Select as MuiSelect } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { addSnack } from "core/actions/snackbarActions";
import { isUndefined,isEmpty } from "lodash";
import { setCreateRulesFormData } from "modules/inventorysmart/services-inventorysmart/DcStoreStrategyRules/create-dc-store-strategy-rules-service";
import React, { Fragment, useEffect, useState } from "react";
import { connect } from "react-redux";
import { Select, Input, Switch } from "impact-ui-v3";

const useStyles = makeStyles((theme) => ({
  groupFields: {
    display: "flex",
    overflow: "scroll",
    alignItems: "center",
    "& .MuiSelect-select": {
      width: "100%",
      paddingTop: "0.5rem",
      paddingBottom: "0.5rem",
    },
  },
  alignFormElements: {
    "& .MuiOutlinedInput-root": {
      marginLeft: "8px",
    },
  },
  centerDependent: { display: "flex", gap: "1rem", alignItems: "center" },
}));

const RuleStructureInput = ({
  rule_key,
  structure,
  default_value,
  formData,
  setFormData,
  disabledDefaultRule
}) => {
  const [defaultJson, setDefaultJson] = useState({ ...formData[rule_key] });
  const [dependencyJson, setDependencyJson] = useState({});
  const [initialJsonFetch, setInitialJsonFetch] = useState(true);
  const classes = useStyles();
  const type = structure?.value?.type || null;
  const [options, setOptions] = useState( structure.value?.value || [])
  const [transformedOptions,setTransformedOptions] = useState([])

  useEffect(() => {
    // This is filter out "mins_only" from dc_to_store_strategy options incase demandType is "Fixed" Or "Aps"
    if (rule_key === "dc_to_store_strategy" && !isEmpty(formData)) {
      if (!isEmpty(formData?.demand_type)) {
        let demandType = Object.keys(formData?.demand_type)[0]
        if (["fixed_inventory_push", "aps"].includes(demandType)) {
          let options = structure.value?.value.filter((thisOpt) => {
            // Filtering out mins_only
            return isUndefined(thisOpt?.mins_only)
          })
          if (formData?.dc_to_store_strategy === "mins_only") {
            // Resting dc_to_store_strategy to "mins_first_and_then_wos"
            setFormData({ ...formData, dc_to_store_strategy: "mins_first_and_then_wos" })
          }
          setOptions(options)
        }
        else {
          setOptions(structure.value?.value || [])
        }
      }
    }
  }, [rule_key, formData])

  useEffect(()=>{
  const transformedOptions =
    options?.map((obj) => {
      const [key, value] = Object.entries(obj)[0];
      return { value: key, label: value };
    }) || [];
    setTransformedOptions(transformedOptions)
    },[options])

    useEffect(()=>{
        setCurrentOptions(transformedOptions)
    },[transformedOptions])

  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(transformedOptions);
  const [selectedOptions, setSelectedOptions] = useState(null);

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

  const removePercentageSuffix = (str) => {
    return str ? str.replace("%", "") : str;
  };

  const getDependentValue = (jsonObject) => {
    // Get key and value from jsonObject with single element
    if (jsonObject) {
      const [key, value] = Object.entries(jsonObject)[0];
      return { key, value };
    }
    return { key: null, value: null }; // Return a default value to prevent errors
  };

  const dependentOnChange = (value, dependencies) => {
    if (!dependencies || !dependencies.length) return;

    const dep = dependencies.filter((dep) => dep.show_on === value);
    if (dep.length === 0) return;

    const default_value = dep[0].default_value;
    setFormData({
      ...formData,
      [rule_key]: { [value]: default_value },
    });
  };

  const renderSwitchForNested = (sub_rule_key, label, index) => {
    return (
      <Switch
        value={defaultJson[sub_rule_key] || false}
        onChange={(e) => {
          setDefaultJson((prev) => ({
            ...prev,
            [sub_rule_key]: e.target.checked,
          }));
        }}
        leftLabel={defaultJson?.[sub_rule_key] ? "Yes" : "No"}
        disabled={disabledDefaultRule}
      />
    );
  };

  const renderTextFieldForNested = (
    sub_rule_key,
    label,
    index,
    type,
    min,
    max
  ) => (
    <div className="rule-number-input-wrapper">
      <Input
        type="number"
        placeholder=""
        min={min}
        max={max}
        onChange={(e) => {
          var value = isNaN(parseFloat(e.target.value))
            ? 0
            : parseFloat(e.target.value);
          if (value > max) value = max;
          if (value <= min) value = min;
          handleChange(sub_rule_key, value);
        }}
        value={defaultJson[sub_rule_key] || ""}
        name={sub_rule_key}
        label={label}
        isDisabled={disabledDefaultRule}
      />
    </div>
  );

  const renderSelectForNested = (sub_rule_key, label, options, index) => {
    return (
      <FormControlLabel
        disabled={disabledDefaultRule}
        control={
          <MuiSelect
            value={defaultJson[sub_rule_key] || ""}
            onChange={(e) => handleChange(sub_rule_key, e.target.value)}
            autoWidth
            label={label}
            
          >
            {options?.map((obj) => {
              const [key, value] = Object.entries(obj)[0];
              return (
                <MenuItem key={key} value={key}>
                  {value}
                </MenuItem>
              );
            })}
          </MuiSelect>
        }
        label={label}
        labelPlacement="start"
        className="alignFormElements"
      />
    );
  };

  const renderSwitch = (sub_rule_key, label, onChange, value) => {
    const isChecked =
      value !== null && value !== undefined
        ? value
        : formData?.[sub_rule_key] || false;

    return (
      <Switch
        checked={isChecked}
        onChange={
          onChange
            ? onChange
            : (e) => {
                setFormData((prev) => ({
                  ...prev,
                  [sub_rule_key]: e.target.checked,
                }));
              }
        }
        leftLabel={isChecked ? "Yes" : "No"}
        disabled={disabledDefaultRule}
      />
    );
  };

  const renderTextField = (
    sub_rule_key,
    label,
    onChange,
    value,
    type,
    min,
    max
  ) => (
    <div className="rule-number-input-wrapper">
      <Input
        type="number"
        placeholder=""
        min={min}
        max={max}
        onChange={
          onChange
            ? onChange
            : (e) => {
                var inputValue = isNaN(parseFloat(e.target.value))
                  ? 0
                  : parseFloat(e.target.value);
                if (inputValue > max) inputValue = max;
                if (inputValue <= min) inputValue = min;
                setFormData((prev) => ({
                  ...prev,
                  [sub_rule_key]: `${inputValue}`,
                }));
              }
        }
        value={
          value !== null && value !== undefined
            ? value
            : formData?.[sub_rule_key] || ""
        }
        name={sub_rule_key}
        rightIcon={type === "percent" ? "%" : ""}
        label={label}
        isDisabled={disabledDefaultRule}
      />
    </div>
  );

  const renderSelect = (
    sub_rule_key,
    label,
    onChange,
    value,
    options,
    isDependent = false,
    dependencies = []
  ) => {
    const selectedOptions =
      value
        ? transformedOptions?.find((opt) => opt.value === value)
        : isDependent
        ? transformedOptions?.find(
            (opt) => opt.value === getDependentValue(formData[sub_rule_key]).key
          )
        : transformedOptions?.find(
            (opt) => opt.value === formData[sub_rule_key]
          );
    return (
      <FormControlLabel
        control={
          <div className={classes.centerDependent}>
            <Select
              placeholder={`Select ${label}`}
              isClearable={false}
              menuShouldBlockScroll={false}
              isMulti={false}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              setCurrentOptions={setCurrentOptions}
              currentOptions={currentOptions}
              selectedOptions={selectedOptions}
              initialOptions={transformedOptions}
              handleChange={(option) => {
                if (onChange) {
                  onChange(option);
                } else {
                  isDependent
                    ? dependentOnChange(option.value, dependencies)
                    : setFormData({
                        ...formData,
                        [sub_rule_key]: option.value,
                      });
                }
                setSelectedOptions(option);
              }}
              setSelectedOptions={setSelectedOptions}
              withPortal={true}
              isDisabled={disabledDefaultRule}
            />
            {dependencies
              .filter(
                (dep) =>
                  dep.show_on === getDependentValue(formData[sub_rule_key]).key
              )
              .map((dep) => (
                <div key={dep.label}>{renderDependentElement(dep)}</div>
              ))}
          </div>
        }
        label={label}
        labelPlacement="start"
        className="alignFormElements"
      />
    );
  };

  const getRenderElement = (sub_rule_key, sub_rule_structure, index) => {
    const subType = sub_rule_structure?.type
      ? sub_rule_structure?.type
      : sub_rule_structure?.value?.type || null;
    const label =
      structure.value && sub_rule_structure.label
        ? sub_rule_structure.label + " :"
        : sub_rule_structure.label;
    const min = sub_rule_structure.min || 0;
    const max = sub_rule_structure.max || 100;

    const options = sub_rule_structure?.value?.value || [];

    switch (subType) {
      case "boolean":
        return renderSwitchForNested(sub_rule_key, label, index);
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
        return renderSelectForNested(sub_rule_key, label, options, index);
      default:
        return (
          <FormControlLabel
            control={<></>}
            label={!isUndefined(label) && label}
            labelPlacement="start"
            className="alignFormElements"
          />
        );
    }
  };

  const renderMainElement = () => {
    const label =
      structure.value && structure.label
        ? structure.label + " :"
        : structure.label;
    let min = structure.min || 0;
    let max = structure.max || 100;

    if (type === "percent") {
      min = 0;
      max = 100;
    }

    switch (type) {
      case "boolean":
        return renderSwitch(rule_key, label, null, null);
      case "int":
      case "float":
      case "percent":
        return renderTextField(rule_key, label, null, null, type, min, max);
      case "dropdown":
        return renderSelect(rule_key, label, null, null, options);
      default:
        return (
          <FormControlLabel
            control={<></>}
            label={!isUndefined(label) && label}
            labelPlacement="start"
          />
        );
    }
  };

  const renderDependentElement = (dep) => {
    if (!dep) return null;

    const label = "";
    const options = dep.value?.value || [];
    const type = dep.value?.type;
    let min = dep.min || 0;
    let max = dep.max || 100;

    if (type === "percent") {
      min = 0;
      max = 100;
    }

    const switchChange = (e) => {
      setFormData({
        ...formData,
        [rule_key]: { [dep.show_on]: e.target.checked },
      });
    };

    const onChange = (e) => {
      let value = isNaN(parseFloat(e.target.value))
        ? 0
        : parseFloat(e.target.value);
      if (value > max) value = max;
      if (value <= min) value = min;
      setFormData({
        ...formData,
        [rule_key]: { [dep.show_on]: `${value}` },
      });
    };

    // Get the dependent value safely
    const dependentValue = formData[rule_key]
      ? getDependentValue(formData[rule_key])
      : { key: null, value: null };

    switch (type) {
      case "boolean":
        return renderSwitch(
          rule_key,
          label,
          switchChange,
          dependentValue.value
        );
      case "int":
      case "float":
        return renderTextField(
          rule_key,
          label,
          onChange,
          dependentValue.value,
          type,
          min,
          max
        );
      case "percent":
        return renderTextField(
          rule_key,
          label,
          onChange,
          dependentValue.value
            ? removePercentageSuffix(dependentValue.value)
            : "",
          type,
          0,
          100
        );
      case "dropdown":
        return renderSelect(
          rule_key,
          label,
          onChange,
          dependencyJson[dep.key] || null,
          options,
          false,
          []
        );
      case "-":
        return <Input value={"-"} disabled label="" isDisabled={disabledDefaultRule} />;
      default:
        return (
          <FormControlLabel
            control={<></>}
            label={!isUndefined(label) && label}
            labelPlacement="start"
          />
        );
    }
  };

  const renderElementsWithDependency = () => {
    const label =
      structure.value && structure.label
        ? structure.label + " :"
        : structure.label;
    const dependencies = structure.value?.dependencies || [];
    const options = structure.value?.value || [];
    const min = structure.min || 0;
    const max = structure.max || 100;

    switch (type) {
      case "boolean":
        return renderSwitch(rule_key, label, null, null);
      case "int":
      case "float":
        return renderTextField(rule_key, label, null, null, type, min, max);
      case "percent":
        return renderTextField(rule_key, label, null, null, type, 0, 100);
      case "dropdown":
        return renderSelect(
          rule_key,
          label,
          null,
          null,
          options,
          true,
          dependencies
        );
      default:
        return (
          <FormControlLabel
            control={<></>}
            label={!isUndefined(label) && label}
            labelPlacement="start"
          />
        );
    }
  };

  return structure?.label ? (
    structure?.value?.dependencies ? (
      renderElementsWithDependency()
    ) : (
      renderMainElement()
    )
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
  const createDCStoreStrategyRulesService =
    inventorysmartReducer.createDCStoreStrategyRulesService;
  return {
    formData: createDCStoreStrategyRulesService.formData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setFormData: (payload) => dispatch(setCreateRulesFormData(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(RuleStructureInput);
