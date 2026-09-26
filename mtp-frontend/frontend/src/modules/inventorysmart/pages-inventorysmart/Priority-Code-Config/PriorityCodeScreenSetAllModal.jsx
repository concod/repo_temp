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
import { useMemo, useState } from "react";
import { isEmpty } from "lodash";
import {
  getSelectedRowsForInfiniteRowModel,
  parseRangeBody,
} from "core/Utils/agGrid/table-functions";
import Loader from "core/Utils/Loader/loader";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getObjectsAfterCheckAll } from "../StoreInventoryAlerts/components/AlertsActionPopup";


const PriorityCodeScreenSetAllModal = ({
  setShowSetAllModal,
  agGridInstance,
  filters,
  onSaveHandler,
  displaySnackMessages,
  columns,
  inventorysmartScreenConfig
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [loader, setLoader] = useState(false);

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

  const getPriorityCodeOptions = (accessor) => {
    const options = columns
      ?.filter(
        (column) =>
          column?.extra?.bulkEdit && column?.extra?.column_name === accessor
      )
      ?.map((item) => item?.extra?.options)?.[0];
    return options ? options : [];
  };

  const PRIORITY_CODE_SET_ALL_FIELDS = useMemo(
    () => [
      {
        label: "Priority Code",
        accessor: "priority_code",
        field_type: "list",
        value_type: "list",
        options: getPriorityCodeOptions("priority_code"),
      },
      {
        label: "InStore Date",
        accessor: "instore_date",
        field_type: "DateTimeField",
        disablePast: true,
        isKeyBoardDisable :true
      },
    ],
    [columns]
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

  const refreshCells = () => {
    agGridInstance.api.redrawRows();
  };

  const onApply = async () => {
    if (!isEmpty(formData.priority_code) || !isEmpty(formData.instore_date)) {
      let l_selectedNodes = getSelectedRowsForInfiniteRowModel(
        agGridInstance,
        true
      );
      let l_editedRows = [];

      l_selectedNodes.forEach((row) => {
        const selected = row.data;
        !isEmpty(formData.priority_code) &&
          (selected["priority_code"] = formData.priority_code);
        
        !isEmpty(formData.instore_date) &&
          (selected["instore_date"] = formData.instore_date.format("MM-DD-YYYY"));
        
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
          let l_requestForCheckAll = {
            filters: filters,
            meta: prepareMetaPayload(
              l_userActionClubbed?.searchColumns,
              agGridInstance?.api
            ),
            ...(formData.priority_code
              ? {
                  priority_code: formData.priority_code,
                }
              : ""),
            ...(formData.instore_date
              ? {
                  instore_date: formData.instore_date.format("MM-DD-YYYY"),
                }
              : ""),
            ...l_userActionClubbed,
          };
          await onSaveHandler(l_requestForCheckAll, true, refreshCells);
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
      maxWidth={"md"}
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
          <div>
            <Form
              maxFieldsInRow={2}
              layout={"vertical"}
              handleChange={handleChange}
              fields={PRIORITY_CODE_SET_ALL_FIELDS}
              updateDefaultValue={true}
              defaultValues={""}
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

export default PriorityCodeScreenSetAllModal;
