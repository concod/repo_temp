import Form from "core/Utils/form";
import React, { useMemo, useState, useRef } from "react";
import {
  CONSTRAINTS_OMS_SCREENNAME_KEYS,
  FILL_MANDATORY_FIELDS,
  INVALID_VALUE_MESSAGE,
  NO_UPDATE,
} from "modules/oms/constants-oms/stringConstants";
import { isEmpty, isNil } from "lodash";
import { Panel } from "impact-ui-v3";
import { validateShipmentConstraintsForm } from "./utils/validationUtils.js";
import { useSelector } from "react-redux";

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
  isMaxReplishmentValueIsZero = false,
  updateIdField = "shipment_id",
  updateScopeColumns = null,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [hasRangeConflict, setHasRangeConflict] = useState(false);

  var statusSetAllPayload = useRef([]);
  var leadTimeSetAllPayload = useRef([]);
  var QcTimeSetAllPayload = useRef([]);
  var orderingSetAllPayload = useRef([]);
  var shipmentSetAllPayload = useRef([]);

  // Filter out any metric with enabled=false from the Shipment Set All popup
  const STORE_SETALL_FIELDS = useMemo(() => {
    if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.Shipment) {
      return feildsData.filter((field) => field.enabled !== false);
    }
    return feildsData;
  }, [feildsData, screenName]);

  const IS_WEEK_CALCULATION_ENABLED = useSelector(
    (store) =>
      store?.omsReducer?.orderingCommonService?.orderingScreensConfig
        ?.constraints?.lead_time?.is_week_calculation_enabled || false
  );

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
            if (data?.orderProcessing !== undefined && data?.orderProcessing !== "" && data?.orderProcessing !== null) {
              node.po_to_order_processing = Math.max(
                0,
                Number(data.orderProcessing) || 0
              );
            }
            node.lead_time = IS_WEEK_CALCULATION_ENABLED
              ? getLeadTimeInDays(data?.leadTime)
              : Math.round(data?.leadTime);
            if (data?.manufacturing_lead_time) {
              node.manufacturing_lead_time = IS_WEEK_CALCULATION_ENABLED
                ? getLeadTimeInDays(data?.manufacturing_lead_time)
                : Math.round(data?.manufacturing_lead_time);
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
              po_to_order_processing: Math.max(
                0,
                Number(data?.orderProcessing) || 0
              ),
            });
          } else if (data?.manufacturing_lead_time) {
            leadTimeSetAllPayload.current.push({
              article: val.article,
              vendor_code: val.vendor_code || "",
              ...getLocationField(val), // Use helper function
              ...(val.mode_shipment
                ? { mode_shipment: val.mode_shipment }
                : {}),
              manufacturing_lead_time: IS_WEEK_CALCULATION_ENABLED
                ? getLeadTimeInDays(data?.manufacturing_lead_time)
                : Math.round(data?.manufacturing_lead_time),
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
              lead_time: IS_WEEK_CALCULATION_ENABLED
                ? getLeadTimeInDays(data?.leadTime)
                : Math.round(data?.leadTime),
              ...(IS_WEEK_CALCULATION_ENABLED
                ? { id: val?.id }
                : { [PRIMARY_KEY]: val?.[PRIMARY_KEY] }),
            });
          }
        }
      });
    }

    if (screenName === "Inventorysmart Constraints" || screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.Shipment) {
      // Use new logic (allowing 0 values) only when isMaxReplishmentValueIsZero is true
      let hasMinVal, hasMaxVal, minVal, maxVal;
      
      if (isMaxReplishmentValueIsZero) {
        // New logic: Allow 0 values for min and max
        hasMinVal = data.min_replenishment_quantity !== null && data.min_replenishment_quantity !== undefined && data.min_replenishment_quantity !== '';
        hasMaxVal = data.max_replenishment_quantity !== null && data.max_replenishment_quantity !== undefined && data.max_replenishment_quantity !== '';
        minVal = hasMinVal ? Number(data.min_replenishment_quantity) : null;
        maxVal = hasMaxVal ? Number(data.max_replenishment_quantity) : null;
      } else {
        // Original logic: Treat 0 as falsy (no value)
        minVal = Number(data.min_replenishment_quantity);
        maxVal = Number(data.max_replenishment_quantity);
        hasMinVal = !!minVal;
        hasMaxVal = !!maxVal;
      }
      
      let hasConflicts = false;
      setHasRangeConflict(false);
      rowsData.forEach((val) => {
        // Use unique_row_id when available (article-level view); fall back to
        // shipment_id for legacy per-row views.
        const rowKey = val?.unique_row_id ?? val?.shipment_id;

        let flag = false;
        shipmentSetAllPayload.current.forEach((node) => {
          if (rowKey == node.rowKey) {
            if (data.order_multiple) {
              node.order_multiple = data.order_multiple;
              flag = true;
            }
            if (data.moq_tolerance) {
              node.moq_tolerance = data.moq_tolerance;
              flag = true;
            }
            if (hasMinVal && hasMaxVal && minVal > maxVal) {
              node.min_replenishment_quantity = 0;
              node.max_replenishment_quantity = 0;
              hasConflicts = true;
              setHasRangeConflict(true);
              return;
            } else if (hasMinVal && hasMaxVal && minVal <= maxVal) {
              node.min_replenishment_quantity = data.min_replenishment_quantity;
              node.max_replenishment_quantity = data.max_replenishment_quantity;
              flag = true;
            } else if (hasMinVal && !hasMaxVal) {
              node.min_replenishment_quantity = data.min_replenishment_quantity;
              flag = true;
            } else if (!hasMinVal && hasMaxVal) {
              node.max_replenishment_quantity = data.max_replenishment_quantity;
              flag = true;
            }
          }
        });
        if (!flag && !hasConflicts) {
          // baseEntry carries the row identity so that index.jsx can build
          // the constraint and row_update payloads for any client config:
          //   - scope-column clients: all updateScopeColumns values are spread
          //     (e.g. {article: "ART001"} or {article: "ART001", loc_code: "DC01"})
          //   - legacy clients (no updateScopeColumns): the PK field is included
          //     via updateIdField (defaults to "shipment_id")
          const scopeColumnValues =
            updateScopeColumns?.length
              ? Object.fromEntries(
                  updateScopeColumns
                    .filter((col) => val?.[col] !== undefined)
                    .map((col) => [col, val[col]])
                )
              : {};
          const baseEntry = {
            rowKey,
            order_multiple: data.order_multiple,
            moq_tolerance: data.moq_tolerance,
            ...(updateScopeColumns?.length
              ? scopeColumnValues
              : val?.[updateIdField] !== undefined
              ? { id: val[updateIdField] }
              : {}),
          };
          if (hasMinVal) {
            shipmentSetAllPayload.current.push({
              ...baseEntry,
              min_replenishment_quantity: data?.min_replenishment_quantity,
              max_replenishment_quantity: val.max_replenishment_quantity,
            });
          } else if (hasMaxVal) {
            shipmentSetAllPayload.current.push({
              ...baseEntry,
              min_replenishment_quantity: val.min_replenishment_quantity,
              max_replenishment_quantity: data.max_replenishment_quantity,
            });
          } else {
            shipmentSetAllPayload.current.push({
              ...baseEntry,
              min_replenishment_quantity: val.min_replenishment_quantity,
              max_replenishment_quantity: val.max_replenishment_quantity,
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
    if (IS_WEEK_CALCULATION_ENABLED) {
      // Convert lead_time fields from weeks to days
      ["lead_time", "manufacturing_lead_time"].forEach((field) => {
        const hasValue =
          Object.prototype.hasOwnProperty.call(
            l_checkAllSetAllRequest,
            field
          ) &&
          (l_checkAllSetAllRequest[field] ||
            l_checkAllSetAllRequest[field] === 0);

        if (
          screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.LeadTime &&
          hasValue
        ) {
          const numericValue = Number(l_checkAllSetAllRequest[field]);
          if (!Number.isNaN(numericValue)) {
            l_checkAllSetAllRequest[field] = Math.round(numericValue * 7);
          }
        }
      });
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
          default:
            return false;
        }
      } else return true;
    });
    return isValid;
  };

  const onApply = async () => {
    if (flagEdit) {
      if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.LeadTime) {
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

      if (
        screenName === "Inventorysmart Constraints" ||
        screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.Shipment
      ) {
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

        // Check if MOQ validation is enabled
        const moqField = feildsData.find((f) => f.accessor === "moq_tolerance");
        const isMoqEnabled = moqField?.enabled !== false;

        // Create dynamic mapping based on MOQ validation flag
        const dynamicMapping = {
          ...SHIPMENT_SETALL_MAPPING,
          ...(isMoqEnabled && { moq_tolerance: "moq_tolerance" }),
        };

        let data = checkAllSetAllConfiguration(formData, dynamicMapping);
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
      height="360px"
      width="600px"
      title="Set All"
      aria-labelledby="constraints-oms-set-all"
      open={true}
      disableEscapeKeyDown={true}
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
