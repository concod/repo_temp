import React from "react";
import { isEqual } from "lodash";
import { useState, useEffect } from "react";
import {
  checkFormatOfNumber,
  setTargetDefaultValue,
} from "../budget-table-functions";
import { useMemo } from "react";
import { isWeekNumber } from "modules/plansmart/utils-plansmart/ConstantFunctions";
import { FILTER_FIELDS } from "modules/plansmart/utils-plansmart";
import { Modal } from "impact-ui";
import Form from "core/Utils/form";
import makeStyles from "@mui/styles/makeStyles";

const TargetOptimizationModal = (props) => {
  const {
    selectedLevel,
    setFiltersForBudgetTable,
    filtersForRows,
    planDetails,
    tabData,
    setTargetFormValues,
    disableAllOptions,
    pivotViewMode,
    setFilterChips,
    viewMode,
    updateConstraintFilterReq,
    planSmartBudgetTableLoader,
    planCode,
    setTabData,
    planBudgetData,
    agTableRef,
    showTargetOptimizationModal,
    setShowTargetOptimizationModal,
  } = props;
  const [initialTargetConstraint, setInitialTargetConstraint] = useState(null);
  const [formData, setFormData] = useState(
    props.defaultData ? props.defaultData : {}
  );

  const [changedFormKey, updateChangedFormKey] = useState([]);
  const [targetData, setTargetData] = useState();

  const [isForecastValuesPresent, setIsForecastValuesPresent] = useState(false);

  useEffect(() => {
    const allColumns = agTableRef.current?.columnApi?.columnModel?.gridColumns;
    let fcstTotalSalesTotal = 0;
    let fcstTotalMarginTotal = 0;
    let lyTotalSalesTotal = 0;

    if (!planBudgetData || planBudgetData?.length === 0) return;
    const [fcstTotalSales] = planBudgetData?.filter(
      (metricData) =>
        metricData?.reference === "forcasted" &&
        metricData?.metric === "total_sales"
    );
    const [fcstTotalMargin] = planBudgetData?.filter(
      (metricData) =>
        metricData?.reference === "forcasted" &&
        metricData?.metric === "total_margin"
    );
    if (!fcstTotalSales || !fcstTotalMargin || !allColumns) {
      setIsForecastValuesPresent(false);
      return;
    } else {
      setIsForecastValuesPresent(true);
    }
    const [lyTotalSales = {}] = planBudgetData?.filter(
      (metricData) =>
        metricData?.reference === "compare" &&
        metricData?.metric === "total_sales"
    );
    const lyTotalSalesNode = agTableRef.current?.api.getRowNode(
      lyTotalSales?.uniqueId
    );
    const fcstTotalSalesNode = agTableRef.current?.api.getRowNode(
      fcstTotalSales?.uniqueId
    );
    const fcstTotalMarginNode = agTableRef.current?.api.getRowNode(
      fcstTotalMargin?.uniqueId
    );

    const lyTotalSalesGrandTotal = agTableRef.current?.api?.getValue(
      "total",
      lyTotalSalesNode
    );

    allColumns?.forEach((column) => {
      if (isWeekNumber(column.colId)) {
        const lyTotalSalesValue = agTableRef.current?.api?.getValue(
          column.colId,
          lyTotalSalesNode
        );
        const fcstTotalSalesValue = agTableRef.current?.api?.getValue(
          column.colId,
          fcstTotalSalesNode
        );
        const fcstTotalMarginValue = agTableRef.current?.api?.getValue(
          column.colId,
          fcstTotalMarginNode
        );

        lyTotalSalesTotal = lyTotalSalesValue + lyTotalSalesTotal;
        fcstTotalSalesTotal = fcstTotalSalesValue + fcstTotalSalesTotal;
        fcstTotalMarginTotal = fcstTotalMarginValue + fcstTotalMarginTotal;
      }
    });

    setTargetData({
      gross_margin_per: checkFormatOfNumber(
        fcstTotalMarginTotal / fcstTotalSalesTotal
      ),
      revenue_growth_per: checkFormatOfNumber(
        (fcstTotalSalesTotal - lyTotalSalesTotal) / lyTotalSalesTotal
      ),
      eop_variance: 0,
      revenue_total: lyTotalSalesGrandTotal,
    });
  }, [showTargetOptimizationModal]);

  useEffect(() => {
    setTargetDefaultValue(
      targetData,
      setFormData,
      setTargetFormValues,
      updateChangedFormKey,
      formData
    );
  }, [targetData]);

  const handleChange = (updatedFormData, _id) => {
    if (initialTargetConstraint === null) {
      setInitialTargetConstraint(formData);
    }
    setFormData(updatedFormData);
    setTargetFormValues(formData);
    if (changedFormKey.indexOf(_id) === -1) {
      updateChangedFormKey([...changedFormKey, _id]);
    }
  };

  const handleRecalculate = async () => {
    props.setPlansmartBudgetTableLoader(true);
    try {
      const targetConstraintList = [];
      FILTER_FIELDS.forEach((targetConstraintFilter) => {
        if (!isNaN(parseFloat(formData[targetConstraintFilter.accessor]))) {
          targetConstraintList.push({
            filter_type: "non-cascaded",
            attribute_name: targetConstraintFilter.accessor,
            operator: "in",
            values: formData[targetConstraintFilter.accessor]
              ? targetConstraintFilter.value_type === "percentage"
                ? [parseFloat(formData[targetConstraintFilter.accessor]) / 100]
                : [parseFloat(formData[targetConstraintFilter.accessor])]
              : [],
          });
        }
      });
      const productHierarchyFilters = [];
      Object.keys(filtersForRows).map((tabKey) => {
        if (filtersForRows[tabKey] && filtersForRows[tabKey].length > 0) {
          productHierarchyFilters.push({
            filter_type: "non-cascaded",
            operator: "in",
            attribute_name: tabKey,
            values: filtersForRows[tabKey],
          });
        }
      });
      const reqBody = {
        filters: productHierarchyFilters.concat(targetConstraintList),
      };
      let targetMetrics = [];
      Object.keys(formData).forEach((key) => {
        let obj = {
          attribute_name: key,
          attribute_value: parseFloat(formData[key]) / 100,
          update_flag: changedFormKey.indexOf(key) > -1 ? 1 : 0,
        };
        targetMetrics.push(obj);
      });
      const updateConstraintFilterResp = await updateConstraintFilterReq(
        props.planDetails.plan_code,
        reqBody
      );
      if (updateConstraintFilterResp.data.status) {
        props.addSnack({
          message: "Recalculated Successfully",
          options: {
            variant: "success",
          },
        });
        props.setPlansmartBudgetTableLoader(false);
        setInitialTargetConstraint(null);
      } else {
        props.addSnack({
          message:
            "Recalculation initiated, We will notify you once it is successful",
          options: {
            variant: "info",
          },
        });
        props.setPlansmartBudgetTableLoader(false);
      }
    } catch (err) {
      props.setPlansmartBudgetTableLoader(false);
      props.addSnack({
        message: "Something went wrong while recalculate",
        options: {
          variant: "error",
        },
      });
      props.setPlansmartBudgetTableLoader(false);
    }
  };

  const formattedFilterFields = FILTER_FIELDS?.map((data) => ({
    ...data,
    isDisabled: disableAllOptions || viewMode,
  }));

  // Hided EOP variance
  const removedEopVariance = formattedFilterFields
    .filter(
      (data) =>
        data.accessor !== "eop_variance" && data.accessor !== "revenue_total"
    )
    .map((data) => {
      data.isDisabled = !targetData;
      return data;
    });

  const recalculateValidation = () => {
    if (planSmartBudgetTableLoader || disableAllOptions || viewMode) {
      return true;
    }
    if (initialTargetConstraint === null) return true;
    return isEqual(initialTargetConstraint, formData);
  };

  const useStyles = makeStyles((theme) => ({
    forecastError: {
      color: theme.palette.error.main,
      marginTop: "4px",
    },
  }));

  const classes = useStyles();

  return (
    <Modal
      size="medium"
      heading="Recalculate"
      isOpen={showTargetOptimizationModal}
      aria-labelledby="view-store-codes"
      aria-describedby="view-store-codes-description"
      onClose={() => setShowTargetOptimizationModal(false)}
      primaryButtonProps={{
        children: "Recalculate",
        id: "plansmartRecalculateBtn",
        color: "primary",
        onClick: handleRecalculate,
        disabled:
          recalculateValidation() || !targetData || !isForecastValuesPresent,
      }}
    >
      {!pivotViewMode && (
        <>
          <Form
            updateDefaultValue={false}
            maxFieldsInRow={2}
            labelWidthSpan={6}
            fieldTypeWidthSpan={6}
            handleChange={handleChange}
            fields={removedEopVariance}
            defaultValues={formData}
          ></Form>
          {!isForecastValuesPresent && (
            <span className={classes.forecastError}>
              Please add IAF version
            </span>
          )}
        </>
      )}
    </Modal>
  );
};

export default TargetOptimizationModal;
