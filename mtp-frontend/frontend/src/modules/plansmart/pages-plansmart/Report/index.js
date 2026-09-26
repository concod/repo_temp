import React, { useState, useEffect } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { Container } from "@mui/material";
import { cloneDeep } from "lodash";
import {
  getFiltersOptions,
  getFilterDependency,
  getDefaultValues,
  generateFilterConfig,
} from "../plansmart-utility";
import { CreatePlan } from "../../constants-plansmart/stringConstants";
import { addSnack } from "../../../../core/actions/snackbarActions";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import ReportFilterComponent from "../Report/reportFilterComponent";
import ReportTableComponent from "./ReportTableComponent";
import { reportViewByOptions } from "modules/plansmart/constants-plansmart/stringConstants";
import {
  handleReportDownload,
  handleReportSubmission,
} from "modules/plansmart/utils-plansmart";
import { getSeasonOptions } from "modules/plansmart/services-plansmart/CreateNewPlan/create-new-plan-service";
import {
  getAllAccessTypeData,
  getFilterAccessibleValues,
} from "core/Utils/filter-accessible-data";

import {
  getReportTemplate,
  saveReportTemplate,
  setSaveTemplateLoader,
  clearReportAllData,
  setReportFilterLoader,
  setReportColDefLoader,
  setReportTableDataLoader,
  getReportFilterConfiguration,
  setReportTypesFilterLoader,
} from "modules/plansmart/services-plansmart/Report/report-services";
import ReportPrefernceModal from "./reportPreferenceModal";
import { planSmartDownloadReport } from "../../services-plansmart/common/plansmart-common-service";

const Report = (props) => {
  const [reportFilterElements, setReportFilterElements] = useState([]);
  const [reportFilterDependency, setReportFilterDependency] = useState({});
  const [reportFilterPayload, setReportFilterPayload] = useState([]);
  const [templateModal, setTemplateModal] = useState(false);
  const [selectedViewType, setSelectedViewType] = useState(
    reportViewByOptions[0]
  );

  const [importedFilter, setImportedFilter] = useState(false);
  const [reportType, setReportType] = useState({});

  const [reportTypeFilterData, setReportTypeFilterData] = useState([]);

  useEffect(() => {
    fetchReportTypeFilterConfig();
  }, []);

  const fetchReportTypeFilterConfig = async () => {
    props.setReportTypesFilterLoader(true);
    const filterData = await props.getReportFilterConfiguration(
      "plansmart report types"
    );
    const fields = generateFilterConfig(
      filterData?.data?.data,
      props.userAccessList,
      null,
      null,
      "plansmart report",
      props.addSnack,
      props.tenantFilterUamConfig
    );

    fields.then(async (data) => {
      const formattedData = data.map((filterObj) => ({
        ...filterObj,
      }));

      setReportTypeFilterData(formattedData);
      props.setReportTypesFilterLoader(false);
    });
  };
  /**
   * @function
   * @description Fetch filter config on report type change
   */
  useEffect(() => {
    setReportFilterDependency({});
    fetchReportFilterConfig();
  }, [reportType]);

  useEffect(() => {
    if (importedFilter) {
      handleGenerateReportFun();
      setImportedFilter(false);
    }
  }, [importedFilter]);

  /**
   * @function
   * @description Fetch the inital form Attributes to setup the form.
   */
  const fetchReportFilterConfig = async () => {
    props.setReportFilterLoader(true);
    try {
      const filterConfig =
        props.plansmartReportScreenConfig.report_types[
          reportType.plansmart_report_type
        ].filter_config;

      const filterData = await props.getReportFilterConfiguration(filterConfig);
      const fields = generateFilterConfig(
        filterData?.data?.data,
        props.userAccessList,
        null,
        null,
        "plansmart report",
        props.addSnack,
        props.tenantFilterUamConfig
      );

      fields.then(async (data) => {
        const formattedData = data.map((filterObj) => ({
          ...filterObj,
        }));

        setReportFilterElements(formattedData);
        props.setReportFilterLoader(false);
      });
    } catch (error) {
      props.setReportFilterLoader(false);
    }
  };

  /**
   * @function
   * @description Handle filter operations to show to the table.
   */
  const handleGenerateReportFun = () => {
    handleReportDownload({
      addSnack: props.addSnack,
      filterElements: reportFilterElements,
      filterDependency: reportFilterDependency,
      setFilterPayload: setReportFilterPayload,
    });
  };

  const getFilterOption = (
    id,
    reportFilterElements,
    newUpdatedData,
    filterAccessibleValues,
    props
  ) => {
    const filterData = [...reportFilterElements];
    const filterIdx = filterData.findIndex((filter) => {
      return filter.column_name === id;
    });
    filterData.forEach((filter, idx) => {
      if (
        idx > filterIdx &&
        filter.dimension === filterData[filterIdx].dimension
      ) {
        delete newUpdatedData[filter.accessor];
      }
    });
    const Idx = filterData.findIndex((filter) => {
      return filter.accessor === id;
    });
    let newdependency = getFilterDependency(
      reportFilterElements,
      newUpdatedData,
      Idx,
      reportFilterElements[Idx]?.dimension
    );
    const newUpdateDependency = newdependency.filter(
      (depend) => depend.values.length > 0
    );
    const options = getFiltersOptions(
      reportFilterElements,
      newUpdateDependency,
      Idx,
      "plansmart report",
      reportFilterElements[Idx]?.dimension,
      props.tenantFilterUamConfig
    );
    options
      .then((data) => {
        setReportFilterElements(filterAccessibleValues(data));
        props.setReportFilterLoader(false);
      })
      .catch((error) => {
        props.setReportFilterLoader(false);
      });
  };

  /**
   * @function
   * @description Handle Data on every change of form Element
   * @param {String} formObjectName
   * @param {Object} formObjectValue
   */
  const reportFilterChange = async (updatedFormData, id) => {
    const filterAccessibleValues = (tempData) => {
      let allCreateAccess = getAllAccessTypeData(
        props.userAccessList,
        "create"
      );
      return getFilterAccessibleValues(tempData, allCreateAccess);
    };
    props.setReportFilterLoader(true);
    const newUpdatedData = {
      ...reportFilterDependency,
      ...updatedFormData,
    };
    if (id === "plansmart_year_value") {
      props.setReportFilterLoader(true);
      let seasonResponse =
        newUpdatedData[id] && [newUpdatedData[id]].flat().length > 0
          ? await getSeasonOptions({
              filters: [
                {
                  attribute_name: "year",
                  value: newUpdatedData[id] ? [newUpdatedData[id]].flat() : [],
                  operator: "in",
                },
              ],
            })()
          : null;
      if (seasonResponse?.data?.status || seasonResponse === null) {
        let updatedPlanFilterConfig = cloneDeep(reportFilterElements);
        updatedPlanFilterConfig.forEach((item) => {
          if (item.accessor === "season") {
            item.options = seasonResponse
              ? seasonResponse?.data?.data.map((opt) => {
                  return {
                    label: opt.name,
                    value: opt.attribute_value.incremental_id,
                    id: opt.attribute_value.incremental_id,
                  };
                })
              : [];
          }
        });
        newUpdatedData["season"] = [];
        setReportFilterElements(updatedPlanFilterConfig);
        props.setReportFilterLoader(false);
      }
    }
    if (CreatePlan.__plan_levels.indexOf(id) > -1) {
      props.setReportFilterLoader(true);
      getFilterOption(
        id,
        reportFilterElements,
        newUpdatedData,
        filterAccessibleValues,
        props
      );
    }
    if (CreatePlan.__store_levels.indexOf(id) > -1) {
      getFilterOption(
        id,
        reportFilterElements,
        newUpdatedData,
        filterAccessibleValues,
        props
      );
    }

    setReportFilterDependency(newUpdatedData);
    props.setReportFilterLoader(false);
  };

  const handleTemplateModal = (value) => {
    setTemplateModal(value);
  };
  const handleViewType = (value) => {
    setSelectedViewType(value);
  };

  const onReportTableFetch = () => {
    handleReportDownload({
      addSnack: props.addSnack,
      filterElements: reportFilterElements,
      filterDependency: reportFilterDependency,
      setFilterPayload: setReportFilterPayload,
      planSmartDownloadReport: props.planSmartDownloadReport,
      reportType: reportType.plansmart_report_type,
      plansmartReportScreenConfig:
        props.plansmartReportScreenConfig.report_types,
    });
  };

  const onReportFilterReset = () => {
    setReportFilterDependency({});
    setReportFilterPayload([]);
    setReportType({});
    setReportFilterElements([]);
    props.clearReportAllData();
  };
  return (
    <React.Fragment>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Report",
            id: 1,
          },
        ]}
      />
      {templateModal && (
        <ReportPrefernceModal
          open
          onClose={() => {
            setTemplateModal(false);
          }}
        />
      )}
      <Container maxWidth={false}>
        <ReportFilterComponent
          filterData={reportFilterElements}
          handleChange={reportFilterChange}
          getDefaultValues={getDefaultValues(
            reportFilterElements,
            reportFilterDependency
          )}
          filterDependency={reportFilterDependency}
          onReportTableFilter={onReportTableFetch}
          onReset={onReportFilterReset}
          handleGenerateReportFun={handleGenerateReportFun}
          handleTemplateBtn={() => handleTemplateModal(true)}
          handleViewType={handleViewType}
          viewType={selectedViewType}
          screen="report"
          reportType={reportType}
          setReportType={setReportType}
          reportTypeFilterData={reportTypeFilterData}
          showPreferences={props.plansmartReportScreenConfig.report_types.preferences_section}
        />

        {/* {reportFilterPayload.length > 0 && (
          <ReportTableComponent
            reportFilterPayload={reportFilterPayload}
            viewType={selectedViewType.value}
          />
        )} */}
      </Container>
    </React.Fragment>
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
    userAccessList:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    plansmartReportScreenConfig:
      store.plansmartReducer.planSmartCommonReducer.screenConfig.reports_screen,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};
// Here fetch report services / actions created
const mapDispatchToProps = (dispatch) => ({
  getReportFilterConfiguration: (payload) =>
    dispatch(getReportFilterConfiguration(payload)),
  setReportFilterLoader: (payload) => dispatch(setReportFilterLoader(payload)),
  setReportTypesFilterLoader: (payload) =>
    dispatch(setReportTypesFilterLoader(payload)),
  setReportColDefLoader: (payload) => dispatch(setReportColDefLoader(payload)),
  setReportTableDataLoader: (payload) =>
    dispatch(setReportTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  saveReportTemplate: (payload) => dispatch(saveReportTemplate(payload)),
  setSaveTemplateLoader: (payload) => dispatch(setSaveTemplateLoader(payload)),
  getReportTemplateReq: () => dispatch(getReportTemplate()),
  clearReportAllData: () => dispatch(clearReportAllData()),
  planSmartDownloadReport: (payload, reportType) =>
    dispatch(planSmartDownloadReport(payload, reportType)),
});
export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Report));
