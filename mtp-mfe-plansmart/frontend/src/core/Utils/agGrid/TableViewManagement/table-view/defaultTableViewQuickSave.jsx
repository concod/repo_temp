import React from "react";
import { connect, useDispatch } from "react-redux";

import { isEmpty, snakeCase } from "lodash";

import { Button } from "@mui/material";

import { addSnack } from "core/actions/snackbarActions";
import { saveTableView } from "./table-view-panel-service";
import { getColumnConfigurationData } from "./table-view-functions";

const DefaultTableViewQuickSave = (props) => {
  const {
    agGrid,
    tableViewDefaultData,
    tableName,
    fetchSaveViewPayloadGetter,
    planSmartPlanCode
  } = props;

  const dispatch = useDispatch();

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance
        }
      })
    );
  };

  const onDefaultViewSaveClick = async () => {
    try {
      const payload = getColumnConfigurationData(agGrid);
      // add custom data sent via props
      let defaultValuePayload = {
        ...tableViewDefaultData?.[0],
        table_name: tableName,
        preference: payload?.preference,
        app_attribute_ids: {
          plan_code: planSmartPlanCode
        }
      };

      //add selected view data to the payload
      if (typeof fetchSaveViewPayloadGetter === "function") {
        const data = fetchSaveViewPayloadGetter();
        defaultValuePayload = { ...defaultValuePayload, ...data };
      }

      await saveTableView(defaultValuePayload)();
      displaySnackMessages(
        "Table view configuration saved successfully",
        "success"
      );
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
    }
  };

  return (
    <>
      {/* <Button
        variant="outlined"
        id="defaultTableViewCancelBtn"
        onClick={() => {}}
        disabled={true}
      >
        Cancel
      </Button> */}
      <Button
        variant="contained"
        color="primary"
        id="defaultTableViewSaveBtn"
        onClick={() => onDefaultViewSaveClick()}
      >
        Save View
      </Button>
    </>
  );
};

const mapDispatchToProps = {
  addSnack
};

const mapStateToProps = (state) => {
  return {
    savedFilterSelection: state.filterReducer.savedFilterSelection
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DefaultTableViewQuickSave);
