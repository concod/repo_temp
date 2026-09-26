import { Button, Grid } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
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
  INVALID_DATE,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  SEND_FOR_APPROVAL,
  SUCCESS_ALL_TEXT,
  SUCCESS_TEXT,
  TENANT_DATE_FORMAT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { setOmsCreateNewOrderApproveRequestData } from "modules/inventorysmart/services-inventorysmart/Create-New-Order/create-new-order-service";
import { SetOmsSkuSummaryApprovedRequestData } from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import { useState } from "react";
import { connect } from "react-redux";
import moment from "moment";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const ORDER_PLACEMENT_DATE_COLUMN = "order_placement_date";
const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";

const SendApprovalButton = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [isApproval, setIsApproval] = useState(false);
  const [comment, setComment] = useState(null);

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

  const validateDateRangePicker = (order) => {
    let isValueValid = true;
    let columnValue = order?.[NOT_BEFORE_AFTER_DATE_COLUMN];
    let notBeforeDate = moment(columnValue.fiscalInfoStartDate).format(
      TENANT_DATE_FORMAT
    );
    let notAfterDate = moment(columnValue.fiscalInfoEndDate).format(
      TENANT_DATE_FORMAT
    );
    let orderPlacementDate = moment(
      order?.[ORDER_PLACEMENT_DATE_COLUMN]
    ).format(TENANT_DATE_FORMAT);

    //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
    //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

    if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
      if (
        moment(notBeforeDate).isAfter(orderPlacementDate) &&
        moment(notAfterDate).isAfter(orderPlacementDate)
      ) {
        isValueValid = true;
      } else {
        isValueValid = false;
      }
    }
    return isValueValid;
  };

  const confirmApproval = async (actionType) => {
    let ordersValid = true;
    let errorText = "";
    let selectedEditData = [];

    let selectedData = props.agGridInstance.api.getSelectedNodes();
    let selections = selectedData?.filter((val) => val.displayed);
    selections.forEach((row) => {
      selectedEditData.push(row.data);
    });

    selectedEditData.map((order) => {
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
      if (
        !order.hasOwnProperty("order_quantity") ||
        order["order_quantity"] === ""
      ) {
        ordersValid = false;
        errorText = "Please provide Order Qty for the selected orders";
      }
    });

    if (ordersValid) {
      selectedEditData.map((order) => {
        let notBeforeAfterDate = order[NOT_BEFORE_AFTER_DATE_COLUMN];
        order.not_before_date = notBeforeAfterDate.fiscalInfoStartDate;
        order.not_after_date = notBeforeAfterDate.fiscalInfoEndDate;
      });

      try {
        let body = {
          action: actionType,
          comment: comment !== null ? comment : "-",
          new_orders: [...selectedEditData],
        };
        let response = await props.setOmsCreateNewOrderApproveRequestData(body);

        if (response.data.status) {
          if (response.data.data?.failed.length === 0) {
            displaySnackMessages(SUCCESS_ALL_TEXT, "success");
          } else if (response.data.data?.success.length === 0) {
            if(selectedEditData.length==1)
            {
              selectedEditData.map((id) => {
                if (id.order_quantity === 0) {
                  return  displaySnackMessages(SUCCESS_TEXT, "success");
                }
              
              });
            }
            else{
            displaySnackMessages(FAILED_ALL_TEXT, "error");
            }
          } else {
            // if (response.data.data?.failed.length > 0) {
            //   let orders = [];
            //   response.data.data?.failed.forEach((order) => {
            //     orders.push(order.product_code);
            //   });
            //   let errorText = FAILED_TEXT + orders.join(" , ");
            //   displaySnackMessages(errorText, "error", false);
            // }
            if (response.data.data?.success.length > 0) {
              let orders = [];
              response.data.data?.success.forEach((order) => {
                orders.push(order.product_code);
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
      setShowApprovalDialog(false);
      displaySnackMessages(errorText, "error");
    }
  };

  const approveRequest = () => {
    setIsApproval(false);
    setShowApprovalDialog(true);
  };
  const approvalRequest = () => {
    setIsApproval(true);
    setShowApprovalDialog(true);
  };

  const getConfirmMessage = () => {
    return `Are you sure you want the order of ${props.selectedSkuCount} SKU(s) ${SEND_FOR_APPROVAL}?`;
  };

  const onCancel = () => {
    setShowApprovalDialog(false);
  };

  const handleCommentInputChange = (e) => {
    setComment(e.target.value);
  };

  return (
    <>
      <Grid
        container
        className={globalClasses.marginVertical1rem}
        justifyContent="center"
      >
        {props.renderAgGrid && (
          <>
            {props?.inventorysmartOmsCommonConfig?.isSendForApprovalButton
              ?.isVisible && (
              <Button
                variant="contained"
                color="primary"
                id="sendForApprovalBtn"
                onClick={() => approvalRequest()}
                disabled={props.selectedSkuCount === 0 ? true : false}
              >
                {
                  props?.inventorysmartOmsCommonConfig?.isSendForApprovalButton
                    ?.name
                }
              </Button>
            )}

            {props?.inventorysmartOmsCommonConfig?.isSendForApprovalButton
              ?.isVisible &&
              props?.inventorysmartOmsCommonConfig?.isApprovalButton
                ?.isVisible && <div style={{ marginRight: "25px" }}></div>}

            {props?.inventorysmartOmsCommonConfig?.isApprovalButton
              ?.isVisible && (
              <Button
                variant="contained"
                color="primary"
                id="sendForApprovalBtn"
                onClick={() => approveRequest()}
                disabled={props.selectedSkuCount === 0 ? true : false}
              >
                {props?.inventorysmartOmsCommonConfig?.isApprovalButton?.name}
              </Button>
            )}
          </>
        )}
      </Grid>

      {showApprovalDialog && (
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
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOmsCreateNewOrderApproveRequestData: (payload) =>
    dispatch(setOmsCreateNewOrderApproveRequestData(payload)),
  SetOmsSkuSummaryApprovedRequestData: (payload) =>
    dispatch(SetOmsSkuSummaryApprovedRequestData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SendApprovalButton);
