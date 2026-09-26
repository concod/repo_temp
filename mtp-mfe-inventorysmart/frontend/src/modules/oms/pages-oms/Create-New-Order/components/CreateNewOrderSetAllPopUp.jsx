import Form from "core/Utils/form";
import React, { useRef, useState } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import isEmpty from "lodash/isEmpty";
import moment from "moment";
import { Panel } from "impact-ui-v3";
import {
  EMPTY_ORDER_QTY,
  UPDATED_MESSAGE,
  INVALID_DATE,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  INVALID_VALUE_MESSAGE,
  EXPECTED_RECEIPT_DATE_COLUMN,
  INVALID_ORDER_QTY,
  INVALID_RECEIPT_DATE,
  OMS_CNO_DATA_DATE_FORMAT,
  ORDER_QUANTITY_EACHES_COLUMN,
  ORDER_RETAIL_COLUMN,
  INVALID_ORDER_QTY_PACKSIZE,
  ERROR_MESSAGE,
} from "modules/oms/constants-oms/stringConstants";
import { getFinalCheckedRecords } from "../utils";

const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";
const ORDER_QUANTITY = "order_quantity";
const ORDER_COST = "order_cost";

const CreateNewOrderSetAllPopUp = ({ TENANT_DATE_FORMAT, ...props }) => {
  const [formData, setFormData] = useState({});
  const [isApplying, setIsApplying] = useState(false);
  const isApplyingRef = useRef(false);

  const IS_MIN_QTY_VALIDATION_ENABLED =
    props?.screenConfig?.is_min_qty_validation_enabled ?? true;
  const IS_MAX_QTY_VALIDATION_ENABLED =
    props?.screenConfig?.is_max_qty_validation_enabled ?? true;
  const IS_MULTIPLE_VALIDATION_ENABLED =
    props?.screenConfig?.is_multiple_validation_enabled ?? true;

  const onCancel = () => {
    setIsApplying(false);
    isApplyingRef.current = false;
    props.setShowSetAllModal(false);
  };

  const onApply = async () => {
    let shouldCloseModal = false;
    try {
      const gridApi = props.agGridInstance.api;
      let l_selectedNodes = gridApi.getSelectedNodes();

      // Remove rows that are present in uncheckedRows
      l_selectedNodes = l_selectedNodes.filter(
        (row) => !props?.uncheckedRowIds.has(row?.data?.[props?.uniqueRowId])
      );

      const checkedRowsInSelectAll = getFinalCheckedRecords(
        gridApi?.allRecordsData,
        gridApi?.checkConfiguration
      );

      const checkedRowsInSelectAllSet = new Set(checkedRowsInSelectAll);
      let selections = l_selectedNodes.filter((row) =>
        checkedRowsInSelectAllSet.has(row?.data?.[props?.uniqueRowId])
      );

      const errorStatuses = {
        order_qty: "",
        not_before_after_date: "",
        expected_receipt_date: "",
      };

      if (isEmpty(formData)) {
        displaySnackMessages("Nothing changed", "info");
        isApplyingRef.current = false;
        setIsApplying(false);
        return;
      }

      if (isApplyingRef.current) return;
      isApplyingRef.current = true;
      setIsApplying(true);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      selections.forEach((row) => {
        const selected = row.data;
        if (formData) {
          if (props.isCreateNewOrderTableGrouping) {
            if (selected.status_obj) {
              if (Number(formData?.order_qty) > 0) {
                const Qty = parseInt(formData.order_qty);

                // check if pack_prdering is enabled at client level and is_pack_enabled is true, set same quantity for all status_obj children AND CALCULATE ORDER_QUANTITY_EACHES_COLUMN
                if (props.isPackOrderingEnabled && selected.is_pack_enabled) {
                  let hasValidationError = false;
                  selected.status_obj.forEach((item) => {
                    if (Qty < parseInt(item?.min_order_quantity_sku)) {
                      hasValidationError = true;
                      errorStatuses.order_qty = INVALID_ORDER_QTY;
                    } else {
                      item[ORDER_QUANTITY] = Qty;
                      item.isEdited = true;
                      // Calculate order_quantity_eaches if pack ordering is enabled
                      const packConfig = item.pack_config || 1;
                      item[ORDER_QUANTITY_EACHES_COLUMN] = Qty * packConfig;
                      item[ORDER_COST] =
                        item.cost * item[ORDER_QUANTITY_EACHES_COLUMN];
                      item[ORDER_RETAIL_COLUMN] =
                        item.price * item[ORDER_QUANTITY_EACHES_COLUMN];
                    }
                  });

                  if (!hasValidationError) {
                    selected[ORDER_QUANTITY] = selected.status_obj.reduce(
                      (acc, val) => (acc += Number(val[ORDER_QUANTITY] || 0)),
                      0
                    );
                    selected[ORDER_COST] = selected.status_obj.reduce(
                      (acc, val) => (acc += Number(val[ORDER_COST] || 0)),
                      0
                    );
                    selected[
                      ORDER_QUANTITY_EACHES_COLUMN
                    ] = selected.status_obj.reduce(
                      (acc, val) =>
                        (acc += Number(val[ORDER_QUANTITY_EACHES_COLUMN] || 0)),
                      0
                    );
                    selected[ORDER_RETAIL_COLUMN] = selected.status_obj.reduce(
                      (acc, val) =>
                        (acc += Number(val[ORDER_RETAIL_COLUMN] || 0)),
                      0
                    );

                    selected.isEdited = true;
                  }
                } else if (
                  props.isPackOrderingEnabled &&
                  !selected.is_pack_enabled
                ) {
                  // PACK ORDERING IS ENABLED AT CLIENT LEVEL AND IS_PACK_ENABLED IS FALSE, SO SIZE DISTRIBUTION LOGIC EXIST FOR ORDER_QUANTITY AND ORDER_QUANTITY_EACHES_COLUMN WILL BE SAME AS ORDER_QUANTITY
                  let consumedQty = 0;
                  let unavailableSizes = 0;
                  selected.status_obj.forEach((item, index) => {
                    if (
                      item.size_distribution_percentage !== null &&
                      item.size_distribution_percentage !== undefined
                    ) {
                      const sizeDistributionPercent = parseFloat(
                        item.size_distribution_percentage
                      );
                      const quntityToSizeDistribution =
                        sizeDistributionPercent === 0
                          ? 0
                          : Math.floor(Qty * sizeDistributionPercent) ||
                            item?.min_order_quantity_sku;
                      consumedQty = consumedQty + quntityToSizeDistribution;
                      if (
                        quntityToSizeDistribution <
                        parseInt(item?.min_order_quantity_sku)
                      ) {
                        errorStatuses.order_qty = INVALID_ORDER_QTY;
                      } else {
                        item[ORDER_QUANTITY] = quntityToSizeDistribution;
                        const packConfig = item.pack_config || 1;
                        item.isEdited = true;
                        item[ORDER_QUANTITY_EACHES_COLUMN] =
                          item[ORDER_QUANTITY] * packConfig;
                        item[ORDER_COST] =
                          item.cost * item[ORDER_QUANTITY_EACHES_COLUMN];
                        item[ORDER_RETAIL_COLUMN] =
                          item.price * item[ORDER_QUANTITY_EACHES_COLUMN];
                      }
                    } else {
                      unavailableSizes++;
                    }
                    if (
                      !props.isPackOrderingEnabled &&
                      parseInt(Qty) % parseInt(item?.order_multiple) !== 0
                    ) {
                      errorStatuses.order_qty = INVALID_ORDER_QTY_PACKSIZE;
                    }
                  });
                  const avgSize = Math.floor(
                    (Qty - consumedQty) / unavailableSizes
                  );
                  Boolean(unavailableSizes) &&
                    selected.status_obj.forEach((item, index) => {
                      if (
                        item.size_distribution_percentage === null ||
                        item.size_distribution_percentage === undefined
                      ) {
                        const ajustedSize =
                          avgSize < item.min_order_quantity_sku
                            ? item.min_order_quantity_sku
                            : avgSize;
                        item[ORDER_QUANTITY] = ajustedSize;
                        const packConfig = item.pack_config || 1;
                        item.isEdited = true;
                        item[ORDER_QUANTITY_EACHES_COLUMN] =
                          item[ORDER_QUANTITY] * packConfig;
                        item[ORDER_COST] =
                          item.cost * item[ORDER_QUANTITY_EACHES_COLUMN];
                        item[ORDER_RETAIL_COLUMN] =
                          item.price * item[ORDER_QUANTITY_EACHES_COLUMN];
                      }
                    });
                  selected[ORDER_QUANTITY] = selected.status_obj.reduce(
                    (acc, val) => (acc += Number(val[ORDER_QUANTITY] || 0)),
                    0
                  );
                  selected[ORDER_COST] = selected.status_obj.reduce(
                    (acc, val) => (acc += Number(val[ORDER_COST] || 0)),
                    0
                  );
                  selected[
                    ORDER_QUANTITY_EACHES_COLUMN
                  ] = selected.status_obj.reduce(
                    (acc, val) =>
                      (acc += Number(val[ORDER_QUANTITY_EACHES_COLUMN] || 0)),
                    0
                  );
                  selected[ORDER_RETAIL_COLUMN] = selected.status_obj.reduce(
                    (acc, val) =>
                      (acc += Number(val[ORDER_RETAIL_COLUMN] || 0)),
                    0
                  );

                  if (!Boolean(errorStatuses.order_qty))
                    selected.isEdited = true;
                } else {
                  // Original logic for size distribution
                  let consumedQty = 0;
                  let unavailableSizes = 0;
                  selected.status_obj.forEach((item, index) => {
                    if (
                      item.size_distribution_percentage !== null &&
                      item.size_distribution_percentage !== undefined
                    ) {
                      const sizeDistributionPercent = parseFloat(
                        item.size_distribution_percentage
                      );
                      const quntityToSizeDistribution =
                        sizeDistributionPercent === 0
                          ? 0
                          : Math.floor(Qty * sizeDistributionPercent) ||
                            item?.min_order_quantity_sku;
                      consumedQty = consumedQty + quntityToSizeDistribution;

                      if (
                        IS_MIN_QTY_VALIDATION_ENABLED &&
                        quntityToSizeDistribution <
                          parseInt(item?.min_order_quantity_sku)
                      ) {
                        errorStatuses.order_qty = INVALID_ORDER_QTY;
                      } else {
                        item[ORDER_QUANTITY] = quntityToSizeDistribution;
                        item[ORDER_COST] =
                          item.cost * quntityToSizeDistribution;
                        item.isEdited = true;
                      }
                    } else {
                      unavailableSizes++;
                    }
                    if (
                      IS_MULTIPLE_VALIDATION_ENABLED &&
                      parseInt(Qty) % parseInt(item?.order_multiple) !== 0
                    ) {
                      errorStatuses.order_qty = INVALID_ORDER_QTY_PACKSIZE;
                    }
                  });
                  const avgSize = Math.floor(
                    (Qty - consumedQty) / unavailableSizes
                  );
                  Boolean(unavailableSizes) &&
                    selected.status_obj.forEach((item, index) => {
                      if (
                        item.size_distribution_percentage === null ||
                        item.size_distribution_percentage === undefined
                      ) {
                        const ajustedSize =
                          avgSize < item.min_order_quantity_sku
                            ? item.min_order_quantity_sku
                            : avgSize;
                        item[ORDER_QUANTITY] = ajustedSize;
                        item[ORDER_COST] = item.cost * ajustedSize;
                        item.isEdited = true;
                      }
                    });
                  selected[ORDER_QUANTITY] = selected.status_obj.reduce(
                    (acc, val) => (acc += Number(val[ORDER_QUANTITY] || 0)),
                    0
                  );
                  selected[ORDER_COST] = selected.status_obj.reduce(
                    (acc, val) => (acc += Number(val[ORDER_COST] || 0)),
                    0
                  );
                  if (!Boolean(errorStatuses.order_qty))
                    selected.isEdited = true;
                }
              }

              if (formData?.not_before_after_date) {
                let isValueError = false;
                let columnValue = formData?.not_before_after_date;
                let notBeforeDate = moment(columnValue[0]).format(
                  TENANT_DATE_FORMAT
                );
                let notAfterDate = moment(columnValue[1]).format(
                  TENANT_DATE_FORMAT
                );
                if (
                  notBeforeDate !== INVALID_DATE &&
                  notAfterDate !== INVALID_DATE
                ) {
                  selected.status_obj.forEach((item) => {
                    if (
                      moment(notBeforeDate).isAfter(
                        item.order_placement_date
                      ) &&
                      moment(notAfterDate).isAfter(notBeforeDate)
                    ) {
                      item[NOT_BEFORE_AFTER_DATE_COLUMN] = {
                        fiscalInfoStartDate: notBeforeDate,
                        fiscalInfoEndDate: notAfterDate,
                      };
                      item.isDateEdited = true;
                    } else {
                      isValueError = true;
                    }
                  });
                }
                if (isValueError) {
                  errorStatuses.not_before_after_date = NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE;
                }
              }

              if (formData?.expected_receipt_date) {
                let isValueError = false;
                let columnValue = formData?.expected_receipt_date;
                let dateTobeAssigned = moment(columnValue).format(
                  TENANT_DATE_FORMAT
                );
                if (columnValue !== INVALID_DATE) {
                  selected[EXPECTED_RECEIPT_DATE_COLUMN] = moment(
                    columnValue,
                    TENANT_DATE_FORMAT
                  );
                  selected.isDateEdited = true;
                  selected.status_obj.forEach((item) => {
                    if (
                      moment(dateTobeAssigned, TENANT_DATE_FORMAT).isAfter(
                        moment(
                          item.order_placement_date,
                          OMS_CNO_DATA_DATE_FORMAT
                        )
                      )
                    ) {
                      item[EXPECTED_RECEIPT_DATE_COLUMN] = dateTobeAssigned;
                      item.isDateEdited = true;
                    } else {
                      isValueError = true;
                    }
                  });
                }
                if (isValueError) {
                  errorStatuses.expected_receipt_date = INVALID_RECEIPT_DATE;
                }
              }

              if (formData?.order_reason) {
                selected.order_reason = formData.order_reason;
                selected.isEdited = true;
                selected.isOrderReasonEdited = true;
                selected.status_obj.forEach((item) => {
                  item.order_reason = formData.order_reason;
                  item.isEdited = true;
                  item.isOrderReasonEdited = true;
                });
              }

              if (formData?.ship_mode) {
                selected.ship_mode = formData.ship_mode;
                selected.isEdited = true;
                selected.isShipModeEdited = true;
                selected.status_obj.forEach((item) => {
                  item.ship_mode = formData.ship_mode;
                  item.isEdited = true;
                  item.isShipModeEdited = true;
                });
              }
            }
          } else {
            if (Number(formData?.order_qty) > 0) {
              if (
                parseInt(formData.order_qty) <
                parseInt(selected?.min_order_quantity_sku)
              ) {
                errorStatuses.order_qty = INVALID_ORDER_QTY;
              } else {
                selected[ORDER_QUANTITY] = parseInt(formData.order_qty);
                selected[ORDER_COST] =
                  selected.product_cost_price_per_unit * formData.order_qty;
                selected.isEdited = true;
              }
            }

            if (formData?.not_before_after_date) {
              let isValueError = true;
              let columnValue = formData?.not_before_after_date;
              let notBeforeDate = moment(columnValue[0]).format(
                TENANT_DATE_FORMAT
              );
              let notAfterDate = moment(columnValue[1]).format(
                TENANT_DATE_FORMAT
              );
              if (
                notBeforeDate !== INVALID_DATE &&
                notAfterDate !== INVALID_DATE
              ) {
                if (
                  moment(notBeforeDate).isAfter(
                    selected.order_placement_date
                  ) &&
                  moment(notAfterDate).isAfter(notBeforeDate)
                ) {
                  isValueError = false;
                  selected[NOT_BEFORE_AFTER_DATE_COLUMN] = {
                    fiscalInfoStartDate: notBeforeDate,
                    fiscalInfoEndDate: notAfterDate,
                  };
                  selected.isDateEdited = true;
                }
              }
              if (isValueError) {
                errorStatuses.not_before_after_date = NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE;
              }
            }

            if (formData?.expected_receipt_date) {
              let isValueError = true;
              let columnValue = formData?.expected_receipt_date;
              let dateTobeAssigned = moment(columnValue).format(
                TENANT_DATE_FORMAT
              );
              if (columnValue !== INVALID_DATE) {
                isValueError = false;
                selected[EXPECTED_RECEIPT_DATE_COLUMN] = dateTobeAssigned;
                selected.isDateEdited = true;
              }
              if (isValueError) {
                errorStatuses.expected_receipt_date = INVALID_RECEIPT_DATE;
              }
            }

            if (formData?.order_reason) {
              selected.order_reason = formData.order_reason;
              selected.isEdited = true;
              selected.isOrderReasonEdited = true;
            }

            if (formData?.ship_mode) {
              selected.ship_mode = formData.ship_mode;
              selected.isEdited = true;
              selected.isShipModeEdited = true;
            }
          }
        }
      });

      // Check if there are any validation errors
      const hasErrors = Object.values(errorStatuses).some((error) => error);

      // Display error messages if any exist
      let isError = false;
      Object.values(errorStatuses).forEach((error) => {
        if (error) {
          displaySnackMessages(error, "error");
          isError = true;
        }
      });
      if (isError) {
        return;
      }

      // Only show success message if there are no validation errors
      if (!hasErrors) {
        if (Number(formData?.order_qty) === 0) {
          displaySnackMessages(EMPTY_ORDER_QTY, "info");
        } else if (
          Number(formData?.order_qty) < 0 ||
          formData?.order_qty === ""
        ) {
          displaySnackMessages(INVALID_VALUE_MESSAGE, "info");
        } else {
          displaySnackMessages(UPDATED_MESSAGE, "success");
        }
      }
      if (l_selectedNodes && Object.keys(formData).length !== 0) {
        // Collect all modified records to synchronize across all data sources
        const changedRecords = [];

        // Convert NodeList to array and gather the modified data
        Array.from(selections).forEach((node) => {
          if (node && node.data) {
            changedRecords.push(node.data);
          }
        });

        // Call the synchronization function to update all data sources
        if (props?.agGridInstance?.synchronizeDataChanges) {
          // Determine if this is a Select All operation
          const isSelectAllOperation =
            props?.agGridInstance?.api?.isSelectAllRecords === true;

          // Pass the context to indicate whether this is from Select All
          props.agGridInstance.synchronizeDataChanges(
            changedRecords,
            isSelectAllOperation,
            props?.uncheckedRowIds
          );
        } else {
          // Fall back to just redrawing the rows
          props?.agGridInstance.api.redrawRows({ rowNodes: l_selectedNodes });
        }

        // Save the current selection state
        const wasSelectAllActive = props?.agGridInstance.api.isSelectAllRecords;

        if (wasSelectAllActive) {
          // If Select All was active, we need to maintain that state
          // Skip the deselectAll command that would clear our state
          // Instead, just visually reselect all visible rows
          setTimeout(() => {
            props?.agGridInstance.api.forEachNode((node) => {
              const isUnChecked = props?.uncheckedRowIds.has(
                node.data?.[props?.uniqueRowId]
              );
              if (node.displayed) {
                if (isUnChecked) node.setSelected(false);
                else node.setSelected(true);
              }
            });
          }, 200);
        } else {
          // For normal selection, proceed with standard deselection
          props?.agGridInstance.api.deselectAll(true);
          props?.agGridInstance.api.setCheckConfiguration([]);
        }
      }
      shouldCloseModal = true;
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      isApplyingRef.current = false;
      setIsApplying(false);
      if (shouldCloseModal) props.setShowSetAllModal(false);
    }
  };

  const handleChange = (data) => {
    setFormData(data);
  };

  const displaySnackMessages = (message, variance, autoHideDuration = 1000) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
        autoHideDuration: autoHideDuration,
      },
    });
  };

  return (
    <Panel
      onClose={() => onCancel()}
      aria-labelledby="create-new-order-set-all"
      open={true}
      disableEscapeKeyDown={true}
      title="Set All"
      width="538"
      primaryButtonLabel={isApplying ? "Applying..." : "Apply"}
      primaryButtonProps={{
        disabled: isApplying,
      }}
      onPrimaryButtonClick={() => {
        if (!isApplying) onApply();
      }}
      secondaryButtonLabel="Cancel"
      secondaryButtonProps={{
        variant: "url",
        disabled: isApplying,
      }}
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div>
        <Form
          maxFieldsInRow={2}
          layout={"vertical"}
          fields={props?.STORE_SETALL_FIELDS}
          handleChange={handleChange}
          updateDefaultValue={true}
          defaultValues={{}}
          labelWidthSpan={2}
          fieldTypeWidthSpan={2}
          noPortal={false}
          showClearDates={true}
        ></Form>
      </div>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  return {
    isPackOrderingEnabled:
      store.omsReducer.orderingCommonService.orderingPackOrderConfig
        ?.pack_ordering,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.create_new_order,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewOrderSetAllPopUp);
