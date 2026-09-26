import { Typography, Grid, IconButton } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import Select from "core/commonComponents/filters/Select/Select";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import { Add } from "@mui/icons-material";
import { useHistory } from "react-router";
import { CREATE_STORE_GROUP } from "modules/assortsmart/constants-assortsmart/routesContants";
import { connect } from "react-redux";
import { configureStoreSelection } from "./common-functions";
import { showCreateStoreGroup } from "../../../../../assortsmart/utils-assortsmart/utilityFunctions";
import { appName } from "config/constants";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";

const useStyles = makeStyles({
  createStoreGrpOptDiv: {
    border: "1px solid #eaeef3",
    borderRadius: 5,
    background: "#f9fafc",
    paddingTop: 8,
    paddingBottom: 8,
    "&:hover": {
      cursor: "pointer",
    },
  },
  createStoreGrpOptText: {
    marginLeft: 5,
  },
});
const StoresDropDown = (props) => {
  const history = useHistory();
  const navigateToStoreGrp = () => {
    localStorage.setItem("currentApp", appName.WORKFLOW_INPUT_CENTER);
    history.push({
      pathname: `${CREATE_STORE_GROUP}`,
      state: {
        prevScr: history.location.pathname,
      },
    });
  };
  const classes = useStyles();
  const sharedClasses = sharedStyles();
  const createStoreGroupLabel = (
    <div className={classes.createStoreGrpOptDiv} onClick={navigateToStoreGrp}>
      <IconButton
        className={sharedClasses.addIcon}
        size="small"
        onClick={navigateToStoreGrp}
      >
        <Add />
      </IconButton>
      <span className={classes.createStoreGrpOptText}>
        {"Create Store Group"}
      </span>
    </div>
  );

  return (
    <>
      <Grid container justifyContent="center">
        <Grid className={sharedClasses.textCenter} item xs={4}>
          <Grid container justifyContent="flex-end">
            <Typography>
              Select the store(s) for which you want to create a plan{" "}
            </Typography>
          </Grid>
        </Grid>
        <Grid classes={{ root: sharedClasses.textCenter }} item xs={2}>
          <Select
            id="assortClusterStoreGrpDrpDwn"
            customLabel={
              showCreateStoreGroup(props.planDetails?.data)
                ? createStoreGroupLabel
                : null
            }
            isDisabled={props.selectedChannel?.length < 1}
            menuPosition={"fixed"}
            menuShouldBlockScroll={true}
            dependency={[]}
            initialData={props.stores}
            selectedOptions={
              (!props.selectedGrp && props.selectedGrp !== 0) ||
              props.selectedGrp === "" ||
              props.selectedGrp.length === 0
                ? []
                : configureStoreSelection(props.selectedGrp, props.stores)
            }
            label={"Store Group"}
            updateDependency={(key, option) => props.onChange(option[0])}
            isClearable={false}
            handleDropdownClose={true}
          />
        </Grid>
      </Grid>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
  };
};
export default connect(mapStateToProps, null)(StoresDropDown);
