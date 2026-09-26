import { Button, Tooltip } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import {
  APPROVAL_LIST,
  APPROVE_CONFIRM_MESSAGE,
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT,
  ERROR_MESSAGE,
  FAILED_ALL_TEXT,
  FAILED_TEXT,
  SAVE_VALUE_MESSAGE,
  SEND_FOR_APPROVAL,
  SUCCESS_ALL_TEXT,
  SUCCESS_TEXT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  SetOmsSkuSummaryApprovedRequestData,
  setOmsSkuSummaryApproveRequestSuccess,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import { useState } from "react";
import { connect } from "react-redux";

const EMPTY_ORDER_QTY = "You cannot approve empty order quantity";
const EDITED_ORDER_QTY = "Save the updated Order Quantity";

const SendApprovalButton = (props) => {
  const classes = useStyles();
  const [isApproval, setIsApproval] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const confirmApproval = async (actionType) => {
    if (!props.isSaveDisabled) {
      displaySnackMessages(EDITED_ORDER_QTY, "info");
      setShowDeleteDialog(false);
    } else {
      let flag = false;
      let orderIds = [];
      props.ApproveOrderRequest.forEach((id) => {
        if (id.order_quantity === "" || id.order_quantity === 0) {
          flag = true;
        }
        orderIds.push(id.id);
      });
      if (!flag) {
        try {
          let body = {
            action: actionType,
            comment: "",
            order_ids: orderIds,
          };
          let response = await props?.SetOmsSkuSummaryApprovedRequestData(body);
          if (response.data?.status) {
            if (response.data?.data?.failed.length === 0) {
              displaySnackMessages(SUCCESS_ALL_TEXT, "success");
            } else if (response.data.data?.success.length === 0) {
              displaySnackMessages(FAILED_ALL_TEXT, "error");
            } else {
              let failedSkuIds = [];
              let successSkuIds = [];
              let failedOrders = [...response.data?.data?.failed];
              let successOrders = [...response.data?.data?.success];
              props.ApproveOrderRequest.forEach((order) => {
                if (failedOrders.includes(order.id))
                  failedSkuIds.push(order.product_code);
                if (successOrders.includes(order.id))
                  successSkuIds.push(order.product_code);
              });
              if (response.data?.data?.failed.length > 0) {
                let failedText = FAILED_TEXT + failedSkuIds.join(" , ");
                displaySnackMessages(failedText, "error");
              }
              if (response.data?.data?.success.length > 0) {
                let successText = SUCCESS_TEXT + successSkuIds.join(" , ");
                displaySnackMessages(successText, "success");
              }
            }
            props.setOmsSkuSummaryApproveRequestSuccess(true);
            props?.setReloadKpi(true);
            props?.deepDive([]);
            setShowDeleteDialog(false);
          } else {
            setShowDeleteDialog(false);
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
        } catch (e) {
          setShowDeleteDialog(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      } else {
        displaySnackMessages(EMPTY_ORDER_QTY, "error");
      }
    }
  };

  const approveRequest = () => {
    if (props.selectedSkuCount === 0) {
      displaySnackMessages("Please Select atleast one Order", "info");
    }
    setIsApproval(false);
    setShowDeleteDialog(true);
  };

  const approvalRequest = () => {
    if (props.selectedSkuCount === 0) {
      displaySnackMessages("Please Select atleast one Order", "info");
    }
    setIsApproval(true);
    setShowDeleteDialog(true);
  };

  const getConfirmMessage = () => {
    return `Are you sure you want the order of ${props.selectedSkuCount} SKU(s) ${SEND_FOR_APPROVAL}?`;
  };

  return (
    <>
      <div>
        {props?.inventorysmartOmsCommonConfig?.isSendForApprovalButton
          ?.isVisible && (
          <Button
            variant="contained"
            color="primary"
            id="sendForApprovalBtn"
            onClick={() => approvalRequest()}
            style={{ marginRight: "25px" }}
            disabled={props.isUpdateInProgress}
          >
            {
              props?.inventorysmartOmsCommonConfig?.isSendForApprovalButton
                ?.name
            }
          </Button>
        )}
        {props?.inventorysmartOmsCommonConfig?.isApprovalButton?.isVisible && (
          <Tooltip title={!props.isSaveDisabled ? SAVE_VALUE_MESSAGE : ""}>
            <span>
              <Button
                variant="contained"
                className={classes.button}
                color="primary"
                id="sendForApprovalBtn"
                onClick={() => approveRequest()}
                disabled={props.isUpdateInProgress}
              >
                {props?.inventorysmartOmsCommonConfig?.isApprovalButton?.name}
              </Button>
            </span>
          </Tooltip>
        )}
      </div>

      <Prompt
        isOpen={showDeleteDialog}
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
            setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_REJECT_BTN_TEXT,
          onClick: () => setShowDeleteDialog(false),
        }}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedFilters,
    editOmsSkuSummaryTableDataFailed:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .editOmsSkuSummaryTableDataFailed,
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  SetOmsSkuSummaryApprovedRequestData: (payload) =>
    dispatch(SetOmsSkuSummaryApprovedRequestData(payload)),
  setOmsSkuSummaryApproveRequestSuccess: (payload) =>
    dispatch(setOmsSkuSummaryApproveRequestSuccess(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SendApprovalButton);
