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
import { getObjectsAfterCheckAll } from "../../StoreInventoryAlerts/components/AlertsActionPopup";
import Loader from "core/Utils/Loader/loader";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "40rem",
      borderRadius: "0.6rem",
    },
  },
}));

const StoreDCSetAllModal = ({
  setShowSetAllModal,
  agGridInstance,
  filters,
  onSaveHandler,
  displaySnackMessages,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [loader, setLoader] = useState(false);
  const classes = useStyles();

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
          if (patternText.includes(',')) {
            let parts = patternText.split(',').map(part => part.trim());
            parts = parts.map(part => {
              return replaceSpecialCharToCharCode(part)
            });
            patternText = parts.join(',');
          }
          else{
            patternText=replaceSpecialCharToCharCode(patternText)
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

  const STORE_SETALL_FIELDS = [
    {
      label: "Processing Time",
      accessor: "processing_time",
      field_type: "IntegerField",
      value_type: "number",
      no_negative_values: true

    },
    {
      label: "Transit Time",
      accessor: "transit_time_og",
      field_type: "IntegerField",
      value_type: "number",
      no_negative_values: true

    },
    {
      label: "DC Rank",
      accessor: "dc_rank",
      field_type: "IntegerField",
      value_type: "number",
      no_negative_values: true

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
      !isEmpty(formData.processing_time) ||
      !isEmpty(formData.transit_time_og) ||
      !isEmpty(formData.dc_rank)
    ) {
      let l_selectedNodes = getSelectedRowsForInfiniteRowModel(
        agGridInstance,
        true
      );
      let l_editedRows = [];

      l_selectedNodes.forEach((row) => {
        const selected = row.data;
        !isEmpty(formData.processing_time) &&
          (selected["processing_time"] = +formData.processing_time);

        !isEmpty(formData.transit_time_og) &&
          (selected["transit_time_og"] = +formData.transit_time_og);
        if (!isEmpty(formData.dc_rank) && !selected?.isDisabled) {
          selected["dc_rank"] = +formData.dc_rank;
        }
        let l_dcLeadTime =
          +selected["processing_time"] + +selected["transit_time_og"];
        selected["lead_time"] = l_dcLeadTime;
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
            ...(formData.processing_time
              ? {
                  processing_time: formData.processing_time,
                }
              : {}),
            ...(formData.transit_time_og
              ? {
                  transit_time: formData.transit_time_og,
                }
              : {}),
            ...(formData.dc_rank
              ? {
                  dc_rank: formData.dc_rank,
                }
              : {}),
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
          <Button variant="contained" onClick={onApply} color="primary">
            Apply
          </Button>
        </DialogActions>
      </Loader>
    </Dialog>
  );
};

export default StoreDCSetAllModal;
