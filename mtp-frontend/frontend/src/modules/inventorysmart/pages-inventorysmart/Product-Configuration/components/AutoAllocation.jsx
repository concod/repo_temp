import { Switch } from "impact-ui";
import { Button } from "@mui/material";

import makeStyles from "@mui/styles/makeStyles";
import React, { useState } from "react";
import { Typography } from "@mui/material";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import {
  updateAutoAllocation,
  updateAutoAllocationSetAll,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";
const useStyles = makeStyles((theme) => ({
  btn: {
    marginRight: "1rem",
    marginLeft: "1rem",
  },
  actionBtn: {
    padding: "1rem",
    display: "flex",
    justifyContent: "center",
  },
  container: {
    display: "flex",
    alignItems: "center",
  },
  hideCheckBox: {
    display: "none",
  },
}));
const AutoAllocationTab = (props) => {
  const [value, setValue] = useState(false);
  const classes = useStyles();

  const onChange = (e) => {
    console.log("eee", e, props);
    let checked = e.target.checked;
    setValue(checked);
  };
  console.log("props", props);
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const saveHandlerPopUp = async () => {
    try {
      if (props.checkAll) {
        let reqBody = {
          filters: props.filters,
          meta: props.metaBody,
          auto_allocation_status: value,
        };
        await props.updateAutoAllocationSetAll(reqBody);
      } else {
        let channel = props.filters
          .filter((item) => item.attribute_name === "channel")
          .map((item) => item.values)[0];
        let reqBody = {
          ph_code: props.selectedRowData.map((item) => item.ph_code),
          channel: channel[0],
          auto_allocation_status: value,
        };
        await props.updateAutoAllocation(reqBody);
      }
      props.closeModal();
      props.agGridInstance.api?.refreshServerSideStore({ purge: true });
      displaySnackMessages("Saved successfully", "success");
    } catch (err) {
      console.log(err);
      displaySnackMessages("unable to save the auto allocation", "error");
    }
  };
  const closeModal = () => {
    props.closeModal();
  };
  return (
    <>
      <div className={classes.container}>
        <Typography variant="h2">{"Auto Allocation Status  :  "}</Typography>
        <Switch
          checked={value}
          className={classes.btn}
          onChange={(e) => onChange(e)}
          color="primary"
        />
      </div>

      <div className={classes.actionBtn}>
        <Button
          onClick={closeModal}
          id="productRulePopCancelBtn"
          color="primary"
          variant="outlined"
          className={classes.btn}
        >
          Cancel
        </Button>
        <Button
          onClick={saveHandlerPopUp}
          id="productRulePopCancelBtn"
          color="primary"
          variant="contained"
        >
          Update and Save
        </Button>
      </div>
    </>
  );
};
const mapDispatchToProps = (dispatch) => ({
  updateAutoAllocationSetAll: (payload) =>
    dispatch(updateAutoAllocationSetAll(payload)),
  updateAutoAllocation: (body) => dispatch(updateAutoAllocation(body)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(AutoAllocationTab);
