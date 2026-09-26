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
import { useEffect, useMemo, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import { isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";
import {
  getInvComponent,
  getUpdatedGroupCode,
  includesCommonStores,
} from "../helperFunctions";
import { buildSetAllFieldsFromConfig } from "../setAllFieldBuilder";
import { Panel } from "impact-ui-v3";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { updateVIRAndIOB } from "../helperFunctions";

const useStyles = makeStyles(() => ({
  setAllDetailsPanel: {
    width: "45vw",
    fontFamily: "Manrope",
    "& .impact_drawer_container_large": {
      width: "45vw",
    },
    "& .impact_accordion_main_container": {
      background: "#fff !important",
    },
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
  showSetAllModal,
  agGridInstance,
  getUpdatedApsWos,
  setUpdatedRows,
  setCheckAllSetAllRequest,
  setAllDcs,
  storeGroupStoreMap,
  storesForSelectedStoreFilters,
  isPO,
  columns,
  defaultStoreGroupCode,
  hideInSetAll,
  showAllStoreGroups,
  getStoreGroupStoreMappingData,
  isStoreBand,
  VIRConstraintOptions,
  ...props
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  const [setAllLoader, setSetAllLoader] = useState(false);
  const [articleSetAllFields, setArticleSetAllFields] = useState([]);
  const [isApplyButtonDisabled, setIsApplyButtonDisabled] = useState(true);
  const classes = useStyles();

  //check if a value is present
  const hasValue = (value) => {
    return (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0)
    );
  };

  //check if formData has any values
  const hasFormDataValues = (data) => {
    return Object.keys(data).some((key) => hasValue(data[key]));
  };

  //filter formData to only include keys with present values
  const getFilteredFormData = (data) => {
    return Object.keys(data).reduce((acc, key) => {
      const value = data[key];
      if (hasValue(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  };

  useEffect(() => {
    let DemandTypeOptions = [];
    const wosField = columns?.find((item) => item.column_name === "wos");

    if (!hideInSetAll?.includes("aps")) {
      DemandTypeOptions = [
        {
          label: "APS",
          value: "APS",
          id: "APS",
        },
        { label: "Fixed", value: "Fixed", id: "Fixed" },
        { label: "IA Forecast", value: "IA", id: "IA" },
      ];
    } else {
      DemandTypeOptions = [
        { label: "Fixed", value: "Fixed", id: "Fixed" },
        { label: "IA Forecast", value: "IA", id: "IA" },
      ];
    }

    if (props.createSceanrio) {
      let ARTICLE_SETALL_FIELDS = [];
      ARTICLE_SETALL_FIELDS.push({
        label: "Min",
        accessor: "min_stock",
        field_type: "IntegerField",
        value_type: "number",
      });
      ARTICLE_SETALL_FIELDS.push({
        label: "Max",
        accessor: "max_stock",
        field_type: "IntegerField",
        value_type: "number",
      });
      ARTICLE_SETALL_FIELDS.push({
        label: wosField?.label || "WOS",
        accessor: "wos",
        field_type: "IntegerField",
        value_type: "number",
        min: wosField?.min ?? 1,
        max: wosField?.max ?? 52,
      });
      ARTICLE_SETALL_FIELDS.push({
        label: "Demand Type",
        is_disabled: false,
        accessor: "demand_type",
        field_type: "list",
        options: DemandTypeOptions,
        isMulti: false,
        isSearchable: true,
      });

      ARTICLE_SETALL_FIELDS.push({
        label: "User Defined Inventory %",
        isDisabled: formData.demand_type !== "Fixed",
        accessor: "user_def_inv_perc",
        field_type: "IntegerField",
        value_type: "percentage",
      });
      setArticleSetAllFields(ARTICLE_SETALL_FIELDS);
    } else {
      const ARTICLE_SETALL_FIELDS = buildSetAllFieldsFromConfig(columns, {
        isPO,
        formData,
        // Options that are sourced at runtime (not from tenant config),
        // keyed by column_name.
        runtimeOptions: {
          store_groups:
            showAllStoreGroups && storeGroupStoreMap ? storeGroupStoreMap : [],
          dcs: setAllDcs,
          demand_type: DemandTypeOptions,
        },
      });
      setArticleSetAllFields(ARTICLE_SETALL_FIELDS);
    }
  }, [formData.demand_type, props.columns]);
  const handleChange = (data, id, field) => {
    if (id === "demand_type") {
      if ("user_def_inv_perc" in data) data.user_def_inv_perc = "";
      if ("aps" in data) data.aps = "";
    }
    if (field.min && data[id] < field.min) {
      data[id] = field.min;
      props.displaySnackMessages(
        `${field.label} value should be atleast ${field?.min}`,
        "info"
      );
    }
    if (field.max && data[id] > field.max) {
      data[id] = field.max;
      props.displaySnackMessages(
        `${field.label} value is capped at ${field?.max}.`,
        "info"
      );
    }
    // this has to be handled in form/index.js in future
    data["user_def_inv_perc"] > 100 && (data["user_def_inv_perc"] = "100");
    data["user_def_inv_perc"] < 0 && (data["user_def_inv_perc"] = "0");
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
    checkButtonDisabled(data);
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
    let l_newStoreGroup = !isEmpty(formData.store_groups_options);
    let l_newDcs = !isEmpty(formData.dcs_options);
    let l_newInvSrc = !isEmpty(formData.inventory_source);
    let l_newdemandType = !isEmpty(formData.demand_type);
    let l_newuserDefinedPerc = !isEmpty(formData.user_def_inv_perc);
    let l_newaps = !isEmpty(formData.aps);
    let l_newwos = !isEmpty(formData.wos);
    let l_newminstock = !isEmpty(formData.min_stock);
    let l_newmaxstock = !isEmpty(formData.max_stock);
    let l_allocation_strategy = !isEmpty(formData.allocation_strategy);
    let l_prioritization_strategy = !isEmpty(formData.prioritization_strategy);
    let l_vir_constraint = !isEmpty(formData.vir_constraint);
    let l_shouldSetAll =
      l_newStoreGroup ||
      l_newDcs ||
      l_newInvSrc ||
      l_newdemandType ||
      l_newuserDefinedPerc ||
      l_newaps ||
      l_allocation_strategy ||
      l_prioritization_strategy ||
      l_newminstock ||
      l_newmaxstock ||
      l_newwos ||
      l_vir_constraint;

    let itemsToUpdate = [];
    let storesData = [];

    // let l_selectedNodes = agGridInstance.api.getSelectedNodes();
    let l_selectedNodes = getSelectedRowsForInfiniteRowModel(
      agGridInstance,
      true
    );
    let selections = l_selectedNodes?.filter((val) => val.displayed) || [];
    let l_resApsWos = [];
    let minStockValidator,
      maxStockValidator = null;
    if (props.minMaxValidator && selections.length > 0) {
      const minValues = selections
        .map((item) => item.data?.min_stock_validator)
        .filter((val) => val != null);
      const maxValues = selections
        .map((item) => item.data?.max_stock_validator)
        .filter((val) => val != null);

      minStockValidator = minValues.length > 0 ? Math.min(...minValues) : null;
      maxStockValidator = maxValues.length > 0 ? Math.max(...maxValues) : null;
    }

    if (
      formData.min_stock &&
      formData.max_stock &&
      Number(formData.min_stock) > Number(formData.max_stock) &&
      !props.createSceanrio
    ) {
      props.displaySnackMessages(
        "Please Enter Min Values less than max",
        "error"
      );
      return null;
    }
    if (
      !isEmpty(formData.min_stock) &&
      (isEmpty(formData.max_stock) || formData.max_stock === "") &&
      Number(formData.min_stock) > minStockValidator &&
      !props.createSceanrio
    ) {
      props.displaySnackMessages(
        "Please Enter Min Values less than min Validator",
        "error"
      );
      return null;
    }
    if (
      !isEmpty(formData.max_stock) &&
      (isEmpty(formData.min_stock) || formData.min_stock === "") &&
      Number(formData.max_stock) < maxStockValidator &&
      !props.createSceanrio
    ) {
      props.displaySnackMessages(
        "Please Enter Max Values greater than max Validator",
        "error"
      );
      return null;
    }
    if(!isEmpty(formData.wos) && formData.wos < 0){
      props.displaySnackMessages(
        "Please enter a value equal or greater than 0",
        "error"
      );
      return null;
    }
    if (props.createSceanrio) {
      if (
        formData.min_stock &&
        !formData.max_stock &&
        selections.some(
          (selectedRow) =>
            parseInt(formData.min_stock) > parseInt(selectedRow.data.max_stock)
        )
      ) {
        props.displaySnackMessages(
          "Please enter min value less than max value",
          "error"
        );
        return;
      }
      if (
        !formData.min_stock &&
        formData.max_stock &&
        selections.some(
          (selectedRow) =>
            parseInt(formData.max_stock) < parseInt(selectedRow.data.min_stock)
        )
      ) {
        props.displaySnackMessages(
          "Please enter max value greater than min value",
          "error"
        );
        return;
      }
      if (
        formData.min_stock &&
        formData.max_stock &&
        Number(formData.min_stock) > Number(formData.max_stock)
      ) {
        props.displaySnackMessages(
          "Please enter min value less than max value",
          "error"
        );
        return;
      }
      if (
        formData.min_stock &&
        formData.max_stock &&
        Number(formData.min_stock) > Number(formData.max_stock)
      ) {
        props.displaySnackMessages(
          "Please enter max value greater than min value",
          "error"
        );
        return;
      }
    }
    setSetAllLoader(true);
    if (props.createSceanrio) {
      // Filter formData to only include keys with present values
      const filteredFormData = getFilteredFormData(formData);
      let selectedData = selections
        .map((rowNode) => rowNode.data)
        .map((val) => {
          let itemData = {
            style: val.product_code,
            ...filteredFormData,
          };

          // when demand_type is "Fixed" and user_def_inv_perc is provided, calculate final_tot_inventory
          if (
            filteredFormData.demand_type === "Fixed" &&
            filteredFormData.user_def_inv_perc
          ) {
            itemData.fixed_inventory = Math.round(
              (val.net_available_inventory *
                filteredFormData.user_def_inv_perc) /
                100
            );
          }
          if (itemData.user_def_inv_perc) {
            delete itemData.user_def_inv_perc;
          }

          return itemData;
        });

      // Validation: Check if any item has demand_type "Fixed" but no fixed_inventory
      const hasFixedWithoutInventory = selectedData.some(
        (item) => item.demand_type === "Fixed" && !item.fixed_inventory
      );

      if (hasFixedWithoutInventory) {
        props.displaySnackMessages(
          "Please enter a valid fixed inventory",
          "error"
        );
        setSetAllLoader(false);
        return;
      }

      setSetAllLoader(true);
      props.onCreateSceanrioApply(selectedData, "style");
      setSetAllLoader(false);
      return;
    }

    try {
      if (
        !isEmpty(formData.store_groups_options) ||
        l_newminstock ||
        l_newmaxstock
      ) {
        try {
          let l_reqApsWos = [],
            l_selectedRows = selections?.map((val) => val.data) || [],
            l_storeGroupCodes = {};
          l_selectedRows?.forEach((rowData) => {
            let l_sgCodes = getUpdatedGroupCode(
              formData.store_groups_options || rowData.store_groups,
              defaultStoreGroupCode,
              rowData["channel"],
              storeGroupStoreMap
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
              setall_max_stock: formData?.max_stock || null,
              setall_min_stock: formData?.min_stock || null,
              setall_wos: formData?.wos || null,
            });
          });
          if (!isEmpty(formData.store_groups_options)) {
            let { data: l_noOfStores } = await getStoreGroupStoreMappingData({
              dc_codes: formData.dcs ? formData.dcs : [],
              product_codes: selections.map((row) => row.data?.article),
              store_groups: formData.store_groups_options.map(
                (opt) => opt.label
              ),
              cache_key: props.cacheKeyRef?.current,
            });
            selections.forEach((rowData) => {
              const storeData = l_noOfStores?.data?.find(
                (codeDetails) =>
                  codeDetails.product_code === rowData.data?.article
              );
              if (storeData) {
                rowData.data.mapped_stores = storeData.store_code;
              }
            });
            storesData = Array.isArray(l_noOfStores?.data)
              ? l_noOfStores?.data
              : [];
          }
          l_resApsWos = await getUpdatedApsWos({
            store_group_upc_list: l_reqApsWos,
            cache_key: props.cacheKeyRef?.current,
          });
        } catch (e) {
          setSetAllLoader(false);
          console.log(e);
          // Add Snackbar
        }
      }
      if (l_shouldSetAll) {
        selections.forEach((row) => {
          let selected = row.data;
          if (l_newDcs) {
            let dcs_options = [];
            let eligibleDcsValue = formData.dcs_options?.map((val) =>
              Number(val.value)
            );
            selected.dcs_options.forEach((item) => {
              if (eligibleDcsValue.indexOf(Number(item.value)) > -1) {
                dcs_options.push(item);
              }
            });
            selected.dcs = dcs_options;
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
            selected.oh = l_dcResponse?.oh_map;
            // for levis case
            if (props.dynamicDCoptions) {
              selected = updateVIRAndIOB(selected, selected.dcs);
            }
          }
          if (l_newdemandType) {
            if (formData.demand_type !== "Fixed") {
              selected.user_def_inv = "";
              selected.user_def_inv_perc = "";
              selected.final_tot_inventory = null;
            }
            selected.demand_type = formData.demand_type;
            if (formData.demand_type !== "APS") {
              selected.aps = "";
            }
          }
          if (l_newInvSrc) {
            selected.inventory_source = formData.inventory_source;
            selected.user_def_inv = "";
            selected.user_def_inv_perc = "";
            selected.final_tot_inventory = null;
          }
          if (formData.demand_type === "Fixed") {
            l_newuserDefinedPerc &&
              (selected.user_def_inv_perc = formData.user_def_inv_perc);
            if (l_newuserDefinedPerc) {
              let totalInventory = selected.net_available_inventory;
              if (
                selected?.["inventory_source"] === "oh_oo" ||
                selected?.inventory_source?.[0]?.value === "oh_oo"
              ) {
                totalInventory = selected?.["net_available_inventory_oh_oo"];
              } else if (
                (selected?.["inventory_source"] === "on_hand" ||
                  selected?.inventory_source?.[0]?.value === "on_hand" ||
                  selected?.["inventory_source"] === "po" ||
                  selected?.inventory_source?.[0]?.value === "po") &&
                selected?.["net_available_inventory_oh"] !== undefined &&
                selected?.["net_available_inventory_oh"] !== null
              ) {
                totalInventory = selected?.["net_available_inventory_oh"];
              } else if (
                selected?.["inventory_source"] === "it" ||
                selected?.inventory_source?.[0]?.value === "it"
              ) {
                totalInventory = selected?.["net_available_inventory_it"];
              } else if (
                selected?.["inventory_source"] === "oh_it" ||
                selected?.inventory_source?.[0]?.value === "oh_it"
              ) {
                totalInventory = selected?.["net_available_inventory_oh_it"];
              } else {
                totalInventory = selected?.["net_available_inventory"];
              }

              selected.user_def_inv_perc = formData.user_def_inv_perc;
              selected.final_tot_inventory = Math.round(
                +(totalInventory * formData.user_def_inv_perc) / 100
              );
              selected.user_def_inv = "";
            }
          }
          if (l_newStoreGroup) {
            let l_updtaedStoreGroups = getUpdatedGroupCode(
              formData.store_groups_options,
              defaultStoreGroupCode,
              selected["channel"],
              storeGroupStoreMap
            );
            // let l_intersectionStores = includesCommonStores(
            //   storeGroupStoreMap,
            //   // formData.store_groups_options,
            //   l_updtaedStoreGroups,
            //   selected.mapped_stores,
            //   storesForSelectedStoreFilters
            // );
            let l_intersectionStores = storesData
              .filter((item) => item.product_code === selected.article)
              .map((item) => item.store_code)[0];
            selected.mapped_stores_count = l_intersectionStores?.length
              ? l_intersectionStores?.length
              : 0;
            selected.store_groups = l_updtaedStoreGroups;
            // formData.store_groups_options;
            let l_resApsWosArticle = l_resApsWos?.data?.data?.filter(
              (val) => val.artilce === selected.artilce
            )[0];
            // Preserve a user-entered WOS (target forward cover). Changing store
            // groups re-fetches aps/wos with setall_wos:null, which returns the
            // recomputed default and would otherwise revert the edited WOS.
            if (!selected.isWosEdited) {
              selected.wos = l_resApsWosArticle?.wos || 0;
            }
            selected.aps = l_resApsWosArticle?.aps ?? "";
            selected.intersected_stores = l_intersectionStores;
            selected.max_stock_validator =
              l_resApsWosArticle?.max_stock_validator;
            selected.min_stock_validator =
              l_resApsWosArticle?.min_stock_validator;
          }
          if (l_newaps) {
            selected.aps = formData.aps;
          }
          if (l_newwos) {
            selected.wos = formData.wos;
            selected.isWosEdited = true;
          }
          if (l_newminstock) {
            selected.min_stock = formData.min_stock;
            selected.isMinEdited = true;
          }
          if (l_newmaxstock) {
            selected.max_stock = formData.max_stock;
            selected.isMaxEdited = true;
          }
          if (l_prioritization_strategy) {
            selected.prioritization_strategy = formData.prioritization_strategy;
          }
          if (l_allocation_strategy) {
            selected.allocation_strategy = formData.allocation_strategy;
          }
          if (l_vir_constraint) {
            selected.vir_constraint = formData.vir_constraint;
          }
          itemsToUpdate.push(selected);
        });

        if (
          l_newInvSrc ||
          l_newdemandType ||
          l_allocation_strategy ||
          l_prioritization_strategy
        ) {
          agGridInstance.api.redrawRows({ rowNodes: l_selectedNodes });
        }
        await agGridInstance.api.refreshCells({ update: itemsToUpdate });
        // assuming user doesn't select articles from different batches and then setall - setting setall values only for available data in FE as it might have conflict with checkall and uncheckall for other batches
        let l_dispalyedRows = l_selectedNodes?.map((val) => val.data);
        let l_updatedRows = {};
        l_dispalyedRows.forEach((val) => {
          l_updatedRows[val.article] = val;
        });
        setUpdatedRows((old) => {
          return { ...old, ...l_updatedRows };
        });
        props.onCreateSceanrioApply(itemsToUpdate, "style");
        let l_checkAllSetAllRequest = {
          searchColumns: agGridInstance.api.getFilterModel(),
          ...getcheckAllSetAllReq(formData, SETALL_MAPPING),
        };
        // if (
        //   agGridInstance.api.checkConfiguration[
        //     agGridInstance.api.checkConfiguration.length - 2
        //   ]
        // ) {
        //   setcheckAllSetAllRequest((old) => {
        //     if (!isEmpty(old)) {
        //       return [...old, l_checkAllSetAllRequest];
        //     } else {
        //       return [l_checkAllSetAllRequest];
        //     }
        //   });
        // }
      }
    } catch (err) {
      setSetAllLoader(false);
    }
    setSetAllLoader(false);
    props.displaySnackMessages(
      "Successfully applied the updated values",
      "success"
    );
    setShowSetAllModal(false);
  };

  function checkButtonDisabled(fromSelectedData) {
    for (const [_, value] of Object.entries(fromSelectedData)) {
      if (
        (typeof value === "string" && value) ||
        (Array.isArray(value) && value.length)
      ) {
        setIsApplyButtonDisabled(false);
        return;
      }
    }
    setIsApplyButtonDisabled(true);
  }

  return (
    <Panel
      title="Set All"
      size="large"
      anchor="right"
      width = {550}
      onClose={onCancel}
      aria-labelledby="customized-dialog-title"
      open={showSetAllModal}
      primaryButtonLabel={"Apply"}
      onPrimaryButtonClick={onApply}
      onSecondaryButtonClick={onCancel}
      secondaryButtonProps={{
        variant:'url'
      }}
      primaryButtonProps={{
        disabled: props.createSceanrio ? !hasFormDataValues(formData) : false,
      }}
      secondaryButtonLabel={"Cancel"}
    >
      <Loader loader={setAllLoader}>
        <div className={classes.contentBody}>
          {articleSetAllFields?.length > 0 && (
            <Form
              maxFieldsInRow={3}
              layout={"vertical"}
              handleChange={handleChange}
              fields={articleSetAllFields}
              updateDefaultValue={true}
              defaultValues={{}}
            ></Form>
          )}
        </div>
      </Loader>
    </Panel>
  );
};

export default SetAllModal;
