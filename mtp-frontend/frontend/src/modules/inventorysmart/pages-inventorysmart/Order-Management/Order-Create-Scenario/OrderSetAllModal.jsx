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
import { useMemo, useRef, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { OMS_SERVICE_LEVEL_VALIDATION_ERROR } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
    },
  },
}));

const OrderSetAllModal = ({
  setShowSetAllModal,
  agGridInstance,
  displaySnackMessages,
}) => {
  const classes = useStyles();

  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);

  const STORE_SETALL_FIELDS = useMemo(
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
        isDisabled: formData.safety_stock !== "Service Level",
      },
      {
        label: "Safety Stock Unit",
        accessor: "max_stock",
        field_type: "IntegerField",
        value_type: "number",
        isDisabled: formData.safety_stock !== "User Input",
      },
      {
        label: "User Reserve",
        accessor: "inventory_hold",
        field_type: "IntegerField",
        value_type: "number",
      },
    ],
    [formData.safety_stock]
  );

  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    if (flagEdit) {
      let l_selectedNodes = agGridInstance.api.getSelectedNodes();
      let selections = l_selectedNodes?.filter((val) => val.displayed);

      //Validating Service Level
      let validationError = false;
      let validated_service_level = 50;
      if (formData && formData.service_level) {
        if (formData.service_level < 50 || 99 < formData.service_level) {
          if (formData.service_level > 99) validated_service_level = 99;
          validationError = true;
        } else {
          validated_service_level = parseInt(formData.service_level);
        }
      }

      selections.forEach((row) => {
        const selected = row.data;
        if (formData) {
          if (formData.safety_stock === "Service Level") {
            selected.safety_stock_method = formData.safety_stock;
            selected.service_level_pct = validated_service_level;
          }
          if (formData.safety_stock === "User Input") {
            selected.safety_stock_method = formData.safety_stock;
            if (formData.max_stock)
              selected.stock_units = parseInt(formData.max_stock);
          }
          if (formData.inventory_hold)
            selected.inventory_hold = parseInt(formData.inventory_hold);
        }
      });

      if (validationError)
        displaySnackMessages(OMS_SERVICE_LEVEL_VALIDATION_ERROR, "info");

      if (l_selectedNodes) {
        agGridInstance.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: l_selectedNodes,
          columns: [
            "service_level_pct",
            "safety_stock_method",
            "inventory_hold",
            "stock_units",
          ],
        });
      }
      setShowSetAllModal(false);
      //safetyStockSetAllPayload.current = [];
    }
  };

  return (
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
            Set All
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setShowSetAllModal(false)}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div className={classes.contentBody}>
          <Form
            maxFieldsInRow={3}
            layout={"vertical"}
            handleChange={handleChange}
            fields={STORE_SETALL_FIELDS}
            updateDefaultValue={true}
            defaultValues={{}}
            labelWidthSpan={2}
            //fieldTypeWidthSpan={2}
          ></Form>
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onCancel();
          }}
          color="primary"
        >
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={onApply}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderSetAllModal;
