import PageRouteTitles from "../PageRouteTitles";
import AddIcon from "@mui/icons-material/Add";
import {
  Container,
  TextField,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  FormHelperText,
} from "@mui/material";
import Button from "@mui/material/Button";
import makeStyles from "@mui/styles/makeStyles";
import "../groupTable.scss";
import SubRule from "./subrule";
import { useEffect, useReducer, useState } from "react";
import {
  fetchFilterAttributes,
  saveDefinition,
  fetchGroupDefinitionById,
  updateDefinition,
  setMappedDefns,
} from "core/pages/product-grouping/product-grouping-service";
import { addSnack } from "../../../../actions/snackbarActions";
import { connect } from "react-redux";
import DefintionName from "./defintionname";
import DefinitionasSubRule from "./definitionassubrule";
import { pseudocodeValidation } from "./common-functions";
import { trim } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles({
  subRuleContainer: {
    height: "min(50vh, 18rem)",
    overflowY: "auto",
  },
  input: {
    height: "2em",
  },
});

const initialState = {
  editDefinitionName: "",
  subrules: [],
  psuedocode: "",
  filterAttributes: [],
  openModal: false,
  isDfnasSubRuleOpen: false,
};

const groupDefReducer = (state, action) => {
  switch (action.type) {
    case "SET_EDIT_DEFINITION_NAME":
      return {
        ...state,
        editDefinitionName: action.payload,
      };
    case "RESET_DEFINITION":
      return {
        ...state,
        subrules: [],
        psuedocode: "",
        editDefinitionName: "",
      };
    case "SET_PSUEDO_CODE":
      return {
        ...state,
        psuedocode: action.psuedocode,
      };
    case "SET_SUB_RULES":
      return {
        ...state,
        subrules: [...action.payload],
      };
    case "ADD_SUB_RULE":
      return {
        ...state,
        subrules: [...state.subrules, action.subrule],
      };
    case "UPDATE_SUB_RULE":
      let updatedpseudocode = state.psuedocode;
      let updatedSubRules = state.subrules.map((subrule, index) => {
        if (index === action.index) {
          updatedpseudocode = updatedpseudocode.replace(
            new RegExp("\\b" + subrule.name + "\\b"),
            action.payload.name
          );
          return action.payload;
        } else {
          return subrule;
        }
      });
      return {
        ...state,
        psuedocode: updatedpseudocode,
        subrules: [...updatedSubRules],
      };
    case "DELETE_SUB_RULE":
      let old_name = state.subrules[action.index].name;
      let replaced_strings = [
        old_name + " AND ",
        " AND " + old_name,
        old_name + " OR ",
        " OR " + old_name,
        old_name,
      ];
      let deletedpseudocode = state.psuedocode;
      replaced_strings.forEach((str) => {
        deletedpseudocode = deletedpseudocode.replace(
          new RegExp("\\b" + str + "\\b"),
          ""
        );
      });
      let newSubRules = state.subrules.map((subrule, index) => {
        if (index > action.index) {
          if (subrule.id === subrule.name) {
            deletedpseudocode = deletedpseudocode.replace(
              new RegExp("\\b" + subrule.name + "\\b"),
              `Sub_Rule_${index}`
            );
            return {
              ...subrule,
              id: `Sub_Rule_${index}`,
              name: `Sub_Rule_${index}`,
            };
          } else {
            return {
              ...subrule,
              id: `Sub_Rule_${index}`,
            };
          }
        }
        return subrule;
      });
      newSubRules = newSubRules.filter((_item, idx) => {
        return idx !== action.index;
      });
      deletedpseudocode = deletedpseudocode.replace("()", "");
      deletedpseudocode = deletedpseudocode.trim();
      deletedpseudocode = trim(deletedpseudocode, "AND");
      if (newSubRules.length === 0) {
        //If all the subrules are removed, make the psedocode as empty
        deletedpseudocode = "";
      }
      return {
        ...state,
        subrules: [...newSubRules],
        psuedocode: deletedpseudocode,
      };
    case "SET_FILTER_ATTRIBUTES":
      return {
        ...state,
        filterAttributes: [...action.payload],
      };
    case "TOGGLE_MODAL_STATE":
      return {
        ...state,
        openModal: action.status,
      };
    case "SET_DFN_SUB_RULE_MODAL_STATE":
      return {
        ...state,
        isDfnasSubRuleOpen: action.status,
      };
    default:
      return state;
  }
};

const Definition = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const [state, dispatch] = useReducer(groupDefReducer, initialState);
  useEffect(() => {
    //fetch the product dimension filter-attributes
    const fetchData = async () => {
      try {
        const res = await props.fetchFilterAttributes("product");
        dispatch({
          type: "SET_FILTER_ATTRIBUTES",
          payload: res.data.data,
        });
      } catch (error) {
        //Error Handling
      }
    };
    fetchData();
  }, []);
  useEffect(() => {
    //whenever definition is changed
    if (props.type === "edit") {
      dispatch({
        type: "SET_SUB_RULES",
        payload: props.definition.rules
          ? props.definition.rules.map((rule, idx) => {
              return {
                id: `Sub_Rule_${idx + 1}`,
                name: rule.name,
                pgr_code: rule.pgr_code,
                field: rule.attribute_name,
                value: [...rule.attribute_values],
                isSaved: true,
              };
            })
          : [],
      });
      dispatch({
        type: "SET_PSUEDO_CODE",
        psuedocode: props.definition.pseudo_code,
      });
      dispatch({
        type: "SET_EDIT_DEFINITION_NAME",
        payload: props.definition.name,
      });
    }
  }, [props.definition]);
  const addNewSubRule = () => {
    const newSubRule = {
      id: `Sub_Rule_${state.subrules.length + 1}`,
      name: `Sub_Rule_${state.subrules.length + 1}`,
      field: "",
      value: [],
      isSaved: false,
    };
    if (state.subrules.length === 0) {
      let psuedocode = `Sub_Rule_${state.subrules.length + 1}`;
      dispatch({
        type: "SET_PSUEDO_CODE",
        psuedocode: psuedocode,
      });
    } else {
      let psuedocode =
        state.psuedocode + ` AND Sub_Rule_${state.subrules.length + 1}`;
      dispatch({
        type: "SET_PSUEDO_CODE",
        psuedocode: psuedocode,
      });
    }
    dispatch({
      type: "ADD_SUB_RULE",
      subrule: newSubRule,
    });
    props.setIsEdited && props.setIsEdited(true);
  };

  const deleteSubRule = (index) => {
    dispatch({
      type: "DELETE_SUB_RULE",
      index: index,
    });
    if (state.subrules.length === 0 && state.psuedocode === "") {
      props.setIsEdited && props.setIsEdited(false);
    }
  };
  const updateSubRule = (index, payload) => {
    dispatch({
      type: "UPDATE_SUB_RULE",
      index: index,
      payload: payload,
    });
    props.setIsEdited && props.setIsEdited(true);
  };
  const resetDefinition = () => {
    dispatch({
      type: "RESET_DEFINITION",
    });
    props.setIsEdited && props.setIsEdited(false);
  };
  const toggleModalState = (status) => {
    dispatch({
      type: "TOGGLE_MODAL_STATE",
      status: status,
    });
  };
  const onPsuedoChange = (event) => {
    dispatch({
      type: "SET_PSUEDO_CODE",
      psuedocode: event.target.value,
    });
    props.setIsEdited && props.setIsEdited(true);
  };

  const onEditNameChange = (event) => {
    dispatch({
      type: "SET_EDIT_DEFINITION_NAME",
      payload: event.target.value,
    });
    props.setIsEdited && props.setIsEdited(true);
  };

  const redirect = () => {
    if (props.prevScr) {
      if (props.prevScr.includes("create-group")) {
        navigate("/product-grouping/create-group/group-definitions", {
          state: {
            redirectTo: props.prevScr,
          },
        });
      } else {
        navigate(props.prevScr);
      }
    } else {
      navigate("/product-grouping/group-definitions");
    }
  };

  const goBack = (subrules = []) => {
    if (props.type === "edit") {
      if (
        subrules.some((subrule) => {
          return !subrule.isSaved;
        }) &&
        subrules.length !== 0
      ) {
        redirect();
        return;
      }
    }
    // if (state.subrules.length != 0) {
    //   setconfirmPopUp(true);
    //   return;
    // }
    redirect();
  };

  const onUpdate = async () => {
    if (!pseudocodeValidation(state.psuedocode, state.subrules)) {
      props.addSnack({
        message: "Please enter a valid definition",
        options: {
          variant: "error",
        },
      });
      return;
    }
    const updatedDefinitionJSON = {
      name: state.editDefinitionName,
      pseudo_code: state.psuedocode,
      rules: state.subrules.map((subrule) => {
        return {
          name: subrule.name,
          pgr_code: subrule.pgr_code,
          attribute_name:
            typeof subrule.field === "string"
              ? {
                  name: subrule.field,
                }
              : subrule.field,
          attribute_values: subrule.value.map((attribvalue) => {
            if (typeof attribvalue === "string") {
              return attribvalue;
            } else {
              return attribvalue.value;
            }
          }),
        };
      }),
    };
    try {
      await props.updateDefinition(
        props.definition.pgd_code,
        updatedDefinitionJSON
      );
      if (location.pathname.includes("definition-mapping")) {
        props.setMappedDefns(
          props.mappedDefns.map((defn) => {
            const defn_id = location.pathname.split("/")[5];
            if (defn.name + "" === defn_id) {
              return {
                ...defn,
                defn_name: state.editDefinitionName,
                pseudo_code: state.psuedocode,
              };
            }
            return defn;
          })
        );
      }
      props.setIsEdited && props.setIsEdited(false);
      props.addSnack({
        message: "Updated Successfully",
        options: {
          variant: "success",
          autoHideDuration: 3000,
          onClose: () => goBack(),
        },
      });
    } catch (error) {
      props.addSnack({
        message: error?.response?.data?.data?.message || "Update failed",
        options: {
          variant: "error",
          autoHideDuration: 3000,
        },
      });
    }
  };

  const ToggleDfnSubRuleModal = (status) => {
    dispatch({
      type: "SET_DFN_SUB_RULE_MODAL_STATE",
      status: status,
    });
  };

  const addedDefns = (dfns) => {
    let updatedSubRules = [...state.subrules];
    let newSubRules = [];
    let updatedpseudocode = state.psuedocode;
    dfns.forEach((dfn) => {
      if (dfn.rules) {
        dfn.rules.forEach((rule) => {
          newSubRules.push({
            name: rule.name,
            field: rule.attribute_name,
            value: [...rule.attribute_values],
            isSaved: false,
          });
        });
      }
      if (!updatedpseudocode.includes(dfn.pseudo_code)) {
        if (updatedpseudocode === "") {
          updatedpseudocode = updatedpseudocode + `${dfn.pseudo_code}`;
        } else {
          updatedpseudocode = updatedpseudocode + ` AND (${dfn.pseudo_code})`;
        }
      }
    });
    updatedSubRules = [...updatedSubRules, ...newSubRules];
    updatedSubRules = updatedSubRules.map((subrule, idx) => {
      return {
        ...subrule,
        id: `Sub_Rule_${idx + 1}`,
      };
    });

    dispatch({
      type: "SET_SUB_RULES",
      payload: updatedSubRules,
    });
    dispatch({
      type: "SET_PSUEDO_CODE",
      psuedocode: updatedpseudocode,
    });
    props.setIsEdited && props.setIsEdited(true);
    ToggleDfnSubRuleModal(false);
  };
  return (
    <>
      {state.isDfnasSubRuleOpen && (
        <DefinitionasSubRule
          type={props.type}
          editDefinition={props.definition}
          id="productGrpingDfnasSubruleComp"
          isOpen={state.isDfnasSubRuleOpen}
          handleClose={() => ToggleDfnSubRuleModal(false)}
          addedDefns={addedDefns}
        />
      )}
      <PageRouteTitles
        id="productGrpingDfnBrdCrmbs"
        options={props.routeOptions}
      />
      <Container maxWidth={false}>
        {state.openModal && (
          <DefintionName
            open={state.openModal}
            handleClose={() => toggleModalState(false)}
            subrules={state.subrules}
            psuedocode={state.psuedocode}
            resetDefinition={resetDefinition}
            prevScr={props.prevScr}
            id="productGrpingDfnNameComp"
          />
        )}
        <Container maxWidth={false} disableGutters={true}>
          {props.type === "edit" && (
            <TextField
              autoFocus
              margin="dense"
              id="definitionEditName"
              label="Definition Name"
              value={state.editDefinitionName}
              onChange={onEditNameChange}
              classes={{ root: globalClasses.marginBottom }}
            />
          )}
          <div>
            <Typography>Rules</Typography>
            {state.subrules.length === 0 ? (
              <Container
                id="productGrpingEmptySubruleCont"
                maxWidth={false}
                className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${classes.subRuleContainer}`}
              >
                <div className="no-subrule-div">No subrules added yet</div>
              </Container>
            ) : (
              <Container
                id="productGrpingSubruleCont"
                maxWidth={false}
                classes={{ root: classes.subRuleContainer }}
              >
                {state.subrules.map((subrule, idx) => {
                  return (
                    <>
                      <SubRule
                        id={idx}
                        index={idx}
                        subrules={state.subrules}
                        subrule={subrule}
                        deleteSubRule={deleteSubRule}
                        updateSubRule={updateSubRule}
                        filterAttributes={state.filterAttributes}
                        type={props.type}
                      />
                    </>
                  );
                })}
              </Container>
            )}
            <div
              className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginBottom} ${globalClasses.marginTop}`}
            >
              <Button
                color="primary"
                variant="contained"
                onClick={addNewSubRule}
                id="productGrpingAddNewSubBtn"
              >
                <AddIcon /> <Typography>Sub rule</Typography>
              </Button>
              <Button
                onClick={() => ToggleDfnSubRuleModal(true)}
                color="primary"
                variant="contained"
                id="productGrpingDfnasSubBtn"
              >
                <AddIcon /> <Typography>Definition as sub rule</Typography>
              </Button>
            </div>
            <div className="definition-input-div">
              <Typography>Definition:</Typography>
              <div
                className={`${globalClasses.flexColumn} ${globalClasses.fullWidth}`}
              >
                <TextField
                  id="productGrpingDfnPsuedocodeInp"
                  style={{ flex: 1 }}
                  multiline
                  value={state.psuedocode}
                  onChange={onPsuedoChange}
                  rows={4}
                  classes={{
                    root: `${globalClasses.marginLeft1rem} ${globalClasses.fullWidth}`,
                  }}
                  variant="outlined"
                  InputProps={{ input: classes.input }}
                />
                <FormHelperText
                  error
                  variant="filled"
                  classes={`${globalClasses.marginLeft1rem} ${globalClasses.fullWidth} ${globalClasses}`}
                >
                  * The output of grouping definition may not be in line with
                  the sub-rule created
                </FormHelperText>
              </div>
            </div>

            <div
              className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.centerAlign} ${globalClasses.marginTop}`}
            >
              {props.type === "create" ? (
                <Button
                  id="productGrpingDfnSaveBtn"
                  variant="contained"
                  color="primary"
                  disabled={
                    state.subrules.some((subrule) => !subrule.isSaved) ||
                    state.subrules.length === 0
                  }
                  onClick={() => toggleModalState(true)}
                >
                  Save
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onUpdate}
                  id="productGrpingDfnUpdBtn"
                  disabled={state.subrules.some((subrule) => !subrule.isSaved)}
                >
                  Update
                </Button>
              )}
              <Button
                variant="outlined"
                color="primary"
                onClick={() => goBack(state.subrules)}
                id="productGrpingDfnCnclBtn"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Container>
      </Container>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    mappedDefns: state.productGroupReducer.mappedDefns,
  };
};
const mapActionsToProps = {
  fetchFilterAttributes,
  saveDefinition,
  fetchGroupDefinitionById,
  updateDefinition,
  addSnack,
  setMappedDefns,
};
export default connect(mapStateToProps, mapActionsToProps)(Definition);
