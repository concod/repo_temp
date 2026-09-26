import { Button } from "@mui/material";
import { setColumnsConfiguration } from "core/actions/tableColumnActions";
import { Box } from "@mui/material";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  boxPadding: {
    //overwriting default padding in ag-column-select-header
    padding: "1.5rem 0  !important",
  },
}));

const TableConfigSideBar = (props) => {
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

  const onClickHandler = async () => {
    try {
      const columnsList = props.columnApi
        .getAllGridColumns()
        .filter((item) => item.colId !== "Selection");
      let tableCode = -1;
      let payload = {
        tc_code: tableCode,
        preference: {},
      };
      columnsList.forEach((item, index) => {
        const { column_name, is_editable, type, label, tc_code, extra } = item.colDef;
        if (column_name) {
          payload.preference = {
            ...payload.preference,
            [column_name]: {
              type,
              label,
              tc_code,
              is_frozen: item.pinned ? true : false,
              is_editable,
              order_of_display: index + 1,
              is_hidden: !item.visible,
              extra
            },
          };
          tableCode = tc_code;
        }
      });
      payload.tc_code = tableCode;
      await setColumnsConfiguration(payload)();
      displaySnackMessages("Table configuration successfully saved", "success");
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
    }
  };

  return (
    <Box
      className={`${classes.boxPadding} ${"ag-column-select-header"}`}
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <Button
        id="setAll"
        variant="contained"
        color="primary"
        onClick={onClickHandler}
        disabled={props?.disablesaveConfig}
      >
        Save Table Config
      </Button>
    </Box>
  );
};

export default TableConfigSideBar;
