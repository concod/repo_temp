import Form from "core/Utils/form";
import { useMemo, useState, useRef } from "react";
import {
  CONSTRAINTS_OMS_SCREENNAME_KEYS,
  FILL_MANDATORY_FIELDS,
  INVALID_VALUE_MESSAGE,
  NO_UPDATE,
} from "modules/oms/constants-oms/stringConstants";
import { isEmpty, isNil } from "lodash";
import { Modal } from "impact-ui-v3";
import { validateShipmentConstraintsForm } from "./utils/validationUtils.js";
import { Panel } from "impact-ui-v3";

const LEAD_TIME_SETALL_MAPPING = {
  orderProcessing: "po_to_order_processing",
  leadTime: "lead_time",
  manufacturing_lead_time: "manufacturing_lead_time",
  shipping_lead_time: "shipping_lead_time",
};

const SHIPMENT_SETALL_MAPPING = {
  min_replenishment_quantity: "min_replenishment_quantity",
  max_replenishment_quantity: "max_replenishment_quantity",
  order_multiple: "order_multiple",
};

const QC_SETALL_MAPPING = {
  qcTime: "qc_time",
};

const STATUS_MAPPING = {
  status: "status",
};

const OrderSetAllModal = ({
  setShowSetAllModal,
  feildsData,
  screenName,
  rowsData,
  setAll,
  setCheckAllSetAllRequest,
  agGridInstance,
  displaySnackMessages,
  maxFields,
  PRIMARY_KEY,
  isStore = false,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [hasRangeConflict, setHasRangeConflict] = useState(false);

  var statusSetAllPayload = useRef([]);
  var leadTimeSetAllPayload = useRef([]);
  var QcTimeSetAllPayload = useRef([]);
  var orderingSetAllPayload = useRef([]);
  var shipmentSetAllPayload = useRef([]);
  const STORE_SETALL_FIELDS = useMemo(() => feildsData, [formData.demand_type]);

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  // Helper function to get the correct location field
  const getLocationField = (val) => {
    if (isStore) {
      return { store_code: val.store_code || "" };
    } else {
      return { loc_code: val.loc_code || "" };
    }
  };
  const getLeadTimeInDays = (value) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return undefined;
    }
    return Math.round(numericValue * 7);
  };

  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }

    if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.LeadTime) {
      rowsData.filter((val) => {
        let flag = false;
        leadTimeSetAllPayload.current.filter((node) => {
          if (val[PRIMARY_KEY] === node[PRIMARY_KEY]) {
            node.po_to_order_processing =
              data?.po_to_order_processing < 0 ? 0 : data?.orderProcessing;
            node.lead_time = getLeadTimeInDays(data?.leadTime);
            if (data?.manufacturing_lead_time) {
              node.manufacturing_lead_time = Math.round(
                data?.manufacturing_lead_time
              );
            }
            if (data?.shipping_lead_time) {
              node.shipping_lead_time = Math.round(data?.shipping_lead_time);
            }
            flag = true;
          }
        });
        if (!flag) {
          if (data?.po_to_order_processing) {
            leadTimeSetAllPayload.current.push({
              article: val.article,
              vendor_code: val.vendor_code || "",
              ...getLocationField(val), // Use helper function
              ...(val.mode_shipment
                ? { mode_shipment: val.mode_shipment }
                : {}),
              po_to_order_processing:
                data?.orderProcessing < 0 ? 0 : data?.orderProcessing,
            });
          } else if (data?.manufacturing_lead_time) {
            leadTimeSetAllPayload.current.push({
              article: val.article,
              vendor_code: val.vendor_code || "",
              ...getLocationField(val), // Use helper function
              ...(val.mode_shipment
                ? { mode_shipment: val.mode_shipment }
                : {}),
              manufacturing_lead_time: Math.round(
                data?.manufacturing_lead_time
              ),
              shipping_lead_time: val.shipping_lead_time,
              [PRIMARY_KEY]: val?.[PRIMARY_KEY],
            });
          } else if (data?.shipping_lead_time) {
            leadTimeSetAllPayload.current.push({
              article: val.article,
              vendor_code: val.vendor_code || "",
              ...getLocationField(val), // Use helper function
              ...(val.mode_shipment
                ? { mode_shipment: val.mode_shipment }
                : {}),
              shipping_lead_time: Math.round(data?.shipping_lead_time),
              manufacturing_lead_time: val.manufacturing_lead_time,
              [PRIMARY_KEY]: val?.[PRIMARY_KEY],
            });
          } else {
            leadTimeSetAllPayload.current.push({
              article: val.article,
              vendor_code: val.vendor_code || "",
              ...getLocationField(val), // Use helper function
              ...(val.mode_shipment
                ? { mode_shipment: val.mode_shipment }
                : {}),
              lead_time: getLeadTimeInDays(data?.leadTime),
              id: val?.id,
            });
          }
        }
      });
    }

    if (screenName === "Inventorysmart Constraints") {
      const minVal = Number(data.min_replenishment_quantity);
      const maxVal = Number(data.max_replenishment_quantity);
      let hasConflicts = false;
      setHasRangeConflict(false);
      rowsData.forEach((val) => {
        let flag = false;
        shipmentSetAllPayload.current.forEach((node) => {
          if (val.shipment_id == node.id) {
            if (data.order_multiple) {
              node.order_multiple = data.order_multiple;
              flag = true;
            }
            if (data.moq_tolerance) {
              node.moq_tolerance = data.moq_tolerance;
              flag = true;
            }
            if (minVal && maxVal && minVal > maxVal) {
              node.min_replenishment_quantity = 0;
              node.max_replenishment_quantity = 0;
              hasConflicts = true;
              setHasRangeConflict(true);
              return;
            } else if (minVal && maxVal && minVal <= maxVal) {
              node.min_replenishment_quantity = data.min_replenishment_quantity;
              node.max_replenishment_quantity = data.max_replenishment_quantity;
              flag = true;
            } else if (minVal && !maxVal) {
              node.min_replenishment_quantity = data.min_replenishment_quantity;
              flag = true;
            } else if (!minVal && maxVal) {
              node.max_replenishment_quantity = data.max_replenishment_quantity;
              flag = true;
            }
          }
        });
        if (!flag && !hasConflicts) {
          if (data?.min_replenishment_quantity) {
            shipmentSetAllPayload.current.push({
              min_replenishment_quantity: data?.min_replenishment_quantity,
              max_replenishment_quantity: val.max_replenishment_quantity,
              order_multiple: data.order_multiple,
              moq_tolerance: data.moq_tolerance,
              id: val?.shipment_id,
            });
          } else if (data?.max_replenishment_quantity) {
            shipmentSetAllPayload.current.push({
              min_replenishment_quantity: val.min_replenishment_quantity,
              max_replenishment_quantity: data.max_replenishment_quantity,
              order_multiple: data.order_multiple,
              moq_tolerance: data.moq_tolerance,
              id: val?.shipment_id,
            });
          } else {
            shipmentSetAllPayload.current.push({
              min_replenishment_quantity: val.min_replenishment_quantity,
              max_replenishment_quantity: val.max_replenishment_quantity,
              order_multiple: data.order_multiple,
              moq_tolerance: data.moq_tolerance,
              id: val?.shipment_id,
            });
          }
        }
      });
    }

    if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.QcTime) {
      rowsData.filter((val) => {
        let flag = false;
        QcTimeSetAllPayload.current.filter((node) => {
          if (
            val.product_code === node.product_code &&
            val.fiscal_year_month === node.fiscal_year_month &&
            val.fical_year_week === node.fical_year_week
          ) {
            node.qc_time = data?.qcTime;
            flag = true;
          }
        });
        if (!flag) {
          QcTimeSetAllPayload.current.push({
            product_code: val.product_code,
            fiscal_year_month: val.fiscal_year_month,
            fical_year_week: val.fical_year_week,
            ...getLocationField(val),
            qc_time: data?.qcTime,
          });
        }
      });
    }

    if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.Ordering) {
      rowsData.filter((row) => {
        let flag = false;
        orderingSetAllPayload.current.filter((node) => {
          if (row.product_code == node.product_code) {
            node.min_order_quantity = parseInt(data?.min_order_quantity);
            node.max_order_quantity = parseInt(data?.max_order_quantity);
            flag = true;
          }
        });
        if (!flag) {
          orderingSetAllPayload.current.push({
            product_code: row.product_code,
            vendor_code: row.vendor_code,
            min_order_quantity: parseInt(data?.min_order_quantity),
            max_order_quantity: parseInt(data?.max_order_quantity),
          });
        }
      });
    }

    if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.Status) {
      rowsData.filter((val) => {
        let flag = false;
        statusSetAllPayload.current.filter((node) => {
          if (val[PRIMARY_KEY] === node[PRIMARY_KEY]) {
            node.status = data?.status;
            flag = true;
          }
        });
        if (!flag) {
          const statusObject = {
            vendor_code: val.vendor_code,
            ...getLocationField(val), // Use helper function
            status: data?.status,
          };
          statusObject[PRIMARY_KEY] = val[PRIMARY_KEY];
          statusSetAllPayload.current.push(statusObject);
        }
      });
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const checkAllSetAllConfiguration = (formData, SETALL_MAPPING) => {
    let l_checkAllSetAllRequest = {
      searchColumns: agGridInstance.api.getFilterModel(),
      ...getcheckAllSetAllReq(formData, SETALL_MAPPING),
    };

    const hasLeadTimeValue =
      Object.prototype.hasOwnProperty.call(
        l_checkAllSetAllRequest,
        "lead_time"
      ) &&
      (l_checkAllSetAllRequest.lead_time ||
        l_checkAllSetAllRequest.lead_time === 0);

    if (
      screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.LeadTime &&
      hasLeadTimeValue
    ) {
      const numericValue = Number(l_checkAllSetAllRequest.lead_time);
      if (!Number.isNaN(numericValue)) {
        l_checkAllSetAllRequest.lead_time = Math.round(numericValue * 7);
      }
    }

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
    return data;
  };

  const checkMandatoryFields = () => {
    let isValid = false;
    isValid = STORE_SETALL_FIELDS.every((field) => {
      if (field.required) {
        switch (field.value_type) {
          case "number":
            if (field.no_negative_values) {
              return (
                !isNil(formData[field.accessor]) &&
                formData[field.accessor] >= 0
              );
            } else {
              return !isNil(formData[field.accessor]);
            }
          case "string":
            return (
              !isNil(formData[field.accessor]) &&
              Boolean(formData[field.accessor].trim().length)
            );
        }
      } else return true;
    });
    return isValid;
  };

  const onApply = async () => {
    if (flagEdit) {
      if (screenName == CONSTRAINTS_OMS_SCREENNAME_KEYS.LeadTime) {
        let data = checkAllSetAllConfiguration(
          formData,
          LEAD_TIME_SETALL_MAPPING
        );
        leadTimeSetAllPayload.current?.map((data) => {
          delete data.id;
        });
        let response = setAll(leadTimeSetAllPayload.current, data);
        if (response) {
          setShowSetAllModal(false);
          leadTimeSetAllPayload.current = [];
        }
      }

      if (screenName === "Inventorysmart Constraints") {
        // Dynamic validation using feildsData (includes required field checks)
        if (
          !validateShipmentConstraintsForm(
            formData,
            feildsData,
            displaySnackMessages
          )
        ) {
          return;
        }
        if (hasRangeConflict) {
          displaySnackMessages(
            "Please resolved conflicts, minimun value cannot be greater than maximum value.",
            "error"
          );
          return;
        }
        let data = checkAllSetAllConfiguration(
          formData,
          SHIPMENT_SETALL_MAPPING
        );
        let response = setAll(shipmentSetAllPayload.current, data);
        if (response) {
          setShowSetAllModal(false);
          shipmentSetAllPayload.current = [];
        }
      }

      if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.QcTime) {
        let data = checkAllSetAllConfiguration(formData, QC_SETALL_MAPPING);
        let isValuesValid = true;
        QcTimeSetAllPayload.current.forEach((row) => {
          if (
            row.qc_time === "" ||
            row.qc_time === null ||
            Number.isNaN(parseInt(row.qc_time))
          ) {
            isValuesValid = false;
          }
        });
        if (!isValuesValid) {
          displaySnackMessages(INVALID_VALUE_MESSAGE, "info");
          return;
        }
        let response = setAll(QcTimeSetAllPayload.current, data);
        if (response) {
          setShowSetAllModal(false);
          QcTimeSetAllPayload.current = [];
        }
      }

      if (screenName == CONSTRAINTS_OMS_SCREENNAME_KEYS.Ordering) {
        let response = setAll(orderingSetAllPayload.current);
        if (response) {
          setShowSetAllModal(false);
          orderingSetAllPayload.current = [];
        }
      }

      if (screenName == CONSTRAINTS_OMS_SCREENNAME_KEYS.Status) {
        let data = checkAllSetAllConfiguration(formData, STATUS_MAPPING);
        let response = setAll(statusSetAllPayload.current, data);
        if (response) {
          setShowSetAllModal(false);
          statusSetAllPayload.current = [];
        }
      }
    } else {
      displaySnackMessages(NO_UPDATE, "info");
    }
  };

  return (
    <Panel
      onClose={() => onCancel()}
      size="medium"
      width="600"
      title="Set All"
      aria-labelledby="constraints-oms-set-all"
      open={true}
      disableEscapeKeyDown={true}
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
          maxFieldsInRow={
            maxFields
              ? maxFields
              : screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.Status
              ? 3
              : 2
          }
          spacing={3}
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

export default OrderSetAllModal;
