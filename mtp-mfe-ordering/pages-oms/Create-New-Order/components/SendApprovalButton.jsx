import React, { useEffect, useState } from "react";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { Button, Modal, TextArea, Panel } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import moment from "moment";
import { cloneDeep, isEmpty } from "lodash";
import { connect } from "react-redux";
import { validateDate, validateDateRangePicker } from "../utils";
import {
  APPROVAL_LIST,
  ERROR_MESSAGE,
  EXPECTED_RECEIPT_DATE_COLUMN,
  FAILED_ALL_TEXT,
  FAILED_TEXT,
  NOT_BEFORE_AFTER_DATE_COLUMN,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  SUCCESS_ALL_TEXT,
  SUCCESS_TEXT,
  TENANT_DATE_FORMAT,
  OMS_CREATE_NEW_ORDER_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { setOmsCreateNewOrderApproveRequestData } from "modules/oms/services-oms/Create-New-Order/create-new-order-service";

const SendApprovalButton = (props) => {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [isApproval, setIsApproval] = useState(false);
  const [comment, setComment] = useState("");
  const [isSendForApprovalButton, setIsSendForApprovalButton] = useState(false);
  const [isApprovalButton, setIsApprovalButton] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const isCreateNewOrderTableGrouping =
    props?.screenConfig?.isCreateNewOrderTableGrouping;

  const globalClasses = globalStyles();
  const enabledCommentDialog = props?.screenConfig?.enabledCommentDialog;

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const displaySnackMessages = (
    message,
    variance,
    hideAllSnackMessages = true
  ) => {
    if (hideAllSnackMessages) props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const confirmApproval = async (actionType) => {
    try {
      setButtonDisabled(true);
      let ordersValid = true;
      let errorText = "";
      let selectedEditData = [];

      let selectedData = cloneDeep(props.agGridInstance.api.getSelectedNodes());

      let selections = selectedData?.filter((val) => val.displayed);

      if (isCreateNewOrderTableGrouping) {
        selections.forEach((row) => {
          if (row.data.status_obj) {
            if (row.data[EXPECTED_RECEIPT_DATE_COLUMN]) {
              row.data[EXPECTED_RECEIPT_DATE_COLUMN] = moment(
                row.data[EXPECTED_RECEIPT_DATE_COLUMN],
                DATE_FORMAT
              ).format(props?.DATE_FORMAT);
            }
            selectedEditData.push(row.data);
          }
        });
      } else {
        selections.forEach((row) => {
          selectedEditData.push(row.data);
        });
      }

      // Transform status_obj for pack enabled items
      selectedEditData = selectedEditData.map(transformStatusObjForPackEnabled);

      if (isCreateNewOrderTableGrouping) {
        selectedEditData.forEach((item) => {
          if (!item.order_quantity) {
            ordersValid = false;
            errorText = "Please provide Order Qty for the selected orders";
          }
          if (item.order_quantity) {
            if (item.hasOwnProperty(NOT_BEFORE_AFTER_DATE_COLUMN)) {
              if (!item[NOT_BEFORE_AFTER_DATE_COLUMN]) {
                ordersValid = false;
                errorText = NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE;
              } else {
                ordersValid = validateDateRangePicker(item);
                if (!ordersValid)
                  errorText = NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE;
              }
            }
            if (item.hasOwnProperty(EXPECTED_RECEIPT_DATE_COLUMN)) {
              if (!item[EXPECTED_RECEIPT_DATE_COLUMN]) {
                ordersValid = false;
                errorText = "Please provide a valid Date";
              } else {
                ordersValid = validateDate(item);
                if (!ordersValid)
                  errorText = `Please enter a date after "Order Placement Date"`;
              }
            }
          }
        });
      } else {
        selectedEditData.forEach((order) => {
          if (
            !order.hasOwnProperty(NOT_BEFORE_AFTER_DATE_COLUMN) ||
            order[NOT_BEFORE_AFTER_DATE_COLUMN] === null
          ) {
            ordersValid = false;
            errorText = NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE;
          }
          if (order.hasOwnProperty(NOT_BEFORE_AFTER_DATE_COLUMN)) {
            ordersValid = validateDateRangePicker(order);
            if (!ordersValid) errorText = NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE;
          }
          if (order.hasOwnProperty(EXPECTED_RECEIPT_DATE_COLUMN)) {
            ordersValid = validateDate(order);
            if (!ordersValid)
              errorText = `Please enter a date after "Order Placement Date"`;
          }
          if (
            !order.hasOwnProperty("order_quantity") ||
            order["order_quantity"] === ""
          ) {
            ordersValid = false;
            errorText = "Please provide Order Qty for the selected orders";
          }
        });
      }

      if (ordersValid) {
        try {
          selectedEditData = selectedEditData.map(transformDateForApproval);

          let body = {
            action: actionType,
            comment: comment !== "" ? comment : "-",
            new_orders: [...selectedEditData],
          };
          let response = await props.setOmsCreateNewOrderApproveRequestData(
            body
          );

          if (response.data.status) {
            setButtonDisabled(false);
            if (response?.data?.data?.failed?.length === 0) {
              displaySnackMessages(SUCCESS_ALL_TEXT, "success");
            } else if (response?.data?.data?.success?.length === 0) {
              displaySnackMessages(FAILED_ALL_TEXT, "error");
            } else {
              if (response?.data?.data?.failed.length > 0) {
                let orders = [];
                response.data.data?.failed?.forEach((order) => {
                  orders.push(order.uniqueRowId);
                });
                let errorText = FAILED_TEXT + orders.join(" , ");
                displaySnackMessages(errorText, "error", false);
              }

              if (response?.data?.data?.success?.length > 0) {
                let orders = [];
                response?.data?.data?.success?.forEach((order) => {
                  orders.push(order.uniqueRowId);
                });
                let successText = SUCCESS_TEXT + orders.join(" , ");
                displaySnackMessages(successText, "success", false);
              }
            }
            setShowApprovalDialog(false);
          } else {
            setShowApprovalDialog(false);
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
        } catch (e) {
          setShowApprovalDialog(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
        props.refreshTableData();
      } else {
        setButtonDisabled(false);
        setShowApprovalDialog(false);
        displaySnackMessages(errorText, "error");
      }
    } catch (error) {
      console.log("Error in confirmApproval", error);
    }
  };

  const approveRequest = () => {
    if (enabledCommentDialog) {
      setIsApproval(false);
      setShowApprovalDialog(true);
    } else {
      confirmApproval(APPROVAL_LIST[0]);
    }
  };

  const approvalRequest = () => {
    if (enabledCommentDialog) {
      setIsApproval(true);
      setShowApprovalDialog(true);
    } else {
      confirmApproval(APPROVAL_LIST[1]);
    }
  };

  const onCancel = () => {
    setShowApprovalDialog(false);
  };

  const handleCommentInputChange = (e) => {
    setComment(e.target.value);
  };

  const transformDateForApproval = (orderData) => {
    let order = cloneDeep(orderData);
    if (order[EXPECTED_RECEIPT_DATE_COLUMN]) {
      order[EXPECTED_RECEIPT_DATE_COLUMN] = moment(
        order[EXPECTED_RECEIPT_DATE_COLUMN],
        DATE_FORMAT,
        true
      ).format(TENANT_DATE_FORMAT);
    }
    order.status_obj.forEach((subRow) => {
      if (subRow[EXPECTED_RECEIPT_DATE_COLUMN]) {
        subRow[EXPECTED_RECEIPT_DATE_COLUMN] = moment(
          subRow[EXPECTED_RECEIPT_DATE_COLUMN],
          DATE_FORMAT,
          true
        ).format(TENANT_DATE_FORMAT);
      }
    });
    return {
      ...order,
    };
  };

  const transformStatusObjForPackEnabled = (orderData) => {
    if (!props?.isPackOrderingEnabled || !orderData.status_obj) {
      return orderData;
    }

    const transformedStatusObj = [];

    orderData.status_obj.forEach((statusItem) => {
      const sizeArray = statusItem.sizes || statusItem.size;

      if (
        statusItem.product_codes &&
        sizeArray &&
        Array.isArray(statusItem.product_codes) &&
        Array.isArray(sizeArray)
      ) {
        // create separate objects for each product_code and corresponding size
        statusItem.product_codes.forEach((productCode, index) => {
          const size = sizeArray[index] || sizeArray[0];

          const {
            product_codes,
            sizes,
            size: originalSize,
            ...restOfItem
          } = statusItem;

          const transformedItem = {
            ...restOfItem,
            product_code: productCode,
            size: size,
          };

          // Handle units_in_pack for order_quantity_eaches calculation
          if (
            statusItem.units_in_pack &&
            statusItem.units_in_pack.length > 0 &&
            statusItem.units_in_pack[index] !== null
          ) {
            const unitsInPack =
              statusItem.units_in_pack[index] ||
              statusItem.units_in_pack[0] ||
              1;
            transformedItem.order_quantity_eaches =
              transformedItem?.order_quantity * unitsInPack;
            transformedItem.pack_config = unitsInPack;
          } else {
            transformedItem.order_quantity_eaches =
              transformedItem?.pack_config * transformedItem?.order_quantity;
          }
          transformedStatusObj.push(transformedItem);
        });
      } else {
        transformedStatusObj.push(statusItem);
      }
    });

    return {
      ...orderData,
      status_obj: transformedStatusObj,
    };
  };

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags passed from parent
      const createNewOrderAccess = props.userAccess?.find(
        (item) => item.screen === OMS_CREATE_NEW_ORDER_SCREENNAME_KEY
      );
      if (createNewOrderAccess.hasOwnProperty("isSendForApprovalButton")) {
        setIsSendForApprovalButton(
          createNewOrderAccess.isSendForApprovalButton
        );
      } else {
        setIsSendForApprovalButton(props.screenConfig?.isSendForApprovalButton);
      }

      if (createNewOrderAccess.hasOwnProperty("isApprovalButton")) {
        setIsApprovalButton(createNewOrderAccess?.isApprovalButton);
      } else {
        setIsApprovalButton(props.screenConfig?.isApprovalButton);
      }
    } else {
      // Fall back to old access control
      if (
        props.orderingAccessControl.hasOwnProperty("isSendForApprovalButton")
      ) {
        setIsSendForApprovalButton(
          props.orderingAccessControl.isSendForApprovalButton
        );
      } else {
        setIsSendForApprovalButton(props.screenConfig?.isSendForApprovalButton);
      }
      if (props.orderingAccessControl.hasOwnProperty("isApprovalButton")) {
        setIsApprovalButton(props.orderingAccessControl.isApprovalButton);
      } else {
        setIsApprovalButton(props.screenConfig?.isApprovalButton);
      }
    }
  }, [props.userAccess, props.screenConfig, props.orderingAccessControl]);

  const getButtonLabelForCommentsPopup = () => {
    return props?.screenConfig?.isSendForApprovalButton?.isVisible
      ? props?.screenConfig?.isSendForApprovalButton?.name ||
          "Send for Approval"
      : props?.screenConfig?.isApprovalButton?.name || "Approve";
  };

  return (
    <>
      {props.renderAgGrid && (
        <>
          {isSendForApprovalButton?.isVisible && (
            <Button
              variant="primary"
              color="primary"
              id="sendForApprovalBtn"
              onClick={() => approvalRequest()}
              disabled={
                buttonDisabled || (props.selectedSkuCount === 0 ? true : false)
              }
            >
              {isSendForApprovalButton?.label || isSendForApprovalButton?.name}
            </Button>
          )}

          {isSendForApprovalButton?.isVisible &&
            isApprovalButton?.isVisible && (
              <div style={{ marginRight: "25px" }}></div>
            )}

          {isApprovalButton?.isVisible && (
            <Button
              variant="primary"
              color="primary"
              id="sendForApprovalBtn"
              onClick={() => approveRequest()}
              disabled={
                buttonDisabled || (props.selectedSkuCount === 0 ? true : false)
              }
            >
              {isApprovalButton?.label || isApprovalButton?.name}
            </Button>
          )}
        </>
      )}

      {enabledCommentDialog && showApprovalDialog && (
        <Panel
          onClose={() => onCancel()}
          title="Please add PO comment (Optional)"
          size="small"
          aria-labelledby="approval-comment-modal"
          open={true}
          // footerButtons={[
          //   {
          //     label: "Cancel",
          //     onClick: () => {
          //       onCancel();
          //     },
          //     variant: "contained",
          //   },
          //   {
          //     label: getButtonLabelForCommentsPopup(),
          //     onClick: () => {
          //       isApproval
          //         ? confirmApproval(APPROVAL_LIST[1])
          //         : confirmApproval(APPROVAL_LIST[0]);
          //     },
          //     variant: "contained",
          //   },
          // ]}
          primaryButtonLabel={getButtonLabelForCommentsPopup()}
          onPrimaryButtonClick={() => {
            isApproval
              ? confirmApproval(APPROVAL_LIST[1])
              : confirmApproval(APPROVAL_LIST[0]);
          }}
          primaryButtonProps={{
            disabled: buttonDisabled,
          }}
          secondaryButtonLabel="Cancel"
          onSecondaryButtonClick={() => {
            onCancel();
          }}
        >
          <div className={`${globalClasses.centerAlign}`}>
            <TextArea
              placeholder="Write comment..."
              characterLimit={240}
              height="80px"
              width="480px"
              defaultValue=""
              value={comment}
              onChange={(e) => handleCommentInputChange(e)}
            />
          </div>
        </Panel>
      )}
      {/* <Prompt
        isOpen={showApprovalDialog}
        title="Order Confirmation"
        subHeading={isApproval ? getConfirmMessage() : APPROVE_CONFIRM_MESSAGE}
        infoList={[]}
        primaryButtonProps={{
          children: DIALOG_CONFIRM_BTN_TEXT,
          onClick: () => {
            if (isApproval) {
              confirmApproval(APPROVAL_LIST[1]);
            } else {
              confirmApproval(APPROVAL_LIST[0]);
            }
            setShowApprovalDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_REJECT_BTN_TEXT,
          onClick: () => setShowApprovalDialog(false),
        }}
      /> */}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.create_new_order,
    moduleConfig: store.omsReducer.orderingCommonService.orderingModuleConfig,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    isPackOrderingEnabled:
      store.omsReducer.orderingCommonService.orderingPackOrderConfig
        ?.pack_ordering,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOmsCreateNewOrderApproveRequestData: (payload) =>
    dispatch(setOmsCreateNewOrderApproveRequestData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SendApprovalButton);
