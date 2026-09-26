import { Button, Tooltip } from "impact-ui-v3";
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
  OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
} from "modules/oms/constants-oms/stringConstants";
import {
  SetOmsSkuSummaryApprovedRequestData,
  setOmsSkuSummaryApproveRequestSuccess,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { useState } from "react";
import { connect } from "react-redux";
import colours from "core/Styles/colours";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TextInputFieldSection from "core/commonComponents/commentbar/TextInputFieldSection";
import { makeStyles } from "@mui/styles";

const EMPTY_ORDER_QTY = "You cannot approve empty order quantity";
const EDITED_ORDER_QTY = "Save the updated Order Quantity";

const SendApprovalButton = (props) => {
  const classes = useStyles();
  const [isApproval, setIsApproval] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [comment, setComment] = useState(null);

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
        if (id.order_quantity === "") {
          flag = true;
        }
        orderIds.push(id.id);
      });
      if (!flag) {
        try {
          if (props.isRedirectedFromDifferentPage) {
            var skuFilter = JSON.parse(
              JSON.stringify(props.tableArticleFilter)
            );
            skuFilter.values = [...props.selectedOmsSku];
          }
          var sku_summary_payload = {
            filters: props.isRedirectedFromDifferentPage
              ? [...props.selectedFilters, skuFilter]
              : [...props.selectedFilters],
            meta: props.manualBodyData?.sort
              ? {
                  ...props.manualBodyData,
                }
              : {
                  ...props.tableConfigurationMetaData.meta,
                },
            isSelectAllRecords: props?.isSelectAll,
            selection: props?.selectionDataFromSetAll,
            date_filter: [props.ropDate, props.recommRecieptDate],
            is_recommended: props.isRecommended,
            include_custom_order: false,
            current_cycle_order: true,
            order_status: OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
          };
          let body = {
            sku_summary_payload,
            action: actionType,
            comment: comment !== null ? comment : "-",
            order_ids: orderIds,
          };
          let response = await props?.SetOmsSkuSummaryApprovedRequestData(body);
          if (response.data?.status) {
            if (response.data?.data?.failed.length === 0) {
              displaySnackMessages(SUCCESS_ALL_TEXT, "success");
            } else if (response.data.data?.success.length === 0) {
              if (props.ApproveOrderRequest.length == 1) {
                props.ApproveOrderRequest.forEach((id) => {
                  if (id.order_quantity === 0) {
                    return displaySnackMessages(SUCCESS_TEXT, "success");
                  }
                });
              } else {
                displaySnackMessages(FAILED_ALL_TEXT, "error");
              }
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
              // if (response.data?.data?.failed.length > 0) {
              //   let failedText = FAILED_TEXT + failedSkuIds.join(" , ");
              //   displaySnackMessages(failedText, "error");
              // }
              if (response.data?.data?.success.length > 0) {
                let successText = SUCCESS_TEXT;
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
    if (!props?.selectionDataFromSetAll) {
      if (props.selectedSkuCount === 0) {
        return displaySnackMessages("Please Select atleast one Order", "info");
      }
    }
    setIsApproval(false);
    setShowDeleteDialog(true);
  };

  const approvalRequest = () => {
    if (!props?.selectionDataFromSetAll) {
      if (props.selectedSkuCount === 0) {
        return displaySnackMessages("Please Select atleast one Order", "info");
      }
    }
    setIsApproval(true);
    setShowDeleteDialog(true);
  };

  const getConfirmMessage = () => {
    return `Are you sure you want the order of ${props.selectedSkuCount} SKU(s) ${SEND_FOR_APPROVAL}?`;
  };

  const onCancel = () => {
    setShowDeleteDialog(false);
  };

  const handleCommentInputChange = (e) => {
    setComment(e.target.value);
  };

  return (
    <>
      <div>
        {props?.orderingAccessControl?.isSendForApprovalButton?.isVisible && (
          <Button
            variant="contained"
            color="primary"
            id="sendForApprovalBtn"
            onClick={() => approvalRequest()}
            style={{ marginRight: "25px" }}
            disabled={props.isUpdateInProgress}
          >
            {props?.orderingAccessControl?.isSendForApprovalButton?.name}
          </Button>
        )}
        {props?.orderingAccessControl?.isApprovalButton?.isVisible && (
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
                {props?.orderingAccessControl?.isApprovalButton?.name}
              </Button>
            </span>
          </Tooltip>
        )}
      </div>

      {showDeleteDialog && (
        <Dialog
          onClose={() => onCancel()}
          className={classes.root}
          maxWidth={"sm"}
          aria-labelledby="customized-dialog-title"
          open={true}
          fullWidth={true}
          disableEscapeKeyDown={true}
        >
          <DialogTitle id="customized-dialog-title">
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h5" gutterBottom>
                Please add PO comment (Optional)
              </Typography>
              <IconButton
                aria-label="close"
                onClick={() => onCancel()}
                size="large"
              >
                <CloseIcon />
              </IconButton>
            </Grid>
          </DialogTitle>
          <DialogContent sx={{ pr: 2 }}>
            <textarea
              style={{ width: "100%", height: "6rem", padding: "10px" }}
              onChange={(e) => handleCommentInputChange(e)}
              placeholder="Write comment..."
              maxLength={240}
            ></textarea>
            <div style={{ textAlign: "right", marginTop: "0.6rem" }}>
              <Button
                id="submitButton"
                color="primary"
                // disabled={type=== "edit" ?  !editCommentTextInput : !comment}
                variant="contained"
                onClick={() =>
                  isApproval
                    ? confirmApproval(APPROVAL_LIST[1])
                    : confirmApproval(APPROVAL_LIST[0])
                }
              >
                Approve
              </Button>
              <Button
                id="submitButton"
                color="primary"
                // disabled={type=== "edit" ?  !editCommentTextInput : !comment}
                variant="outlined"
                style={{ marginLeft: "5px" }}
                onClick={() => onCancel()}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* <Prompt
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
      /> */}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    editOmsSkuSummaryTableDataFailed:
      store.omsReducer.orderManagementService.editOmsSkuSummaryTableDataFailed,
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderingAccessControl:
      store?.omsReducer.orderingCommonService.orderingAccessControl,
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
