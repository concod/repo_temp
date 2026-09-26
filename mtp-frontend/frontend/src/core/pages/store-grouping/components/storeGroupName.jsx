import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { forwardRef, useState } from "react";
import {
  createNewGroup,
  resetFilterStores,
} from "../services-store-grouping/custom-store-group-service";
import { addSnack } from "../../../actions/snackbarActions";
import { connect } from "react-redux";
import { LinearProgress } from "@mui/material";
import { storeGrouping } from "config/routes";
import { resetToDefaultValues } from "../services-store-grouping/custom-store-group-service";
import { formatFiltersDependency } from "./common-functions";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const GroupName = forwardRef((props, ref) => {
  const [groupName, setgroupName] = useState("");
  const [showLoader, setshowLoader] = useState(false);
  const navigate = useNavigate();
  let location = useLocation();
  const getChannelValue = () => {
    if (props.allowMultiChannel) {
      return "MC"; //multi channel
    }
    //This function is used to handle a use case
    //The value could be either object or string
    let channelValues =
      props.group_type === "manual"
        ? ref?.storeFiltersRef?.filter(
            (filter) => filter.filter_id === "channel"
          )[0]?.values
        : props.selectedCluster.metrics.filters.filter(
            (filter) =>
              filter.attribute_name === "channel" ||
              filter.filter_id === "channel"
          )[0]?.values;
    if (
      channelValues.length > 0 &&
      typeof channelValues[0] === "object" &&
      channelValues[0] !== null
    ) {
      return channelValues[0].value;
    }
    return channelValues[0];
  };

  const checkForEmptyStoreGroup = () => {
    //If the group type is manual, we are checking for if all the rows are selected or not
    //If the group type is custom, then check if atleast one of the stores are selected or not
    return props.selectedStores.length === 0;
  };

  const saveStoreGroup = async () => {
    if (groupName === "") {
      props.addSnack({
        message: "Group name can't be empty",
        options: {
          variant: "error",
        },
      });
      return;
    }
    let storeJSON = {
      name: replaceSpecialCharToCharCode(groupName),
      group_type: props.group_type,
      store_ids: [],
      store_group_ids: [],
      channel: getChannelValue(),
    };
    if (props.group_type === "manual") {
      const params = ref.storeTableRef;
      const storeGroupTableParams = ref.storeGroupTableRef;
      const filterDependency = formatFiltersDependency(
        ref.storeFiltersRef,
        null,
        true
      );
      let selectedData = params?.api?.getSelectedNodes().map((node) => {
        return node.data;
      });
      let store_grade = selectedData
        .filter((item) => item.grade)
        .map((item) => {
          return {
            store_code: item.store_code,
            store_grade: item.grade,
          };
        });
      if (props.storeGradeFlag) {
        storeJSON.store_grades = store_grade;
      }
      storeJSON.store_ids = {
        filters: filterDependency,
        meta: {
          search: [],
          range: [],
          sort: [],
        },
        metrics: [],
        selection: {
          data: params?.api?.checkConfiguration,
          unique_columns: ["store_code"],
        },
      };
      storeJSON.store_group_ids = {
        filters: filterDependency,
        meta: {
          search: [],
          range: [],
          sort: [],
        },
        metrics: [],
        selection: {
          data: storeGroupTableParams?.api?.checkConfiguration || [],
          unique_columns: ["sg_code"],
        },
      };
    } else {
      storeJSON["objective_metrics"] = props.selectedCluster.metrics.metrics;
      storeJSON.store_ids = props.selectedStores.map(
        (store) => store.store_code
      );
    }
    try {
      setshowLoader(true);
      storeJSON.application_code =
        sessionStorage.getItem("currentApp")?.toLowerCase() ===
          "inventorysmart" || location.pathname.includes("inventory-smart")
          ? 1
          : 3;
      const createResp = await props.createNewGroup(storeJSON);
      if (createResp?.data?.status) {
        props.resetFilterStores();
        props.resetToDefaultValues();
        props.addSnack({
          message: "Group created successfully",
          options: {
            variant: "success",
            onClose: () =>
              props.prevScr
                ? navigate(props.prevScr)
                : navigate(storeGrouping.home),
          },
        });
        props.handleClose();
      } else {
        props.addSnack({
          message: createResp?.data?.data?.group_id?.message,
          options: {
            variant: "error",
          },
        });
      }
      setshowLoader(false);
    } catch (error) {
      setshowLoader(false);
      props.addSnack({
        message: error?.response?.data?.message || "Group creation failed",
        options: {
          variant: "error",
        },
      });
    }
  };
  return (
    <Dialog
      id="storeGrpingNameDialog"
      open={props.open}
      fullWidth={true}
      maxWidth={"sm"}
      onClose={props.handleClose}
      aria-labelledby="form-dialog-title"
    >
      {showLoader && <LinearProgress />}
      <DialogTitle id="form-dialog-title">Enter store group name</DialogTitle>
      <DialogContent>
        <TextField
          id="storeGrpingNameInp"
          autoFocus
          margin="dense"
          placeholder="Enter here"
          fullWidth
          value={groupName}
          inputProps={{ maxLength: 40 }}
          disabled={showLoader}
          onChange={(event) => setgroupName(event.target.value)}
          helperText="Max Characters limit is 40"
        />
      </DialogContent>
      <DialogActions>
        <Button
          id="storeGrpingNameDialogCnclBtn"
          onClick={props.handleClose}
          color="primary"
        >
          Cancel
        </Button>
        <Button
          id="storeGrpingNameDialogSaveBtn"
          onClick={saveStoreGroup}
          color="primary"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
});

const mapStateToProps = (state) => {
  return {
    group_type: state.storeGroupReducer.selectedGroupType,
    selectedManualFilterType: state.storeGroupReducer.selectedManualFilterType,
    selectedStores: state.storeGroupReducer.selectedstores,
    selectedGrps: state.storeGroupReducer.manualselectedGroups,
    selectedFilters: state.filterReducer.selectedFilters["store_hierarchy"],
    selectedProductFilters:
      state.filterReducer.selectedFilters["product_filters_create_group"] || [],
    selectedStoreFilters:
      state.filterReducer.selectedFilters["store_filters_create_group"] || [],
    selectedCluster: state.storeGroupReducer.selectedCluster,
    allowMultiChannel: state.storeGroupReducer.allowMultiChannelFlag,
  };
};
const mapActionsToProps = {
  createNewGroup,
  addSnack,
  resetFilterStores,
  resetToDefaultValues,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(GroupName);
