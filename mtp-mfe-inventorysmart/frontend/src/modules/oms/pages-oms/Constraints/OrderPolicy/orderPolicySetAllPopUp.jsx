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

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
    },
  },
}));

const SETALL_MAPPING = {
  lot_sizing_strategy: "lot_sizing_strategy",
  wos_value: "wos",
};

const OrderPolicySetAllModal = ({
  setShowSetAllModal,
  rowsData,
  setAll,
  setCheckAllSetAllRequest,
  agGridInstance,
}) => {
  const classes = useStyles();

  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  var orderPolicySetAllPayload = useRef([]);

  const STORE_SETALL_FIELDS = useMemo(
    () => [
      {
        label: "Week",
        accessor: "order_cycle",
        field_type: "list",
        options: [
          {
            label: "1",
            value: "1",
            id: "1",
          },
          {
            label: "2",
            value: "2",
            id: "2",
          },
          {
            label: "3",
            value: "3",
            id: "3",
          },
          {
            label: "4",
            value: "4",
            id: "4",
          },
        ],
        required: false,
      },
      // {
      //   label: "Lot Sizing Strategy",
      //   accessor: "lot_sizing_strategy",
      //   field_type: "list",
      //   options: [
      //     {
      //       label: "Order Cycle Based",
      //       value: "Order Cycle Based",
      //       id: "Order Cycle Based",
      //     },
      //     {
      //       label: "Week of Supply",
      //       value: "Week of Supply",
      //       id: "Week of Supply",
      //     },
      //   ],
      //   required: false,
      // },
      // {
      //   label: "WOS",
      //   accessor: "wos_value",
      //   field_type: "IntegerField",
      //   value_type: "number",
      //   isDisabled: formData.lot_sizing_strategy !== "Week of Supply",
      // },
    ],
    [formData.lot_sizing_strategy]
  );

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
    rowsData?.filter((val) => {
      let flag = false;
      orderPolicySetAllPayload.current.filter((lead) => {
        if (val?.id == lead?.id) {
          lead.order_cycle.week = parseInt(data?.order_cycle);
          lead.lot_sizing_strategy = data?.lot_sizing_strategy;
          if (data.lot_sizing_strategy === "Week of Supply") {
            lead.wos = parseInt(data?.wos_value);
          }
          flag = true;
        }
      });
      if (!flag) {
        if (data.lot_sizing_strategy === "Week of Supply") {
          orderPolicySetAllPayload.current.push({
            product_code: val.product_code,
            lot_sizing_strategy: data?.lot_sizing_strategy,
            wos: parseInt(data?.wos_value),
            order_cycle: {
              week: parseInt(data?.order_cycle),
              day: val?.day,
            },
          });
        } else {
          orderPolicySetAllPayload.current.push({
            product_code: val.product_code,
            lot_sizing_strategy: data?.lot_sizing_strategy,
            order_cycle: {
              week: parseInt(data?.order_cycle),
            },
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
      var Weekdata = {
        week: parseInt(formData?.order_cycle),
        day: "Sunday",
      };
      let l_checkAllSetAllRequest = {
        searchColumns: agGridInstance.api.getFilterModel(),
        order_cycle: Weekdata,
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
      let response = setAll(orderPolicySetAllPayload.current, data);
      if (response) {
        setShowSetAllModal(false);
        orderPolicySetAllPayload.current = [];
      }
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
            maxFieldsInRow={2}
            layout={"vertical"}
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

export default OrderPolicySetAllModal;
