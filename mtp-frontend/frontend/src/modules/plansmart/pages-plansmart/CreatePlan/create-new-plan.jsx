import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import { getAllFilters, getFiltersValues } from "core/actions/filterAction";
import moment from "moment";
import { useEffect, useState } from "react";
import { useHistory, withRouter } from "react-router-dom";
import Form from "../../../../core/Utils/form";
import { addSnack } from "../../../../core/actions/snackbarActions";
import { updateForecastedData } from "../../services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { useStyles } from "../plansmart-styles";
// import { generateFilterConfig } from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  filterHierarchyOptions,
  getAllAccessTypeData,
  getFilterAccessibleValues,
} from "core/Utils/filter-accessible-data";
import { Prompt } from "impact-ui";
import { cloneDeep, forEach, get } from "lodash";
import { getSeasonOptions } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  CREATE_PLAN_PRE_SEASON,
  common,
  plansmart_dashboard,
} from "modules/plansmart/constants-plansmart/stringConstants";
import { planSmartScreenConfigSelector } from "modules/plansmart/services-plansmart/common/plansmart-common-service";
import { connect } from "react-redux";
import {
  EDIT_RECEIPT_PLAN,
  PLAN_SMART_PLAN_DETAILS,
} from "../../constants-plansmart/routesConstants";
import { CreatePlan } from "../../constants-plansmart/stringConstants";
import {
  createNewPlan,
  fetchCreatePlanAttributes,
  getDropdownValues,
  setPlansmartCreateNewPlanLoader,
} from "../../services-plansmart/CreateNewPlan/create-new-plan-service";
import { createNewReceiptPlan } from "../../services-plansmart/ReceiptPlan/receipt-plan-services";
import {
  configureAttributeOptions,
  createPlanGetSeasonType,
  generateFilterConfig,
  generateForecastData,
  getAttributesGenerated,
  getFilterDependency,
  getFiltersOptions,
  getMasterPlanCrumbsUrl,
  getPlanStageBasedOnSeasonType,
} from "../plansmart-utility";
import { autoPopulateFields } from "modules/plansmart/utils-plansmart";
import { getValueFromAttributeMaster } from "modules/plansmart/services-plansmart/Report/report-services";
import {
  getStoreDropdownValues,
  getTenantConfigApplicationLevel,
} from "core/actions/tenantConfigActions";
import { formatStringArray } from "core/Utils/functions/utils";
import { useCallback } from "react";
import { useRef } from "react";

const CreateNewPlan = (props) => {
  const { createPlanConfig } = props;
  const classes = useStyles();
  const history = useHistory();
  const [formElementsData, setFormElementsData] = useState([]);

  const [isElementsValid, setIsElementsValid] = useState(false);
  const [selectedData, setSelectedData] = useState({});
  const [defaultValues, setDefaultValues] = useState("");
  const [overWriteFlag, setOverwriteFlag] = useState(false);
  const [showOverWriteDialogue, setOverWriteDialogue] = useState(false);
  const [planFilterConfigSelection, setplanFilterConfigSelection] = useState(
    {}
  );
  const seasonType = createPlanGetSeasonType(props.location.search);
  const dashboardRedirectionUrl = getMasterPlanCrumbsUrl(seasonType);
  const formElementsDataRef = useRef(null);

  /**
   * @function
   * @description Define the Elements Data with custom required changes.
   */
  useEffect(async () => {
    props.setPlansmartCreateNewPlanLoader(true);
    fetchFormElementsData();
  }, []);

  /**
   * @function
   * @description Call to Validation on after every selectedData change
   */
  useEffect(() => {
    validateFields();
  }, [selectedData]);

  /**
   * @function
   * @description Call to generate the plan after overwrite flag set
   */
  useEffect(() => {
    if (overWriteFlag) handleGeneratePlan();
  }, [overWriteFlag]);

  const fetchOptionsOnDropdownOpen = async (index, dispatch, initialData) => {
    const elements = cloneDeep(formElementsDataRef.current);

    if (formElementsDataRef.current[index].options.length > 0) return;
    dispatch({
      type: "OPTION_INIT",
    });
    const screenName =
      props.planType() === "receiptPlan"
        ? "plansmart create receipt plan"
        : "plansmart create plan";
    const planData = null;
    if (
      elements[index].column_name === "plansmart_reports_buckets" ||
      elements[index].column_name === "plansmart_bucket"
    ) {
      const buckets = await getValueFromAttributeMaster(
        4,
        "plansmart_reports_buckets"
      );
      elements[index].options = buckets.value?.map((bucket) => {
        return {
          value: bucket,
          label: bucket,
          id: bucket,
        };
      });
    }
    if (elements[index].column_name === "plansmart_report_type") {
      const reportTypes = await getValueFromAttributeMaster(
        4,
        "plansmart_report_type"
      );
      elements[index].options = reportTypes.value?.map((reportType) => {
        return {
          value: reportType.value,
          label: reportType.label,
          id: reportType.id,
        };
      });
    }
    if (elements[index].dimension === "product") {
      let selectedOptions = {};
      if (planData) {
        selectedOptions = {
          l0_name: planData.l0_name?.[0],
          l1_name: planData.l1_name?.[0],
          l2_name: planData.l2_name?.[0],
        };
      }
      const dependency = getFilterDependency(
        [],
        selectedOptions,
        index,
        elements[index].dimension
      );
      let body = {
        attribute_name: elements[index].column_name,
        filter_type: elements[index].type || "cascaded",
        filters: dependency,
        is_urm_filter: screenName && props.tenantFilterUamConfig ? true : false,
        screen_name: screenName,
        application_code: 4,
      };
      const options = await getFiltersValues("product", body)();
      let accessibleOptions = filterHierarchyOptions(
        options.data.data.attribute,
        elements[index].accessor,
        props.userAccessList
      );
      elements[index].options = configureAttributeOptions(accessibleOptions);
    }
    if (elements[index].column_name === "season") {
      const seasonBody = {
        option: "ALL",
      };
      const seasonOptions = await getSeasonOptions(seasonBody)();
      elements[index].options = seasonOptions?.data.data.map((data) => {
        return {
          value: data.attribute_value.incremental_id,
          label: data.name,
          id: data.attribute_value.incremental_id,
        };
      });
    }
    if (elements[index].column_name === "version") {
      let version = await getValueFromAttributeMaster(
        4,
        "plansmart_reports_versions"
      );
      elements[index].options = version.value?.map((item) => {
        return {
          value: item,
          label: item,
          id: item,
        };
      });
    }
    if (elements[index].dimension === "plan") {
      const optionsResponse = await getTenantConfigApplicationLevel(4, {
        attribute_name: elements[index].column_name,
      })();
      let attributes =
        elements[index].column_name === "plan_stage" ||
        elements[index].column_name === "master_plan_stage"
          ? getPlanStageBasedOnSeasonType(optionsResponse, seasonType)
          : optionsResponse?.data?.data[0]?.attribute_value?.value;
      elements[index].options = formatStringArray(attributes || []);
    }
    if (elements[index].dimension === "store") {
      let channelBody = {
        attribute_name: elements[index].column_name,
        operator: "in",
        values: [],
        filter_type: elements[index].type,
      };
      let channelOptions = await getStoreDropdownValues(channelBody)();
      elements[index].options = configureAttributeOptions(
        get(channelOptions, "data.data.attribute", [])
      );
    }

    setFormElementsData(elements);
    dispatch({
      type: "OPTION_SUCCESS",
      payload: elements[index].options,
    });
  };

  /**
   * @function
   * @description Fetch the inital form Attributes to setup the form.
   */
  const fetchFormElementsData = async () => {
    try {
      const createPlanFilterResponse = await props.getAllFilters([
        props.planType() === "receiptPlan"
          ? "plansmart create receipt plan"
          : "plansmart create plan",
      ]);
      let createPlanFilterConfig = [];
      if (createPlanFilterResponse?.data?.status) {
        createPlanFilterConfig = await generateFilterConfig(
          createPlanFilterResponse?.data?.data,
          props.userAccessList,
          seasonType || CREATE_PLAN_PRE_SEASON,
          null,
          props.planType() === "receiptPlan"
            ? "plansmart create receipt plan"
            : "plansmart create plan",
          props.addSnack,
          props.tenantFilterUamConfig,
          true
        );
      }
      const formElements = filterAccessibleValues(createPlanFilterConfig);
      const initialSelectedData = autoPopulateFields(formElements, {});
      formElements.map((formElement, index) => {
        Object.assign(formElement, {
          dropdownOpenCallback: (dispatch, initialData) =>
            fetchOptionsOnDropdownOpen(index, dispatch, initialData),
        });
      });
      setFormElementsData(formElements);

      setDefaultValues(initialSelectedData);
      setSelectedData(initialSelectedData);
      props.setPlansmartCreateNewPlanLoader(false);
    } catch (error) {
      props.setPlansmartCreateNewPlanLoader(false);
      props.addSnack({
        message:
          error?.response?.data?.detail ||
          "Error fetching the plan configurations.",
        options: {
          variant: "error",
        },
      });
    }
  };

  const filterAccessibleValues = (tempData) => {
    let allCreateAccess = getAllAccessTypeData(props.userAccessList, "create");
    return getFilterAccessibleValues(tempData, allCreateAccess);
  };

  const validateSequence = (options) => {
    if (options.length > 1) {
      const sortedOptions = options.sort((a, b) => a - b);
      for (let i = 0; i < sortedOptions.length - 1; i++) {
        if (Math.abs(sortedOptions[i] - sortedOptions[i + 1]) !== 1) {
          return false;
        }
      }
    }
    return true;
  };

  const getFilterDependencyOptionsForDimension = async (
    dimension,
    id,
    filterData,
    newUpdatedData
  ) => {
    props.setPlansmartCreateNewPlanLoader(true);
    const filterIdx = filterData.findIndex(
      (filter) => filter.column_name === id
    );

    filterData.forEach((filter, idx) => {
      if (
        filterIdx &&
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
      formElementsData,
      newUpdatedData,
      Idx,
      dimension
    );
    const newUpdateDependency = newdependency.filter(
      (depend) => depend.values.length > 0
    );
    const options = await getFiltersOptions(
      formElementsData,
      newUpdateDependency,
      Idx,
      props.planType() === "receiptPlan"
        ? "plansmart create receipt plan"
        : "plansmart create plan",
      dimension,
      props.tenantFilterUamConfig
    );

    props.setPlansmartCreateNewPlanLoader(false);

    return options;
  };

  /**
   * @function
   * @description Handle Data on every change of form Element
   * @param {String} formObjectName
   * @param {Object} formObjectValue
   */
  const handleChange = async (updatedFormData, id) => {
    const validations = get(createPlanConfig, `validations`, {});
    let newUpdatedData = {
      ...selectedData,
      ...updatedFormData,
    };

    let filterData = cloneDeep(formElementsData);
    if (id === "season") {
      let temp = [];
      props.setPlansmartCreateNewPlanLoader(true);
      if (updatedFormData.season_options) {
        temp = forEach(updatedFormData?.season_options).map((k) => {
          return k.value;
        });
      } else {
        temp = updatedFormData?.season;
      }
      let sesasonResponse =
        temp.length > 0
          ? await props.getSeasonOptions({
              filters: [
                {
                  attribute_name: "incremental_id",
                  value: temp,
                  prefix: "attribute_value",
                  operator: "in",
                },
              ],
            })
          : null;
      if (sesasonResponse?.status) {
        newUpdatedData["plansmart_selling_period_value"] = [];
        newUpdatedData["plansmart_selling_period_value"][0] = moment(
          sesasonResponse?.data?.data?.[0]?.season_start_date,
          "YYYY-MM-DD"
        );
        newUpdatedData["plansmart_selling_period_value"][1] = moment(
          sesasonResponse?.data?.data?.[sesasonResponse?.data?.data?.length - 1]
            ?.season_end_date,
          "YYYY-MM-DD"
        );
        setplanFilterConfigSelection(newUpdatedData);
        newUpdatedData["plansmart_selling_period_value"] = [
          newUpdatedData["plansmart_selling_period_value"][0],
          newUpdatedData["plansmart_selling_period_value"][1],
        ];
        setDefaultValues(newUpdatedData);
        setSelectedData(newUpdatedData);
        props.setPlansmartCreateNewPlanLoader(false);
      } else {
        newUpdatedData["plansmart_selling_period_value"] = [null, null];
        props.setPlansmartCreateNewPlanLoader(false);
      }
    }
    if (id === "plansmart_year_value") {
      props.setPlansmartCreateNewPlanLoader(true);
      let seasonResponse =
        newUpdatedData[id] && [newUpdatedData[id]].flat().length > 0
          ? await props.getSeasonOptions({
              filters: [
                {
                  attribute_name: "year",
                  value: newUpdatedData[id] ? [newUpdatedData[id]].flat() : [],
                  operator: "in",
                },
              ],
            })
          : null;
      if (seasonResponse?.data?.status || seasonResponse === null) {
        let updatedPlanFilterConfig = cloneDeep(formElementsData);
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

        //TO DO: Auto All-Season options selection from db config
        newUpdatedData["season"] = seasonResponse?.data.data.map(
          (data) => data.attribute_value.incremental_id
        );
        newUpdatedData["season_options"] = seasonResponse?.data?.data.map(
          (opt) => {
            return {
              label: opt.name,
              value: opt.attribute_value.incremental_id,
              id: opt.attribute_value.incremental_id,
            };
          }
        );

        newUpdatedData["plansmart_selling_period_value"] = [];
        newUpdatedData["plansmart_selling_period_value"][0] = moment(
          seasonResponse?.data?.data?.[0]?.season_start_date,
          "YYYY-MM-DD"
        );
        newUpdatedData["plansmart_selling_period_value"][1] = moment(
          seasonResponse?.data?.data?.[seasonResponse?.data?.data?.length - 1]
            ?.season_end_date,
          "YYYY-MM-DD"
        );

        filterData = [...updatedPlanFilterConfig];
        setplanFilterConfigSelection(newUpdatedData);
        setDefaultValues(newUpdatedData);
        setSelectedData(newUpdatedData);
        props.setPlansmartCreateNewPlanLoader(false);
      }
    }
    if (CreatePlan.__plan_levels.indexOf(id) > -1) {
      filterData = await getFilterDependencyOptionsForDimension(
        "product",
        id,
        filterData,
        newUpdatedData
      );
    }
    if (CreatePlan.__store_levels.indexOf(id) > -1) {
      filterData = await getFilterDependencyOptionsForDimension(
        "store",
        id,
        filterData,
        newUpdatedData
      );
    } else {
      filterData.forEach((filter) => {
        if (
          filter.field_type === "DateTimeField" &&
          newUpdatedData[filter.column_name] != ""
        ) {
          let data = newUpdatedData[filter.column_name];
          newUpdatedData[filter.column_name] = !data
            ? ""
            : moment(data).format("YYYY-MM-DD");
        }
      });
    }

    Object.keys(validations).forEach((key) => {
      const validationObj = validations[key];
      const multiSelectDisable = get(validationObj, `multi_select_disable`, []);
      const enableMultiSelect = get(validationObj, `enable_multi_select`, []);

      const validationValues = Object.keys(validations)
        .map((key) => validations[key]?.["values"])
        .flat();
      const dropdownDisableFields = get(
        validations[key],
        `dropdown_disable`,
        []
      );
      const dropdownDisableValues = get(validations[id], `values`, []);
      const selectedValues = Object.keys(updatedFormData)
        .map((key) => updatedFormData[key])
        .flat();

      if (multiSelectDisable.length > 0) {
        if (newUpdatedData[key]?.length > 1) {
          filterData.forEach((ele) => {
            if (multiSelectDisable.indexOf(ele.accessor) > -1) {
              ele.options = [];
              ele.isDisabled = true;
              delete newUpdatedData[ele.accessor];
            }
          });
        } else {
          filterData.forEach((ele) => {
            if (
              multiSelectDisable.indexOf(ele.accessor) > -1 &&
              !selectedValues.some((item) => validationValues.includes(item))
            ) {
              ele.isDisabled = false;
            }
          });
        }
      }

      if (dropdownDisableFields.length > 0) {
        filterData.forEach((ele) => {
          if (dropdownDisableFields.includes(ele.accessor)) {
            let disableDropdown = dropdownDisableValues.includes(
              updatedFormData[id]
            );
            if (disableDropdown) {
              ele.isDisabled = true;
              delete newUpdatedData[ele.accessor];
              delete newUpdatedData[`${ele.accessor}_options`];
            }
          }
        });
      }
      if (enableMultiSelect.length > 0) {
        const selectedValue = newUpdatedData[key];
        filterData.forEach((ele) => {
          if (
            enableMultiSelect.includes(ele.accessor) &&
            validationObj.values.includes(selectedValue)
          ) {
            ele.isMulti = true;
          } else if (
            enableMultiSelect.includes(ele.accessor) &&
            !validationObj.values.includes(selectedValue)
          ) {
            ele.isMulti = false;
          }
        });
      }
    });
    newUpdatedData = autoPopulateFields(formElementsData, newUpdatedData);
    setFormElementsData(filterAccessibleValues(filterData));
    setDefaultValues(newUpdatedData);
    setSelectedData(newUpdatedData);
    setFormElementsData(filterAccessibleValues(filterData));
  };

  useEffect(() => {
    if (formElementsData) {
      const data = autoPopulateFields(formElementsData, selectedData);
      setDefaultValues(data);
      setSelectedData(data);

      formElementsDataRef.current = formElementsData;
    }
  }, [formElementsData]);

  /**
   * @function
   * @description Validate all required fields.
   */
  const validateFields = () => {
    let isValid = Boolean(formElementsData.length);
    for (let inx = 0; inx < formElementsData.length; inx++) {
      const item = formElementsData[inx];
      let selectedPlanField = selectedData[item.accessor];
      if (item.required) {
        if (!selectedPlanField && selectedPlanField !== 0) {
          isValid = false;
          break;
        }

        if (
          Array.isArray(selectedPlanField) &&
          selectedPlanField.length === 0
        ) {
          isValid = false;
          break;
        }
        if(item.accessor === "plan_display_name") {
          if((selectedPlanField || "").trim().length ===  0) {
            isValid = false
          }
        }
        if (item.field_type === "rangePicker") {
          selectedPlanField.forEach((element) => {
            if (!element) {
              isValid = false;
            }
          });
        }
        if (item.accessor === "plansmart_year_value") {
          if (selectedPlanField.length > 2) {
            isValid = false;
            props.addSnack({
              message: "Please select 2 or less years",
              options: {
                variant: "error",
              },
            });
          } else if (!validateSequence(selectedPlanField)) {
            isValid = false;
            props.addSnack({
              message: "Please select only sequential years",
              options: {
                variant: "error",
              },
            });
          }
        }
        if (item.accessor === "season") {
          if (!validateSequence(selectedPlanField)) {
            isValid = false;
            props.addSnack({
              message: "Please select only sequential seasons",
              options: {
                variant: "error",
              },
            });
          }
        }
        if (!isValid) {
          break;
        }
      }
      isValid = true;
    }
    setIsElementsValid(isValid);
  };

  /**
   * @function
   * @description Handle Generate Plan on Generate Plan Button Click
   */
  const handleGeneratePlan = async () => {
    props.setPlansmartCreateNewPlanLoader(true);
    let planResponse;
    try {
      props.setPlansmartCreateNewPlanLoader(true);
      const attributes = getAttributesGenerated(
        formElementsData,
        selectedData
      ).filter((e) => e != null);
      const body = {
        overwrite: overWriteFlag,
        attributes,
      };
      if (props.planType() === "receiptPlan") {
        attributes.push({
          attribute_name: "plan_type",
          attribute_value: "RCPT",
          dimension: "plan",
        });
        planResponse = await props.createNewReceiptPlan(body);
      } else {
        planResponse = await props.createNewPlan(body);
      }
      if (planResponse?.data?.status) {
        setOverWriteDialogue(false);
        setOverwriteFlag(false);
        let plan_code = planResponse.data.data?.[0]?.plan_smart_create_plan;
        let redirectionURL = `${EDIT_RECEIPT_PLAN}/edit/${plan_code}`;
        if (props.planType() !== "receiptPlan") {
          // await generateForecastData(plan_code, props);
          redirectionURL = `${PLAN_SMART_PLAN_DETAILS}/edit/${plan_code}`;
        }
        if (plan_code) {
          props.addSnack({
            message: "Plan Created Successfully",
            options: {
              variant: "success",
              onClose: () => {
                history.push(redirectionURL);
                props.setPlansmartCreateNewPlanLoader(false);
              },
            },
          });
        }
      } else {
        setOverWriteDialogue(true);
        props.setPlansmartCreateNewPlanLoader(false);
      }
    } catch (error) {
      props.setPlansmartCreateNewPlanLoader(false);
      props.addSnack({
        message:
          error?.response?.data?.message || error?.response?.data?.detail,
        options: {
          variant: "error",
        },
      });
    }
  };

  return (
    <LoadingOverlay loader={props.plansmartCreateNewPlanLoader}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Button
          id="plansmartDashboardCancelBtn"
          color="primary"
          variant="contained"
          className={`${classes.button} ${classes.cancelButton}`}
          onClick={() => {
            history.push(dashboardRedirectionUrl);
          }}
        >
          Cancel
        </Button>
        <Card className={classes.overFlow}>
          <Prompt
            isOpen={showOverWriteDialogue}
            title={plansmart_dashboard.__overwrite_plan}
            subHeading={plansmart_dashboard.__overwrite_msg}
            infoList={[]}
            primaryButtonProps={{
              label: common.__ConfirmBtnText,
              onClick: () => {
                setOverwriteFlag(true);
                setOverWriteDialogue(false);
              },
            }}
            tertiaryButtonProps={{
              children: common.__RejectBtnText,
              onClick: () => setOverWriteDialogue(false),
            }}
            variant="warning"
          />
          <Paper elevation={0} className={classes.createDetailsWarapper}>
            <h3 className={classes.createDetailsTitle}>Basic Details</h3>
            <div className={classes.detailsForm}>
              <Form
                layout={"horizontal"}
                maxFieldsInRow={2}
                handleChange={handleChange}
                fields={formElementsData}
                updateDefaultValue={false}
                defaultValues={defaultValues}
              />
            </div>
          </Paper>
          <Paper elevation={0} className={classes.createDetailsFooter}>
            <Button
              variant="contained"
              color={!isElementsValid ? "secondary" : "primary"}
              id="plansmartDashboardCreatePlanBtn"
              className={`${classes.generateButton} ${classes.button}`}
              onClick={handleGeneratePlan}
              disabled={!isElementsValid}
            >
              Generate Plan
            </Button>
          </Paper>
        </Card>
      </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (store) => {
  const screenConfig = planSmartScreenConfigSelector(store);
  return {
    plansmartCreateNewPlanLoader:
      store.plansmartReducer.planCreateNewPlanReducer
        .plansmartCreateNewPlanLoader,
    userAccessList:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    screenConfig,
    createPlanConfig: get(screenConfig, "create_plan", {}),
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};
const mapDispatchToProps = (dispatch) => ({
  createNewPlan: (payload) => dispatch(createNewPlan(payload)),
  fetchCreatePlanAttributes: (payload) =>
    dispatch(fetchCreatePlanAttributes(payload)),
  getDropdownValues: (payload) => dispatch(getDropdownValues(payload)),
  setPlansmartCreateNewPlanLoader: (payload) =>
    dispatch(setPlansmartCreateNewPlanLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  updateForecastedData: (id, payload) =>
    dispatch(updateForecastedData(id, payload)),
  getAllFilters: (payload) => dispatch(getAllFilters(payload)),
  getSeasonOptions: (payload) => dispatch(getSeasonOptions(payload)),
  createNewReceiptPlan: (payload) => dispatch(createNewReceiptPlan(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateNewPlan));
