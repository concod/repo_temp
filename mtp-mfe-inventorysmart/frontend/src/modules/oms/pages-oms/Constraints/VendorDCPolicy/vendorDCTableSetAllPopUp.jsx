import React from "react";
import Form from "core/Utils/form";
import { useMemo, useRef, useState } from "react";
import { isEmpty, cloneDeep } from "lodash";
import { Panel } from "impact-ui-v3";
import { FILL_MANDATORY_FIELDS } from "modules/oms/constants-oms/stringConstants";

const OrderPolicySetAllModal = ({
  SETALL_FORMDATA_FIELDS,
  setShowSetAllModal,
  rowsData,
  setAll,
  setCheckAllSetAllRequest,
  agGridInstance,
  displaySnackMessages,
  keyField,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  var orderPolicySetAllPayload = useRef([]);

  const identifierField = keyField;

  const SETALL_FIELDS = cloneDeep(SETALL_FORMDATA_FIELDS);

  const columnAccessors = SETALL_FIELDS.map((item) => item.accessor);

  const SETALL_MAPPING = columnAccessors.reduce((acc, key) => {
    acc[key] = key;
    return acc;
  }, {});

  const ORDER_CYCLE_BASED = "Order Cycle Based";
  const REORDER_POINT = "Reorder Point";

  const MANDATORY_FIELDS = SETALL_FIELDS.filter(
    (field) => field.is_mandatory === true
  ).map((field) => field.accessor);

  const STORE_SETALL_FIELDS = useMemo(() => {
    const currentOrderStrategy = formData?.order_strategy;
    const currentReplenishmentStrategy = formData?.replenishment_strategy;

    return SETALL_FIELDS.map((field) => {
      if (!Array.isArray(field.options)) return { ...field };

      const isOrderStrategyField = field.accessor === "order_strategy";
      const isReplenishmentStrategyField =
        field.accessor === "replenishment_strategy";

      const updatedOptions = field.options.map((currentOption) => {
        const option = { ...currentOption };

        if (isOrderStrategyField && currentOption.value === ORDER_CYCLE_BASED) {
          option.isDisabled = currentReplenishmentStrategy === REORDER_POINT;
        }
        if (
          isReplenishmentStrategyField &&
          currentOption.value === REORDER_POINT
        ) {
          option.isDisabled = currentOrderStrategy === ORDER_CYCLE_BASED;
        }
        return option;
      });
      return {
        ...field,
        options: updatedOptions,
      };
    });
  }, [
    SETALL_FIELDS,
    formData?.order_strategy,
    formData?.replenishment_strategy,
  ]);

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  const handleChange = (formCurrentData) => {
    let modifiedData = { ...formCurrentData };

    const newOrderStrategy = modifiedData?.order_strategy;
    const newReplenishmentStrategy = modifiedData?.replenishment_strategy;

    if (
      newOrderStrategy === ORDER_CYCLE_BASED &&
      newReplenishmentStrategy === REORDER_POINT
    ) {
      modifiedData.replenishment_strategy = undefined;
      modifiedData.order_strategy = undefined;
    }

    setFormData(modifiedData);
    if (!flagEdit) {
      setFlagEdit(true);
    }

    const currentPayload = [];
    rowsData?.forEach((val) => {
      const payloadEntry = { id: val.id };
      columnAccessors.forEach((col) => {
        payloadEntry[col] = modifiedData?.[col];
      });
      payloadEntry[identifierField] = val[identifierField];
      currentPayload.push(payloadEntry);
    });
    orderPolicySetAllPayload.current = currentPayload;
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    if (flagEdit) {
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
      let validPayload = true;
      orderPolicySetAllPayload.current.map((val) => {
        MANDATORY_FIELDS.forEach((field) => {
          if (val[field] === undefined) {
            validPayload = false;
          }
        });
      });
      if (!validPayload) {
        displaySnackMessages(FILL_MANDATORY_FIELDS, "error");
      } else {
        let response = setAll(orderPolicySetAllPayload.current, data);
        if (response) {
          setShowSetAllModal(false);
          orderPolicySetAllPayload.current = [];
        }
      }
    } else {
      displaySnackMessages(FILL_MANDATORY_FIELDS, "error");
    }
  };

  return (
    <Panel
      onClose={() => onCancel()}
      aria-labelledby="vendor-dc-set-all"
      open={true}
      disableEscapeKeyDown={true}
      title="Set All"
      size="medium"
      height="400px"
      width="540"
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
          maxFieldsInRow={2}
          layout={"vertical"}
          handleChange={handleChange}
          fields={STORE_SETALL_FIELDS}
          updateDefaultValue={true}
          defaultValues={{}}
        ></Form>
      </div>
    </Panel>
  );
};

export default OrderPolicySetAllModal;
