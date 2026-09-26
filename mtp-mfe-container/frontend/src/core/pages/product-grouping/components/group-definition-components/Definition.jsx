import PageRouteTitles from "../PageRouteTitles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { Grid } from "@mui/material";
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
  getDefinitions,
} from "core/pages/product-grouping/product-grouping-service";
import { addSnack } from "../../../../actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { connect } from "react-redux";
import DefintionName from "./defintionname";
import DefinitionasSubRule from "./definitionassubrule";
import { pseudocodeValidation } from "./common-functions";
import { trim } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { Input, Button, TextArea, Select, Loader } from "impact-ui-v3";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const splitFromAND = (pseducode) => {
  return pseducode
    .replace(/\s+(?=\()/g, "<<SPACE>>") // Temporarily replace spaces before opening parentheses with a marker
    .split(/ (?=AND|OR|\))/) // Split before AND/OR or closing parentheses
    .map((rule) => rule.replace(/<<SPACE>>/g, " ")) // Restore spaces inside parentheses
    .map((rule) => rule.trim()) // Trim spaces around each token
    .filter((rule) => rule.length > 0); // Remove any empty strings
};

const useStyles = makeStyles({
  subRuleContainer: {
    background: 'white',
    borderRadius: "8px",
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 8px 12px 8px',
    position: 'relative',
    minHeight: '160px',
    maxHeight: '550px',
    height: 'fit-content',
  },
  input: {
    height: "2em",
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    padding: '22px 8px 16px'
  },
  subRuleButtonContainer: {
    display: 'flex',
    flexDirection: 'row',
    padding: '5.5px 8px 0px 8px',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  subRuleButton: {
    padding: '0px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  resetButton: {
    '&.ia-styles.ia-btn.ia-btn-tertiary': {
      backgroundColor: '#F5F6FA',
      color: '#60697D',
      border: 'none',
    },
  },
  subRuleTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    padding: '9.5px 8px 0rem',
    fontWeight: 700,
    lineHeight: '21px'
  },
  subRulesTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    fontWeight: 700,
    lineHeight: '21px'
  },
  bottomButtonContainer: {
    position: 'sticky',
    bottom: 0,
    left: 0,
    padding: '8px',
    width: '100%',
    background: 'white',
    borderTop: '1px solid #f0f0f0',
    zIndex: 1,
  },
  bottomSection:{
    background: 'white',
    borderRadius: '8px',
    margin: '0px 8px',
    border: '1px solid #D9DDE7',
    padding: '16px',
    marginTop: '16px'
  },
  bottomSectionContent: {
    backgroundColor: '#F5F6FA',
    padding: '12px',
    borderRadius: '8px',
  },
  definitionLabel: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '16px',
    color: '#60697D'
  },
  infoText: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '125%',
    padding: '0px 8px',
    color: '#60697D'
  },
  definitionInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  scrollableArea: {
    overflowY: 'auto',
    flex: 1,
  },
  subRuleContent: {
    flex: 1,
  },
});

const initialState = {
  editDefinitionName: "",
  subrules: [],
  psuedocode: "",
  filterAttributes: [],
  openModal: false,
  isDfnasSubRuleOpen: false,
  showBottomSection: false,
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
          const pseudocodeArr = splitFromAND(updatedpseudocode);
          pseudocodeArr[index] = pseudocodeArr[index]?.replace(
            new RegExp("\\b" + subrule.name + "\\b"),
            action.payload.name
          );
          updatedpseudocode = pseudocodeArr.join(" ");
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
      let deletedpseudocode = state.psuedocode;

      // Split the pseudocode into parts
      let parts = splitFromAND(deletedpseudocode);

      // Remove the specific part that matches the old_name
      parts = parts.filter((part, idx) => {
        return !(part.trim() === old_name && idx === action.index);
      });

      // Reconstruct the pseudocode
      deletedpseudocode = parts.join(" AND ");

      // Clean up consecutive logical operators
      deletedpseudocode = deletedpseudocode.replace(/\b(AND|OR)\s+\1\b/g, "$1");

      // Remove redundant parentheses
      deletedpseudocode = deletedpseudocode.replace(/\(\s*\)/g, ""); // Remove empty parentheses

      // Trim leading and trailing logical operators
      deletedpseudocode = deletedpseudocode.trim();
      deletedpseudocode = trim(deletedpseudocode, "AND");
      deletedpseudocode = trim(deletedpseudocode, "OR");

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
      if (newSubRules.length === 0) {
        // If all the subrules are removed, make the psedocode as empty
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
    case "TOGGLE_BOTTOM_SECTION":
      return {
        ...state,
        showBottomSection: action.status,
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
  const [customGroupingConfig, setCustomGroupingConfig] = useState({});
  const [definitions, setDefinitions] = useState([]);
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(false);
  const [selectedDefinitions, setSelectedDefinitions] = useState([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [allOptions, setAllOptions] = useState([]);
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
    const fetchCustomGroupingConfig = async () => {
      try {
        const resp = await props.getTenantConfigApplicationLevel(3, {
          attribute_name: "custom_product_grouping_definition_attributes",
        });
        const configData = resp?.data?.data?.[0]?.attribute_value || {};
        setCustomGroupingConfig(configData);
      } catch (error) {
      }
    };
    fetchCustomGroupingConfig();
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
    const isDefaultEnabled = customGroupingConfig?.enableDefault ?? false;
    const defaultAttributeName = customGroupingConfig?.attributeName;

    const defaultAttribute = defaultAttributeName ? state.filterAttributes.find(attr => attr.name === defaultAttributeName) : null;
    const isFirstSubRule = state.subrules.length === 0;

    const newSubRule = {
      id: `Sub_Rule_${state.subrules.length + 1}`,
      name: `Sub_Rule_${state.subrules.length + 1}`,
      field: isFirstSubRule && isDefaultEnabled && defaultAttribute ? {
        label: defaultAttribute.label || defaultAttributeName,
        value: defaultAttribute.name,
        name: defaultAttribute.name,
      } : "",
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
    if (state.subrules.length === 0) {
      let psuedocode = ``;
      dispatch({
        type: "SET_PSUEDO_CODE",
        psuedocode: psuedocode,
      });
    } else {
      let psuedocode = state.psuedocode.split(" AND ");
      psuedocode.pop();
      psuedocode = psuedocode.join(" AND ");
      dispatch({
        type: "SET_PSUEDO_CODE",
        psuedocode: psuedocode,
      });
    }
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
        navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/create-group/group-definitions`, {
          state: {
            redirectTo: props.prevScr,
          },
        });
      } else {
        navigate(props.prevScr);
      }
    } else {
      navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definitions`);
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
        message: error?.response?.data?.data?.message || "Definition name already exists",
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

  const toggleBottomSection = async (status) => {
    dispatch({
      type: "TOGGLE_BOTTOM_SECTION",
      status: status,
    });
    
    if (status) {
      await fetchDefinitions();
    } else {
      setSelectedDefinitions([]);
      setDefinitions([]);
      setCurrentOptions([]);
      setAllOptions([]);
    }
  };

  const getOptionsFromDefinitions = (defs) => {
    let filteredDefinitions = [...defs];

    if (props.type === "edit") {
      filteredDefinitions = filteredDefinitions.filter((dfn) => {
        return dfn.pgd_code !== props.definition.pgd_code;
      });
    }

    return filteredDefinitions.map((dfn) => {
      return {
        ...dfn,
        label: dfn.name,
        value: dfn.pgd_code,
      };
    });
  };

  const fetchDefinitions = async () => {
    setIsLoadingDefinitions(true);
    try {
      let body = {
        search: [],
        range: [],
        sort: [],
      };
      const res = await props.getDefinitions(body, 100, 0);
      const defs = res.data.data;
      setDefinitions(defs);
      const options = getOptionsFromDefinitions(defs);
      setCurrentOptions(options);
      setAllOptions(options);
      setIsLoadingDefinitions(false);
    } catch (error) {
      setIsLoadingDefinitions(false);
    }
  };

  const onSearch = (searchValue) => {
    const searchText = searchValue?.target?.value?.toLowerCase() || '';
    
    if (!searchText) {
      setCurrentOptions(allOptions);
    } else {
      setCurrentOptions(
        allOptions.filter(option => 
          option.label.toLowerCase().includes(searchText)
        )
      );
    }
  };

  const handleAddDefinitions = () => {
    addedDefns(selectedDefinitions);
    toggleBottomSection(false);
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
      if (updatedpseudocode === "") {
        updatedpseudocode = updatedpseudocode + `${dfn.pseudo_code}`;
      } else {
        updatedpseudocode = updatedpseudocode + ` AND (${dfn.pseudo_code})`;
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

  const hasUnsavedSubRules = state.subrules.some((subrule) => !subrule.isSaved);
  const isFooterSaveEnabled =
    props.type === "create" &&
    state.subrules.length > 0 &&
    !hasUnsavedSubRules;
  const isFooterUpdateEnabled = props.type !== "create" && state.subrules.length > 0 && !hasUnsavedSubRules;

  return (
    <div className={globalClasses.paddingAroundNew}>
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
      <div className={globalClasses.breadcrumbPadding}>
        <PageRouteTitles
          id="productGrpingDfnBrdCrmbs"
          options={props.routeOptions}
        />
      </div>
      <div className={globalClasses.marginTop}>
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
        <div>
          <div className={classes.subRuleContainer}>
            <span className={classes.subRuleTitle}>
              {props.type === "edit" ? "Edit Rules" : "Add Rules"}
            </span>
            <div className={`${classes.inputContainer}`}>
              {props.type === "edit" && (
                <div className={classes.definitionInputWrapper}>
                  <label className={classes.definitionLabel}>Definition Name</label>
                  <Input
                    id="definitionEditName"
                    value={state.editDefinitionName}
                    onChange={onEditNameChange}
                  />
                </div>
              )}
              <div className={classes.definitionInputWrapper}>
                <label className={classes.definitionLabel}>Definition</label>
                <Input
                  value={state.psuedocode}
                  placeholder="Rule Definition"
                  onChange={onPsuedoChange}
                  margin="normal"
                  required
                  disabled={false}
                />
              </div>
            </div>

            {state.subrules.length > 0 && (
              <>
                <div className={classes.subRuleButtonContainer}>
                  <span className={classes.subRulesTitle}>
                    Sub Rules
                  </span>
                  <Button
                    variant="primary"
                    onClick={addNewSubRule}
                    id="productGrpingAddNewSubBtn"
                    icon={<AddIcon />}
                  >
                    <span>Sub rule</span>
                  </Button>
                </div>
                <span className={classes.infoText}>You can add maximum 9 sub rules</span>

                <div className={classes.scrollableArea}>
                  <div className={classes.subRuleContent}>
                    {state.subrules.map((subrule, idx) => {
                      return (
                        <>
                          <SubRule
                            key={`sub-rule-${subrule.id}-${idx}`}
                            id={idx}
                            index={idx}
                            subrules={state.subrules}
                            subrule={subrule}
                            deleteSubRule={deleteSubRule}
                            updateSubRule={updateSubRule}
                            filterAttributes={state.filterAttributes}
                            type={props.type}
                            customGroupingConfig={customGroupingConfig}
                          />
                        </>
                      );
                    })}
                  </div>
                </div> </>)}
            <div >
              <div className={classes.subRuleButton}>
                {state.subrules.length === 0 ? 
                 ( <Button
                    onClick={addNewSubRule}
                    variant="tertiary"
                    id="productGrpingDfnasSubBtn"
                    icon={<AddIcon />}
                  >
                    <span>Sub rule</span>
                  </Button>) : 
                  (<Button
                    onClick={resetDefinition}
                    variant="tertiary"
                    id="productGrpingDfnResetBtn"
                    className={classes.resetButton}
                  > 
                    <span>Reset</span>
                  </Button>)
                }
                {!state.showBottomSection &&
                  (<Button
                    onClick={() => toggleBottomSection(true)}
                    variant="tertiary"
                    id="productGrpingDfnasSubBtn"
                    icon={<AddIcon />}
                  >
                    <span>Definition as sub rule</span>
                  </Button>)
                }
              </div>
            </div>
            
            {state.showBottomSection &&
              (
                <div className={classes.bottomSection}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className={classes.subRulesTitle}>
                      Definition as sub rule
                    </span>
                    <Button
                      onClick={() => toggleBottomSection(false)}
                      variant="tertiary"
                      className={classes.resetButton}
                    >
                      <span>Close</span>
                      <CloseIcon style={{fontSize: '16px', color: '#60697D' }} />
                    </Button>
                  </div>
                  <div className={classes.bottomSectionContent} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
                      {isLoadingDefinitions ? (
                        <Loader />
                      ) : (
                        <Select
                          isOpen={isSelectOpen}
                          setIsOpen={setIsSelectOpen}
                          isWithSearch={true}
                          isClearable={true}
                          setCurrentOptions={setCurrentOptions}
                          currentOptions={currentOptions}
                          selectedOptions={selectedDefinitions}
                          initialOptions={allOptions}
                          setSelectedOptions={setSelectedDefinitions}
                          handleChange={(options) => setSelectedDefinitions(options)}
                          label="Select Definition"
                          labelOrientation="left"
                          isMulti={true}
                          isSelectAll={isSelectAll}
                          setIsSelectAll={setIsSelectAll}
                          toggleSelectAll={true}
                          onSearch={onSearch}
                          placeholder="Select definitions"
                        />
                      )}
                    </div>
                    <Button
                      onClick={handleAddDefinitions}
                      variant="primary"
                      disabled={selectedDefinitions.length === 0}
                      id="productGrpingDfnasSubAddBtn"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
          </div>
            <Grid
              gap={2}
              className={`${globalClasses.stickyFooter}`}
            >

              <Button
                variant="tertiary"
                onClick={() => goBack(state.subrules)}
                id="productGrpingDfnCnclBtn"
              >
               { "< Back to Grouping Definitions"}
              </Button>
              {props.type === "create" ? (
                isFooterSaveEnabled && (
                  <Button
                    id="productGrpingDfnSaveBtn"
                    variant="primary"
                    onClick={() => toggleModalState(true)}
                  >
                    Save
                  </Button>
                )
              ) : (
                isFooterUpdateEnabled && (
                  <Button
                    variant="primary"
                    onClick={onUpdate}
                    id="productGrpingDfnUpdBtn"
                  >
                    Update
                  </Button>
                )
              )}
            </Grid>
          </div>
      </div>
    </div>
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
  getTenantConfigApplicationLevel,
  getDefinitions,
};
export default connect(mapStateToProps, mapActionsToProps)(Definition);