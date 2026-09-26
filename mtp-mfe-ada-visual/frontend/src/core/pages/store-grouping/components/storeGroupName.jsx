import { forwardRef, useState } from "react";
import {
  createNewGroup,
  resetFilterStores,
} from "../services-store-grouping/custom-store-group-service";
import { addSnack } from "../../../actions/snackbarActions";
import { connect } from "react-redux";
import { storeGrouping } from "config/routes";
import { resetToDefaultValues } from "../services-store-grouping/custom-store-group-service";
import { formatFiltersDependency } from "./common-functions";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { Modal, Input, Loader } from "impact-ui-v3";
import { hasExcludedSpecialCharacters } from "core/Utils/functions/utils";
import { EXCLUDED_SPECIAL_CHARACTERS } from "core/constants";

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
      channelValues?.length > 0 &&
      typeof channelValues[0] === "object" &&
      channelValues[0] !== null
    ) {
      return channelValues[0].value;
    }
    if (channelValues?.length > 0) {
      return channelValues[0];
    }
    return "NC";
  };

  const checkForEmptyStoreGroup = () => {
    //If the group type is manual, we are checking for if all the rows are selected or not
    //If the group type is custom, then check if atleast one of the stores are selected or not
    return props.selectedStores.length === 0;
  };
  const handleErrorMessage = (e, displaySnackMessages) => {
    const errObj = e?.response?.data;
    if (errObj?.message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages("Something went wrong", "error");
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
    if (hasExcludedSpecialCharacters(groupName)) {
      displaySnackMessages(
        `Group Name cannot have these characters "${EXCLUDED_SPECIAL_CHARACTERS?.join(
          `", "`
        )}" Please change the name and try again.`,
        "error"
      );
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
          unique_columns: [props.uniqueRowId],
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
      handleErrorMessage(error, displaySnackMessages);
    }
  };
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  return (
    <Modal
      className="storeGrpingNameDialog"
      open={props.open}
      onClose={props.handleClose}
      size="small"
      title="Enter store group name"
      primaryButtonLabel="Save"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={saveStoreGroup}
      onSecondaryButtonClick={props.handleClose}
      primaryButtonProps={{ variant: "primary" }}
      secondaryButtonProps={{ variant: "secondary" }}
    >
      {showLoader && <Loader size="small" />}
      <div style={{ padding: "16px 24px" }}>
        <Input
          id="storeGrpingNameInp"
          placeholder="Enter here"
          value={groupName}
          maxLength={40}
          isDisabled={showLoader}
          inputProps={{ maxLength: 40 }}
          onChange={(event) => setgroupName(event.target.value)}
          isHelperText
          helperText="Max Characters limit is 40"
        />
      </div>
    </Modal>
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
