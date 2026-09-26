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
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";
import {
  getInvComponent,
  getUpdatedGroupCode,
  includesCommonStores,
} from "../helperFunctions";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "80rem",
      borderRadius: "0.6rem",
    },
  },
  contentBody: {
    minHeight: "20rem",
  },
}));

const SETALL_MAPPING = {
  dcs_options: "dcs",
  demand_type: "demand_type",
  store_groups_options: "store_groups",
  aps: "aps",
  wos: "wos",
  user_def_inv_perc: "user_def_inv_perc",
  inventory_source_options: "inventory_source",
};

const SetAllModal = ({
  setShowSetAllModal,
  agGridInstance,
  getUpdatedApsWos,
  setUpdatedRows,
  setCheckAllSetAllRequest,
  setAllDcs,
  channel,
  inventorysmartScreenConfig,
  selectedFilters,
  storeGroupStoreMap,
  storesForSelectedStoreFilters,
  isPO,
  columns,
  defaultStoreGroupCode,
  hideInSetAll,
  showAllStoreGroups,
  newStoreData
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [setAllLoader, setSetAllLoader] = useState(false);
  const classes = useStyles();

  const ARTICLE_SETALL_FIELDS = useMemo(
    () => [
      ...(!newStoreData?.store_code ? [{
        label: "Store Eligibility Groups",
        is_disabled: true,
        accessor: "store_groups",
        field_type: "list",
        isSearchable: true,
        options: [
          { label: "Default Mapping", value: -1, id: -1 },
          ...(showAllStoreGroups ? storeGroupStoreMap.store_groups : []),
        ],
        isMulti: true,
      }]:[]),
      ...(!isPO && !hideInSetAll?.includes("strategy_dc")
        ? [
            {
              label: "DC",
              isDisabled: false,
              accessor: "dcs",
              field_type: "list",
              isSearchable: true,
              options: setAllDcs,
              isMulti: true,
            },
          ]
        : []),

      ...(!hideInSetAll?.includes("inventory_source")
        ? [
            {
              label: "Inv. Source",
              accessor: "inventory_source",
              field_type: "list",
              options: columns.find(
                (column) => column.column_name === "inventory_source"
              ).options,
              isSearchable: true,
              isMulti: true,
              isDisabled: isPO ? true :false,
            },
          ]
        : []),
      {
        label: "Demand Type",
        isDisabled: isPO ? true :false,
        accessor: "demand_type",
        field_type: "list",
        options: [
          ...(!hideInSetAll?.includes("aps")
            ? [
                {
                  label: "APS",
                  value: "APS",
                  id: "APS",
                },
              ]
            : []),
          { label: "Fixed", value: "Fixed", id: "Fixed" },
          { label: "IA Forecast", value: "IA", id: "IA" },
        ],
        isMulti: false,
        isSearchable: true,
      },
      {
        label: "User Defined Inventory %",
        isDisabled: formData.demand_type !== "Fixed",
        accessor: "user_def_inv_perc",
        field_type: "IntegerField",
        value_type: "percentage",
      },
      // commenting for UAT, this will be derived from tenant attribute as it's clients specific.
      ...(!hideInSetAll?.includes("aps")
        ? [
            {
              label: "Planned APS",
              isDisabled: formData.demand_type !== "APS",
              accessor: "aps",
              field_type: "IntegerField",
              value_type: "number",
            },
          ]
        : []),
      ...(!hideInSetAll?.includes("wos")
        ? [
            {
              label: "WOS",
              accessor: "wos",
              field_type: "IntegerField",
              value_type: "number",
              no_negative_values:true,
              isDisabled: isPO ? true :false,
            },
          ]
        : []),
    ],
    [setAllDcs, formData.demand_type, isPO, columns]
  );
  const handleChange = (data) => {
    // this has to be handled in form/index.js in future
    data["user_def_inv_perc"] > 100 && (data["user_def_inv_perc"] = "100");
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  const onApply = async () => {
    setSetAllLoader(true);
    let l_newStoreGroup = !isEmpty(formData.store_groups_options);
    let l_newDcs = !isEmpty(formData.dcs_options);
    let l_newInvSrc = !isEmpty(formData.inventory_source);
    let l_newdemandType = !isEmpty(formData.demand_type);
    let l_newuserDefinedPerc = !isEmpty(formData.user_def_inv_perc);
    let l_newaps = !isEmpty(formData.aps);
    let l_newwos = !isEmpty(formData.wos);

    let l_shouldSetAll =
      l_newStoreGroup ||
      l_newDcs ||
      l_newInvSrc ||
      l_newdemandType ||
      l_newuserDefinedPerc ||
      l_newaps ||
      l_newwos;
    let itemsToUpdate = [];
    // let l_selectedNodes = agGridInstance.api.getSelectedNodes();
    let l_selectedNodes = getSelectedRowsForInfiniteRowModel(
      agGridInstance,
      true
    );
    let selections = l_selectedNodes?.filter((val) => val.displayed);
    let l_resApsWos = [];

    if (!isEmpty(formData.store_groups_options)) {
      try {
        let l_reqApsWos = [],
          l_selectedRows = selections?.map((val) => val.data),
          l_storeGroupCodes = {};
        l_selectedRows?.forEach((rowData) => {
          let l_sgCodes = getUpdatedGroupCode(
            formData.store_groups_options,
            defaultStoreGroupCode,
            rowData["channel"],
            rowData["store_groups_options"]
          );
 
          l_storeGroupCodes[rowData?.article] = l_sgCodes?.map(
            (val) => val?.valueArray?.[0] || val.value
          );
        });
        // formData.store_groups_options?.map(
        //   (val) => val?.valueArray || val?.value
        // );
        l_selectedRows.forEach((selectedRow) => {
          let sizes = selectedRow.sizes?.map((size) => size.value);
          l_reqApsWos.push({
            store_group_code: l_storeGroupCodes?.[selectedRow?.article],
            upc: sizes?.map((value) => selectedRow?.size_upc_map[value]),
          });
        });
        l_resApsWos = await getUpdatedApsWos({
          store_group_upc_list: l_reqApsWos,
        });
      } catch (e) {
        console.log(e);
        // Add Snackbar
      }
    }
    if (l_shouldSetAll) {
      selections.forEach((row) => {
        const selected = row.data;
        if (l_newdemandType) {
          if (l_newdemandType !== "Fixed") {
            selected.user_def_inv = "";
            selected.user_def_inv_perc = "";
            selected.final_tot_inventory = null;
          }
          selected.demand_type = formData.demand_type;
        }
        l_newuserDefinedPerc &&
          (selected.user_def_inv_perc = formData.user_def_inv_perc);
        l_newInvSrc &&
          (selected.inventory_source = formData.inventory_source_options);
        if (l_newuserDefinedPerc) {
          selected.user_def_inv_perc = formData.user_def_inv_perc;
          selected.final_tot_inventory = Math.round(
            +(selected.net_available_inventory * formData.user_def_inv_perc) /
              100
          );
          selected.user_def_inv = "";
        }
        if (l_newStoreGroup) {
          let l_updtaedStoreGroups = getUpdatedGroupCode(
            formData.store_groups_options,
            defaultStoreGroupCode,
            selected["channel"],
            selected["store_groups_options"]
          );
          let l_intersectionStores = includesCommonStores(
            storeGroupStoreMap,
            // formData.store_groups_options,
            l_updtaedStoreGroups,
            selected.mapped_stores,
            storesForSelectedStoreFilters
          );
          selected.mapped_stores_count = l_intersectionStores.length;
          selected.store_groups = l_updtaedStoreGroups;
          // formData.store_groups_options;
          let l_resApsWosArticle = l_resApsWos.data.data.filter(
            (val) => val.artilce === selected.artilce
          )[0];
          selected.wos = l_resApsWosArticle?.wos || 0;
          selected.aps = l_resApsWosArticle?.aps || 0;
          selected.intersected_stores = l_intersectionStores;
        }
        if (l_newaps) {
          selected.aps = formData.aps;
        }
        if (l_newwos) {
          selected.wos = formData.wos;
          selected.isWosEdited = true;
        }
        if (l_newDcs) {
          selected.dcs = formData.dcs_options;
          let l_dcResponse = getInvComponent({
            size: selected?.sizes?.map((val) => val.value),
            dc_code: selected.dcs?.map((val) => val.value),
            data: selected,
          });
          let net_available_inventory =
            (+l_dcResponse?.oh_map || 0) -
            (+l_dcResponse?.rq_map || 0) -
            (+l_dcResponse?.au_map || 0);
          selected.net_available_inventory = Math.max(
            0,
            net_available_inventory
          );
        }
        itemsToUpdate.push(selected);
      });
      await agGridInstance.api.refreshCells({ update: itemsToUpdate });
      if (l_newdemandType) {
        agGridInstance.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: l_selectedNodes,
          columns: [
            "aps",
            "wos",
            "user_def_inv_perc",
            "user_def_inv",
            "final_tot_inventory",
          ],
        });
      }
      // assuming user doesn't select articles from different batches and then setall - setting setall values only for available data in FE as it might have conflict with checkall and uncheckall for other batches
      let l_dispalyedRows = l_selectedNodes?.map((val) => val.data);
      let l_updatedRows = {};
      l_dispalyedRows.forEach((val) => {
        l_updatedRows[val.article] = val;
      });
      setUpdatedRows((old) => {
        return { ...old, ...l_updatedRows };
      });
      let l_checkAllSetAllRequest = {
        searchColumns: agGridInstance.api.getFilterModel(),
        ...getcheckAllSetAllReq(formData, SETALL_MAPPING),
      };
      if (
        agGridInstance.api.checkConfiguration[
          agGridInstance.api.checkConfiguration.length - 2
        ]
      ) {
        if (l_checkAllSetAllRequest.store_groups) {
          if(inventorysmartScreenConfig?.dashboard?.calculateStoreGroupIdForClient){
            // for Signet , check for product_channel_name value in filters
            const channelValue = selectedFilters.find(filter => filter.attribute_name === "product_channel_name")?.values?.[0];
    
            l_checkAllSetAllRequest.store_groups.forEach(group => {
              if (group.value === -1) {
                group.value = defaultStoreGroupCode[channelValue];
              }
            });

          } 
          // else check for channel code
          else {
            l_checkAllSetAllRequest.store_groups.forEach(group => {
              // Check if the label is "Default Mapping"
              if (group.value === -1) {
                  // Update the value from -1 to channel_code
                  group.value = defaultStoreGroupCode[channel];
              }
          });
          }

      }
        setCheckAllSetAllRequest((old) => {
          if (!isEmpty(old)) {
            return [...old, l_checkAllSetAllRequest];
          } else {
            return [l_checkAllSetAllRequest];
          }
        });
      }
    }
    setSetAllLoader(true);
    setShowSetAllModal(false);
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
              maxFieldsInRow={3}
              layout={"vertical"}
              handleChange={handleChange}
              fields={ARTICLE_SETALL_FIELDS}
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

export default SetAllModal;
