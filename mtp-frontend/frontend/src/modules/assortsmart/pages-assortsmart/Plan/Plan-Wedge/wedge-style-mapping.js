import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, Button } from "@mui/material";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  set2_3_Loader,
  fetchStyleMappingData,
  sisterStyleMapping,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import LoadingOverlay from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import AgGridTable from "core/Utils/agGrid";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { bindActionCreators } from "redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { assortAgGridCustomCellRenderer } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { WEDGE_STYLE_MAPPING_FORM } from "modules/assortsmart/constants-assortsmart/stringContants";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { getSeasonOptions } from "../../../services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { isEmpty } from "lodash";
import { displaySnackMessage } from "./plan-wedge-functions";

const StyleMappingComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  let [filteredData, setFilteredData] = useState([]);
  let [selectedValues, setSelectedValues] = useState({});
  const [seasonDetails, setSeasonDetails] = useState([]);
  const classes = useStyles();
  const StyleMappingInstance = useRef({});
  let selectedAttributes = useRef([]);

  useEffect(() => {
    const fetchData = async () => {
      let columns = await getColumnsAg(
        "table_name=sister_style_mapping",
        props.columnHeaderJson
      )();
      columns.unshift({
        column_name: "radio_select",
        label: "Select",
        order_of_display: 1,
        is_frozen: true,
      });
      let attributeColumns = [];
      props.wedgeColumn.map((col) => {
        if (col.column_name === "attributes") {
          col.sub_headers.map((subCol) => {
            subCol.column_name =
              subCol.column_name.split("attributes_")?.[1] ||
              subCol.column_name;
            subCol.is_editable = false;
            attributeColumns.push(subCol);
          });
        }
      });
      columns = columns.concat(attributeColumns);
      columns = agGridColumnFormatter(columns, props.columnHeaderJson);
      setColumns(columns);
    };
    fetchData();
  }, [props.wedgeColumn]);

  useEffect(() => {
    const fetchFormOptions = async () => {
      WEDGE_STYLE_MAPPING_FORM[0].options = props.l3Options;
      WEDGE_STYLE_MAPPING_FORM[0].label = props.levelsJson?.["l3_name"];
      formData["l3_name"] = props.l3Options?.[0]?.value;
      const optionsResponse = await getTenantConfigApplicationLevel(2, {
        attribute_name: "assort_year_value",
      })();
      if (optionsResponse?.data?.status) {
        let yearArr = optionsResponse?.data?.data?.[0]?.attribute_value?.value;
        let seasonYr = props.planDetails?.data?.season?.split(" ")?.[0];
        if (seasonYr) {
          yearArr = yearArr.filter((year) => year <= seasonYr);
        }
        WEDGE_STYLE_MAPPING_FORM[1].options = generateDropDownOptions(yearArr);
        formData["year"] = [yearArr?.[0]];
        fetchSeasonDetails([yearArr?.[0]]);
      }
      setFormFields(WEDGE_STYLE_MAPPING_FORM);
    };
    fetchFormOptions();
  }, [props.planDetails?.data, props.l2Options, props.l3Options]);

  useEffect(() => {
    if (formData?.season?.length) {
      seasonDetails.forEach((season) => {
        formData.season.map((obj, index) => {
          if (season.name === obj) {
            if (index === 0) {
              formData.selling_period_sdate = season.season_start_date;
            }
            formData.selling_period_edate = season.season_end_date;
          }
        });
      });
      fetchMappingData(formData);
    }
  }, [formData?.season, formData?.l3_name]);

  const generateDropDownOptions = (dropDownValues) => {
    return (
      dropDownValues?.length &&
      dropDownValues.map((obj) => {
        return {
          value: obj,
          label: obj,
          id: obj,
        };
      })
    );
  };

  const fetchMappingData = async (form) => {
    const planData = props.planDetails?.data;
    setShowLoader(true);
    try {
      let payload = {
        filters: [
          {
            attribute_name: "l0_name",
            value: planData.l0_name,
            prefix: "levels",
            operator: "in",
          },
          {
            attribute_name: "l1_name",
            value: planData.l1_name,
            prefix: "levels",
            operator: "in",
          },
          {
            attribute_name: "l2_name",
            value: props.selectedL2FilterValue?.value
              ? [props.selectedL2FilterValue?.value]
              : planData.l2_name,
            prefix: "levels",
            operator: "in",
          },
          {
            attribute_name: "start_date",
            value: [form.selling_period_sdate, form.selling_period_edate],
            prefix: "levels",
            operator: "between",
          },
          {
            attribute_name: "channel",
            value: planData.channel,
            prefix: "levels",
            operator: "in",
          },
        ],
        plan_code: planData.plan_code,
      };
      let mappingData = await props.fetchStyleMappingData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (mappingData?.data?.status) {
        setTableData([]);
        mappingData.data.data.forEach((obj) => {
          obj["uniqueID"] = obj.season_name + obj.article;
        });
        setTableData(mappingData?.data?.data);
        let filter = mappingData?.data?.data.filter(
          (data) => data.l3_name === formData?.l3_name
        );
        setFilteredData(filter);
        if (StyleMappingInstance.current.api) {
          StyleMappingInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
          });
        }
      }
      setShowLoader(false);
    } catch (err) {
      setShowLoader(false);
      displaySnackMessage("Something went wrong", "error", props.addSnack);
    }
  };

  const fetchSeasonDetails = async (year) => {
    let seasonResponse = await props.getSeasonOptions({
      filters: [
        {
          attribute_name: "year",
          value: year,
          operator: "in",
        },
      ],
    });
    if (seasonResponse?.data?.status) {
      let options = [];
      seasonResponse?.data?.data.forEach((obj) => {
        options.push({
          label: obj.name,
          id: obj.name,
          value: obj.name,
        });
      });
      WEDGE_STYLE_MAPPING_FORM[2].options = options;
      let data = formData;
      data["season"] = [options?.[0]?.value];
      data["year"] = year;
      setFormFields(WEDGE_STYLE_MAPPING_FORM);
      setSeasonDetails(seasonResponse?.data?.data);
      setFormData(data);
    }
  };

  const handleChangeFilter = async (updatedFormData, id) => {
    if (id === "year") {
      fetchSeasonDetails(updatedFormData?.year);
    }
    setFormData(updatedFormData);
    if (id === "l3_name") {
      StyleMappingInstance.current.api.onFilterChanged();
      let filter = tableData.filter(
        (data) => data.l3_name === updatedFormData.l3_name
      );
      setFilteredData(filter);
    }
  };

  const handleEventChange = (event, type, column_name, rowData) => {
    let values = selectedValues;
    if (type === "radio" && !event.target.checked) {
      selectedAttributes.current = [];
      if (
        isEmpty(selectedValues) ||
        selectedValues?.choices_selected?.article !== rowData?.article
      ) {
        values = { choices_selected: rowData };
      } else {
        values = {};
      }
    }
    if (type === "checkbox") {
      if (event.target.checked) {
        selectedAttributes.current.push({
          [column_name]: rowData[column_name],
        });
      } else {
        let attributeData = [];
        selectedAttributes.current.map((col) => {
          Object.keys(col).map((key) => {
            if (!key.includes(column_name)) {
              attributeData.push(col);
            }
            return key;
          });
        });
        selectedAttributes.current = attributeData;
      }
      values = {
        ...values,
        attributes_selected: selectedAttributes.current,
      };
    }
    setSelectedValues(values);
    if (StyleMappingInstance.current.api) {
      StyleMappingInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  };

  const handleConfirmDialog = async () => {
    let choiceData = [];
    props.selectedChoices.forEach((choice) => {
      choiceData.push({
        l0_name: choice.l0_name,
        l1_name: choice.l1_name,
        l2_name: choice.l2_name,
        l3_name: choice.l3_name,
        choice_name: choice.choice_name,
      });
    });
    let attributesData = {};
    selectedValues?.["attributes_selected"]?.length &&
      selectedValues?.["attributes_selected"].map((obj) => {
        Object.keys(obj).map((key) => {
          attributesData[key] = obj[key];
          return key;
        });
      });
    let payload = {
      plan_code: props.planDetails?.data?.plan_code,
      choices_selected: choiceData,
      attributes_selected: attributesData,
    };
    props.set2_3_Loader(true);
    const updateResponse = await props.sisterStyleMapping(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (updateResponse?.data.status) {
      props.setSelectedChoices([]);
      props.toggleViewAddChoiceModal(false, "style-mapping");
      props.callWedgeAttributeData();
    } else {
      props.set2_3_Loader(false);
      displaySnackMessage("Something went wrong", "error", props.addSnack);
    }
  };

  const isExternalFilterPresent = useCallback(() => {
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableData]);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel changes data get filtered here
    (node) => {
      if (node.data) {
        return node.data.l3_name === formData?.l3_name;
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, tableData]
  );

  const loadTableInstance = (params) => {
    StyleMappingInstance.current = params;
  };

  return (
    <React.Fragment>
      <LoadingOverlay loader={showLoader} spinner>
        <div className={classes.planFinalizeFormContainer}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={5}
            handleChange={handleChangeFilter}
            fields={formFields}
            updateDefaultValue={false}
            defaultValues={formData}
            handleDropdownClose={true}
          ></Form>
        </div>
        <div className={`${classes.choiceTable} choiceViewTable`}>
          {filteredData?.length ? (
            <AgGridTable
              rowdata={tableData}
              columns={columns}
              loadTableInstance={loadTableInstance}
              rowSelection="single"
              uniqueRowId={"uniqueID"}
              noEditableCustomCellRender={(cellProps) =>
                assortAgGridCustomCellRenderer(
                  cellProps,
                  "style-mapping-component",
                  null,
                  props,
                  handleEventChange,
                  selectedValues
                )
              }
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
            />
          ) : (
            <Box textAlign="center" mt={2}>
              No data available
            </Box>
          )}
        </div>
        <div className={classes.choiceActionDiv}>
          <Button
            variant="contained"
            color="primary"
            title={"Save"}
            id={"save"}
            onClick={() => handleConfirmDialog()}
            disabled={!selectedAttributes.current?.length}
            className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            color="primary"
            title={"Cancel"}
            id={"cancel"}
            onClick={() =>
              props.toggleViewAddChoiceModal(false, "style-mapping")
            }
            className={`${classes.buttonFitContent} ${classes.choiceBtnAlignRight}`}
          >
            Cancel
          </Button>
        </div>
      </LoadingOverlay>
    </React.Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    wedgeAttributeData: planWedgeServiceActions.wedgeAttributeDataSelector(
      state
    ),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchStyleMappingData,
      sisterStyleMapping,
      getSeasonOptions,
      getTenantConfigApplicationLevel,
      set2_3_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(StyleMappingComponent));
