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
import { useMemo, useState, useRef } from "react";
import makeStyles from "@mui/styles/makeStyles";
import {
  CONSTRAINTS_OMS_SCREENNAME_KEYS,
  FILL_MANDATORY_FIELDS,
  INVALID_VALUE_MESSAGE,
  NO_UPDATE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isEmpty } from "lodash";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
    },
  },
}));

const LEAD_TIME_SETALL_MAPPING = {
  variance: "variance",
  leadTime: "lead_time",
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
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const classes = useStyles();
  var statusSetAllPayload = useRef([]);
  var leadTimeSetAllPayload = useRef([]);
  var QcTimeSetAllPayload = useRef([]);
  var orderingSetAllPayload = useRef([]);
  const STORE_SETALL_FIELDS = useMemo(() => feildsData, [formData.demand_type]);

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

    if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.LeadTime) {
      rowsData.filter((val) => {
        let flag = false;
        leadTimeSetAllPayload.current.filter((node) => {
          if (val.product_code == lead.product_code) {
            node.variance = data?.variance < 0 ? 0 : data?.variance;
            node.lead_time = data?.leadTime;
            flag = true;
          }
        });
        if (!flag) {
          if (data?.variance) {
            leadTimeSetAllPayload.current.push({
              product_code: val.product_code,
              vendor_code: val.vendor_code,
              loc_code: val.loc_code,
              variance: data?.variance < 0 ? 0 : data?.variance,
            });
          } else {
            leadTimeSetAllPayload.current.push({
              product_code: val.product_code,
              vendor_code: val.vendor_code,
              loc_code: val.loc_code,
              lead_time: data?.leadTime,
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
            loc_code: val.loc_code,
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
          if (val.product_code == node.product_code) {
            node.status = data?.status;
            flag = true;
          }
        });
        if (!flag) {
          statusSetAllPayload.current.push({
            product_code: val.product_code,
            vendor_code: val.vendor_code,
            loc_code: val.loc_code,
            status: data?.status,
          });
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

  const onApply = async () => {
    if (flagEdit) {
      if (screenName == CONSTRAINTS_OMS_SCREENNAME_KEYS.LeadTime) {
        let data = checkAllSetAllConfiguration(
          formData,
          LEAD_TIME_SETALL_MAPPING
        );
        let response = setAll(leadTimeSetAllPayload.current, data);
        if (response) {
          setShowSetAllModal(false);
          leadTimeSetAllPayload.current = [];
        }
      }

      if (screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.QcTime) {
        let data = checkAllSetAllConfiguration(formData, QC_SETALL_MAPPING);
        let isValuesValid = true;
        QcTimeSetAllPayload.current.forEach((row) => {
          if (
            row.qc_time === "" ||
            row.qc_time === null ||
            parseInt(row.qc_time) === NaN
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
            maxFieldsInRow={
              screenName === CONSTRAINTS_OMS_SCREENNAME_KEYS.Status ? 3 : 2
            }
            layout={"verticle"}
            handleChange={handleChange}
            fields={STORE_SETALL_FIELDS}
            updateDefaultValue={true}
            defaultValues={{}}
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
