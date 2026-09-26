import {
  Button,
  Grid,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import Form from "core/Utils/form";
import { useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import {
  saveCancelDates,
  savePriority,
  saveShippingDates,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { isEmpty } from "lodash";

const SetDatesComponent = (props) => {
  const classes = useStyles();
  const [formData, setFormData] = useState({});
  const [setAllLoader, setSetAllLoader] = useState(false);

  const handleChange = (data) => {
    setFormData(data);
  };

  const onCancel = () => {
    props.editDeliveryDate(false);
  };

  const EDITABLE_DATES_STORE_VIEW = useMemo(
    () => [
      {
        shipping_date: { api: props.saveShippingDates, column: formData?.dcs },
        cancel_date: {
          api: props.saveCancelDates,
          column: formData?.dcs?.map((val) =>
            val.replace("shipping_date", "cancel_date")
          ),
        },
        priority_code: {
          api: props.savePriority,
          column: formData?.dcs?.map((val) =>
            val.replace("shipping_date", "priority_code")
          ),
          type: "str",
        },
      },
    ],
    [
      formData.dcs,
      props.saveShippingDates,
      props.saveCancelDates,
      props.savePriority,
    ]
  );

  const shouldCallApi = (p_editedColumn, p_config) => {
    let l_selectedNodes = props.storeDetailsTableInstance?.current?.api?.getSelectedNodes();
    let l_userEdits = {};
    l_selectedNodes.forEach((row) => {
      const selected = row.data;
      l_userEdits[selected.store_code] = {};
      for (let column of p_config.column) {
        if (selected[column] && formData?.[p_editedColumn]) {
          selected[column] =
            p_config.type === "str"
              ? formData?.[p_editedColumn]
              : formData?.[p_editedColumn]?.format("MM-DD-YYYY");
          l_userEdits[selected.store_code][
            column.replace(`${p_editedColumn}_`, "")
          ] =
            p_config.type === "str"
              ? formData?.[p_editedColumn]
              : formData?.[p_editedColumn]?.format("MM-DD-YYYY");
        }
      }
    });
    let l_request = {
      allocation_code: props.originalAllocationCode || props.allocationCode,
      updated_stores: l_userEdits,
    };
    return !isEmpty(formData?.[p_editedColumn])
      ? p_config.api(l_request)
      : null;
  };

  const onSave = async () => {
    try {
      let l_selectedNodes = props.storeDetailsTableInstance?.current?.api?.getSelectedNodes();
      setSetAllLoader(true);
      let l_apis = [];
      for (let i in EDITABLE_DATES_STORE_VIEW[0]) {
        l_apis.push(shouldCallApi(i, EDITABLE_DATES_STORE_VIEW[0][i]));
      }
      Promise.all(l_apis).then((values) => {
        props.storeDetailsTableInstance?.current?.api?.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: l_selectedNodes,
        });
      });
    } finally {
      onCancel();
      setSetAllLoader(false);
    }
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className={classes.root}
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
      disableBackdropClick={false}
    >
      <Loader loader={setAllLoader}>
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
              onClick={() => onCancel()}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div className={classes.contentBody} style={{ minHeight: "300px" }}>
            <Form
              maxFieldsInRow={3}
              layout={"vertical"}
              handleChange={handleChange}
              fields={props.setAllFields}
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
          <Button variant="contained" onClick={onSave} color="primary">
            Save
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
};
const mapDispatchToProps = (dispatch) => ({
  saveShippingDates: (payload) => dispatch(saveShippingDates(payload)),
  saveCancelDates: (payload) => dispatch(saveCancelDates(payload)),
  savePriority: (payload) => dispatch(savePriority(payload)),
});

export default connect(null, mapDispatchToProps)(SetDatesComponent);
