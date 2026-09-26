import { TextField, Typography, IconButton, Button } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AppBar from "@mui/material/AppBar";
import makeStyles from "@mui/styles/makeStyles";
import ReactSelect from "../../../../Utils/select";
import "../groupTable.scss";
import { useEffect, useReducer } from "react";
import { connect } from "react-redux";
import { addSnack } from "../../../../actions/snackbarActions";
import {
  fetchFilterAttributeValues,
  checkSubRuleStatus,
} from "core/pages/product-grouping/product-grouping-service";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

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
    backgroundColor: "#E9EFF5",
    color: "black",
  },
  dropdownDisabled : {
    color:"#AFAFAF"
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
const SubRule = (props) => {
  const classes = useStyles();
  const [state, dispatch] = useReducer(subRuleReducer, initialState);
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
      payload: options,
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
  useEffect(() => {
    if (
      (props.type === "edit" || props.subrule.field) &&
      !props.isSaved &&
      state.filter_attribute_values.length === 0
    ) {
      setDisableState(props.subrule.isSaved);
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
  }, [props.subrule]);

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
                  )[0].label
                ),
                value: props.subrule.field,
                name: props.subrule.field,
              }
            : props.subrule.field,
      });
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
  return (
    <AppBar
      classes={{
        root: state.isDisabled ? classes.subruleDisabled : classes.subrule,
      }}
      position="static"
    >
      <div className="sub-rule-div">
        <Typography>{props.subrule.id}:</Typography>
        <TextField
          id="productGrpingSubRuleNameInp"
          size="small"
          onChange={onNameChange}
          disabled={state.isDisabled}
          classes={{ root: classes.textField }}
          variant="outlined"
          value={state.rule_name}
          InputProps={{ classes: { input: classes.input } }}
        />
        <div style={{ width: "20%" }}>
          <ReactSelect
            menuPortalTarget={document.body}
            id="productGrpingSubRuleFieldDrpDwn"
            isSearchable={true}
            isDisabled={state.isDisabled}
            options={modifyOptions(props.filterAttributes)}
            value={state.rule_field}
            onChange={onRuleFieldChange}
            maxMenuHeight={"25vh"}
            className={state.isDisabled && classes.dropdownDisabled}
          />
        </div>
        <div style={{ width: "20%" }}>
          <ReactSelect
            menuPortalTarget={document.body}
            isSearchable={true}
            id="productGrpingSubRuleValueDrpDwn"
            isMulti={true}
            value={state.rule_value}
            isDisabled={state.isDisabled}
            options={modifyValueOptions(state.filter_attribute_values)}
            onChange={onRuleValueChange}
            maxMenuHeight={"25vh"}
            className={state.isDisabled && classes.dropdownDisabled}
          />
        </div>
        <div>
          {state.isDisabled ? (
            <IconButton
              id="productGrpingSubRuleEditBtn"
              classes={{ root: classes.editButton }}
              onClick={EditSubRule}
              size="large"
            >
              <EditRoundedIcon />
            </IconButton>
          ) : (
            <Button
              id="productGrpingSubRuleSaveBtn"
              color="primary"
              variant="contained"
              onClick={() => updateSubRule()}
              classes={{ root: classes.saveButton }}
            >
              {" "}
              Save
            </Button>
          )}
          <IconButton
            classes={{ root: classes.deleteButton }}
            onClick={onDelete}
            id="productGrpingSubRuleDelBtn"
            size="large"
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      </div>
    </AppBar>
  );
};
const mapActionsToProps = {
  fetchFilterAttributeValues,
  addSnack,
  checkSubRuleStatus,
};
export default connect(null, mapActionsToProps)(SubRule);
