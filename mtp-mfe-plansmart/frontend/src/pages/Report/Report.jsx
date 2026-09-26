import PropTypes from "prop-types";
import { useState, useEffect, useCallback } from "react";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { Button } from "impact-ui";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import "./Report.css";
import Form from "core/Utils/form";
import LoadingOverlay from "core/Utils/Loader/loader";
import * as actions from "../CommonDashboard/dashboard.slice";
import { bindActionCreators } from "redux";
import * as apis from "./apis";
import { useDispatch, connect } from "react-redux";
import { getUpdatedDefaultValues, validateYearSelection } from "./report.util";
import { FORM_LABEL, REPORT_LABEL } from "./report.constant";

const Report = (props) => {
  const {
    formFields,
    fetchFilterConfig,
    fetchFormFieldDataApi,
    generateReportApi,
    fetchReportType,
    reports
  } = props;

  const dispatch = useDispatch();

  const [fields, setFields] = useState([]);
  const [fieldsDefaultValues, setFieldsDefaultValues] = useState({});
  const [isGenerateReportDisabled, setIsGenerateReportDisabled] = useState(
    false
  );
  const [filterLoader, setFilterLoader] = useState(false);
  const [generateReportLoader, setGenerateReportLoader] = useState(false);
  const [rest, setRest] = useState(true);
  const [selectedReport, setSelectedReport] = useState("");

  useEffect(async () => {
    const reportTypes = await fetchReportType(setFilterLoader);
    if (reportTypes && reportTypes[0]?.options?.length == 1) {
      await fetchFilterConfig(
        setFilterLoader,
        reportTypes[0]?.options[0]?.value
      );
      setSelectedReport(reportTypes[0]?.options[0]?.value);
    }
  }, []);

  useEffect(() => {
    if (formFields) {
      setFields(formFields);
    }

    const validateRequiredFields = formFields?.every((field) => {
      const value = fieldsDefaultValues[field.accessor];
      return (
        !field.required ||
        (value !== undefined && !(Array.isArray(value) && value.length === 0))
      );
    });

    setIsGenerateReportDisabled(validateRequiredFields);
  }, [formFields, fieldsDefaultValues]);

  const onFormUpdate = (defaultValues, fieldKey) => {
    const updatedDefaultValues = getUpdatedDefaultValues({
      newDefaultValues: defaultValues,
      prevDefaultValues: fieldsDefaultValues,
      fieldKey
    });
    setFieldsDefaultValues(updatedDefaultValues);
  };

  const onDropdownOpen = useCallback(
    (dropdownDispatch, selectedField) => {
      dropdownDispatch({ type: "OPTION_INIT" });
      fetchFormFieldDataApi({
        selectedField,
        formFields,
        dropdownDispatch,
        fieldsDefaultValues
      });
    },
    [formFields, fieldsDefaultValues]
  );

  const onReportDropdownOpen = (selectedReport) => {
    fetchFilterConfig(setFilterLoader, selectedReport?.plansmart_report_type);
    setRest(false);
    setSelectedReport(selectedReport?.plansmart_report_type);
  };

  const onGenerateReport = () => {
    if (validateYearSelection(fieldsDefaultValues, dispatch)) {
      generateReportApi(
        {
          fields,
          fieldsDefaultValues
        },
        setGenerateReportLoader,
        setFieldsDefaultValues
      );
    }
  };
  const onResetReportType = () => {
    setRest(true);
    setFields([]);
    setSelectedReport("");
  };
  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Report",
            id: 1
          }
        ]}
      />
      {reports[0]?.options.length > 1 && (
        <div className="filter-wrapper">
          <CustomAccordion label={REPORT_LABEL} defaultExpanded={true}>
            <LoadingOverlay loader={filterLoader}>
              <div>
                <Form
                  fields={reports?.map((field) => ({
                    ...field
                  }))}
                  maxFieldsInRow={4}
                  updateDefaultValue={false}
                  layout={"vertical"}
                  handleChange={(e) => onReportDropdownOpen(e)}
                  defaultValues={fieldsDefaultValues}
                  handleDropdownClose={true}
                />

                <div className="filter-button">
                  <Button
                    className="customActionButton"
                    variant="primary"
                    id="plansmartReportGenerateBtn"
                    onClick={onResetReportType}
                    disabled={rest}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </LoadingOverlay>
          </CustomAccordion>
        </div>
      )}

      <div className="filter-wrapper">
        <CustomAccordion label={FORM_LABEL} defaultExpanded={true}>
          <LoadingOverlay loader={filterLoader}>
            {selectedReport && (
              <div>
                <Form
                  fields={fields.map((field) => ({
                    ...field,
                    dropdownOpenCallback: onDropdownOpen
                  }))}
                  maxFieldsInRow={4}
                  updateDefaultValue={false}
                  layout={"vertical"}
                  handleChange={onFormUpdate}
                  defaultValues={fieldsDefaultValues}
                />

                <div className="filter-button">
                  <Button
                    className="customActionButton"
                    variant="primary"
                    id="plansmartReportGenerateBtn"
                    onClick={onGenerateReport}
                    disabled={generateReportLoader || !isGenerateReportDisabled}
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            )}
          </LoadingOverlay>
        </CustomAccordion>
      </div>
    </>
  );
};

Report.propTypes = {
  fetchFilterConfig: PropTypes.func,
  fetchFormFieldDataApi: PropTypes.func,
  formFields: PropTypes.array,
  generateReportApi: PropTypes.func
};

const mapStateToProps = (state) => ({
  formFields: actions.formFieldsSelector(state),
  reports: actions.reportSelector(state)
});

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators({ ...actions, ...apis }, dispatch)
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Report);
