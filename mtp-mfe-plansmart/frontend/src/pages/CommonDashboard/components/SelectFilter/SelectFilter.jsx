import PropTypes from "prop-types";
import React, { useCallback, useEffect, useState } from "react";
import { connect, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom-v5-compat";
import { bindActionCreators } from "redux";
import { Button } from "impact-ui";
import FilterIcon from "assets/filterButtonIcon.svg";

import CustomAccordion from "core/commonComponents/Custom-Accordian";
import Form from "core/Utils/form";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import LoadingOverlay from "core/Utils/Loader/loader";

import * as actions from "../../dashboard.slice";
import * as apis from "./apis";
import * as dashboardApi from "../../dashboard.api";
import styles from "./selectFilter.styles";
import {
  validateYearSelection,
  getUpdatedDefaultValues
} from "./selectFilters.util";
import "./SelectFilter.scss";
import { noop } from "lodash";

function SelectFilter({
  selectedScreenName,
  filterConfigUrl,
  filterConfigPayload,
  filterLoader,
  formFields,
  fetchFilterConfig,
  fetchFormFieldDataApi,
  getDashboardTableData,
  handleFilter = noop(),
  setFilterLoader,
  showFilterStatus = false,
  resetFilter,
  fieldsDefaultValues,
  setFieldsDefaultValues,
  callDropdownApi,
  setCallDropdownApi,
  setformFields,
  modalTopValue
}) {
  const classes = styles();
  const dispatch = useDispatch();
  const location = useLocation();
  const showFilterState = location?.state;
  const showFilterValue = !showFilterState;
  const [fields, setFields] = useState([]);
  const [showFilter, setShowFilter] = useState(
    !showFilterValue ? showFilterValue : showFilterStatus
  );
  const [isFilterDisabled, setIsFilterDisabled] = useState(false);

  useEffect(() => {
    return () => {
      setFieldsDefaultValues({});
      setformFields([]);
    };
  }, []);

  useEffect(() => {
    if (formFields) {
      setFields(formFields);
    }
    const validateRequiredFields = fields.every((field) => {
      return !field.required || fieldsDefaultValues[field.accessor];
    });

    setIsFilterDisabled(validateRequiredFields);
  }, [formFields, fieldsDefaultValues]);
  useEffect(() => {
    if (!callDropdownApi) return;
    (async () => {
      for (const field in fieldsDefaultValues) {
        const selectedField = formFields.filter(
          (fields) => fields.accessor === field
        )[0];
        await fetchFormFieldDataApi({
          selectedField,
          fieldsDefaultValues,
          selectedScreenName
        });
      }
    })().finally(() => {
      setCallDropdownApi(false);
    });
  }, [fieldsDefaultValues]);

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
        dropdownDispatch,
        fieldsDefaultValues,
        selectedScreenName
      });
    },
    [formFields, fieldsDefaultValues]
  );
  const onFilter = () => {
    if (validateYearSelection(fieldsDefaultValues, dispatch)) {
      if (handleFilter) {
        handleFilter(fieldsDefaultValues, fields);
      } else {
        getDashboardTableData(selectedScreenName, fieldsDefaultValues);
      }
      setShowFilter(false);
    }
  };

  return (
    <>
      <Button
        className="customActionButton"
        variant="secondary"
        id="plansmartUpdatePlanBtn"
        data-testid="plansmartFilterBtn"
        loadingPosition="start"
        icon={FilterIcon}
        onClick={() => {
          setShowFilter(true);
          if (formFields?.length === 0) {
            fetchFilterConfig(
              selectedScreenName,
              filterConfigUrl,
              filterConfigPayload,
              fieldsDefaultValues
            );
          }
        }}
      >
        Filters
      </Button>

      <FilterModal
        open={showFilter}
        isModalFixedTop={true}
        closeOnOverlayClick={() => {
          setShowFilter(false);
        }}
        isOverflowVisible={true}
        modalTopValue={modalTopValue}
      >
        <CustomAccordion label="Basic Filters" defaultExpanded={true}>
          <LoadingOverlay loader={filterLoader}>
            <div className={classes.filterBoardMain}>
              <Form
                fields={fields?.map((field) => ({
                  ...field,
                  dropdownOpenCallback: onDropdownOpen
                }))}
                maxFieldsInRow={4}
                updateDefaultValue={false}
                layout={"vertical"}
                handleChange={onFormUpdate}
                defaultValues={fieldsDefaultValues}
                handleDropdownClose={true}
              />

              <div className={classes.filterButtons}>
                <Button
                  variant="primary"
                  id="plansmartDasboardFilterBtn"
                  className={`${classes.button} customActionButton`}
                  onClick={onFilter}
                  disabled={!isFilterDisabled}
                >
                  Filter
                </Button>
                <Button
                  variant="secondary"
                  id="plansmartDasboardFilterReset"
                  className={`${classes.button} customActionButton`}
                  onClick={() => {
                    resetFilter();
                    setFieldsDefaultValues({});
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
}

SelectFilter.propTypes = {
  fetchFilterConfig: PropTypes.func,
  fetchFormFieldDataApi: PropTypes.func,
  filterLoader: PropTypes.bool,
  formFields: PropTypes.array,
  getDashboardTableData: PropTypes.func,
  selectedScreenName: PropTypes.string,
  setFilterLoader: PropTypes.func,
  filterConfigUrl: PropTypes.string,
  filterConfigPayload: PropTypes.object,
  resetFilter: PropTypes.func
};

const mapStateToProps = (state) => ({
  filterLoader: actions.filterLoaderSelector(state),
  formFields: actions.formFieldsSelector(state),
  fieldsDefaultValues: actions.fieldsDefaultValuesSelector(state),
  callDropdownApi: actions.callDropdownApiSelector(state)
});

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators({ ...actions, ...apis, ...dashboardApi }, dispatch)
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SelectFilter);
