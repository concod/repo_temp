import React, { useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import Button from "@mui/material/Button";
import { Box, CircularProgress } from "@mui/material";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useStyles } from "../plansmart-styles";
import Form from "../../../../core/Utils/form";
import { reportViewByOptions } from "modules/plansmart/constants-plansmart/stringConstants";
import Select from "core/Utils/select";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import { updateFilterChips } from "../plansmart-budget-table/budget-table-functions";
import FilterChips from "core/commonComponents/filters/filterChips";
import {
  setReportFilterLoader,
  setReportColDefLoader,
  setReportTableDataLoader,
} from "modules/plansmart/services-plansmart/Report/report-services";
import { getDefaultValues } from "../plansmart-utility";

const ReportSection = ({ handleTemplateBtn, handleViewType, viewType }) => {
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
          Preference
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
        <Box component="span" mr={2} mt={1}>
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

const ReportFilterComponent = (props) => {
  const { handleTemplateBtn, handleViewType, viewType, showPreferences = true } = props;
  const classes = useStyles();
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

  const filterBtnLoader =
    props.reportFilterLoader ||
    props.reportColDefLoader ||
    props.reportTableDataLoader;

  const handleReportTypeChange = (params) => {
    props.setReportType(params);
  };

  return (
    <div loader={props.reportFilterLoader}>
    {showPreferences &&
      <div className={`${classes.buttonsWrapper} ${classes.flexEnd}`}>
        <ReportSection
          handleTemplateBtn={handleTemplateBtn}
          handleViewType={handleViewType}
          viewType={viewType}
        />
      </div>
    }
      <CustomAccordion label="Report Types" defaultExpanded={true}>
        <LoadingOverlay loader={props.reportTypesFilterLoader}>
          {props.reportTypeFilterData.length > 0 && (
            <Form
              layout={"vertical"}
              maxFieldsInRow={5}
              handleChange={handleReportTypeChange}
              fields={props.reportTypeFilterData}
              updateDefaultValue={false}
              defaultValues={getDefaultValues(
                props.reportTypeFilterData,
                props.reportType
              )}
            />
          )}
          <Box mt={3} display="flex" justifyContent="flex-end">
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
          </Box>
        </LoadingOverlay>
      </CustomAccordion>
      <CustomAccordion label="Report Filters" defaultExpanded={true}>
        <LoadingOverlay loader={props.reportFilterLoader}>
          {props.filterData.length > 0 ? (
            <div>
              <Form
                layout={"vertical"}
                maxFieldsInRow={5}
                handleChange={props.handleChange}
                fields={props.filterData || []}
                updateDefaultValue={false}
                defaultValues={props.getDefaultValues}
              />

              <div
                className={`${classes.filterButtons} ${classes.filterMasterPlanBtn}`}
              >
                <Box mt={3} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="primary"
                    id="plansmartReport"
                    onClick={() => {
                      props.onReportTableFilter();
                    }}
                  >
                    Generate Report
                  </Button>
                </Box>
              </div>
            </div>
          ) : (
            "Please select a report type"
          )}
        </LoadingOverlay>
      </CustomAccordion>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    reportReducer: store.plansmartReducer.reportReducer,
    reportFilterLoader: store.plansmartReducer.reportReducer.reportFilterLoader,
    reportTypesFilterLoader:
      store.plansmartReducer.reportReducer.reportTypesFilterLoader,
    reportColDefLoader: store.plansmartReducer.reportReducer.reportColDefLoader,
    reportTableDataLoader:
      store.plansmartReducer.reportReducer.reportTableDataLoader,
    plansmartReportScreenConfig:
      store.plansmartReducer.planSmartCommonReducer.screenConfig.reports_screen,
  };
};
const mapDispatchToProps = (dispatch) => ({
  setReportFilterLoader: (payload) => dispatch(setReportFilterLoader(payload)),
  setReportColDefLoader: (payload) => dispatch(setReportColDefLoader(payload)),
  setReportTableDataLoader: (payload) =>
    dispatch(setReportTableDataLoader(payload)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ReportFilterComponent));
