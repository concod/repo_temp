import React, { useEffect, useRef, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import { Button, Input, Menu, useTranslation } from "impact-ui-v3";
import { Typography } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  createNewAutoAllocationRule,
  getAutoAllocationRulesSet,
  setRulesLoader,
  getSelectedRuleDetails,
  saveEditAutoAllocationChanges,
  setCreateRulesFormData,
  setDisableEditDetail,
} from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/create-auto-allocation-rules-service";
import globalStyles from "core/Styles/globalStyles";
import { cloneDeep, isEqual } from "lodash";
import RuleBarComponent from "./components/RuleBarComponent";
import {
  validateRuleDefinition,
  parseExpression,
  preorderTraversal,
  convertAstToString,
  extractOperatorsFromAst,
} from "./ruleDefinitionUtils";

const excludedRulesInDefinition = ["Set Auto Release", "Set Auto Approve"];

const getRulesRequiringDefinition = (rules) =>
  rules.filter((rule) => !excludedRulesInDefinition.includes(rule.rule_name));

const hasAnyTrueValue = (value) => {
  if (value === true) return true;
  if (value && typeof value === "object") {
    return Object.values(value).some(hasAnyTrueValue);
  }
  return false;
};

const hasAtLeastOneToggleSelected = (rules, formData) => {
  const excludedRules = rules.filter((rule) =>
    excludedRulesInDefinition.includes(rule.rule_name)
  );
  return excludedRules.some((rule) => {
    const keys = Object.keys(
      rule.default_value || rule.rule_structure || {}
    );
    return keys.some((key) => hasAnyTrueValue(formData?.[key]));
  });
};

const CreateAutoAllocationRules = (props) => {
  const { t } = useTranslation();
  const { edit, resetGridView } = props;
  const {
    getAllocationRulesSet,
    createRulesLoader,
    setRulesLoader,
    createNewRule,
    saveEditChanges,
    editId,
    getSelectedRuleSet,
    editName,
    setFormData,
    disableEditDetail
  } = props;
  const [rulesSet, setRulesSet] = useState([]);
  const [ruleDefinition, setRuleDefinition] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [mandatoryRules, setMandatoryRules] = useState([]);
  const [optionalRules, setOptionalRules] = useState([]);
  const [displayRules, setDisplayRules] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [operatorsByIndex, setOperatorsByIndex] = useState({}); // {2: 'OR', 3: 'AND'}
  const [excludedRuleIndexes, setExcludedRuleIndexes] = useState([]);
  const [ruleDefinitionError, setRuleDefinitionError] = useState("");
  const initialFormRef = useRef(null);
  const classes = useStyles();
  const globalClasses = globalStyles();

  const disabledDefaultRule = disableEditDetail?.disabled || false;

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        autoHideDuration: 3000,
        disableOnClose: true
      },
    });
  };

  const handleErrorMessage = (e, props) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      displaySnackMessages(errObj?.message, "error", props);
    else displaySnackMessages(ERROR_MESSAGE, "error", props);
  };

  useEffect(() => {
    setRulesLoader(true);
    if (edit) {
      fetchSelectedRules(editId);
    } else {
      fetchRulesSet();
    }
  }, []);

  useEffect(() => {
    // Compose definition using selected operators between rules
    const ordered = [...mandatoryRules, ...displayRules];
    if (ordered.length === 0) {
      setRuleDefinition("");
      return;
    }
    let parts = [];
    let idxList = [];
    let ruleName = ordered[0]?.rule_name;
    if (
      !excludedRulesInDefinition.includes(ruleName) ||
      !props.enableDefinitionEdit
    ) {
      parts = [`(${ordered[0]?.rule_name})`];
    } else {
      idxList.push(1);
    }

    for (let ruleIndex = 1; ruleIndex < ordered.length; ruleIndex++) {
      const humanIndex = ruleIndex + 1; // human index (Rule 1, Rule 2, ...)
      const operator = operatorsByIndex[humanIndex] || "AND";
      let ruleName = ordered[ruleIndex]?.rule_name;
      if (!excludedRulesInDefinition.includes(ruleName)) {
        if (parts.length > 0) {
          parts.push(`${operator.toUpperCase()}`);
        }
        parts.push(`(${ordered[ruleIndex]?.rule_name})`);
      } else {
        idxList.push(humanIndex);
      }
    }
    setExcludedRuleIndexes(idxList);
    setRuleDefinitionError("");
    setRuleDefinition(parts?.join(" "));
  }, [displayRules, optionalRules, mandatoryRules]);

  // Helpers to sync operators from a manually edited definition
  const normalize = (text = "") => (text || "").trim().replace(/\s+/g, " ");
  const trySyncOperatorsFromDefinition = (definition) => {
    const ordered = [...mandatoryRules, ...displayRules];
    const ruleNames = ordered.map((r) => normalize(r.rule_name));
    if (ruleNames.length <= 1) return false;

    // Tokenize: extract groups and operators preserving order
    const extractedRuleNames = [];
    const extractedOperators = [];
    let currentPosition = 0;
    const definitionString = definition;
    let parenthesesDepth = 0;
    let currentBuffer = "";
    const pushGroup = (content) => {
      const inner = content.trim();
      if (!inner) return;
      const parts = inner.split(/\s+(AND|OR)\s+/i).filter((p) => p !== "");
      for (let partIndex = 0; partIndex < parts.length; partIndex++) {
        const token = parts[partIndex];
        if (/^(AND|OR)$/i.test(token)) {
          extractedOperators.push(token.toUpperCase());
        } else {
          extractedRuleNames.push(normalize(token));
        }
      }
    };

    // Scan for top-level parentheses groups and outside operators
    while (currentPosition < definitionString.length) {
      const currentChar = definitionString[currentPosition];
      if (currentChar === "(") {
        if (parenthesesDepth === 0) currentBuffer = "";
        parenthesesDepth += 1;
      } else if (currentChar === ")") {
        parenthesesDepth -= 1;
        if (parenthesesDepth === 0) {
          pushGroup(currentBuffer);
          currentBuffer = "";
        }
      } else {
        if (parenthesesDepth > 0) currentBuffer += currentChar;
        else {
          // outside parentheses, capture operators
          // attempt to match AND/OR word boundaries
          const remainingText = definitionString.slice(currentPosition);
          const operatorMatch = remainingText.match(/^\s*(AND|OR)\s+/i);
          if (operatorMatch) {
            extractedOperators.push(operatorMatch[1].toUpperCase());
            currentPosition += operatorMatch[0].length - 1; // -1 compensates for currentPosition++
          }
        }
      }
      currentPosition += 1;
    }

    if (extractedRuleNames.length !== ruleNames.length) return false;
    for (let ruleIndex = 0; ruleIndex < ruleNames.length; ruleIndex++) {
      if (extractedRuleNames[ruleIndex] !== ruleNames[ruleIndex]) return false;
    }
    if (
      extractedOperators.length !== Math.max(0, extractedRuleNames.length - 1)
    )
      return false;

    // Build mapping: operator between (ruleIndex) and (ruleIndex+1) stored at index (ruleIndex+1)
    const operatorMapping = {};
    for (
      let ruleIndex = 1;
      ruleIndex < extractedRuleNames.length;
      ruleIndex++
    ) {
      operatorMapping[ruleIndex + 1] = extractedOperators[ruleIndex - 1];
    }
    setOperatorsByIndex(operatorMapping);
    return true;
  };

  const fetchRulesSet = async () => {
    try {
      const response = await getAllocationRulesSet();
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      setRulesSet(response.data);
      const rules = response?.data?.data || [];
      const mandatory = [],
        optional = [];
      let form = {};
      for (const rule of rules) {
        form = { ...form, ...rule.default_value };
        if (rule.is_mandatory) {
          mandatory.push(rule);
        } else {
          optional.push(rule);
        }
      }
      setFormData(form);
      setMandatoryRules(mandatory);
      setOptionalRules(optional);

      setRulesLoader(false);
    } catch (e) {
      handleErrorMessage(e, props);
      setRulesLoader(false);
    }
  };
  const isEditUnchanged = () => {
    if (!edit || !initialFormRef.current) return false;
    const current = { form: props.formData, ruleName, ruleDefinition };
    return isEqual(current, initialFormRef.current);
  };
  const disableSaveButton = () => {
    if (isEditUnchanged()) return true;
    if (ruleName.trim().length === 0) return true;
    const allRules = [...mandatoryRules, ...displayRules];
    if (allRules.length === 0) return true;
    const rulesRequiringDefinition = getRulesRequiringDefinition(allRules);
    if (rulesRequiringDefinition.length === 0) {
      return !hasAtLeastOneToggleSelected(allRules, props.formData);
    }
    const existingRuleNames = allRules.map((rule) => rule.rule_name);
    const validation = validateRuleDefinition(ruleDefinition, existingRuleNames);
    if (!validation.valid) return true;
    return false;
  };
  const fetchSelectedRules = async (editId) => {
    setRuleName(editName);
    try {
      const response = await getSelectedRuleSet({ rule_code: editId });
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      const selectedRules = response.data?.data[0]?.rules || [];
      const modifiedRules = selectedRules.map((rule) => {
        return { ...rule, default_value: cloneDeep(rule.selected_value) };
      });
      const mandatory = [],
        optional = [],
        display = [];
      let form = {};
      for (const rule of modifiedRules) {
        form = { ...form, ...rule.default_value };
        if (rule.is_mandatory) {
          mandatory.push(rule);
        } else if (rule.is_visible) {
          display.push(rule);
        } else {
          optional.push(rule);
        }
      }
      setFormData(form);
      setMandatoryRules(mandatory);
      setOptionalRules(optional);
      setDisplayRules(display);
      let initialRuleDefinition = "";

      if (props.enableDefinitionEdit) {
        let ruleExpression = response.data?.data[0]?.rule_expression;
        if (ruleExpression) {
          // Convert AST array back to readable string
          const readableString = convertAstToString(ruleExpression);
          initialRuleDefinition = readableString;
          setRuleDefinition(readableString);

          // Extract operators from rule definition string and update operatorsByIndex
          const allRules = [...mandatory, ...display];
          const ruleNames = allRules.map((rule) => rule.rule_name);
          const extractedOperators = extractOperatorsFromAst(
            readableString,
            ruleNames,
            excludedRulesInDefinition
          );
          setOperatorsByIndex(extractedOperators);
        }
      }
      initialFormRef.current = {
        form: cloneDeep(form),
        ruleName: editName,
        ruleDefinition: initialRuleDefinition,
      };
    } catch (e) {
      handleErrorMessage(e, props);
      setRulesLoader(false);
    }
    setRulesLoader(false);
  };

  const handleCancel = (e) => {
    props?.resetGridView();
  };

  useEffect(() => {
    return () => {
      props.setDisableEditDetail({});
    }
  }, []);

  const saveNewRule = async () => {
    const rule_values = {};
    const formData = props.formData;
    const _ = [...mandatoryRules, ...displayRules].forEach((rule) => {
      for (const key in rule.rule_structure) {
        rule_values[key] = formData[key];
      }
    });
    try {
      const payload = {
        rule_name: ruleName,
        rule_values: {
          ...rule_values,
        },
      };
      if (props.enableDefinitionEdit) {
        payload.rule_expression = convertExpressionToPrefix(ruleDefinition);
      }
      const response = await createNewRule(payload);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      if (response?.data?.data?.[0]?.dc_store_policy_rule_add?.status) {
        displaySnackMessages(
          response?.data?.data?.[0]?.dc_store_policy_rule_add?.message,
          "success",
          props
        );
        props?.resetGridView();
      } else {
        displaySnackMessages(
          response?.data?.data?.[0]?.dc_store_policy_rule_add?.message,
          "error",
          props
        );
      }
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const saveEditedChanges = async () => {
    const rule_values = {};
    const formData = props.formData;
    const _ = [...mandatoryRules, ...displayRules].forEach((rule) => {
      for (const key in rule.rule_structure) {
        rule_values[key] = formData[key];
      }
    });
    try {
      const payload = {
        rule_code: editId,
        rule_values: {
          ...rule_values,
        },
      };
      if (props.enableDefinitionEdit) {
        payload.rule_expression = convertExpressionToPrefix(ruleDefinition);
      }
      const response = await saveEditChanges(payload);
      if (response?.data?.data?.[0]?.dc_store_policy_rule_update?.status) {
        displaySnackMessages(
          response?.data?.data?.[0]?.dc_store_policy_rule_update?.message,
          "success",
          props
        );
        props?.resetGridView();
      } else {
        displaySnackMessages(
          response?.data?.data?.[0]?.dc_store_policy_rule_update?.message,
          "error",
          props
        );
      }
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  const addRuleToDisplay = (ruleName) => {
    const ruleToAdd = optionalRules.find((rule) => rule.rule_name === ruleName);
    if (!ruleToAdd) return;

    const rest = optionalRules.filter((rule) => rule.rule_name !== ruleName);

    setDisplayRules((prev) => [...prev, ruleToAdd]);
    setOperatorsByIndex((prev) => ({
      ...prev,
      [(displayRules?.length || 0) + 2]: "AND",
    }));
    setOptionalRules(rest);
    setMenuAnchor(null);
  };

  const getAddRuleMenuOptions = () => {
    const addedRuleNames = new Set(
      displayRules.map((rule) => rule.rule_name)
    );
    return [...displayRules, ...optionalRules]
      .sort((a, b) => a.rule_name.localeCompare(b.rule_name))
      .map((rule) => ({
        label: rule.rule_name,
        value: rule.rule_name,
        disabled: addedRuleNames.has(rule.rule_name),
        onClick: () => addRuleToDisplay(rule.rule_name),
      }));
  };

  const updateOperatorsOnChange = () => {
    let text = ruleDefinition;
    let rules = text
      .split(/\s+(AND|OR)\s+/) // split and keep operators
      .map((str) => str.replace(/[()]/g, "").trim()) // remove parentheses and trim
      .filter(Boolean);
    let operatorsData = cloneDeep(operatorsByIndex);
    rules.forEach((ruleItem, itemIndex) => {
      if ((ruleItem === "AND" || ruleItem === "OR") && itemIndex > 0) {
        let ruleName = rules[itemIndex - 1];
        let allRules = [...mandatoryRules, ...displayRules];
        let ruleIndex = allRules.findIndex(
          (rule) => rule.rule_name === ruleName
        );
        operatorsData[ruleIndex + 2] = ruleItem;
      }
    });
    setOperatorsByIndex(operatorsData);
  };

  const convertExpressionToPrefix = (definition) => {
    try {
      const ast = parseExpression(definition);
      const result = [];
      preorderTraversal(ast, result);
      return result;
    } catch (error) {
      handleErrorMessage(error, props);
      return null;
    }
  };

  // Function to update rule definition while preserving nesting structure
  const updateRuleDefinitionWithOperator = (index, operator) => {
    index = index - excludedRuleIndexes.length;

    const currentDefinition = ruleDefinition;
    const ordered = [...mandatoryRules, ...displayRules];

    if (index <= 1 || index > ordered.length) return;

    // Simple approach: Find all AND/OR operators and update by index
    const operatorMatches = [];
    const operatorRegex = /\b(AND|OR)\b/g;
    let match;

    // Find all operator positions
    while ((match = operatorRegex.exec(currentDefinition)) !== null) {
      operatorMatches.push({
        operator: match[1],
        start: match.index,
        end: match.index + match[1].length,
      });
    }

    // Update the operator at the specified index
    if (index - 2 < operatorMatches.length) {
      const targetOperator = operatorMatches[index - 2];
      const updatedDefinition =
        currentDefinition.substring(0, targetOperator.start) +
        operator +
        currentDefinition.substring(targetOperator.end);

      setRuleDefinition(updatedDefinition);
    }
  };

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div className={globalClasses.layoutAlignEnd}>
        <div
          style={{ height: "30px" }}
          className={`${globalClasses.marginHorizontal} ${globalClasses.marginBottom}`}
        >
          {optionalRules.length > 0 && (
            <>
              <Button
                variant="primary"
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                disabled={disabledDefaultRule}
              >
                Add rule(s)
              </Button>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                options={getAddRuleMenuOptions()}
              />
            </>
          )}
        </div>
      </div>

      <div className={classes.dcCreateRulesCard}>
        <div className={classes.dcCreateRulesHeader}>Create Rules</div>
        <Loader
          loader={createRulesLoader}
          minHeight={createRulesLoader ? "200px" : ""}
        >
          <div className={classes.dcRuleNameDefRow}>
            <div className={`${classes.dcInputBox} ${classes.dcRuleNameField}`}>
              <Typography className={classes.dcFieldLabel}>
                Rule name <span className="dcReq">*</span>
              </Typography>
              <Input
                value={ruleName}
                placeholder={t("inventorysmart.ruleName")}
                onChange={(event) => setRuleName(event.target.value.trim())}
                margin="normal"
                required
                disabled={edit || disabledDefaultRule}
              />
            </div>
            <div className={`${classes.dcInputBox} ${classes.dcRuleDefField}`}>
              <Typography className={classes.dcFieldLabel}>
                Rule definition
              </Typography>
              <Input
                value={ruleDefinition}
                placeholder={t("inventorysmart.ruleDefinition")}
                onChange={(event) => {
                  const val = event.target.value;
                  setRuleDefinition(val);
                  // Clear error on change
                  if (ruleDefinitionError) {
                    setRuleDefinitionError("");
                  }
                  // Attempt to parse and sync operators; if successful, keep selections in sync
                  trySyncOperatorsFromDefinition(val);
                }}
                onBlur={() => {
                  const allRules = [...mandatoryRules, ...displayRules];
                  const rulesRequiringDefinition =
                    getRulesRequiringDefinition(allRules);
                  if (rulesRequiringDefinition.length === 0) {
                    setRuleDefinitionError("");
                    return;
                  }
                  const existingRuleNames = allRules.map((rule) => rule.rule_name);
                  const { valid, message } = validateRuleDefinition(
                    ruleDefinition,
                    existingRuleNames
                  );
                  if (!valid) {
                    displaySnackMessages(message, "error", props);
                    setRuleDefinitionError(message);
                  } else {
                    setRuleDefinitionError("");
                    updateOperatorsOnChange();
                  }
                }}
                isHelperText={props.enableDefinitionEdit}
                helperText={ruleDefinition}
                margin="normal"
                required
                disabled={!props.enableDefinitionEdit || disabledDefaultRule}
                label=""
                isError={ruleDefinitionError}
              />
            </div>
          </div>
          {mandatoryRules.length > 0 &&
            mandatoryRules.map((rule, ruleIndex) => (
              <RuleBarComponent
                rule={rule}
                key={rule?.rule_name}
                index={ruleIndex + 1}
                disableDelete
                setDisplayRules={setDisplayRules}
                setOptionalRules={setOptionalRules}
                optionalRules={optionalRules}
                operator={operatorsByIndex[ruleIndex + 1] || "AND"}
                onOperatorChange={(index, operator) => {
                  setOperatorsByIndex((prev) => ({
                    ...prev,
                    [index]: operator,
                  }));
                  // Update rule definition while preserving nesting structure
                  updateRuleDefinitionWithOperator(index, operator);
                }}
                excludedRuleIndexes={excludedRuleIndexes}
                enableDefinitionEdit={props.enableDefinitionEdit}
                disabledDefaultRule={disabledDefaultRule}
              />
            ))}
          {displayRules.length > 0 &&
            displayRules.map((rule, ruleIndex) => (
              <RuleBarComponent
                rule={rule}
                key={rule?.rule_name}
                index={mandatoryRules.length + ruleIndex + 1}
                setDisplayRules={setDisplayRules}
                setOptionalRules={setOptionalRules}
                optionalRules={optionalRules}
                operator={
                  operatorsByIndex[mandatoryRules.length + ruleIndex + 1] ||
                  "AND"
                }
                onOperatorChange={(index, operator) => {
                  setOperatorsByIndex((prev) => ({
                    ...prev,
                    [index]: operator,
                  }));
                  // Update rule definition while preserving nesting structure
                  updateRuleDefinitionWithOperator(index, operator);
                }}
                excludedRuleIndexes={excludedRuleIndexes}
                enableDefinitionEdit={props.enableDefinitionEdit}
                disabledDefaultRule={disabledDefaultRule}
              />
            ))}

        </Loader>
      </div>

      <div className={globalClasses.stickyFooter}>
        <Button
          variant="tertiary"
          id="backButton"
          onClick={handleCancel}
        >
          {"< Back to auto allocation rules"}
        </Button>
        <div className={`${globalClasses.flexRow} ${globalClasses.gap_12}`}>
          <Button id="cancelButton" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            id="submitButton"
            variant="primary"
            onClick={edit ? saveEditedChanges : saveNewRule}
            disabled={disableSaveButton() || disabledDefaultRule}
          >
            {edit ? "Save" : "Create and save"}
          </Button>
        </div>
      </div>
    </div>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const createAutoAllocationRulesService =
    inventorysmartReducer.createAutoAllocationRulesService;
  return {
    createRulesLoader: createAutoAllocationRulesService.rulesLoader,
    formData: createAutoAllocationRulesService.formData,
    editId: createAutoAllocationRulesService.editId,
    editName: createAutoAllocationRulesService.editName,
    disableEditDetail: createAutoAllocationRulesService.disableEditDetail,
    enableDefinitionEdit:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown
        ?.auto_allocation_rules?.enableDefinitionEdit,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAllocationRulesSet: () => dispatch(getAutoAllocationRulesSet()),
    setRulesLoader: (payload) => dispatch(setRulesLoader(payload)),
    createNewRule: (payload) => dispatch(createNewAutoAllocationRule(payload)),
    saveEditChanges: (payload) =>
      dispatch(saveEditAutoAllocationChanges(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    setDisableEditDetail: (payload) => dispatch(setDisableEditDetail(payload)),
    getSelectedRuleSet: (payload) => dispatch(getSelectedRuleDetails(payload)),
    setFormData: (payload) => dispatch(setCreateRulesFormData(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateAutoAllocationRules);
