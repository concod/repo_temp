import makeStyles from "@mui/styles/makeStyles";
import React from "react";
import { connect } from "react-redux";
import { Button, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { saveTableView } from "./table-view-panel-service";
import { getColumnConfigurationData } from "./table-view-functions";
import { isEmpty } from "lodash";

const useStyles = makeStyles((theme) => ({}));

const DefaultTableViewQuickSave = (props) => {
  const { agGrid, tableViewDefaultData, tableName } = props;

  const classes = useStyles();
  const dispatch = useDispatch();

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  const onDefaultViewSaveClick = async () => {
    try {
      const payload = getColumnConfigurationData(agGrid);
      // add custom data sent via props
      const defaultValePayload = {
        ...tableViewDefaultData?.[0],
        table_name: tableName,
        preference: payload.preference,
      };
      await saveTableView(defaultValePayload)();
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
  addSnack,
};

const mapStateToProps = (state) => {
  return {
    savedFilterSelection: state.filterReducer.savedFilterSelection,
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DefaultTableViewQuickSave);
