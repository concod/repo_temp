import React, { useEffect, useState } from "react";
import { withRouter, useHistory } from "react-router-dom";
import LoadingOverlay from "core/Utils/Loader/loader";
import Button from "@mui/material/Button";
import { useStyles } from "../plansmart-styles";
import Form from "../../../../core/Utils/form";
import { connect } from "react-redux";
import { PLAN_SMART_MASTER_PLAN } from "../../constants-plansmart/routesConstants";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { updateFilterChips } from "../plansmart-budget-table/budget-table-functions";
import FilterChips from "core/commonComponents/filters/filterChips";
import {
  CREATE_PLAN_IN_SEASON,
  CREATE_PLAN_PRE_SEASON,
} from "modules/plansmart/constants-plansmart/stringConstants";

export const PlansmartDashboardFilter = (props) => {
  const classes = useStyles();
  const history = useHistory();
  const [showFilter, setShowFilter] = useState(false);
  const [filterChips, setFilterChips] = useState({
    filterConfig: [],
  });
  useEffect(() => {
    updateFilterChips(
      props.filterData || [],
      props.filterDependency,
      setFilterChips,
      "accessor",
      false,
      "label"
    );
  }, [props.filterData, props.filterDependency]);

  const masterPlanUrl = `${PLAN_SMART_MASTER_PLAN}?season_type=${
    props?.isInSeasonDashbaord ? CREATE_PLAN_IN_SEASON : CREATE_PLAN_PRE_SEASON
  }`;

  return (
    <>
      <div className={`${classes.buttonsWrapper} ${classes.flexEnd}`}>
        <Button
          variant="outlined"
          color="primary"
          id="plansmartMasterPlanBtn"
          className={classes.button}
          sx={{ marginLeft: "10px" }}
          onClick={() => {
            history.push(masterPlanUrl);
          }}
        >
          Master Plan
        </Button>
        <Button
          variant="contained"
          color="primary"
          id="plansmartSnapshotsBtn"
          className={`${classes.button} ${classes.hide}`}
          onClick={() => {
            // Handle Snapshot operation
          }}
        >
          Snapshots
        </Button>
        <Button
          variant="contained"
          color="primary"
          id="plansmartUpdatePlanBtn"
          loadingPosition="start"
          startIcon={<FilterAltOutlinedIcon />}
          onClick={() => setShowFilter(true)}
        >
          Select Filters
        </Button>
      </div>
      {filterChips.filterConfig.length > 0 && <FilterChips {...filterChips} />}
      <FilterModal
        open={showFilter}
        isModalFixedTop={true}
        closeOnOverlayClick={() => setShowFilter(false)}
        isOverflowVisible={true}
      >
        <CustomAccordion label="Basic Filters" defaultExpanded={true}>
          <LoadingOverlay loader={props.plansmartFilterLoader}>
            <div className={classes.filterBoardMain}>
              <Form
                layout={"vertical"}
                maxFieldsInRow={5}
                handleChange={props.handleChange}
                fields={props.filterData || []}
                updateDefaultValue={false}
                defaultValues={props.getDefaultValues}
              />

              <div className={classes.filterButtons}>
                <Button
                  variant="contained"
                  color="primary"
                  id="plansmartDasboardFilterBtn"
                  className={classes.button}
                  onClick={() => {
                    props.onPlanSmartDashboardFilter();
                  }}
                  disabled={props.plansmartFilterLoader}
                >
                  Filter
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  id="plansmartDasboardFilterReset"
                  className={classes.button}
                  onClick={() => {
                    props.onReset();
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </LoadingOverlay>
        </CustomAccordion>
      </FilterModal>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    plansmartFilterLoader:
      store.plansmartReducer.planDashboardReducer.plansmartFilterLoader,
  };
};

export default connect(mapStateToProps)(withRouter(PlansmartDashboardFilter));
