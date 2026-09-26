import NavigationCrumbs from "../../../Utils/HeaderBreadCrumbs";
import { connect } from "react-redux";
import { Typography, Button } from "@mui/material";
import { makeStyles } from "@mui/styles";
import {
  deleteDefn,
  changeDataStatus,
} from "../product-unit-definition-service";
import { addSnack } from "../../../actions/snackbarActions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles({
  header: {
    marginTop: 15,
    marginLeft: 20,
  },
  flexStyle: {
    display: "flex",
    justifyContent: "space-between",
  },
});
const Header = (props) => {
  const classes = useStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const routeOptions = [
    {
      id: "unit_defn_scr",
      label: dynamicLabelsBasedOnTenant("product_unit_definition", "core"),
      action: () => {
        navigate("/product-unit-definition");
      },
    },
    {
      id: "create",
      label: location.pathname.includes("edit")
        ? "Edit Definition"
        : "Create New Definition",
      action: () => null,
    },
  ];

  const DeleteDefn = async () => {
    try {
      const defn_id = location.pathname.split("/")[4];
      await props.deleteDefn(defn_id);
      props.changeDataStatus({ status: true, type: "save" });
      props.addSnack({
        message: "Deleted Successfully",
        options: {
          variant: "success",
          autoHideDuration: 3000,
          onClose: () => {
            navigate("/product-unit-definition");
          },
        },
      });
    } catch (error) {
      props.addSnack({
        message: "Can't delete",
        options: {
          variant: "error",
        },
      });
    }
  };
  return (
    <>
      <NavigationCrumbs
        id="productUnitDefnCreateBrdCrmbs"
        options={routeOptions}
      />
      <div className={classes.flexStyle}>
        <Typography
          id="productUnitDefnCreateStyleTitle"
          className={classes.header}
        >
          Selected Style - Style ID: {location.pathname.split("/")[3]}
        </Typography>
        {location.pathname.includes("edit") && (
          <Button
            id="productUnitDefnDltBtn"
            variant="contained"
            color="primary"
            onClick={DeleteDefn}
          >
            Delete
          </Button>
        )}
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    selectedStyleId: state.UnitDefnReducer.selectedStyleId,
  };
};

const mapActionsToProps = {
  deleteDefn,
  addSnack,
  changeDataStatus,
};
export default connect(mapStateToProps, mapActionsToProps)(Header);
