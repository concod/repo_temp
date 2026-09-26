import { Typography } from "@mui/material";
import DeleteTrashIcon from "coreAssets/pageAssets/IS_deleteTrash.svg";
import EditPencilIcon from "coreAssets/pageAssets/IS_editPencil.svg";
import makeStyles from "@mui/styles/makeStyles";
import "../groupTable.scss";
import { useEffect, useReducer, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "../../../../actions/snackbarActions";
import {
  fetchFilterAttributeValues,
  checkSubRuleStatus,
} from "core/pages/product-grouping/product-grouping-service";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { Input, Button, Select, Tooltip } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import CoreSelect from "core/commonComponents/filters/Select/Select";

const useStyles = makeStyles({
  subrule: {
    margin: "10px 0px",
    padding: "10px 20px",
    backgroundColor: "white",
    color: "black",
  },
  subruleDisabled: {
    margin: "10px 0px",
    padding: "10px 20px",
    backgroundColor: "#f5f6fa",
    color: "black",
    borderRadius:'8px'
  },
  dropdownDisabled: {
    color: "#AFAFAF"
  },
  textField: {
    backgroundColor: "white",
    "& .MuiInputBase-root.Mui-disabled": {
      backgroundColor: "#F2F2F2",
    },
  },
  input: {
    height: "2vh",
  },
  editButton: {
    backgroundColor: "white",
    color: "#4F677B",
    marginRight: 10,
    "&:hover": {
      backgroundColor: "white",
      color: "#4F677B",
    },
  },
  deleteButton: {
    backgroundColor: "#4F677B",
    color: "white",
    "&:hover": {
      backgroundColor: "#4F677B",
      color: "white",
    },
  },
  saveButton: {
    marginRight: 10,
  },
  subruleDiv: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const initialState = {
  isDisabled: false,
  rule_name: "",
  rule_field: "",
  rule_value: [],
  filter_attribute_values: [],
};

const subRuleReducer = (state, action) => {
  switch (action.type) {
    case "SET_DISABLED_STATE":
      return {
        ...state,
        isDisabled: action.payload,
      };
    case "SET_FILTER_ATTRIBUTE_VALUES":
      return {
        ...state,
        filter_attribute_values: action.payload,
      };
    case "CHANGE_SUB_RULE_NAME":
      return {
        ...state,
        rule_name: action.payload,
      };
    case "CHANGE_SUB_RULE_FIELD":
      return {
        ...state,
        rule_field: action.payload,
      };
    case "CHANGE_SUB_RULE_VALUE":
      return {
        ...state,
        rule_value: action.payload,
      };
    default:
      return state;
  }
};
const modifyOptions = (options) => {
  return options.map((option) => {
    return {
      ...option,
      label: replaceSpecialCharacter(option.label),
      value: option.name,
    };
  });
};


const modifyValueOptions = (options) => {
  return options.map((option) => {
    return {
      ...option,
      label: replaceSpecialCharacter(option.attribute),
      value: option.attribute,
    };
  });
};
const SubRule = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles()
  const [state, dispatch] = useReducer(subRuleReducer, initialState);
  const [typeCurrentOptions, setTypeCurrentOptions] = useState([]);
  const [typeAllOptions, setTypeAllOptions] = useState([]);
  const [typeSelectedOptions, setTypeSelectedOptions] = useState(state.rule_field);
  const [valueCurrentOptions, setValueCurrentOptions] = useState([]);
  const [valueAllOptions, setValueAllOptions] = useState([]);
  const [valueSelectedOptions, setValueSelectedOptions] = useState(state.rule_value);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isValueOpen, setIsValueOpen] = useState(false);
  const setDisableState = (status) => {
    dispatch({
      type: "SET_DISABLED_STATE",
      payload: status,
    });
  };
  const onDelete = () => {
    props.deleteSubRule(props.index);
  };
  const onNameChange = (event) => {
    dispatch({
      type: "CHANGE_SUB_RULE_NAME",
      payload: event.target.value,
    });
  };
  const onRuleFieldChange = (option) => {
    dispatch({
      type: "CHANGE_SUB_RULE_FIELD",
      payload: option,
    });
    dispatch({
      type: "CHANGE_SUB_RULE_VALUE",
      payload: [],
    });
    dispatch({
      type: "SET_FILTER_ATTRIBUTE_VALUES",
      payload: [],
    });

    fetchAttributeValues(option);
  };

  const fetchAttributeValues = async (option) => {
    try {
      const res = await props.fetchFilterAttributeValues(option.name);
      dispatch({
        type: "SET_FILTER_ATTRIBUTE_VALUES",
        payload: res.data.data.attribute,
      });
    } catch (error) {}
  };
  const onRuleValueChange = (options) => {
    dispatch({
      type: "CHANGE_SUB_RULE_VALUE",
      payload: isSubruleValuesMultiSelect() ? options : [options],
    });
  };
  const updateSubRule = async () => {
    if (
      state.rule_name === "" ||
      state.rule_field === "" ||
      state.rule_value.length === 0
    ) {
      props.addSnack({
        message: "Fields can't be empty",
        options: {
          variant: "error",
        },
      });
      return;
    }
    if (/\s/g.test(state.rule_name)) {
      props.addSnack({
        message: "Please enter a valid definition name",
        options: {
          variant: "error",
        },
      });
      return;
    }
    const savedRules = props.subrules.filter(
      (subrule, idx) => subrule.isSaved && idx !== props.index
    );
    if (savedRules.some((subrule) => subrule.name === state.rule_name)) {
      props.addSnack({
        message: "Sub Rule Names have to be unique",
        options: {
          variant: "error",
        },
      });
      return;
    }
    try {
      const body = {
        pgr_code: props.subrule.pgr_code,
        name: state.rule_name,
        attribute_name: state.rule_field.value,
        attribute_value: state.rule_value.map((val) => val.value),
      };
      const res = await props.checkSubRuleStatus(body);
      if (res.data.data.is_valid) {
        const payload = {
          id: props.subrule.id,
          name: state.rule_name,
          field: state.rule_field,
          value: state.rule_value,
          pgr_code: props.subrule.pgr_code,
          isSaved: true,
        };
        props.updateSubRule(props.index, payload);
        setDisableState(true);
      } else {
        props.addSnack({
          message: res.data.message,
          options: {
            variant: "error",
          },
        });
      }
    } catch (error) {
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
    }
  };

  useEffect(() => {
    if (
      ((props.type === "edit" && props.subrule.field) || props.subrule.field) &&
      !props.isSaved &&
      state.filter_attribute_values.length === 0
    ) {
      fetchAttributeValues(
        typeof props.subrule.field === "string"
          ? {
              label: props.subrule.field,
              value: props.subrule.field,
              name: props.subrule.field,
            }
          : props.subrule.field
      );
    }
    setDisableState(props.subrule.isSaved);
    dispatch({
      type: "CHANGE_SUB_RULE_NAME",
      payload: props.subrule.name,
    });
    dispatch({
      type: "CHANGE_SUB_RULE_VALUE",
      payload: props.subrule.value.map((value) => {
        if (typeof value === "string") {
          return {
            label: replaceSpecialCharacter(value),
            value: value,
            name: value,
            attribute: value,
          };
        }
        return value;
      }),
    });
  }, [props.subrule, props.subrule.isSaved]);

  useEffect(() => {
    if (props.filterAttributes.length > 0) {
      dispatch({
        type: "CHANGE_SUB_RULE_FIELD",
        payload:
          typeof props.subrule.field === "string" && props.subrule.field !== ""
            ? {
                label: replaceSpecialCharacter(
                  props.filterAttributes.filter(
                    (attrib) => attrib.name === props.subrule.field
                  )[0]?.label
                ),
                value: props.subrule.field,
                name: props.subrule.field,
              }
            : props.subrule.field,
      });
    }
  }, [props.filterAttributes]);

  useEffect(() => {
    if (state.filter_attribute_values.length > 0) {
      const modifiedOptions = modifyValueOptions(state.filter_attribute_values);
      setValueCurrentOptions(modifiedOptions);
      setValueAllOptions(modifiedOptions);
    }
    if (state.rule_field) {
      setTypeSelectedOptions(state.rule_field);
    }
    if (state.rule_value) {
      setValueSelectedOptions(isSubruleValuesMultiSelect() ? state.rule_value : state.rule_value[0]);
    }
  }, [state]);

  useEffect(() => {
    if (props.filterAttributes.length > 0) {
      const modifiedOptions = modifyOptions(props.filterAttributes);
      setTypeCurrentOptions(modifiedOptions);
      setTypeAllOptions(modifiedOptions);
    }
  }, [props.filterAttributes]);

  const EditSubRule = () => {
    setDisableState(false);
    const payload = {
      id: props.subrule.id,
      name: state.rule_name,
      field: state.rule_field,
      value: state.rule_value,
      pgr_code: props.subrule.pgr_code,
      isSaved: false,
    };
    props.updateSubRule(props.index, payload);
  };

  const onValueSearch = (searchValue) => {
    const searchText = searchValue?.target?.value?.toLowerCase() || '';
    if (!searchText) {
      setValueCurrentOptions(valueAllOptions);
    } else {
      // Split by comma and trim whitespace for comma-separated search
      const searchTerms = searchText.split(',').map(term => term.trim()).filter(term => term.length > 0);
      setValueCurrentOptions(
        valueAllOptions.filter(option => {
          const optionLabel = option.label.toLowerCase();
          // If no comma in search, use original behavior
          if (searchTerms.length === 1) {
            return optionLabel.includes(searchTerms[0]);
          }
          // For comma-separated search, to check if option contains any of the search terms
          return searchTerms.some(term => optionLabel.includes(term));
        })
      );
    }
  };
  const onTypeSearch = (searchValue) => {
    const searchText = searchValue?.target?.value?.toLowerCase() || '';
    if (!searchText) {
      setTypeCurrentOptions(typeAllOptions);
    } else {
      setTypeCurrentOptions(
        typeAllOptions.filter(option =>
          option.label.toLowerCase().includes(searchText)
        )
      );
    } 
  };
  const isTypeDropdownSingleSelect = props.inventorysmartScreenConfig?.inventorysmart_grouping?.isSubruleTypeSingleSelect ?? false;
  const typeDropdownSingleSelectKey = props.inventorysmartScreenConfig?.inventorysmart_grouping?.subruleTypeSingleSelectKey;
  const backGroundClass = state.isDisabled ? classes.subruleDisabled : classes.subrule;
  
  // Determine if the dropdown should be multi-select based on configuration and selected type
  const isSubruleValuesMultiSelect = () => {
    return !(isTypeDropdownSingleSelect && typeSelectedOptions?.value === typeDropdownSingleSelectKey);
  }
  const shouldUseCoreSelect = () => {
    return valueAllOptions.length > 100;
  }

  const handleCoreSelectChange = (keys, option) => {
    onRuleValueChange(option);
  }

  return (
    
    <div>
      <div className={`${globalClasses.flexAlignBetweenCenter} ${backGroundClass}`}>
        <div className={globalClasses.flexRow}>
          <div className={classes.flexRow}>
            <Typography sx={{ marginRight: "4px" }}>{"Name "}</Typography>
            <div className={classes.textField}>
              <Input
                id="productGrpingSubRuleNameInp"
                onChange={onNameChange}
                placeholder="Please enter text"
                value={state.rule_name}
                isDisabled={state.isDisabled}
                inputProps={{
                  classes: {
                    input: classes.input,
                  },
                }}
              />
            </div>
          </div>
          <div className={globalClasses.marginHorizontal}>
            <Select
              isDisabled={state.isDisabled || (props.customGroupingConfig?.enableDefault && props.index === 0 && state.rule_field && state.rule_field.value === props.customGroupingConfig?.attributeName)}
              portalContainer={document.body}
              isOpen={isTypeOpen}
              setIsOpen={setIsTypeOpen}
              isWithSearch={true}
              isClearable={false}
              isMulti={false}
              setCurrentOptions={setTypeCurrentOptions}
              currentOptions={typeCurrentOptions}
              selectedOptions={typeSelectedOptions}
              initialOptions={typeCurrentOptions}
              setSelectedOptions={setTypeSelectedOptions}
              handleChange={onRuleFieldChange}
              labelOrientation="left"
              onSearch={onTypeSearch}
              withPortal={true}
              label="Type"
            />
          </div>

          {shouldUseCoreSelect() ? (
            <CoreSelect
            isDisabled={state.isDisabled}
            is_multiple_selection={isSubruleValuesMultiSelect()}
            isClearable={true}
            initialData={valueAllOptions}
            selectedOptions={valueSelectedOptions}
            updateDependency={handleCoreSelectChange}
            label="Values"
            labelOrientation="left"
            withPortal={true}
            filter_keyword="values"
           column_name="values"
           type="cascaded"
           dimension="product"
           doNotUpdateDefaultValue={false}
           name="subrule_values"
           />
          ) : ( 
          <Select
            isDisabled={state.isDisabled}
            portalContainer={document.body}
            isOpen={isValueOpen}
            setIsOpen={setIsValueOpen}
            isWithSearch={true}
            isClearable={true}
            isMulti={isSubruleValuesMultiSelect()}
            setCurrentOptions={setValueCurrentOptions}
            currentOptions={valueCurrentOptions}
            selectedOptions={valueSelectedOptions}
            initialOptions={valueCurrentOptions}
            setSelectedOptions={setValueSelectedOptions}
            handleChange={onRuleValueChange}
            labelOrientation="left"
            isSelectAll={isSubruleValuesMultiSelect() ? isSelectAll : false}
            setIsSelectAll={setIsSelectAll}
            onSearch={onValueSearch}
            withPortal={true}
            label="Values"
            toggleSelectAll={isSubruleValuesMultiSelect()}
            placeholder="Select"
          />
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {state.isDisabled ? (
            <Tooltip title="Edit" orientation="top" variant="tertiary">
              <Button
                id="productGrpingSubRuleEditBtn"
                onClick={EditSubRule}
                size="large"
                variant="secondary"
                icon={<EditPencilIcon />}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            </Tooltip>
          ) : (
            <Button
              id="productGrpingSubRuleSaveBtn"
              variant="tertiary"
              onClick={() => updateSubRule()}
              className={`${classes.saveButton}`}
            >
              Save
            </Button>
          )}
          <Tooltip title="Delete" orientation="top" variant="tertiary">
            <Button
              onClick={onDelete}
              id="productGrpingSubRuleDelBtn"
              size="large"
              variant="secondary"
              type="destructive"
              icon={<DeleteTrashIcon />}
              disabled={
                props.customGroupingConfig?.enableDefault &&
                props.index === 0 &&
                state.rule_field &&
                (state.rule_field.value ===
                  props.customGroupingConfig?.attributeName ||
                  state.rule_field.name ===
                    props.customGroupingConfig?.attributeName)
              }
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
const mapStateToProps = (state) => ({
  inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
});
const mapActionsToProps = {
  fetchFilterAttributeValues,
  addSnack,
  checkSubRuleStatus,
};
export default connect(mapStateToProps, mapActionsToProps)(SubRule);