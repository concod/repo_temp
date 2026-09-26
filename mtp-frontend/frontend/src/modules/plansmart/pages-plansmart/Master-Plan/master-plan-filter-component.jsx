import React, { useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import get from "lodash/get";
import Button from "@mui/material/Button";
import { Box, CircularProgress } from "@mui/material";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useStyles } from "../plansmart-styles";
import Form from "../../../../core/Utils/form";
import {
  FINAL_FORECAST,
  FINAL_PLAN,
  reportViewByOptions,
  statusCodeBasedOnPlanType,
} from "modules/plansmart/constants-plansmart/stringConstants";
import Select from "core/Utils/select";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import { updateFilterChips } from "../plansmart-budget-table/budget-table-functions";
import FilterChips from "core/commonComponents/filters/filterChips";
import {
  dimensionUpdateLoaderSelector,
  masterPlanApproveAccessSelector,
  masterPlanApproveApi,
  masterPlanApproveLoaderSelector,
  masterPlanApproveStatusSelector,
  masterPlanColDefLoaderSelector,
  masterPlanFilteredDataLoaderSelector,
  masterPlanLockAccessSelector,
  masterPlanLockApi,
  masterPlanLockLoaderSelector,
  masterPlanLockStatusSelector,
  masterPlanMetricFormulaLoaderSelector,
  masterPlanPersistFilterSelector,
} from "modules/plansmart/services-plansmart/Master-Plan/master-plan-services";
import HistoryToggleOffOutlinedIcon from '@mui/icons-material/HistoryToggleOffOutlined';

const ReportSection = ({
  handleTemplateBtn,
  handleViewType,
  viewType,
}) => {
  return (
    <Box display="flex" alignItems="center">
      <div>
        <Button
          variant="contained"
          color="primary"
          id="plansmartReport"
          onClick={handleTemplateBtn}
          sx={{ marginLeft: "10px" }}
        >
          Template
        </Button>
      </div>
      <Box
        display="flex"
        alignItems="center"
        ml={2}
        px={0.5}
        py={1}
        borderRadius="4px"
      >
        <Box component="span" mr={1}>
          View By:
        </Box>
        <Select
          options={reportViewByOptions}
          valueStyles={{
            width: "80px",
          }}
          value={viewType}
          onChange={handleViewType}
          isSearchable={false}
        />
      </Box>
    </Box>
  );
};

const MasterPlanFilterComponent = (props) => {
  const {
    screen,
    handleTemplateBtn,
    handleGenerateReportFun,
    handleViewType,
    viewType,
    filterDependency,
    metricFormulaLoader,
    isAllHierarchyLocked,
    hideLockAndApprove,
    planSmartApprover,
    masterPlanLockApiReq,
    masterPlanApproveApiReq,
    lockLoader,
    approveLoader,
    masterPlanFilterLoader,
    columnDefLoader,
    filteredDataLoader,
    seasonType,
    selectedFilters,
    dimensionUpdateLoader,
    approveAccess,
    lockAccess,
    approveStatus,
    lockStatus,
    handleHistoryModal,
  } = props;
  const classes = useStyles();
  const [showFilter, setShowFilter] = useState(true);
  const [filterChips, setFilterChips] = useState({
    filterConfig: [],
  });
  useEffect(() => {
    if (filteredDataLoader) {
      setShowFilter(false);
    }
  }, [filteredDataLoader]);

  useEffect(() => {
    const persistFilter = selectedFilters?.filter || {};
    const formattedFilter = props.filterData.reduce(
      (accumulator, filterObj) => {
        if (persistFilter[filterObj.accessor]) {
          if (
            filterObj.accessor === "season" &&
            persistFilter[`${filterObj.accessor}_options`]
          ) {
            return {
              ...accumulator,
              [filterObj.accessor]: persistFilter[
                `${filterObj.accessor}_options`
              ]?.map((selectedSeason) => selectedSeason.label),
            };
          }
          return {
            ...accumulator,
            [filterObj.accessor]: persistFilter[filterObj.accessor],
          };
        }
        return accumulator;
      },
      {}
    );
    updateFilterChips(
      props.filterData || [],
      formattedFilter,
      setFilterChips,
      "accessor",
      false,
      "label"
    );
  }, [selectedFilters?.filter]);

  const handleLock = () => {
    masterPlanLockApiReq(seasonType);
  };

  const handleApprove = () => {
    masterPlanApproveApiReq();
  };

  const filterBtnLoader =
    masterPlanFilterLoader || columnDefLoader || filteredDataLoader;

  return (
    <div loader={props.masterPlanFilterLoader}>
      <div className={`${classes.buttonsWrapper} ${classes.flexEnd}`}>
        {!columnDefLoader && !filteredDataLoader && !masterPlanFilterLoader && (
          <>
            {lockAccess && (
              <Button
                variant="outlined"
                color="primary"
                id="plansmartLockStatusBtn"
                loadingPosition="start"
                onClick={handleLock}
                sx={{
                  marginRight: "10px",
                }}
                disabled={approveLoader || lockLoader}
                startIcon={lockLoader ? <CircularProgress size="1rem" /> : null}
              >
                {lockStatus ? "Unlock" : "Lock"}
              </Button>
            )}
            {approveAccess && (
              <Button
                variant="contained"
                color="primary"
                id="plansmartApproveBtn"
                loadingPosition="start"
                sx={{
                  marginRight: "10px",
                }}
                onClick={handleApprove}
                disabled={approveLoader || !approveStatus}
                startIcon={
                  approveLoader ? <CircularProgress size="1rem" /> : null
                }
              >
                Approve
              </Button>
            )}
          </>
        )}
        <Button
          variant="outlined"
          color="primary"
          id="plansmartHistoryBtn"
          className={classes.button}
          onClick={() => {
            handleHistoryModal();
          }}
          startIcon={<HistoryToggleOffOutlinedIcon />}
        >
          History
        </Button>
        <Button
          variant="contained"
          color="primary"
          id="plansmartFilterBtn"
          loadingPosition="start"
          startIcon={
            filterBtnLoader ? (
              <CircularProgress size="1rem" />
            ) : (
              <FilterAltOutlinedIcon />
            )
          }
          onClick={() => setShowFilter(true)}
          disabled={filterBtnLoader}
        >
          Filters
        </Button>
        {screen === "report" && (
          <ReportSection
            handleTemplateBtn={handleTemplateBtn}
            handleViewType={handleViewType}
            viewType={viewType}
          />
        )}
      </div>
      {filterChips.filterConfig?.length > 0 && <FilterChips {...filterChips} />}
      <FilterModal
        open={showFilter}
        isModalFixedTop={true}
        closeOnOverlayClick={() => setShowFilter(false)}
        isOverflowVisible={true}
      >
        <CustomAccordion label="Basic Filters" defaultExpanded={true}>
          <LoadingOverlay
            loader={
              props.masterPlanFilterLoader ||
              metricFormulaLoader ||
              dimensionUpdateLoader
            }
          >
            <div>
              <Form
                layout={"vertical"}
                maxFieldsInRow={5}
                handleChange={props.handleChange}
                fields={props.filterData || []}
                updateDefaultValue={false}
                defaultValues={props.getDefaultValues}
              />
              {screen === "master_plan" && (
                <div
                  className={`${classes.filterButtons} ${classes.filterMasterPlanBtn}`}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    id="plansmartDasboardFilterBtn"
                    className={classes.button}
                    onClick={() => {
                      props.onMasterPlanTableFilter();
                    }}
                    disabled={filterBtnLoader || approveLoader || lockLoader}
                    startIcon={
                      filterBtnLoader ? <CircularProgress size="1rem" /> : null
                    }
                  >
                    Filter
                  </Button>
                  <Button
                    variant="contained"
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
              )}
            </div>
            {screen === "report" && (
              <Box mt={3} display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  id="plansmartReport"
                  onClick={handleGenerateReportFun}
                >
                  Generate Report
                </Button>
              </Box>
            )}
          </LoadingOverlay>
        </CustomAccordion>
      </FilterModal>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    masterPlanFilterLoader:
      store.plansmartReducer.masterPlanReducer.masterPlanFilterLoader,
    userAccessList: get(
      store,
      "tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList",
      {}
    ),
    metricFormulaLoader: masterPlanMetricFormulaLoaderSelector(store),
    lockLoader: masterPlanLockLoaderSelector(store),
    approveLoader: masterPlanApproveLoaderSelector(store),
    columnDefLoader: masterPlanColDefLoaderSelector(store),
    filteredDataLoader: masterPlanFilteredDataLoaderSelector(store),
    selectedFilters: masterPlanPersistFilterSelector(store),
    dimensionUpdateLoader: dimensionUpdateLoaderSelector(store),
    approveAccess: masterPlanApproveAccessSelector(store),
    lockAccess: masterPlanLockAccessSelector(store),
    approveStatus: masterPlanApproveStatusSelector(store),
    lockStatus: masterPlanLockStatusSelector(store),
  };
};
const mapDispatchToProps = (dispatch) => ({
  masterPlanLockApiReq: (seasonType) => dispatch(masterPlanLockApi(seasonType)),
  masterPlanApproveApiReq: () => dispatch(masterPlanApproveApi()),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(MasterPlanFilterComponent));
