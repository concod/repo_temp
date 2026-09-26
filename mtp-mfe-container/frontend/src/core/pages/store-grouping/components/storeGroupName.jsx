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
import {
  replaceSpecialCharToCharCode,
  checkForSpecialCharacters,
} from "core/Utils/functions/utils";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { Modal, Input, Loader } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles({
  storeGrpingNameDialog: {
    "& .ia_modalBody": {
      padding: "12px 16px",
    },
  },
  loaderContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
});

const ASSORT_APP_NAME = "AssortSmart";
// Same allowed charset as plan / cluster display name validation
const ASSORT_STORE_GROUP_NAME_PATTERN = /^[0-9.,&()a-zA-Z\d\-_\s]+$/i;
const ASSORT_INVALID_CHARSET_MESSAGE =
  "Group name can only contain letters, numbers, spaces, and . , & ( ) - _";
const INVALID_NAME_MESSAGE =
  "Group name must contain at least one letter or number.";
const GENERIC_INVALID_CHARSET_MESSAGE =
  "Group name cannot have special characters";

const isAssortSmartApp = (pathname = "") => {
  // Identify assort the same way manualGroup does: by application name
  const { applicationName } = getCurrentApplicationDetails();
  if (applicationName === ASSORT_APP_NAME) {
    return true;
  }
  // Shared routes (e.g. /store-grouping) rely on session/path, same as inventory checks in this file
  return (
    sessionStorage.getItem("currentApp")?.toLowerCase() === "assortsmart" ||
    pathname.includes("assort-smart")
  );
};

const getStoreGroupNameValidationError = (name, isAssort) => {
  if (!name || typeof name !== "string") return INVALID_NAME_MESSAGE;
  const trimmedName = name.trim();
  if (trimmedName === "") return INVALID_NAME_MESSAGE;
  // Must contain at least one letter or number; special characters alone are not allowed
  if (!/[a-zA-Z0-9]/.test(trimmedName)) {
    return INVALID_NAME_MESSAGE;
  }
  if (isAssort && trimmedName.match(ASSORT_STORE_GROUP_NAME_PATTERN) === null) {
    return ASSORT_INVALID_CHARSET_MESSAGE;
  } else if (!isAssort && !checkForSpecialCharacters(trimmedName)) {
    // Generic case: only letters, numbers and spaces are allowed (same as product profile creation)
    return GENERIC_INVALID_CHARSET_MESSAGE;
  }
  return null;
};

const GroupName = forwardRef((props, ref) => {
  const classes = useStyles();
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
    const trimmedGroupName = groupName.trim();
    if (trimmedGroupName === "") {
      props.addSnack({
        message: "Group name can't be empty",
        options: {
          variant: "error",
        },
      });
      return;
    }
    const isAssort = isAssortSmartApp(location.pathname);
    const validationError = getStoreGroupNameValidationError(
      trimmedGroupName,
      isAssort
    );
    if (validationError) {
      displaySnackMessages(validationError, "error");
      return;
    }
    let storeJSON = {
      name: replaceSpecialCharToCharCode(trimmedGroupName),
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
          message: createResp?.data?.message || "Group already exists",
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
      className={`${classes.storeGrpingNameDialog}`}
      open={props.open}
      onClose={props.handleClose}
      size="small"
      width={360}
      height={240}
      title="Store group name"
      primaryButtonLabel="Save"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={saveStoreGroup}
      onSecondaryButtonClick={props.handleClose}
      primaryButtonProps={{ variant: "primary" }}
      secondaryButtonProps={{ variant: "secondary" }}
    >
      {showLoader ? (
        <div className={classes.loaderContainer}>
          <Loader size="small" />
        </div>
      ) : (
        <div>
          <Input
            id="storeGrpingNameInp"
            placeholder="Enter here"
            value={groupName}
            label="Store group name"
            maxLength={40}
            inputProps={{ maxLength: 40 }}
            onChange={(event) => setgroupName(event.target.value)}
            isHelperText
            helperText="Max Characters limit is 40"
          />
        </div>
      )}
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
