import React, { useEffect, useRef, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { displaySnackMessages } from "../inventorysmart-utility";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  createNewDCStoreStrategyRule,
  getDCStoreStrategyRulesSet,
  setRulesLoader,
  getSelectedStrategyRuleDetails,
  saveEditDCStoreStrategyChanges,
  setCreateRulesFormData,
  setDisableEditDetail
} from "modules/inventorysmart/services-inventorysmart/DcStoreStrategyRules/create-dc-store-strategy-rules-service";
import globalStyles from "core/Styles/globalStyles";
import { cloneDeep, isEqual } from "lodash";
import RuleBarComponent from "./components/RuleBarComponent";
import { Button, Input, Menu, useTranslation } from "impact-ui-v3";

const getFieldType = (structure) =>
  structure?.value?.type || structure?.type || null;

const getDropdownOptionKeys = (structure) =>
  (structure?.value?.value || []).map((option) => Object.keys(option)[0]);

const isDropdownValueSelected = (value, optionKeys = []) => {
  if (value === null || value === undefined || value === "") return false;

  if (typeof value === "object") {
    const selectedKey = Object.keys(value)[0];
    if (!selectedKey) return false;
    if (!optionKeys.length) return true;
    return optionKeys.includes(selectedKey);
  }

  if (!optionKeys.length) return true;
  return optionKeys.includes(value);
};

const isDropdownFieldUnselected = (structure, formValue) => {
  if (structure?.label) {
    if (getFieldType(structure) !== "dropdown") return false;
    return !isDropdownValueSelected(
      formValue,
      getDropdownOptionKeys(structure)
    );
  }

  return Object.entries(structure || {}).some(([subKey, subStructure]) => {
    if (getFieldType(subStructure) !== "dropdown") return false;
    const nestedValue =
      formValue && typeof formValue === "object" ? formValue[subKey] : formValue;
    return !isDropdownValueSelected(
      nestedValue,
      getDropdownOptionKeys(subStructure)
    );
  });
};

const hasUnselectedRuleDropdowns = (rules, formData) =>
  rules.some((rule) =>
    Object.entries(rule.rule_structure || {}).some(([key, structure]) =>
      isDropdownFieldUnselected(structure, formData?.[key])
    )
  );

const CreateDCStoreStrategyRules = (props) => {
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
    disableEditDetail,
  } = props;
  const [rulesSet, setRulesSet] = useState([]);
  const [ruleDefinition, setRuleDefinition] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [mandatoryRules, setMandatoryRules] = useState([]);
  const [optionalRules, setOptionalRules] = useState([]);
  const [displayRules, setDisplayRules] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const initialFormRef = useRef(null);
  const classes = useStyles();
  const globalClasses = globalStyles();

  const disabledDefaultRule = disableEditDetail?.disabled || false;

  useEffect(() => {
    setRulesLoader(true);
    if (edit) {
      fetchSelectedRules(editId);
    } else {
      fetchRulesSet();
    }
  }, []);

  useEffect(() => {
    let temp = [
      ...mandatoryRules.map((rule) => `(${rule.rule_name})`),
      ...displayRules.map((rule) => `(${rule.rule_name})`),
    ];
    setRuleDefinition(temp.join(" AND "));
  }, [displayRules, optionalRules]);

  const getDisplayRuleNames = (rules = []) =>
    rules.map((rule) => rule.rule_name);

  const isEditUnchanged = () => {
    if (!edit || !initialFormRef.current) return false;
    const current = {
      form: props.formData,
      ruleName,
      displayRuleNames: getDisplayRuleNames(displayRules),
    };
    return isEqual(current, initialFormRef.current);
  };
  const disableSaveButton = () => {
    const visibleRules = [...mandatoryRules, ...displayRules];
    return (
      isEditUnchanged() ||
      ruleName.trim().length === 0 ||
      visibleRules.length === 0 ||
      hasUnselectedRuleDropdowns(visibleRules, props.formData)
    );
  };
  const fetchRulesSet = async () => {
    try {
      const response = await getAllocationRulesSet();
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
      displaySnackMessages(ERROR_MESSAGE, "error");
      setRulesLoader(false);
    }
  };
  const fetchSelectedRules = async (editId) => {
    setRuleName(editName);
    try {
      const response = await getSelectedRuleSet({ rule_code: editId });
      const selectedRules = response.data?.data || [];
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
      initialFormRef.current = {
        form: cloneDeep(form),
        ruleName: editName,
        displayRuleNames: getDisplayRuleNames(display),
      };
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
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
      const response = await createNewRule(payload);
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
      displaySnackMessages(ERROR_MESSAGE, "error", props);
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

  return (
    <Grid margin={"1rem"} style={{ paddingBottom: "80px" }}>
      <div className={globalClasses.layoutAlignEnd}>
        <div
          style={{ height: "30px" }}
          className={`${globalClasses.marginHorizontal} ${globalClasses.marginBottom}`}
        >
          {optionalRules?.length > 0 && (
            <>
              <Button
                variant="primary"
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                disabled={disabledDefaultRule}
              >
                {t("inventorysmart.dcStoreStrategyAddRulesButton")}
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
        <div className={classes.dcCreateRulesHeader}>{t("inventorysmart.dcStoreStrategyCreateRulesHeading")}</div>
        <Loader loader={createRulesLoader} minHeight={createRulesLoader ? "200px" : ""}>
          <div className={classes.dcRuleNameDefRow}>
            <div className={`${classes.dcInputBox} ${classes.dcRuleNameField}`}>
              <Typography className={classes.dcFieldLabel}>
                {t("inventorysmart.dcStoreStrategyRuleNameLabel")} <span className="dcReq">*</span>
              </Typography>
              <Input
                value={ruleName}
                placeholder={t(
                  "inventorysmart.dcStoreStrategyRuleNamePlaceholder"
                )}
                onChange={(event) => setRuleName(event.target.value.trim())}
                margin="normal"
                required
                disabled={edit || disabledDefaultRule}
                label=""
              />
            </div>
            <div className={`${classes.dcInputBox} ${classes.dcRuleDefField}`}>
              <Typography className={classes.dcFieldLabel}>
                {t("inventorysmart.dcStoreStrategyRuleDefinitionLabel")}
              </Typography>
              <Input
                value={ruleDefinition}
                placeholder={t(
                  "inventorysmart.dcStoreStrategyRuleDefinitionPlaceholder"
                )}
                onChange={() => {}}
                margin="normal"
                required
                disabled={true}
                label=""
              />
            </div>
          </div>
          {mandatoryRules.length > 0 &&
            mandatoryRules.map((rule, idx) => (
              <RuleBarComponent
                rule={rule}
                key={rule?.rule_name}
                index={idx + 1}
                disableDelete
                setDisplayRules={setDisplayRules}
                setOptionalRules={setOptionalRules}
                disabledDefaultRule={disabledDefaultRule}
              />
            ))}
          {displayRules.length > 0 &&
            displayRules.map((rule, idx) => (
              <RuleBarComponent
                rule={rule}
                key={rule?.rule_name}
                index={mandatoryRules.length + idx + 1}
                setDisplayRules={setDisplayRules}
                setOptionalRules={setOptionalRules}
                optionalRules={optionalRules}
                disabledDefaultRule={disabledDefaultRule}
              />
            ))}
        </Loader>
      </div>

      <div className={globalClasses.stickyFooter}>
        <Button variant="tertiary" id="backButton" onClick={handleCancel}>
          {t("inventorysmart.dcStoreStrategyBackButton")}
        </Button>
        <div className={`${globalClasses.flexRow} ${globalClasses.gap_12}`}>
          <Button id="cancelButton" variant="secondary" onClick={handleCancel}>
            {t("inventorysmart.dcStoreStrategyCancelButton")}
          </Button>
          <Button
            id="submitButton"
            variant="primary"
            onClick={edit ? saveEditedChanges : saveNewRule}
            disabled={disableSaveButton() || disabledDefaultRule}
          >
            {edit
              ? t("inventorysmart.dcStoreStrategySaveButton")
              : t("inventorysmart.dcStoreStrategyCreateAndSaveButton")}
          </Button>
        </div>
      </div>
    </Grid>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const createDCStoreStrategyRulesService =
    inventorysmartReducer.createDCStoreStrategyRulesService;
  return {
    createRulesLoader: createDCStoreStrategyRulesService.rulesLoader,
    formData: createDCStoreStrategyRulesService.formData,
    editId: createDCStoreStrategyRulesService.editId,
    editName: createDCStoreStrategyRulesService.editName,
    disableEditDetail: createDCStoreStrategyRulesService.disableEditDetail,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAllocationRulesSet: () => dispatch(getDCStoreStrategyRulesSet()),
    setRulesLoader: (payload) => dispatch(setRulesLoader(payload)),
    createNewRule: (payload) => dispatch(createNewDCStoreStrategyRule(payload)),
    saveEditChanges: (payload) =>
      dispatch(saveEditDCStoreStrategyChanges(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    getSelectedRuleSet: (payload) =>
      dispatch(getSelectedStrategyRuleDetails(payload)),
    setDisableEditDetail: (payload) => dispatch(setDisableEditDetail(payload)),
    setFormData: (payload) => dispatch(setCreateRulesFormData(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateDCStoreStrategyRules);
