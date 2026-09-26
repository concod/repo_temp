import { useState, useRef } from "react";
import { Checkbox } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";
import { isEmpty } from "lodash";
import { useStyles } from "../../../../styling.jsx";

const CheckboxGroupContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
  const classes = useStyles();
  const {
    label,
    orientation,
    options = [],
    defaultSelected,
    minOptions,
    maxOptions,
    isRequired,
    isDisabled,
  } = bodyText || {};

  const min = minOptions ?? 1;
  const max = maxOptions ?? options.length;

  const chatbotContext = useSelector((state) => state.smartBotReducer.chatbotContext);
  const chatbotContextRef = useRef(chatbotContext);
  chatbotContextRef.current = chatbotContext;
  const persistedFormValues = useSelector((state) => state.smartBotReducer.persistedFormValues);
  const dispatch = useDispatch();

  const [selected, setSelected] = useState(() => {
    const persisted = persistedFormValues?.[formKey];
    if (Array.isArray(persisted)) return persisted;
    return Array.isArray(defaultSelected) ? defaultSelected : [];
  });

  if (isEmpty(bodyText)) return null;

  const groupDisabled = isDisabled || isFormDisabled;

  const dispatchSelection = (newValues) => {
    const latestContext = chatbotContextRef.current;
    dispatch(setChatbotContext({
      ...latestContext,
      [bodyText?.paramName]: {
        ...latestContext?.[bodyText?.paramName],
        [bodyText?.paramName]: newValues,
        updated: true,
      },
    }));
    dispatch(setPersistedFormValues({ [formKey]: newValues }));
  };

  const handleChange = (optionValue, isChecked) => {
    try {
      const newValues = isChecked
        ? [...selected, optionValue]
        : selected.filter((val) => val !== optionValue);
      setSelected(newValues);
      dispatchSelection(newValues);
    } catch (error) {
      console.error("Error in checkboxGroup handleChange", error);
    }
  };

  const isRow = orientation === "row";
  const overMax = selected.length > max;
  const belowMin = isRequired && selected.length < min;

  return (
    <div style={{ width: "100%", marginTop: "10px" }}>
      {label && (
        <p className={classes.radioGrpLabel}>
          {label}
          {isRequired ? " *" : ""}
        </p>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: isRow ? "row" : "column",
          flexWrap: isRow ? "wrap" : "nowrap",
          gap: isRow ? "16px" : "8px",
        }}
      >
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={selected.includes(option.value)}
            disabled={option.disabled || groupDisabled}
            onChange={(e) => handleChange(option.value, e?.currentTarget?.checked)}
            variant="default"
          />
        ))}
      </div>
      {overMax && (
        <p className={classes.radioGrpLabel} style={{ margin: "8px 0 0 0", color: "red" }}>
          {`Select at most ${max} option${max > 1 ? "s" : ""}`}
        </p>
      )}
      {!overMax && belowMin && (
        <p className={classes.radioGrpLabel} style={{ margin: "8px 0 0 0", color: "red" }}>
          {`Select at least ${min} option${min > 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
};

export default CheckboxGroupContent;
