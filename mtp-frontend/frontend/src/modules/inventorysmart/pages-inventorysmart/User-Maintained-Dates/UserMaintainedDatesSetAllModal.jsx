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
import { useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty } from "lodash";
import {
  getSelectedRowsForInfiniteRowModel,
  parseRangeBody,
} from "core/Utils/agGrid/table-functions";
import Loader from "core/Utils/Loader/loader";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getObjectsAfterCheckAll } from "../StoreInventoryAlerts/components/AlertsActionPopup";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "60rem",
      borderRadius: "0.6rem",
    },
  },
}));

const UserMaintainedDatesSetAllModal = ({
  setShowSetAllModal,
  agGridInstance,
  filters,
  onSaveHandler,
  displaySnackMessages,
  userMaintainedDatesCount,
  setAllTableData,
  handleCountCheck,
  loader,
  setLoader,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [clearanceDate, setClearanceDate] = useState([]);
  const [markDownDate, setMarkDownDate] = useState([]);
  const [launchDate, setLaunchDate] = useState([]);
  const classes = useStyles();
  const preparepayload = (
    filters,
    l_userActionClubbed,
    formData,
    l_editedRows
  ) => {
    const uniqueKeys = l_editedRows.map((item) => item.unique_key);
    const payload = {
      filters: filters,
      checkedRows: uniqueKeys,
      checkAll: l_userActionClubbed?.checkAll,
      unCheckedRows: [],
      application_code: 1,
      user_maintained_dates:{markdown_date: !isEmpty(formData.markdown_date)
        ? formData.markdown_date
        : [],
      clearance_date: !isEmpty(formData.clearance_date)
        ? formData.clearance_date
        : [],
      launch_date: formData.launch_date
        ? formData.launch_date.format("YYYY-MM-DD")
        : null},
      meta: {
        search: [],
        range: [],
      },
    };
    return payload;
  };

  const prepareMetaPayload = (filterModel, api) => {
    let toSearchKeys = [],
      toRangeKey = [];
    if (!isEmpty(filterModel)) {
      // Append tp-active to handle hight of active sideBar action.
      api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach((button) => {
        if (button.toolPanelDef.id === "table-actions") {
          button.eGui?.classList.add("tp-active");
        }
      });
      let keyList = Object.keys(filterModel);
      keyList.forEach((filterKey) => {
        //If the filterColumnType is number, we parse the filterBody into range field
        if (
          filterModel[filterKey].filterType === "number" ||
          filterModel[filterKey].filterType === "date"
        ) {
          toRangeKey.push(parseRangeBody(filterKey, filterModel, true));
        } else {
          //Else we parse the filterBody into search field
          let patternText = filterModel[filterKey].filter;
          let listType = api.columnModel.columnDefs.some(
            (col) => "list" == col.type && col.accessor == filterKey
          );
          if (filterModel[filterKey].filterType === "set") {
            patternText = filterModel[filterKey].values;
          }
          toSearchKeys.push({
            column: filterKey,
            pattern: patternText,
            ...(true && {
              search_type: filterModel[filterKey].type,
            }),
            ...(listType && {
              type: "list",
            }),
          });
        }
      });
    } else {
      api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach((button) => {
        if (button.toolPanelDef.id === "table-actions") {
          button.eGui?.classList.remove("tp-active");
        }
      });
    }

    return {
      search: toSearchKeys,
      range: toRangeKey,
    };
  };

  const USER_MAINTAINED_SET_ALL_FIELDS = [
    {
      label: "Clearance",
      accessor: "clearance_date",
      field_type: "multiple_daterangepicker",
      value_type: "multiple_daterangepicker",
    },
    {
      label: "Mark Down",
      accessor: "markdown_date",
      field_type: "multiple_daterangepicker",
      value_type: "multiple_daterangepicker",
    },
    {
      label: "Floorset date",
      accessor: "launch_date",
      field_type: "DateTimeField",
      value_type: "DateTimeField",
      disablePast: true,
      isKeyBoardDisable:true
    },
  ];
  const handleChange = (data) => {
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const refreshCells = () => {
    agGridInstance.api.redrawRows();
  };

  const onApply = async () => {
    if (
      !isEmpty(formData.clearance_date) ||
      !isEmpty(formData.markdown_date) ||
      !isEmpty(formData.launch_date)
    ) {
      let l_selectedNodes = getSelectedRowsForInfiniteRowModel(
        agGridInstance,
        true
      );
      let l_editedRows = [];

      l_selectedNodes.forEach((row) => {
        const selected = row.data;
        !isEmpty(formData.clearance_date) &&
          (selected["clearance_date"] = formData.clearance_date);

        !isEmpty(formData.markdown_date) &&
          (selected["markdown_date"] = formData.markdown_date);

        !isEmpty(formData.launch_date) &&
          (selected["launch_date"] = formData.launch_date.format("MM-DD-YYYY"));
        l_editedRows.push(selected);
      });

      try {
        setLoader(true);
        let l_userActions = getObjectsAfterCheckAll(
          agGridInstance?.api?.checkConfiguration
        );
        if (isEmpty(l_userActions)) {
          await onSaveHandler(l_editedRows, false, refreshCells);
        } else {
          let l_userActionClubbed = l_userActions.reduce(
            (result, obj) => Object.assign(result, obj),
            {}
          );

          let payload = preparepayload(
            filters,
            l_userActionClubbed,
            formData,
            l_editedRows
          );
          handleCountCheck(payload);
        }
      } catch {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        setLoader(false);
        setShowSetAllModal(false);
      }
    } else {
      setShowSetAllModal(false);
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
      <Loader loader={loader}>
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
              fields={USER_MAINTAINED_SET_ALL_FIELDS}
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
          <Button variant="contained" onClick={onApply} color="primary">
            Apply
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
};

export default UserMaintainedDatesSetAllModal;
