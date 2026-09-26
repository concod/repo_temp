import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { forwardRef, useState } from "react";
import {
  createNewGroup,
  resetFilterProds,
  setSelectedProductGrpType,
} from "core/pages/product-grouping/product-grouping-service";
import { addSnack } from "../../../../actions/snackbarActions";
import { connect } from "react-redux";
import { LinearProgress } from "@mui/material";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import { formatFiltersDependency } from "core/pages/store-grouping/components/common-functions";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { useNavigate } from "react-router-dom-v5-compat";

const GroupName = forwardRef((props, ref) => {
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
      await props.createNewGroup(productJSON, props.isStyleLevel);
      props.addSnack({
        message: "Group created successfully",
        options: {
          variant: "success",
          autoHideDuration: 3000,
        },
      });
      setTimeout(() => {
        navigate("/product-grouping");
      }, 3000);
      setshowLoader(false);
      props.handleClose();
      props.resetFilterProds();
    } catch (error) {
      props.addSnack({
        message: error?.response?.data?.message || "Group creation failed",
        options: {
          variant: "error",
        },
      });
      setshowLoader(false);
    }
  };
  return (
    <Dialog
      id="productGrpingGrpNameDialog"
      open={props.open}
      fullWidth={true}
      maxWidth={"sm"}
      onClose={props.handleClose}
      aria-labelledby="form-dialog-title"
      onBackdropClick="false"
    >
      {showLoader && <LinearProgress />}
      <DialogTitle id="form-dialog-title">{`Enter ${dynamicLabelsBasedOnTenant(
        "product",
        "core"
      )} group name`}</DialogTitle>
      <DialogContent>
        <TextField
          id="productGrpingGrpDfnNameInp"
          autoFocus
          margin="dense"
          placeholder="Enter here"
          fullWidth
          disabled={showLoader}
          value={groupName}
          onChange={(event) => setgroupName(event.target.value)}
          inputProps={{ maxLength: 40 }}
          helperText="Max Characters limit is 40"
        />
      </DialogContent>
      <DialogActions>
        <Button
          disabled={showLoader}
          onClick={() => props.handleClose(true)}
          color="primary"
          id="productGrpingGrpDfnNameCnclBtn"
        >
          Cancel
        </Button>
        <Button
          disabled={showLoader}
          onClick={saveProductGroup}
          color="primary"
          id="productGrpingGrpDfnNameSaveBtn"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
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
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(GroupName);
