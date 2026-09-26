import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import Loader from "core/Utils/Loader/loader";
import CloseIcon from "assets/closeIcon.svg";
import { isUndefined } from "lodash";
import {
  ERROR_MESSAGE,
  MIN_MAX_ACCESSOR,
  SET_ALL_FUNCTIONALITY_TABS,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { setSetAllModalLoader } from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { displaySnackMessages } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import SetAllModal from "./set-all-modal";
import PartiallySetAllModal from "./partial-set-all";
import {
  isEmptySetAllValue,
  isMandatorySetAllField,
  validateMinDistFromSavedRow,
} from "./setAllMinDistributionUtils";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import moment from "moment";
import globalStyles from "core/Styles/globalStyles";
import { ButtonGroup, Panel, Card, Button } from "impact-ui-v3";

const tenantDateFormat = localStorage.getItem("tenantDateFormat");

const CHILD_ATTRIBUTE_META = {
  min_stock: { label: "Min", field_type: "IntegerField" },
  max_stock: { label: "Max", field_type: "IntegerField" },
  wos: { label: "WOS", field_type: "IntegerField" },
  start_date: { label: "Start Date", field_type: "DateTimeField" },
  end_date: { label: "End Date", field_type: "DateTimeField" },
};

const formatChildAsSetAllData = (child) =>
  Object.entries(CHILD_ATTRIBUTE_META).map(([attributeName, meta]) => ({
    attribute_name: attributeName,
    attribute_value: child?.[attributeName],
    accessor: attributeName,
    value_type: "number",
    ...meta,
  }));

const buildUpdatesPayload = (rows = [], savedSetAllModalData = []) =>
  rows.map((parent) => ({
    ...parent,
    constraint: [
      ...(parent?.constraint || []).map(formatChildAsSetAllData),
      ...savedSetAllModalData,
    ],
  }));

const tabProps = (tabOption) => {
  return {
    id: `simple-tab-${tabOption?.label}`,
    label: tabOption?.label,
    value: tabOption?.value,
    "aria-controls": `simple-tabpanel-${tabOption?.label}`,
  };
};

const SetAllModalComponent = (props) => {
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";
  const classes = useStyles();
  const { inventorysmartModulesPermission, module, filtersWithSearch } = props;
  const [selectedTab, setSelectedTab] = useState(null);
  const [tabsList, setTabsList] = useState([]);
  const [isPSAPrimaryBtnDisabled, setIsPSAPrimaryBtnDisabled] = useState(true);
  const [hasError, setErrorForForm] = useState(false);
  const [isInsertAsNewRows, setIsInsertAsNewRows] = useState(false);
  const [isPartialSetAll, setIsPartialSetAll] = useState(false);
  const [disablePrimaryBtn, setDisablePrimaryBtn] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [isWosRelative, setIsWosRelative] = useState(false);
  const globalClasses = globalStyles();

  useEffect(() => {
    let defaultRelative = true;
    if (props.defaultWosType === "absolute") {
      defaultRelative = false;
    }
    if (props.disableRelativeWos) {
      setIsWosRelative(false);
    } else {
      setIsWosRelative(defaultRelative);
    }
  }, [props.disableRelativeWos, props.defaultWosType, props.showSetAllModal]);

  useEffect(() => {
    const newTabsList = SET_ALL_FUNCTIONALITY_TABS.map((tabOption) => {
      if (props.constraintsConfigs?.hidden?.indexOf(tabOption.value) === -1) {
        return tabOption;
        // return <Tab {...tabProps(tabOption)} />;
      }
    })?.filter((item) => item);
    setTabsList(newTabsList);
    if (newTabsList?.[0]?.props?.value === "partial-set-all") {
      setIsPartialSetAll(true);
      setErrorForForm(false);
    }
  }, [props.constraintsConfigs]);

  useEffect(() => {
    setSelectedTab(tabsList?.[0]?.value);
  }, [tabsList]);
  useEffect(() => {
    if (props?.showSetAllModal) {
      setIsInsertAsNewRows(false);
      setDisablePrimaryBtn(true);
      props?.setAllModalData([]);
    }
  }, [props?.showSetAllModal]);

  useEffect(() => {
    if (props.savedSetAllModalData?.length) {
      const errorType = validateNullValues(props.savedSetAllModalData);
      if (selectedTab === "partial-set-all") {
        setDisablePrimaryBtn(
          isPSAPrimaryBtnDisabled ||
            errorType.minMaxError ||
            errorType.minDistError
        );
      } else {
        let check = false;
        Object.values(errorType)?.map((value) => {
          if (value === true) {
            check = true;
          }
        });
        setDisablePrimaryBtn(check);
        if (errorType.dateError) {
          displaySnackMessages(
            "Dates can not be with in same range !",
            "error",
            props
          );
        }
      }
    } else {
      setDisablePrimaryBtn(true);
    }
  }, [
    props.savedSetAllModalData,
    props.showNewConstraintFlow,
    isPSAPrimaryBtnDisabled,
    selectedTab,
  ]);

  function primaryButtonStateChangeForPSA(newState) {
    setIsPSAPrimaryBtnDisabled(newState);
  }

  const handleErrorMessage = (e, props) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      displaySnackMessages(errObj?.message, "error", props);
    else displaySnackMessages(ERROR_MESSAGE, "error", props);
  };

  const renderTabComponents = () => {
    switch (selectedTab) {
      case "set-all":
        return (
          <SetAllModal
            {...props}
            setErrorForForm={setErrorForForm}
            validationErrors={validationErrors}
            setInsertAsNewRows={setIsInsertAsNewRows}
          />
        );
      case "partial-set-all":
        return (
          <PartiallySetAllModal
            {...props}
            setErrorForForm={setErrorForForm}
            isConfirmationChecking={true}
            primaryButtonStateChange={primaryButtonStateChangeForPSA}
            validationErrors={validationErrors}
            setIsWosRelative={setIsWosRelative}
            isWosRelative={isWosRelative}
          />
        );
      default:
        return <></>;
    }
  };

  const handleTabChange = (event, tabValue) => {
    setSelectedTab(tabValue);
    setIsPartialSetAll(tabValue === "partial-set-all");
    setErrorForForm(tabValue !== "partial-set-all");
  };

  const saveData = async (state) => {
    let errorType = validateNullValues(props?.savedSetAllModalData);
    if (!state) props?.setAllModalVisible(!props?.showSetAllModal);
    else if (errorType?.nullValueError) {
      displaySnackMessages(
        "Please Enter the data in all the required fields",
        "error",
        props
      );
    } else if (errorType?.dateError) {
      displaySnackMessages(
        "Dates can not be with in same range !",
        "error",
        props
      );
    } else if (errorType?.minDistError) {
      displaySnackMessages(
        "Please complete min distribution fields with valid values.",
        "error",
        props
      );
    } else if (state) {
      props?.setSetAllModalLoader(true);
      let tempPayload = {};
      if (props?.useTableName) {
        tempPayload = {
          table_name:
            props.rulesTableName ??
            (props?.localstoreKeyTableName
              ? localStorage.getItem(props.localstoreKeyTableName)
              : null),
        };
      } else {
        tempPayload = {
          filters: isUndefined(props?.filterDependencies?.current?.filters)
            ? []
            : props?.filterDependencies?.current?.filters,
        };
      }
      let constraintsPayload = props.savedSetAllModalData.map((row) => {
        row = row.map((item) => {
          if (item.field_type === "DateTimeField") {
            return {
              attribute_name: item.attribute_name,
              attribute_value: moment(
                item.attribute_value,
                tenantDateFormat
              ).format("YYYY-MM-DD"),
            };
          }
          return {
            attribute_name: item.attribute_name,
            attribute_value: item.attribute_value,
          };
        });
        return row;
      });
      const useUpdatesPayload =
        !isInsertAsNewRows &&
        props?.selectedParentAndChildRows?.some(
          (parent) => parent?.constraint?.length > 0
        );
      let payload = {
        ...tempPayload,
        ...(useUpdatesPayload
          ? {
              updates: buildUpdatesPayload(
                props?.selectedParentAndChildRows,
                props?.savedSetAllModalData || []
              ),
            }
          : {
              constraint: constraintsPayload,
              row_update: props?.agGridInstance?.current?.api
                ?.isSelectAllRecords
                ? []
                : props?.selectedPlan,
            }),
        meta: {
          ...(filtersWithSearch?.meta || tableConfigurationMetaData.meta),
          limit: { limit: 10, page: 1 },
        },
        is_new_row: isInsertAsNewRows,
      };
      if (props.excludeDeselections) {
        payload = {
          ...payload,
          excluded_rows: props?.agGridInstance?.current?.api?.isSelectAllRecords
            ? props.deSelectedRows
              ? props.deSelectedRows
              : []
            : [],
          is_all_records_selected:
            props?.agGridInstance?.current?.api?.isSelectAllRecords,
        };
      }
      if (selectedTab === "partial-set-all") {
        payload = {
          ...payload,
          is_wos_relative: isWosRelative,
        };
      }
      try {
        let response = await props?.saveSetAllModalData(
          payload,
          selectedTab === "partial-set-all" ? true : false,
          isOMSConstraintsFlow
        );
        props?.setSetAllModalLoader(false);
        if (response?.data?.show_message || response.status) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        props?.setAllModalData([]);
        setSelectedTab(tabsList?.[0]?.value);
      } catch (error) {
        props?.setAllModalData([]);
        props?.setSetAllModalLoader(false);
        handleErrorMessage(error, props);
      }
      if (props?.setDeselectedRows) {
        props?.setDeselectedRows([]);
      }
      setIsInsertAsNewRows(false);
      props?.setAllModalVisible(!props?.showSetAllModal);
      props?.resetSelectedPlan();
      try {
        const api = props?.agGridInstance?.current?.api;
        api?.clearChildSelectionCache?.();
        api?.refreshServerSideStore?.({ purge: true });
        api?.deselectAll?.(true);
      } catch (refreshErr) {
        // Avoid showing a generic error after a successful Set All API when grid refresh fails
        console.warn("Set All: grid refresh after apply failed", refreshErr);
      }
    }
  };

  const validateNullValues = (data) => {
    let errorObj = {};
    if (data?.length === 0) return { nullValueError: true };
    let dateRangeResult = [];
    data.forEach((row) => {
      let tempRow = row.filter((key) => key.attribute_name.includes("date"));
      dateRangeResult.push({
        start_date: moment(tempRow[0]?.attribute_value, tenantDateFormat),
        end_date: moment(tempRow[1]?.attribute_value, tenantDateFormat),
      });
    });
    let nullValuesFound = false;
    let minMaxError = false;
    let minDistError = false;
    data.forEach((row) => {
      let minFields = [];
      let maxFields = [];
      row.forEach((attribute) => {
        if (
          isMandatorySetAllField(attribute) &&
          isEmptySetAllValue(attribute.attribute_value)
        ) {
          nullValuesFound = true;
        }
        if (
          attribute.attribute_name.includes("min") &&
          attribute.max_validation
        ) {
          minFields.push(attribute);
        }
        if (
          attribute.attribute_name.includes("max") &&
          attribute.min_validation
        ) {
          maxFields.push(attribute);
        }
        if (
          (attribute.maxCappedValue &&
            Number(attribute.attribute_value) > attribute.maxCappedValue) ||
          (attribute.minCappedValue &&
            Number(attribute.attribute_value) < attribute.minCappedValue)
        ) {
          errorObj["minMaxCapError"] = true;
        }
      });
      // Check if min is greater than max for each min/max pair.
      // max_validation may be a boolean flag (config) or the paired accessor
      // string (injected fields); resolve the paired max via MIN_MAX_ACCESSOR,
      // falling back to the accessor string when provided.
      minFields.forEach((minField) => {
        const pairedMaxName =
          MIN_MAX_ACCESSOR[minField.attribute_name] ||
          (typeof minField.max_validation === "string"
            ? minField.max_validation
            : null);
        const pairedMax = maxFields.find(
          (maxField) => maxField.attribute_name === pairedMaxName
        );
        if (
          pairedMax &&
          minField?.attribute_value != null &&
          pairedMax?.attribute_value != null &&
          Number(pairedMax.attribute_value) < Number(minField.attribute_value)
        ) {
          minMaxError = true;
        }
      });
      if (props.showNewConstraintFlow) {
        const minStockAttr = row.find(
          (attribute) => attribute.attribute_name === "min_stock"
        );
        const minDistAttr = row.find(
          (attribute) => attribute.attribute_name === "min_distribution"
        );
        if (
          !validateMinDistFromSavedRow(
            minStockAttr?.attribute_value,
            minDistAttr?.attribute_value
          ).isValid
        ) {
          minDistError = true;
        }
      }
    });

    errorObj["nullValueError"] = nullValuesFound;
    errorObj["minMaxError"] = minMaxError;
    errorObj["minDistError"] = minDistError;

    if (areDateRangesOverlapping(dateRangeResult)) {
      errorObj["dateError"] = true;
    }
    setValidationErrors(errorObj);
    return errorObj;
  };

  function areDateRangesOverlapping(dateRanges) {
    dateRanges = dateRanges.map((range) => ({
      start_date: new Date(range.start_date),
      end_date: new Date(range.end_date),
    }));

    // Sort ranges by start_date
    dateRanges.sort((a, b) => a.start_date - b.start_date);

    // Check for overlapping ranges
    for (let i = 0; i < dateRanges.length - 1; i++) {
      if (dateRanges[i].end_date >= dateRanges[i + 1].start_date) {
        return true; // Overlapping ranges found
      }
    }

    return false; // No overlapping ranges found
  }

  const closeModal = () => {
    setIsInsertAsNewRows(false);
    props?.setAllModalVisible(!props?.showSetAllModal);
  };
  if(props.showSetAllInBottomSheet && props?.showSetAllModal ){
    return (
      <Card
        padding={0}
        minHeight={638}
        className={`${classes.setAllCard} ${classes.setAllCardContainer}`}
      >
        <div className={classes.setAllCardHeader}>
          Set All
          <CloseIcon className={classes.setAllCloseIcon} onClick={closeModal} />
        </div>
        <div className={classes.setAllCardBody}>
          <Loader loader={props.setAllModalLoader}>
            <div className={classes.setAllCardContent}>
              <div
                className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
              >
                <ButtonGroup
                  onChange={handleTabChange}
                  options={tabsList}
                  selectedOption={selectedTab}
                />
              </div>
              {renderTabComponents()}
            </div>
          </Loader>
        </div>
        <div className={classes.setAllCardFooter}>
          <Button
            id="cancel-exception-btn"
            variant="secondary"
            size="large"
            onClick={closeModal}
          >
            Cancel
          </Button>
          <Button
            id="apply-exception-btn"
            onClick={() => {
              saveData(true);
              setDisablePrimaryBtn(true);
              setIsPSAPrimaryBtnDisabled(true);
            }}
            variant="primary"
            size="large"
            disabled={disablePrimaryBtn}
          >
            Apply
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Panel
      title="Set All"
      size="large"
      anchor="right"
      open={props?.showSetAllModal}
      onClose={closeModal}
      className={classes.constraintsPanel}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={() => {
        saveData(true);
        setDisablePrimaryBtn(true);
        setIsPSAPrimaryBtnDisabled(true);
      }}
      onSecondaryButtonClick={closeModal}
      primaryButtonProps={{
        disabled: disablePrimaryBtn,
      }}
    >
      <Loader loader={props.setAllModalLoader}>
        <div
          className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
        >
          <ButtonGroup
            onChange={handleTabChange}
            options={tabsList}
            selectedOption={selectedTab}
          />
        </div>
        {renderTabComponents()}
      </Loader>
    </Panel>
  );
};

SetAllModalComponent.propTypes = {
  agGridInstance: PropTypes.shape({
    current: PropTypes.shape({
      api: PropTypes.shape({
        deselectAll: PropTypes.func,
        isSelectAllRecords: PropTypes.any,
        refreshServerSideStore: PropTypes.func,
      }),
    }),
  }),
  filterDependencies: PropTypes.shape({
    current: PropTypes.shape({
      filters: PropTypes.any,
    }),
  }),
  inventorysmartModulesPermission: PropTypes.any,
  inventorysmartScreenConfig: PropTypes.shape({
    inventorysmart_constraints: PropTypes.shape({
      drillDown: PropTypes.shape({
        hidden: PropTypes.shape({
          indexOf: PropTypes.func,
        }),
        showSingleMergedRows: PropTypes.any,
      }),
    }),
  }),
  localstoreKeyTableName: PropTypes.any,
  /** When set, used instead of localStorage (e.g. create-new-rule flow). */
  rulesTableName: PropTypes.string,
  module: PropTypes.any,
  resetSelectedPlan: PropTypes.func,
  saveSetAllModalData: PropTypes.func,
  savedSetAllModalData: PropTypes.any,
  selectedPlan: PropTypes.any,
  setAllModalData: PropTypes.func,
  setAllModalLoader: PropTypes.any,
  setAllModalVisible: PropTypes.func,
  setSetAllModalLoader: PropTypes.func,
  showSetAllModal: PropTypes.any,
  useTableName: PropTypes.any,
  excludeDeselections: PropTypes.bool,
  deSelectedRows: PropTypes.arrayOf(
    PropTypes.shape({
      rule_code: PropTypes.number,
      psa_code: PropTypes.string,
    })
  ),
  addSnack: PropTypes.func,
  constraintsConfigs: PropTypes.object,
  defaultWosType: PropTypes.string,
  disableRelativeWos: PropTypes.bool,
  enableMinDistribution: PropTypes.bool,
  showNewConstraintFlow: PropTypes.bool,
  filtersWithSearch: PropTypes.object,
  setDeselectedRows: PropTypes.func,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    setAllModalLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.setAllModalLoader,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    defaultWosType:
      inventorysmartReducer.inventorySmartConstraints?.constraintsConfigs
        ?.default_wos_type,
    constraintsConfigs:
      inventorysmartReducer.inventorySmartConstraints?.constraintsConfigs,
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
)(SetAllModalComponent);
