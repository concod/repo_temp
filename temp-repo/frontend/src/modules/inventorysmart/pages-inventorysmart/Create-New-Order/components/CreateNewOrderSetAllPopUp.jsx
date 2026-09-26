import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Form from "core/Utils/form";
import { useMemo, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import {
  EMPTY_ORDER_QTY,
  INVALID_DATE,
  TENANT_DATE_FORMAT,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import moment from "moment";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
      maxHeight: "80vh",
    },
  },
}));

const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";
const ORDER_QUANTITY = "order_quantity";
const ORDER_COST = "order_cost";

const CreateNewOrderSetAllPopUp = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [formData, setFormData] = useState({});

  const STORE_SETALL_FIELDS = useMemo(
    () => [
      {
        label: "Order Qty",
        accessor: "order_qty",
        field_type: "IntegerField",
        value_type: "number",
      },
      {
        label: "DC Not Before - DC Not After Date",
        accessor: "not_before_after_date",
        field_type: "rangePicker",
        value_type: "number",
      },
    ],
    [formData.create_new_order]
  );

  const onCancel = () => {
    props.setShowSetAllModal(false);
  };

  const onApply = async () => {
    let l_selectedNodes = props.agGridInstance.api.getSelectedNodes();
    let selections = l_selectedNodes?.filter((val) => val.displayed);
    selections.forEach((row) => {
      const selected = row.data;

      if (formData) {
        if (formData?.order_qty > 0) {
          selected[ORDER_QUANTITY] = parseInt(formData.order_qty);
          selected[ORDER_COST] =
            selected.product_cost_price_per_unit * formData.order_qty;
        }

        if (formData?.not_before_after_date) {
          let isValueError = true;
          let columnValue = formData?.not_before_after_date;
          let notBeforeDate = moment(columnValue[0]).format(TENANT_DATE_FORMAT);
          let notAfterDate = moment(columnValue[1]).format(TENANT_DATE_FORMAT);
          if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
            if (
              moment(notBeforeDate).isAfter(selected.order_placement_date) &&
              moment(notAfterDate).isAfter(notBeforeDate)
            ) {
              isValueError = false;
              selected[NOT_BEFORE_AFTER_DATE_COLUMN] = {
                fiscalInfoStartDate: notBeforeDate,
                fiscalInfoEndDate: notAfterDate,
              };
            }
          }
          if (isValueError) {
            displaySnackMessages(NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE, "error");
          }
        }
      }
    });

    if (formData?.order_qty <= 0 || formData?.order_qty === "") {
      displaySnackMessages(EMPTY_ORDER_QTY, "error");
    }

    if (l_selectedNodes) {
      props.agGridInstance.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: l_selectedNodes,
        columns: [ORDER_QUANTITY, ORDER_COST, NOT_BEFORE_AFTER_DATE_COLUMN],
      });
    }

    props.setShowSetAllModal(false);
  };

  const handleChange = (data) => {
    setFormData(data);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className={classes.root}
      maxWidth={"md"}
      fullWidth={true}
      aria-labelledby="customized-dialog-title"
      open={true}
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
            Set All
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => props.setShowSetAllModal(false)}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div className={globalClasses.paddingAround}>
          <Form
            maxFieldsInRow={2}
            layout={"vertical"}
            fields={STORE_SETALL_FIELDS}
            handleChange={handleChange}
            updateDefaultValue={true}
            defaultValues={{}}
            labelWidthSpan={2}
            fieldTypeWidthSpan={2}
            noPortal={false}
          ></Form>
        </div>
      </DialogContent>
      <DialogActions>
        <div className={globalClasses.paddingAround}>
          <Button
            onClick={() => {
              onCancel();
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onApply}
            className={globalClasses.marginLeft1rem}
          >
            Apply
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewOrderSetAllPopUp);
