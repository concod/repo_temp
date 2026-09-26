import { forwardRef, useState } from "react";
import {
  createNewGroup,
  resetFilterProds,
  setSelectedProductGrpType,
  ToggleLoader,
} from "core/pages/product-grouping/product-grouping-service";
import { addSnack } from "../../../../actions/snackbarActions";
import { connect } from "react-redux";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import { formatFiltersDependency } from "core/pages/store-grouping/components/common-functions";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { useNavigate } from "react-router-dom-v5-compat";
import { Input, Modal } from "impact-ui-v3";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { EXCLUDED_SPECIAL_CHARACTERS } from "core/constants";
import { hasExcludedSpecialCharacters } from "core/Utils/functions/utils";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles({
  productGroupNameModal: {
    '&.ia_modalPopover .ia_modalBody': {
      padding: '12px 16px 16px !important'
    },
  },
});

const GroupName = forwardRef((props, ref) => {
  const classes = useStyles();
  const [groupName, setgroupName] = useState("");
  const [showLoader, setshowLoader] = useState(false);
  const navigate = useNavigate();
  const saveProductGroup = async () => {
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
        `Group Name cannot have these characters " ${EXCLUDED_SPECIAL_CHARACTERS?.join(
          ` ", " `
        )} " Please change the name and try again.`,
        "error"
      );
      return;
    }
    let productJSON = {
      name: replaceSpecialCharToCharCode(groupName),
      group_type: props.group_type,
      definitions: [],
      exclude_product_ids: [],
      product_ids: [],
      hierarchy_ids: [],
      product_group_ids: [],
    };
    if (props.group_type === "manual") {
      const productTableParams = ref.productLvlRef;
      const productGroupTableParams = ref.productGroupLvlRef;
      const styleTableParams = ref.styleLvlRef;
      if (props.selectedManualFilterType !== "product_hierarchy") {
        productJSON.definitions = Array.isArray(props.selectedDfns)
          ? props.selectedDfns.map((defn) => defn.pgd_code)
          : [props.selectedDfns.pgd_code];
        productJSON.exclude_product_ids = props.excludedDefnProds.map(
          (prod) => prod.product_code
        );
      } else {
        productJSON.product_ids = {
          filters: formatFiltersDependency(
            props.selectedFilters,
            "product",
            true
          ),
          meta: {
            search: [],
            range: [],
            sort: [],
          },
          metrics: [],
          selection: {
            data:
              (props.isStyleLevel
                ? styleTableParams?.current?.api?.checkConfiguration
                : productTableParams?.current?.api?.checkConfiguration) || [],
            unique_columns: [
              props.isStyleLevel
                ? dynamicLabelKeysBasedOnTenant("style", "core")
                : "product_code",
            ],
          },
        };
        productJSON.product_group_ids = {
          filters: formatFiltersDependency(
            props.selectedFilters,
            "product",
            true
          ),
          meta: {
            search: [],
            range: [],
            sort: [],
          },
          metrics: [],
          selection: {
            data:
              productGroupTableParams?.current?.api?.checkConfiguration || [],
            unique_columns: ["pg_code"],
          },
        };
      }
    } else {
      productJSON.product_ids = props.selectedProducts.map(
        (product) => product.product_code
      );
      productJSON["objective_metrics"] = props.clusterData.metrics.metrics;
    }
    try {
      setshowLoader(true);
      props.handleClose();
      props.ToggleLoader(true);
      await props.createNewGroup(productJSON, props.isStyleLevel);
      props.addSnack({
        message: "Group created successfully",
        options: {
          variant: "success",
          onClose: () => {
            navigate(`${STORE_ELIGIBILITY_GROUP}/product-grouping`);
          },
        },
      });
      setshowLoader(false);
      props.ToggleLoader(false);
      props.resetFilterProds();
    } catch (error) {
      setshowLoader(false);
      props.ToggleLoader(false);
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
  const handleErrorMessage = (e, displaySnackMessages) => {
    const errObj = e?.response?.data;
    if (errObj?.message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages("Something went wrong", "error");
  };
  return (
    <Modal
      className={classes.productGroupNameModal}
      height={240}
      width={360}
      onClose={() => {
        props.handleClose();
      }}
      onPrimaryButtonClick={() => {
        saveProductGroup();
      }}
      onSecondaryButtonClick={() => {
        props.handleClose(true);
      }}
      primaryButtonLabel="Submit"
      secondaryButtonLabel="Cancel"
      size="small"
      title={`${dynamicLabelsBasedOnTenant(
        "Product",
        "Core"
      )} group name`}
      open={props.open}
    >
      <Input
        id="productGrpingGrpDfnNameInp"
        placeholder="Enter here"
        fullWidth
        isDisabled={showLoader}
        value={groupName}
        onChange={(event) => setgroupName(event.target.value)}
        inputProps={{ maxLength: 40 }}
        helperText="Max Characters limit is 40"
        label="Product Group Name"
      />
    </Modal>
  );
});

const mapStateToProps = (state) => {
  return {
    hierarchy_filters: state.filterReducer.selectedFilters,
    group_type: state.productGroupReducer.selectedGroupType,
    selectedManualFilterType:
      state.productGroupReducer.selectedManualFilterType,
    selectedDfns: state.productGroupReducer.manualGroupDfnFilters,
    selectedProducts: state.productGroupReducer.selectedProducts,
    selectedGroups: state.productGroupReducer.manualselectedGroups,
    excludedDefnProds: state.productGroupReducer.deleteProdsInDefn,
  };
};
const mapActionsToProps = {
  createNewGroup,
  addSnack,
  resetFilterProds,
  setSelectedProductGrpType,
  ToggleLoader,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(GroupName);
