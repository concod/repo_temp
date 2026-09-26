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
import { isEmpty } from "lodash";
import {
  INVALID_VALUE_MESSAGE,
  NO_UPDATE,
  OMS_SERVICE_LEVEL_VALIDATION_ERROR,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
    },
  },
}));

const SETALL_MAPPING = {
  safety_stock: "safety_stock_method",
  service_level: "service_level_pct",
  max_stock: "stock_units",
  //inventory_hold: "inventory_hold",
};

const OrderSetAllModal = ({
  setShowSetAllModal,
  rowsData,
  setAll,
  setCheckAllSetAllRequest,
  agGridInstance,
  displaySnackMessages,
}) => {
  const classes = useStyles();

  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  var safetyStockSetAllPayload = useRef([]);

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
        label: "Stock Unit",
        accessor: "max_stock",
        field_type: "IntegerField",
        value_type: "number",
        isDisabled: formData.safety_stock !== "User Input",
        no_negative_values: true,
      },
      // {
      //   label: "Inventory Hold",
      //   accessor: "inventory_hold",
      //   field_type: "IntegerField",
      //   value_type: "number",
      //   no_negative_values: true,
      // },
    ],
    [formData.safety_stock]
  );

  const checkInValidNumber = (value) => {
    return isNaN(value) || value === "" || parseInt(value) === NaN;
  };

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }

    rowsData.filter((row) => {
      let flag = false;
      safetyStockSetAllPayload.current.filter((node) => {
        if (row.product_code == node.product_code) {
          node.safety_stock_method = data?.safety_stock;
          //node.inventory_hold = data?.inventory_hold;
          if (data.safety_stock === "Service Level") {
            if (data?.service_level > 99) {
              data.service_level = 99;
            }
            node.service_level_pct = data?.service_level;
          } else {
            node.stock_units = data?.max_stock;
          }
          flag = true;
        }
      });

      if (!flag) {
        if (data.safety_stock === "Service Level") {
          safetyStockSetAllPayload.current.push({
            product_code: row.product_code,
            loc_code: row.loc_code,
            vendor_code: row.vendor_code,
            safety_stock_method: data?.safety_stock,
            //inventory_hold: data?.inventory_hold,
            service_level_pct: data?.service_level,
          });
        } else {
          safetyStockSetAllPayload.current.push({
            product_code: row.product_code,
            loc_code: row.loc_code,
            vendor_code: row.vendor_code,
            safety_stock_method: data?.safety_stock,
            //inventory_hold: data?.inventory_hold,
            stock_units: data?.max_stock,
          });
        }
      }
    });
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    if (flagEdit) {
      if (formData && parseInt(formData.service_level) < 50) {
        displaySnackMessages(OMS_SERVICE_LEVEL_VALIDATION_ERROR, "info");
        return;
      }

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

      let isValuesValid = true;
      safetyStockSetAllPayload.current.forEach((row) => {
        //Validation on Inventory Hold
        // if (row.inventory_hold !== undefined) {
        //   if (checkInValidNumber(row.inventory_hold)) {
        //     isValuesValid = false;
        //   } else {
        //     row.inventory_hold = parseInt(row.inventory_hold);
        //   }
        // } else {
        //   row.inventory_hold = 0;
        // }

        //Validation on Stock Units
        if (row.stock_units !== undefined) {
          if (checkInValidNumber(row.stock_units)) {
            isValuesValid = false;
          } else {
            row.stock_units = parseInt(row.stock_units);
          }
        } else {
          row.stock_units = 0;
        }

        //Validation on Service Level (50 - 90%)
        if (row.service_level_pct !== undefined) {
          if (checkInValidNumber(row.service_level_pct)) {
            isValuesValid = false;
          } else {
            row.service_level_pct = parseInt(row.service_level_pct);
          }
        } else {
          row.service_level_pct = 50;
        }
      });

      if (!isValuesValid) {
        displaySnackMessages(INVALID_VALUE_MESSAGE, "info");
        return;
      } else {
        let response = setAll(safetyStockSetAllPayload.current, data);
        if (response) {
          setShowSetAllModal(false);
          safetyStockSetAllPayload.current = [];
        }
      }
    } else {
      displaySnackMessages(NO_UPDATE, "info");
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
