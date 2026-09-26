import PropTypes from "prop-types";
import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import Form from "core/Utils/form";
import { Grid, IconButton, Typography } from "@mui/material";
import { MIN_MAX_ACCESSOR } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getTenantConfigData } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import {  useTranslation } from "impact-ui-v3";
import { setSetAllModalLoader } from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { displaySnackMessages } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { cloneDeep } from "lodash";
import { Switch } from "impact-ui-v3";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";
import { styled } from "@mui/material/styles";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { SetAllMinDistribution } from "./SetAllMinDistribution";
import {
  DEFAULT_MIN_DIST_STATE,
  applyMinDistributionToRow,
} from "./setAllMinDistributionUtils";

const useNewStyles = makeStyles({
  newFormContainer: {
    "& #formbody": {
      width: "100%",
      "& .MuiGrid-root.MuiGrid-container.MuiGrid-item > div": {
        width: "264.5px"
      }
    }
  },
  newFormContainerWOS: {
    "& #formbody": {
      width: "100%",
      "& .impact_inputbox_container": {
        width: "264.5px",
        maxWidth: "264.5px",
        "& .MuiFormHelperText-root": {
          whiteSpace: "normal",
          wordBreak: "break-word",
          maxWidth: "264.5px",
        },
        "& + div": {
          marginLeft: "6px"
        }
      }
    }
  },
});

const PartiallySetAllModal = (props) => {
  const { t } = useTranslation();
  const [initialFormFields, setInitialFormFields] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [defaultData, setDefaultData] = useState({});
  const [minDistState, setMinDistState] = useState({ ...DEFAULT_MIN_DIST_STATE });
  const customClasses = useStyles();
  const globalClasses = globalStyles();
  const classes = useNewStyles();
  const originalMinCappedValue = useRef(null);

  const HtmlTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: "#333333",
      color: "rgba(255, 255, 255, 0.9)",
      maxWidth: 300,
      fontSize: theme.typography.pxToRem(12),
      lineHeight: "1.5",
      borderRadius: "5px",
      padding: "10px",
    },
  }));

 useLayoutEffect(() => {
    getSetAllModalFields();
  }, []);

  useEffect(() => {
    if (formFields.length) {
      let fields = cloneDeep(formFields);
      let wosFieldIdx = -1;
      fields.map((field, index) => {
        if (field.accessor === "wos" || field.accessor === "dos") {
          wosFieldIdx = index;
        }
      });
      let wosField = fields[wosFieldIdx];
      if (wosFieldIdx !== -1) {
        wosField.no_negative_values = !props.isWosRelative;
        wosField.minCappedValue = props.isWosRelative
          ? -1 * wosField.maxCappedValue
          : originalMinCappedValue.current;
      }
      fields[wosFieldIdx] = wosField;
      setFormFields(fields);
    }
  }, [props.isWosRelative]);

  useEffect(() => {
    if (!formData) return;

    const payload = Object.keys(formData)
      .map((item) => {
        if (item === "min_distribution") return null;
        const field = formFields.filter((key) => key.accessor === item)?.[0];
        if (formData[item] !== null && formData[item] !== undefined) {
          return {
            attribute_name: item,
            attribute_value: formData[item],
            maxCappedValue: field?.maxCappedValue,
            minCappedValue: field?.minCappedValue,
            max_validation: field?.max_validation,
            min_validation: field?.min_validation,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (props.showNewConstraintFlow) {
      const { min_distribution } = applyMinDistributionToRow({}, minDistState);
      if (min_distribution !== undefined) {
        payload.push({
          attribute_name: "min_distribution",
          attribute_value: min_distribution,
        });
      }
    }

    props?.setAllModalData([[...payload]]);
  }, [formData, minDistState, props.showNewConstraintFlow]);

  const handleChange = (
    obj,
    id,
    field,
    e,
    initialValue,
    checkConfiguration
  ) => {
    let value;
    let filteredData = {};
    if (id === "rule_name" || id === "exception_rule_name") {
      value = obj[id];
      filteredData = {
        ...formData,
        [id]: value,
      };
    } else {
      let value = e?.target?.value ? e.target.value : e;
      value = Number(value);
      if(isNaN(value)){
        value = null;
      }
      if (field?.maxCappedValue < value) {
        displaySnackMessages(
          `${field.label} value is capped at ${field?.maxCappedValue}.`,
          "info",
          props
        );
      }
      if (field?.minCappedValue > value) {
        displaySnackMessages(
          `${field.label} value should be atleast ${field?.minCappedValue}`,
          "info",
          props
        );
      }
      let finalValue =
        field?.maxCappedValue < value
          ? field.maxCappedValue
          : field?.minCappedValue > value
          ? field.minCappedValue
          : value;
      filteredData = {
        ...formData,
        [field.accessor]: finalValue != null ? String(finalValue) : null,
      };
    }
    setFormData(filteredData);
    setDefaultData(filteredData);
  };

  const getSetAllModalFields = () => {
    let allFields = cloneDeep(props.setAllModalFields);
    let tempFields = allFields
      ?.filter((key) => {
        if (
          key.accessor === "start_date" ||
          key.accessor === "end_date" ||
          (props.flow === "exceptions" && key.accessor === "rule_name") ||
          (props.flow !== "exceptions" &&
            key.accessor === "exception_rule_name") ||
          key.accessor === "min_distribution"
        )
          return;
        return key;
      })
      ?.map((key) => {
        if (key.accessor === "wos" || key.accessor === "dos") {
          originalMinCappedValue.current = key.minCappedValue;
          key.no_negative_values = !props.isWosRelative;
          key.minCappedValue = props.isWosRelative
            ? -1 * key.maxCappedValue
            : originalMinCappedValue.current;
        }
        return {
          ...key,
          is_mandatory: false,
          required: false,
          uniqueId: "uniqueRow" + 1,
        };
      });
    setInitialFormFields(tempFields);
    setFormFields(tempFields);
    let defaultData = tempFields?.reduce((acc, item, index) => {
      acc[item.accessor] = null;
      return acc;
    }, {});
    setDefaultData(defaultData);
    setMinDistState({ ...DEFAULT_MIN_DIST_STATE });
    props?.setErrorForForm(true);
  };

  const handleMinDistChange = (next) => {
    if (!props.showNewConstraintFlow) return;
    setMinDistState(next);
  };

  const handleOnBlur = (e, id) => {
    if (
      (id?.maxCappedValue && e.target.value > id.maxCappedValue) ||
      (id?.minCappedValue && e.target.value < id.minCappedValue)
    ) {
      props.primaryButtonStateChange(true);
      displaySnackMessages(
        `Please enter a value between ${id.minCappedValue} and ${id.maxCappedValue}`,
        "error",
        props
      );
    }
    if (id?.min_validation || id?.max_validation) {
      if (props?.validationErrors?.minMaxError) {
        let fields = cloneDeep(formFields);
        fields.forEach((field) => {
          if (field.min_validation || field.max_validation) {
            field.error = true;
          }
        });
        setFormFields(fields);
      } else if (id.error) {
        let fields = cloneDeep(formFields);
        fields.forEach((field) => {
          if (field.min_validation || field.max_validation) {
            field.error = false;
          }
        });
        setFormFields(fields);
      }
    }
  };

  const toggleIsRelative = (e) => {
    props.setIsWosRelative(e.target.checked);
  };

  const renderForm = (formData, item) => {
    if (item.accessor === "wos" || item.accessor === "dos") {
      return (
        <div className={customClasses.toggleButton}>
          <Switch
            leftLabel={t("inventorysmart.absolute")}
            rightLabel={t("inventorysmart.relative")}
            checked={props.isWosRelative}
            id="wosIsRelative"
            onChange={(e) => toggleIsRelative(e)}
          />
          <HtmlTooltip
            title={
              <ul
                style={{
                  margin: 0,
                  color: "rgba(255, 255, 255, 0.9)",
                  listStyleType: "disc",
                }}
              >
                {props.relativeWosMessage.map((text, index) => (
                  <li
                    key={index}
                    style={{ marginBottom: "5px", color: "inherit" }}
                  >
                    {text}
                  </li>
                ))}
              </ul>
            }
            placement="right"
            arrow
          >
            <InfoIcon fontSize="small" className={customClasses.infoIcon} />
          </HtmlTooltip>
        </div>
      );
    }
  };

  const isNameField = (field) => field.accessor === "rule_name" || field.accessor === "exception_rule_name";
  const isWosField = (field) => field.accessor === "wos" || field.accessor === "dos";

  const getFieldGroups = () => {
    const nameField = formFields.find(isNameField) || null;
    const remaining = formFields.filter((f) => !isNameField(f));
    const wosField = remaining.find(isWosField) || null;
    const numericFields = remaining.filter((f) => !isWosField(f));
    return { nameField, wosField, numericFields };
  };

  const { nameField, wosField, numericFields } = getFieldGroups();

  const isNewFlow = props?.showNewConstraintFlow || false;

  if (!formFields.length) return null;

  const renderNameField = () => {
    if (!nameField) return null;
    return (
      <Form
        layout={"horizontal"}
        handleChange={(obj, id, field, e, initialValue, checkConfiguration) =>
          handleChange(obj, id, field, e, initialValue, checkConfiguration)
        }
        handleOnBlur={(e, id) => handleOnBlur(e, id)}
        fields={[nameField]}
        maxFieldsInRow={1}
        minFieldsInRow={1}
        defaultValues={defaultData}
        checkMinMaxValidation={true}
        min_max_accessor={MIN_MAX_ACCESSOR}
        fieldTypeWidthSpan={10}
        labelWidthSpan={6}
        spacing={2}
        updateDefaultValue={false}
        {...props}
      ></Form>
    );
  };

  const renderNumericFields = () => {
    if (!numericFields.length) return null;
    return (
      <Form
        layout={"horizontal"}
        handleChange={(obj, id, field, e, initialValue, checkConfiguration) =>
          handleChange(obj, id, field, e, initialValue, checkConfiguration)
        }
        handleOnBlur={(e, id) => handleOnBlur(e, id)}
        fields={numericFields}
        maxFieldsInRow={2}
        minFieldsInRow={2}
        defaultValues={defaultData}
        checkMinMaxValidation={true}
        min_max_accessor={MIN_MAX_ACCESSOR}
        fieldTypeWidthSpan={12}
        labelWidthSpan={6}
        spacing={2}
        updateDefaultValue={false}
        {...props}
      ></Form>
    );
  };

  const renderWosField = () => {
    if (!wosField) return null;
    return (
      <div className={customClasses.partialSetAllWosWrapper}>
        <div style={{ flex: 1 }}>
          <Form
            layout={"horizontal"}
            handleChange={(obj, id, field, e, initialValue, checkConfiguration) =>
              handleChange(obj, id, field, e, initialValue, checkConfiguration)
            }
            handleOnBlur={(e, id) => handleOnBlur(e, id)}
            fields={[wosField]}
            maxFieldsInRow={1}
            minFieldsInRow={1}
            defaultValues={defaultData}
            checkMinMaxValidation={true}
            min_max_accessor={MIN_MAX_ACCESSOR}
            fieldTypeWidthSpan={10}
            labelWidthSpan={6}
            spacing={2}
            updateDefaultValue={false}
            renderForm={!props.disableRelativeWos ? renderForm : null}
            {...props}
          ></Form>
        </div>
      </div>
    );
  };

  return (
    <>
      {isNewFlow ? (
        <>
          {nameField && (
            <Grid item xs={12}>
              {renderNameField()}
              <hr className={customClasses.partialSetAllHrDivider} />
            </Grid>
          )}
          <div className={customClasses.partialSetAllNewFlowFields}>
            {numericFields.length > 0 && (
              <div className={`${globalClasses.selectorContainer} ${classes.newFormContainer}`}>
                {renderNumericFields()}
              </div>
            )}
            {wosField && (
              <div className={`${globalClasses.selectorContainer} ${classes.newFormContainerWOS}`}>
                {renderWosField()}
              </div>
            )}
            {props.showNewConstraintFlow && (
              <SetAllMinDistribution
                variant="partialSetAll"
                value={minDistState}
                onChange={handleMinDistChange}
                minStock={formData?.min_stock}
                enableSizesFetch={
                  props.showSetAllModal && !props.setAllModalLoader
                }
                sizeApiProps={{
                  useTableName: props.useTableName,
                  rulesTableName: props.rulesTableName,
                  localstoreKeyTableName: props.localstoreKeyTableName,
                  selectedPlan: props.selectedPlan,
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className={`${customClasses.marginTop2} ${globalClasses.selectorContainer}`}>
          <div className={customClasses.ruleBarContainer}>
            <div className={customClasses.partialSetAllOldFlowFields}>
              {renderNameField()}
              {renderNumericFields()}
              {renderWosField()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    setAllModalLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.setAllModalLoader,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    setAllModalFields:
      inventorysmartReducer.inventorySmartConstraints?.constraintsConfigs
        ?.set_all_modal_fields,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setSetAllModalLoader: (body) => dispatch(setSetAllModalLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PartiallySetAllModal);
