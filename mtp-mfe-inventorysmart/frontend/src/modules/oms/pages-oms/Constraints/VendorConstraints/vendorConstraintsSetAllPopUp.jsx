import Form from "core/Utils/form";
import React, { useMemo, useRef, useState } from "react";
import { cloneDeep, isEmpty, isNaN } from "lodash";
import { ButtonGroup, Panel } from "impact-ui-v3";
import { useSelector } from "react-redux";

const SET_ALL_TAB_VALUE = "set-all";
const PARTIAL_SET_ALL_TAB_VALUE = "partial-set-all";
const VENDOR_CONSTRAINTS_SET_ALL_TABS = [
  { label: "Set All", value: SET_ALL_TAB_VALUE },
  { label: "Partial Set All", value: PARTIAL_SET_ALL_TAB_VALUE },
];
import {
  ERROR_MESSAGE,
  FILL_MANDATORY_FIELDS,
  INVALID_ORDER_MULTIPLE,
  INVALID_SETALL_VALUES_FOR_VENDOR_CONSTRAINTS,
  INVALID_VALUE_FOR_LEVEL_OF_APPLICATION,
  INVALID_VALUE_MESSAGE,
  MIN_MAX_VALIDATION,
  NO_UPDATE,
  NUMERIC_FIELD,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";

const VendorConstraintsSetAllPopUp = ({
  setShowSetAllModal,
  rowsData,
  setAll,
  setAllPartial,
  setCheckAllSetAllRequest,
  agGridInstance,
  displaySnackMessages,
  ruleRowId,
  SETALL_MAPPING,
  SETALL_FORMDATA_FIELDS,
  isCalledFromRCLCreation,
  savedSetAllModalData,
  selectedRows,
  saveSetAllModalData,
  resetSelectedPlan,
  setAllModalData,
  createRulesTableManualBody = {},
  isPartialSaveEnabled,
  isPartialSetAllEnabled,
  partialSetAllIncludedFields,
  isSizeRelated,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [selectedTab, setSelectedTab] = useState(SET_ALL_TAB_VALUE);

  const isPartialSetAllVisible =
    !isCalledFromRCLCreation &&
    isPartialSetAllEnabled === true &&
    Array.isArray(partialSetAllIncludedFields) &&
    partialSetAllIncludedFields.length > 0;

  const isPartialSetAllActive =
    isPartialSetAllVisible && selectedTab === PARTIAL_SET_ALL_TAB_VALUE;

  var ruleConstraintsSetAllPayload = useRef([]);

  const IS_ORDER_MULTIPLE_DISABLED = useSelector(
    (store) =>
      store?.omsReducer?.orderingCommonService?.orderingScreensConfig
        ?.constraints?.vendor_constraints?.is_order_multiple_disabled || false
  );

  // Helper function to check pack_selection value (same as in the main table)
  const getPackSelectionValue = (packSelection) => {
    try {
      // Handle null or undefined
      if (!packSelection) {
        return "not_manual";
      }

      // Handle string values
      if (
        typeof packSelection === "string" ||
        typeof packSelection?.value === "string"
      ) {
        return packSelection?.value || packSelection; // Will be "manual" or something else
      }

      // Handle array values
      if (Array.isArray(packSelection)) {
        // If it's an array of objects (processed pack selection), check the first object's value
        if (
          packSelection.length > 0 &&
          typeof packSelection[0] === "object" &&
          packSelection[0].value
        ) {
          return packSelection[0].value;
        }
        // If it's an array of strings, return the first string
        if (packSelection.length > 0 && typeof packSelection[0] === "string") {
          return packSelection[0];
        }
        // If array has length > 0, it means pack IDs are selected (not manual)
        return packSelection.length > 0 ? "not_manual" : "manual";
      }

      return "not_manual";
    } catch (error) {
      console.log("Error in getPackSelectionValue", error);
      return "not_manual";
    }
  };

  // Check if any row has pack_selection other than "manual"
  const hasNonManualPackSelection = useMemo(() => {
    return rowsData?.some((row) => {
      const packSelectionValue = getPackSelectionValue(row.pack_selection);
      console.log(
        "Row pack_selection:",
        row.pack_selection,
        "resolved value:",
        packSelectionValue
      );
      return packSelectionValue !== "manual";
    });
  }, [rowsData]);

  // Create the fields array with conditional disabling
  const STORE_SETALL_FIELDS = useMemo(() => {
    var SETALL_FIELDS = cloneDeep(SETALL_FORMDATA_FIELDS);
    if (isSizeRelated) {
      SETALL_FIELDS = SETALL_FIELDS?.map((field) => {
        if (
          field.accessor === "level_of_application" &&
          Array.isArray(field.options)
        ) {
          return {
            ...field,
            options: field.options.filter(
              (option) => option.id === "applicable_all"
            ),
          };
        }
        return field;
      });
    }
    if (IS_ORDER_MULTIPLE_DISABLED) {
      // Modify order_multiple field to be disabled if any row has non-manual pack_selection
      SETALL_FIELDS = SETALL_FIELDS?.map((field) => {
        if (field.accessor === "order_multiple") {
          console.log(
            "Modifying order_multiple field, hasNonManualPackSelection:",
            hasNonManualPackSelection
          );
          return {
            ...field,
            isDisabled: hasNonManualPackSelection,
            disabled: hasNonManualPackSelection,
            is_editable: !hasNonManualPackSelection,
            is_mandatory: !hasNonManualPackSelection,
          };
        }
        return field;
      });
    }

    return SETALL_FIELDS;
  }, [SETALL_FORMDATA_FIELDS, isSizeRelated, hasNonManualPackSelection]);

  const PARTIAL_SETALL_FIELDS = useMemo(() => {
    if (!isPartialSetAllVisible) {
      return [];
    }
    const allowedAccessors = new Set(partialSetAllIncludedFields);
    return STORE_SETALL_FIELDS.filter((field) =>
      allowedAccessors.has(field.accessor)
    ).map((field) => ({
      ...field,
      is_mandatory: false,
      required: false,
    }));
  }, [STORE_SETALL_FIELDS, isPartialSetAllVisible, partialSetAllIncludedFields]);

  // let SETALL_FIELDS = cloneDeep(SETALL_FORMDATA_FIELDS);

  // if (isSizeRelated) {
  //   SETALL_FIELDS = SETALL_FIELDS.map((field) => {
  //     if (
  //       field.accessor === "level_of_application" &&
  //       Array.isArray(field.options)
  //     ) {
  //       return {
  //         ...field,
  //         options: field.options.filter(
  //           (option) => option.id === "applicable_all"
  //         ),
  //       };
  //     }
  //     return field;
  //   });
  // }

  //  // Modify order_multiple field to be disabled if any row has non-manual pack_selection
  //  SETALL_FIELDS = SETALL_FIELDS.map((field) => {
  //   if (field.accessor === "order_multiple") {
  //    field.isDisabled = isOrderMultipleDisabled;
  //   }
  //   return field;
  // });

  const IS_LEVEL_OF_APPLICATION_REQUIRED =
    SETALL_FORMDATA_FIELDS?.filter(
      (data) => data.accessor === "level_of_application"
    ) || {};

  const THRESHOLD_MIN_VALUE =
    SETALL_FORMDATA_FIELDS?.filter((data) => data.accessor === "moq_tolerance")
      ?.min_value || 0;
  const THRESHOLD_MAX_VALUE =
    SETALL_FORMDATA_FIELDS?.filter((data) => data.accessor === "moq_tolerance")
      ?.max_value || 100;

  const MINIMUM_QTY_MIN_VALUE =
    SETALL_FORMDATA_FIELDS?.filter(
      (data) => data.accessor === "min_replenishment_quantity"
    )?.min_value || 0;

  const ORDER_MULTIPLE_MIN_VALUE =
    SETALL_FORMDATA_FIELDS?.filter((data) => data.accessor === "order_multiple")
      ?.min_value || 1;

  // const STORE_SETALL_FIELDS = useMemo(() => SETALL_FIELDS, [
  //   formData.level_of_application,
  // ]);

  const checkInValidInteger = (value) => {
    return isNaN(value) || parseInt(value) === NaN;
  };

  const checkValidInput = (value) => {
    return value !== "" && value !== undefined && value !== null;
  };

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  const createPayloadItem = (row) => {
    let payloadObject = {};
    payloadObject[ruleRowId] = row?.[ruleRowId];
    for (let rowKey in row) {
      if (
        row.hasOwnProperty(rowKey) &&
        Object.keys(SETALL_MAPPING).includes(rowKey)
      ) {
        payloadObject[rowKey] = row[rowKey];
      }
    }
    return payloadObject;
  };

  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
    if (isCalledFromRCLCreation) {
      return;
    }

    rowsData.filter((row) => {
      let isEditedBefore = false;
      ruleConstraintsSetAllPayload.current.filter((node) => {
        if (row[ruleRowId] === node?.[ruleRowId]) {
          let payloadItem = createPayloadItem(data);
          for (let rowKey in payloadItem) {
            node[rowKey] = payloadItem[rowKey];
          }
          node[ruleRowId] = row[ruleRowId];
          isEditedBefore = true;
        }
      });

      if (!isEditedBefore) {
        ruleConstraintsSetAllPayload.current.push(createPayloadItem(row));
      }
    });
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  // ButtonGroup forwards (event, value) — value is the second arg per impact-ui-v3.
  const handleTabChange = (_event, nextTabValue) => {
    if (!nextTabValue || nextTabValue === selectedTab) {
      return;
    }
    setSelectedTab(nextTabValue);
    setFormData({});
    setFlagEdit(false);
    ruleConstraintsSetAllPayload.current = [];
  };

  const validateLevelOfApplicationRelatedColumns = (formData) => {
    if (
      checkValidInput(formData?.moq_tolerance) ||
      checkValidInput(formData?.min_replenishment_quantity) ||
      checkValidInput(formData?.max_replenishment_quantity)
    ) {
      return true;
    }
    return false;
  };

  const onApplyPartial = async () => {
    if (!flagEdit || !formData || Object.keys(formData).length === 0) {
      displaySnackMessages(NO_UPDATE, "info");
      return;
    }

    let isValuesValid = true;

    // Partial mode intentionally drops the two cross-field rules that fire in
    // full Set-All (LOA ↔ min/max/MOQ co-presence) — every field is patched
    // independently here. Cross-field rules below are guarded by explicit
    // co-presence checks so a single-field patch never trips them.

    if (
      checkValidInput(formData?.min_replenishment_quantity) &&
      checkValidInput(formData?.max_replenishment_quantity) &&
      parseInt(formData.max_replenishment_quantity) <
        parseInt(formData.min_replenishment_quantity)
    ) {
      displaySnackMessages(MIN_MAX_VALIDATION, "info");
      return;
    }

    if (formData?.order_multiple !== undefined) {
      if (
        checkInValidInteger(formData.order_multiple) ||
        formData.order_multiple < ORDER_MULTIPLE_MIN_VALUE
      ) {
        displaySnackMessages(INVALID_ORDER_MULTIPLE, "info");
        return;
      }
      formData.order_multiple = parseInt(formData.order_multiple);
    }

    if (formData.min_replenishment_quantity !== undefined) {
      if (checkInValidInteger(formData.min_replenishment_quantity)) {
        isValuesValid = false;
      } else if (formData.min_replenishment_quantity < MINIMUM_QTY_MIN_VALUE) {
        formData.min_replenishment_quantity = MINIMUM_QTY_MIN_VALUE;
      } else {
        formData.min_replenishment_quantity = parseInt(
          formData.min_replenishment_quantity
        );
      }
    }

    if (formData.max_replenishment_quantity !== undefined) {
      if (checkInValidInteger(formData.max_replenishment_quantity)) {
        isValuesValid = false;
      } else if (
        formData.min_replenishment_quantity !== undefined &&
        formData.max_replenishment_quantity <
          formData.min_replenishment_quantity
      ) {
        displaySnackMessages(MIN_MAX_VALIDATION, "info");
        formData.max_replenishment_quantity =
          formData.min_replenishment_quantity;
      } else {
        formData.max_replenishment_quantity = parseInt(
          formData.max_replenishment_quantity
        );
      }
    }

    if (formData.moq_tolerance !== undefined) {
      if (checkInValidInteger(formData.moq_tolerance)) {
        isValuesValid = false;
      } else if (formData.moq_tolerance < THRESHOLD_MIN_VALUE) {
        formData.moq_tolerance = THRESHOLD_MIN_VALUE;
      } else if (formData.moq_tolerance > THRESHOLD_MAX_VALUE) {
        formData.moq_tolerance = THRESHOLD_MAX_VALUE;
      } else {
        formData.moq_tolerance = parseInt(formData.moq_tolerance);
      }
    }

    if (!isValuesValid) {
      displaySnackMessages(INVALID_VALUE_MESSAGE, "info");
      return;
    }

    let response = setAllPartial && setAllPartial(formData);
    if (response) {
      setShowSetAllModal(false);
      ruleConstraintsSetAllPayload.current = [];
    }
  };

  const onApply = async () => {
    if (isPartialSetAllActive) {
      return onApplyPartial();
    }
    if (flagEdit) {
      if (formData) {
        //If Level of Application is selected, then check if all the related columns are set
        if (formData?.level_of_application) {
          if (!validateLevelOfApplicationRelatedColumns(formData)) {
            displaySnackMessages(
              INVALID_SETALL_VALUES_FOR_VENDOR_CONSTRAINTS,
              "info"
            );
            return;
          }
        }

        //If all the related columns are set, then Level of Application should be selected
        if (
          validateLevelOfApplicationRelatedColumns(formData) &&
          !checkValidInput(formData?.level_of_application) &&
          !isEmpty(IS_LEVEL_OF_APPLICATION_REQUIRED)
        ) {
          displaySnackMessages(INVALID_VALUE_FOR_LEVEL_OF_APPLICATION, "info");
          return;
        } else {
        }

        //Validation on Order Multiple (>ORDER_MULTIPLE_MIN_VALUE)
        if (parseInt(formData.order_multiple) < ORDER_MULTIPLE_MIN_VALUE) {
          displaySnackMessages(INVALID_ORDER_MULTIPLE, "info");
          return;
        }

        //Validation on Min and Max Qty
        if (
          formData?.min_replenishment_quantity &&
          formData?.max_replenishment_quantity &&
          parseInt(formData.max_replenishment_quantity) <
            parseInt(formData.min_replenishment_quantity)
        ) {
          displaySnackMessages(MIN_MAX_VALIDATION, "info");
          return;
        }
      }

      let l_checkAllSetAllRequest = {
        searchColumns: agGridInstance.api.getFilterModel(),
        ...getcheckAllSetAllReq(formData, SETALL_MAPPING),
      };
      let data;
      if (
        agGridInstance.api.checkConfiguration[
          agGridInstance.api.checkConfiguration.length - 2
        ]
      ) {
        setCheckAllSetAllRequest((old) => {
          if (!isEmpty(old)) {
            data = [...old, l_checkAllSetAllRequest];
            return [...old, l_checkAllSetAllRequest];
          } else {
            data = [l_checkAllSetAllRequest];
            return [l_checkAllSetAllRequest];
          }
        });
      }

      let isValuesValid = true;

      //Validation on Order Multiple (>0)
      if (formData?.order_multiple !== undefined) {
        if (
          checkInValidInteger(formData.order_multiple) ||
          formData.order_multiple < ORDER_MULTIPLE_MIN_VALUE
        ) {
          isValuesValid = false;
        } else {
          formData.order_multiple = parseInt(formData.order_multiple);
        }
      }

      //Validation on Min Qty (>=0)
      if (formData.min_replenishment_quantity !== undefined) {
        if (checkInValidInteger(formData.min_replenishment_quantity)) {
          isValuesValid = false;
        } else {
          if (formData.min_replenishment_quantity < MINIMUM_QTY_MIN_VALUE) {
            formData.min_replenishment_quantity = MINIMUM_QTY_MIN_VALUE;
          } else {
            formData.min_replenishment_quantity = parseInt(
              formData.min_replenishment_quantity
            );
          }
        }
      }

      //Validation on Max Qty (> Min Qty)
      if (formData.max_replenishment_quantity !== undefined) {
        if (checkInValidInteger(formData.max_replenishment_quantity)) {
          isValuesValid = false;
        } else {
          if (
            formData.max_replenishment_quantity <
            formData.min_replenishment_quantity
          ) {
            displaySnackMessages(MIN_MAX_VALIDATION, "info");
            formData.max_replenishment_quantity =
              formData.min_replenishment_quantity;
          } else {
            formData.max_replenishment_quantity = parseInt(
              formData.max_replenishment_quantity
            );
          }
        }
      }

      //Validation on MOQ Tolerance (Between 0 and 100)
      if (formData.moq_tolerance !== undefined) {
        if (checkInValidInteger(formData.moq_tolerance)) {
          isValuesValid = false;
        } else {
          if (formData.moq_tolerance < THRESHOLD_MIN_VALUE) {
            formData.moq_tolerance = THRESHOLD_MIN_VALUE;
          } else if (formData.moq_tolerance > THRESHOLD_MAX_VALUE) {
            formData.moq_tolerance = THRESHOLD_MAX_VALUE;
          } else {
            formData.moq_tolerance = parseInt(formData.moq_tolerance);
          }
        }
      }

      //Check for Full Validation - If all the mandatory values are present, then only proceed
      if (!isPartialSaveEnabled) {
        const mandatoryFields = STORE_SETALL_FIELDS.filter(
          (field) => field.is_mandatory === true
        )
          .map((field) => field.accessor)
          .filter((accessor) => Object.keys(SETALL_MAPPING).includes(accessor));

        const allMandatoryKeysPresent = mandatoryFields.every((key) =>
          formData.hasOwnProperty(key)
        );

        if (!allMandatoryKeysPresent) {
          isValuesValid = allMandatoryKeysPresent;
          displaySnackMessages(FILL_MANDATORY_FIELDS, "info");
          return;
        }
      }

      if (!isValuesValid) {
        displaySnackMessages(INVALID_VALUE_MESSAGE, "info");
        return;
      } else {
        if (isCalledFromRCLCreation) {
          let tempPayload = {
            table_name: localStorage.getItem("rclCreatedTableName"),
          };

          const constraintsPayload = Object.keys(formData)
            .filter((key) => key !== ruleRowId)
            .map((key) => {
              return { attribute_name: key, attribute_value: formData[key] };
            });

          let payload = {
            ...tempPayload,
            constraint: [constraintsPayload],
            row_update: agGridInstance?.api?.isSelectAllRecords
              ? []
              : selectedRows,
            meta: isEmpty(createRulesTableManualBody)
              ? {
                  ...tableConfigurationMetaData.meta,
                  limit: { limit: 10, page: 1 },
                }
              : {
                  ...createRulesTableManualBody.meta,
                },
          };
          try {
            let response = await saveSetAllModalData(payload, false, true);
            resetSelectedPlan();
            displaySnackMessages(response?.data?.message, "success");
            agGridInstance.api.refreshServerSideStore({
              purge: true,
            });
            agGridInstance.api?.deselectAll(true);
            agGridInstance.api?.setCheckConfiguration([]);
            setAllModalData([]);
          } catch (error) {
            setAllModalData([]);
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
          setShowSetAllModal(false);
        } else {
          let response = setAll(formData);
          if (response) {
            setShowSetAllModal(false);
            ruleConstraintsSetAllPayload.current = [];
          }
        }
      }
    } else {
      displaySnackMessages(NO_UPDATE, "info");
    }
  };

  return (
    <Panel
      onClose={() => onCancel()}
      aria-labelledby="-constraints-set-all"
      open={true}
      disableEscapeKeyDown={true}
      title="Set All"
      width={545}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={() => {
        onApply();
      }}
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div>
        {isPartialSetAllVisible && (
          <div style={{ marginBottom: 16 }}>
            <ButtonGroup
              onChange={handleTabChange}
              options={VENDOR_CONSTRAINTS_SET_ALL_TABS}
              selectedOption={selectedTab}
            />
          </div>
        )}
        <Form
          key={isPartialSetAllActive ? "partial-set-all" : "set-all"}
          maxFieldsInRow={3}
          layout={"vertical"}
          handleChange={handleChange}
          fields={
            isPartialSetAllActive ? PARTIAL_SETALL_FIELDS : STORE_SETALL_FIELDS
          }
          updateDefaultValue={true}
          defaultValues={{}}
          labelWidthSpan={2}
          //fieldTypeWidthSpan={2}
        ></Form>
      </div>
    </Panel>
  );
};

export default VendorConstraintsSetAllPopUp;
