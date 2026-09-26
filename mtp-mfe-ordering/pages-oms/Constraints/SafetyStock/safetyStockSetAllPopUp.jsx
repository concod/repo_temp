import Form from "core/Utils/form";
import { useMemo, useRef, useState } from "react";
import { cloneDeep, isEmpty, isNaN } from "lodash";
import {
  INVALID_VALUE_MESSAGE,
  NO_UPDATE,
  OMS_SERVICE_LEVEL_VALIDATION_ERROR,
} from "modules/oms/constants-oms/stringConstants";
import { Panel } from "impact-ui-v3";
import { OMS_WOS_VALIDATION_ERROR } from "modules/oms/constants-oms/stringConstants";

const SafetyStockSetAllPopup = ({
  setShowSetAllModal,
  rowsData,
  setAll,
  setCheckAllSetAllRequest,
  agGridInstance,
  displaySnackMessages,
  safetyStockRowId,
  SAFETY_STOCK_EDIT_API_KEYS,
  SETALL_MAPPING,
  SETALL_FORMDATA_FIELDS,
  EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  var safetyStockSetAllPayload = useRef([]);

  const SETALL_FIELDS = cloneDeep(SETALL_FORMDATA_FIELDS);
  SETALL_FIELDS.map((inputField) => {
    let mappedFieldName = inputField?.accessor;
    let fieldMapping = EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING.find(
      (col) =>
        col?.field === inputField?.accessor || col?.field === mappedFieldName
    );

    if (!fieldMapping) return inputField;
    if (
      (inputField?.accessor === fieldMapping?.field ||
        mappedFieldName === fieldMapping?.field) &&
      formData?.safety_stock_method === fieldMapping?.value
    ) {
      inputField.isDisabled = false;
      inputField.is_mandatory = true;
    } else {
      inputField.isDisabled = true;
      inputField.is_mandatory = false;
    }
  });

  const STORE_SETALL_FIELDS = useMemo(() => SETALL_FIELDS, [
    formData.safety_stock_method,
  ]);

  const checkInValidNumber = (value) => {
    return isNaN(value) || value === "" || parseInt(value) === NaN;
  };

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  const createPayloadItem = (formRowData, tableRowData) => {
    let payloadObject = {};
    payloadObject[safetyStockRowId] = formRowData?.[safetyStockRowId];
    for (let rowKey in formRowData) {
      if (
        formRowData.hasOwnProperty(rowKey) &&
        Object.keys(SETALL_MAPPING).includes(rowKey)
      ) {
        const fieldProperty = SETALL_FORMDATA_FIELDS.filter(
          (field) => field.accessor === rowKey
        )[0];
        if (
          fieldProperty.field_type === "IntegerField" &&
          formRowData[rowKey]
        ) {
          payloadObject[rowKey] = parseInt(formRowData[rowKey]);
        } else {
          payloadObject[rowKey] = formRowData[rowKey];
        }
      }
    }
    SAFETY_STOCK_EDIT_API_KEYS?.forEach((key) => {
      if (tableRowData?.[key]) {
        payloadObject[key] = tableRowData[key];
      }
    });
    return payloadObject;
  };

  const handleChange = (data) => {
      // Reset service_level_pct and stock_units when safety_stock_method is "wos"
      if (data.safety_stock_method === "WOS") {
        data.service_level_pct = "";
        data.stock_units = "";
      }
    if (data.safety_stock_method === "Service Level") {
      data.stock_units = "";
      data.safety_stock_twos = "";
    }
    if (data.safety_stock_method === "Safety Stock Unit") {
      data.service_level_pct = "";
      data.safety_stock_twos = "";
    }

    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }

    rowsData.filter((row) => {
      let isEditedBefore = false;
      safetyStockSetAllPayload.current.filter((node) => {
        if (node[safetyStockRowId] === row?.[safetyStockRowId]) {
          let payloadItem = createPayloadItem(data, row);
          for (let rowKey in payloadItem) {
            node[rowKey] = payloadItem[rowKey];
          }
          node[safetyStockRowId] = row[safetyStockRowId];
          isEditedBefore = true;
        }
      });

      if (!isEditedBefore) {
        safetyStockSetAllPayload.current.push(createPayloadItem(row));
      }
    });
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    if (flagEdit) {
      if (formData) {
        Object.keys(formData).map((key) => {
          if (formData[key] === "") {
            formData[key] = null;
          }
        });

        let isValuesInvalid = false;
        let isValidationMessageDisplayed = false;

        SETALL_FORMDATA_FIELDS.map((inputField) => {
          if (formData?.[inputField?.accessor]) {
            if (
              inputField?.min_value &&
              formData[inputField?.accessor] < inputField?.min_value
            ) {
              isValuesInvalid = true;
              if (inputField?.validation_message) {
                displaySnackMessages(
                  inputField?.validation_message || INVALID_VALUE_MESSAGE,
                  "info"
                );
                isValidationMessageDisplayed = true;
              }
            }
            if (
              inputField?.max_value &&
              formData[inputField?.accessor] > inputField?.max_value
            ) {
              isValuesInvalid = true;
              if (inputField?.validation_message) {
                displaySnackMessages(
                  inputField?.validation_message || INVALID_VALUE_MESSAGE,
                  "info"
                );
                isValidationMessageDisplayed = true;
              }
            }
            if (
              inputField?.no_negative_values &&
              formData[inputField?.accessor] < 0
            ) {
              isValuesInvalid = true;
              if (inputField?.validation_message) {
                displaySnackMessages(
                  inputField?.validation_message || INVALID_VALUE_MESSAGE,
                  "info"
                );
                isValidationMessageDisplayed = true;
              }
            }
            if (inputField?.field_type === "IntegerField") {
              if (checkInValidNumber(formData[inputField?.accessor])) {
                isValuesInvalid = true;
                if (inputField?.validation_message) {
                  displaySnackMessages(
                    inputField?.validation_message || INVALID_VALUE_MESSAGE,
                    "info"
                  );
                  isValidationMessageDisplayed = true;
                }
              }
            }
          } else {
            const inputFieldonSetAll = STORE_SETALL_FIELDS.filter(
              (input) => input.accessor === inputField?.accessor
            )[0];
            if (inputFieldonSetAll?.is_mandatory) {
              isValuesInvalid = true;
              if (inputField?.validation_message) {
                displaySnackMessages(
                  inputField?.validation_message || INVALID_VALUE_MESSAGE,
                  "info"
                );
                isValidationMessageDisplayed = true;
              }
            }
          }
        });

        if (isValuesInvalid && !isValidationMessageDisplayed) {
          displaySnackMessages(INVALID_VALUE_MESSAGE, "info");
          return;
        }

        if (
          formData?.demand_twos &&
          formData?.safety_stock_twos &&
          parseInt(formData.demand_twos) <= parseInt(formData.safety_stock_twos)
        ) {
          displaySnackMessages(OMS_WOS_VALIDATION_ERROR, "info");
          return;
        }

        let isValuesValid = true;
        safetyStockSetAllPayload.current.map((row) => {
          Object.keys(formData).map((key) => {
            const fieldProperty = SETALL_FORMDATA_FIELDS.filter(
              (field) => field.accessor === key
            )[0];
            if (fieldProperty.field_type === "IntegerField" && formData[key]) {
              row[key] = parseInt(formData[key]);
            } else {
              row[key] = formData[key];
            }
          });
        });

        if (!isValuesInvalid && isValuesValid) {
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

          let response = setAll(safetyStockSetAllPayload.current, data);
          if (response) {
            setShowSetAllModal(false);
            safetyStockSetAllPayload.current = [];
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
      title="Set All"
      aria-labelledby="constraint-safety-stock-set-all"
      open={true}
      disableEscapeKeyDown={true}
      width={545}
      // footerButtons={[
      //   {
      //     label: "Cancel",
      //     onClick: () => {
      //       onCancel();
      //     },
      //     variant: "contained",
      //   },
      //   {
      //     label: "Apply",
      //     onClick: () => {
      //       onApply();
      //     },
      //     variant: "contained",
      //   },
      // ]}
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
        <Form
          maxFieldsInRow={3}
          layout={"vertical"}
          handleChange={handleChange}
          fields={STORE_SETALL_FIELDS}
          updateDefaultValue={true}
          defaultValues={{}}
          labelWidthSpan={2}
        ></Form>
      </div>
    </Panel>
  );
};

export default SafetyStockSetAllPopup;
