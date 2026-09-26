import { Modal } from "impact-ui-v3";
import Form from "core/Utils/form";
import { useEffect, useMemo, useState } from "react";
import {
  OMS_SERVICE_LEVEL_VALIDATION_ERROR,
  OMS_SET_ALL_SAFETY_STOCK_VALIDATION_ERROR,
  OMS_SET_ALL_SAFETY_STOCK_METHOD_VALIDATION_ERROR,
} from "modules/oms/constants-oms/stringConstants";
import { cloneDeep, isEmpty } from "lodash";

const DEFAULT_SET_ALL_MAPPING = {
  service_level: "service_level_pct",
  max_stock: "stock_units",
  safety_stock: "safety_stock_method",
};
const OrderSetAllModal = ({
  setShowSetAllModal,
  rowsData,
  agGridInstance,
  displaySnackMessages,
  uniqueRowId,
  SETALL_MAPPING,
  SETALL_FORMDATA_FIELDS,
  EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING,
  editedPayloadRef,
  setAllPayloadRef,
  validateUserInputServiceLevel,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);

  const SETALL_FIELDS = cloneDeep(SETALL_FORMDATA_FIELDS);

  SETALL_FIELDS.map((inputField) => {
    let mappedFieldName = SETALL_MAPPING[inputField?.accessor];
    let fieldMapping = EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING.find(
      (col) =>
        col?.field === inputField?.accessor || col?.field === mappedFieldName
    );

    if (!fieldMapping) return inputField;
    if (
      (inputField?.accessor === fieldMapping?.field ||
        mappedFieldName === fieldMapping?.field) &&
      formData?.safety_stock === fieldMapping?.value
    ) {
      inputField.isDisabled = false;
    } else {
      inputField.isDisabled = true;
    }
  });

  const STORE_SETALL_FIELDS =
    SETALL_FIELDS.length === 0
      ? useMemo(
          () => [
            {
              label: "Safety Stock Method",
              accessor: "safety_stock",
              field_type: "list",
              options: [
                {
                  label: "Service Level",
                  value: "service_level",
                  id: "Service Level",
                },
                { label: "User Input", value: "user_input", id: "User Input" },
              ],
              isMulti: false,
            },
            {
              label: "Service Level",
              accessor: "service_level",
              field_type: "IntegerField",
              value_type: "percentage",
              isDisabled: formData?.safety_stock !== "Service Level",
            },
            {
              label: "Safety Stock Unit",
              accessor: "max_stock",
              field_type: "IntegerField",
              value_type: "number",
              isDisabled: formData?.safety_stock !== "User Input",
            },
          ],
          [formData?.safety_stock]
        )
      : useMemo(() => SETALL_FIELDS, [formData.safety_stock]);

  const { minMaxValidationMapping, maxValues } = useMemo(() => {
    const minMaxValidationMapping = {};
    const maxValues = {};

    SETALL_FIELDS.forEach((inputField) => {
      console.log("inputField", inputField);
      if (inputField?.max_validation) {
        maxValues[`${inputField?.accessor}_max`] =
          inputField?.max_value || 99999;
        minMaxValidationMapping[
          inputField?.accessor
        ] = `${inputField?.accessor}_max`;
      }
    });

    return { minMaxValidationMapping, maxValues };
  }, [SETALL_FIELDS]);

  const handleChange = (data) => {
    console.log("body", data);
    if (data?.max_stock > data?.max_stock_max) {
      data.max_stock = data?.max_stock_max;
    }
    if (data?.safety_stock_twos > data?.safety_stock_twos_max) {
      data.safety_stock_twos = data?.safety_stock_twos_max;
    }
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  /**
   * Verify if the value is greater than the max value
   * @param {Object} data - The data to verify
   * @returns {boolean} - True if the value is greater than the max value, false otherwise
   */
  const verifyMinMaxValidation = (data) => {
    for (const key in minMaxValidationMapping) {
      if (data[key] && data[key] > maxValues[minMaxValidationMapping[key]]) {
        return true;
      }
    }
    return false;
  };

  const onApply = async () => {
    const occupiedFieldsLength = Object.keys(formData).filter(
      (key) => !Object.keys(maxValues).includes(key)
    ).length;
    if (flagEdit && occupiedFieldsLength > 1) {
      let formDataClone = cloneDeep(formData);
      let l_selectedNodes = agGridInstance.api.getSelectedNodes();
      let selections = l_selectedNodes?.filter((val) => val.displayed);
      //Validating Service Level
      let validationError = false;
      let validated_service_level = 50;
      if (formDataClone && formDataClone?.service_level) {
        let validatedServiceLevelData = validateUserInputServiceLevel(
          formDataClone,
          "service_level"
        );
        validated_service_level = validatedServiceLevelData[0];
        validationError = validatedServiceLevelData[1];
        formDataClone["service_level"] = validated_service_level;
      }

      selections.forEach((row) => {
        let selected = row.data;
        if (formDataClone) {
          for (const key in formDataClone) {
            if (key === "safety_stock") {
              selected[
                (isEmpty(SETALL_MAPPING)
                  ? DEFAULT_SET_ALL_MAPPING
                  : SETALL_MAPPING)[key]
              ] = formDataClone[key];
            } else {
              const mappedKey = (isEmpty(SETALL_MAPPING)
                ? DEFAULT_SET_ALL_MAPPING
                : SETALL_MAPPING)[key];
              if (mappedKey) {
                selected[mappedKey] = formData[key]
                  ? parseInt(formDataClone[key])
                  : 0;
              }
            }
          }
          selected.isEdited = true;
          editedPayloadRef.current[selected[uniqueRowId]] = selected;
        }
      });

      if (validationError) {
        displaySnackMessages(OMS_SERVICE_LEVEL_VALIDATION_ERROR, "info");
        return;
      }

      validationError = verifyMinMaxValidation(formDataClone);

      if (validationError) {
        displaySnackMessages("Please enter a valid value", "info");
        return;
      }

      if (l_selectedNodes) {
        l_selectedNodes.forEach((node) => {
          if (node.data) {
            node.data.isEdited = true;
          }
        });
        agGridInstance.api.refreshCells({
          force: true,
          suppressFlash: true,
          rowNodes: l_selectedNodes,
          columns: isEmpty(SETALL_FIELDS)
            ? ["service_level_pct", "safety_stock_method", "stock_units"]
            : SETALL_FIELDS.map(
                (field) =>
                  SETALL_MAPPING[field?.accessor] || field?.accessor || ""
              ),
        });
        agGridInstance?.api?.deselectAll(true);
      }
      setShowSetAllModal(false);
    } else {
      displaySnackMessages(
        occupiedFieldsLength
          ? OMS_SET_ALL_SAFETY_STOCK_VALIDATION_ERROR
          : OMS_SET_ALL_SAFETY_STOCK_METHOD_VALIDATION_ERROR,
        "error"
      );
    }
  };

  return (
    <Modal
      title="Set All"
      size="medium"
      height="360px"
      width="600px"
      aria-labelledby="customized-dialog-title"
      open={true}
      onClose={() => onCancel()}
      footerButtons={[
        {
          label: "Cancel",
          onClick: () => {
            onCancel();
          },
          variant: "url",
        },
        {
          label: "Apply",
          onClick: () => {
            onApply();
          },
          variant: "primary",
        },
      ]}
      primaryButtonLabel="Apply"
      onPrimaryButtonClick={() => {
        onApply();
      }}
      secondaryButtonLabel="Cancel"
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
          labelWidthSpan={2}
          defaultValues={maxValues}
          min_max_accessor={minMaxValidationMapping}
        ></Form>
      </div>
    </Modal>
  );
};

export default OrderSetAllModal;
