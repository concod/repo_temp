import React, { useState, useEffect, useRef } from "react";
import { cloneDeep, uniqBy } from "lodash";
import { useBudgetStyles } from "./budget-table-style";
import PlansmartBudgetTable from ".";
import {
  fetchPlanBudgetSkuDetails,
  getStyleColDef,
  getStyleColorColDef,
  getSkuColDef,
  updateSkuKpis,
  planSmartConfigSelector,
} from "../../services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { Button, Grid } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import get from "lodash/get";
import LoadingOverlay from "core/Utils/Loader/loader";
import Form from "core/Utils/form";

/*This component is written to handle the Style tab of the budget table. It covers Style, Style Color, SKU data for vb; the heirarchy may change for other tenants.
The three heirarchy's data is rendered in three separate tables one below the other
*/
function SkuLevelBudget({ budgetTableRef, filtersForRows, ...props }) {
  const classes = useBudgetStyles();
  const globalClasses = globalStyles();

  const [allMetricsList, setMetricsList] = useState([]); //List of metrics received from API; list of all available metrics that can be made visible
  const [visibleMetrics, setVisibleMetrics] = useState([]); //Metrics visible in the table
  const [visibleVersions, setVisibleVersions] = useState([
    //Versions visible in the table
    { label: "WP", value: "wp" },
  ]);

  const [styleBudgetData, setStyleBudgetData] = useState([]);
  const [styleBudgetColumns, setStyleBudgetColumns] = useState([]);
  const [styleColorBudgetData, setStyleColorBudgetData] = useState([]);
  const [styleColorBudgetColumns, setStyleColorBudgetColumns] = useState([]);
  const [skuBudgetData, setSkuBudgetData] = useState([]);
  const [skuBudgetColumns, setSkuBudgetColumns] = useState([]);

  const [styleLoader, setStyleLoader] = useState(true);
  const [styleColorLoader, setStyleColorLoader] = useState(true);
  const [skuLoader, setSkuLoader] = useState(true);

  const allMetrics = useRef([]);
  const styleTableRef = useRef(null);
  const styleColorTableRef = useRef(null);
  const skuTableRef = useRef(null);
  const activeStyle = useRef(null);
  const activeStyleColor = useRef(null);
  const updatedSkuDetails = useRef({});
  let {
    totalBucketAggregrationFormulas,
    weekAggregationFormula,
  } = props.plansmartConfigs;

  const versionMap = {
    current: "wp",
    compare: "ly",
    forcasted: "iaf",
  };

  //To add the click event to the Styles listed in the style table. Children style colors are fetched for the clicked Style
  const styleActionMap = (key) => {
    return {
      [key]: (el) => {
        activeStyle.current = el.style;
        fetchStyleColorColumns();
      },
    };
  };

  //To add the click event to the Style Colors listed in the style color table. Children skus are fetched for the clicked Style color
  const styleColorActionMap = (key) => {
    return {
      [key]: (el) => {
        activeStyleColor.current = el.styleColor;
        fetchSkuColumns();
      },
    };
  };

  const parserForSkuTable = (response, level) => {
    const tableRows = [];
    const styles = Object.keys(response);
    styles.forEach((style) => {
      const tableRow = {};
      tableRow[level] = style;
      tableRow.id = style;
      const metrics = Object.keys(response[style]);
      metrics.forEach((metric) => {
        const versions = Object.keys(response[style][metric]);
        versions.forEach((version) => {
          const weeks = Object.keys(response[style][metric][version]);
          weeks.forEach((week) => {
            const columnKey = `${week}_${metric}_${versionMap[version]}`;
            tableRow[columnKey] = response[style][metric][version][week];
          });
        });
      });
      tableRows.push(tableRow);
    });
    return tableRows;
  };

  //Generic value getter to calculate the total columns' values when weekly values are edited
  const totalValueGetter = (col) => {
    let kpi = col.colDef.extra.kpi;
    const bucket = col.colDef.extra.bucket;
    kpi = kpi.replace(`${bucket}_`, "");
    const formula = weekAggregationFormula[kpi];
    let splitFormula = formula?.replace(" ", "")?.split(/([\+\-\*\(\)\[\]\/])/);
    let formulaToEval = "";
    const uniqueKpis = [];
    allMetrics.current.forEach((metric) => {
      let kpi = metric.kpi.replace(`${metric.bucket}_`, "");
      if (!uniqueKpis.includes(kpi)) {
        uniqueKpis.push(kpi);
      }
    });
    const weeklyColumns = col.column.parent.parent.parent
      .getColGroupDef()
      .children.filter(
        (column) =>
          !column.column_name.includes("total") &&
          !column.column_name.includes("Total")
      );

    splitFormula.forEach((param) => {
      if (uniqueKpis.includes(param)) {
        const kpiToAdd = [];
        weeklyColumns.forEach((weeklyCol) => {
          const matchingColumn = weeklyCol.children
            .filter((e) => e.extra.metric === col.colDef.extra.metric)[0]
            .children.filter(
              (e) => e.extra.version === col.colDef.extra.version
            )[0];
          kpiToAdd.push(col.data[matchingColumn.id] || 0);
        });
        formulaToEval = formulaToEval.concat(kpiToAdd.join(","));
      } else {
        formulaToEval = formulaToEval.concat(param);
      }
    });
    return eval(formulaToEval);
  };

  const attachValueGetter = (tableRef) => {
    const allColumns = tableRef.current.columnApi.getAllColumns();

    const versionsList = visibleVersions.map((v) => v.value);
    const metricsList = visibleMetrics.map((m) => m.value);

    const totalColumns = allColumns.filter(
      (col) =>
        versionsList.includes(col.colDef?.extra?.version) &&
        metricsList.includes(col.colDef?.extra?.metric) &&
        (col.colDef.column_name.includes("total") ||
          col.colDef.column_name.includes("Total"))
    );
    totalColumns.forEach((col) => {
      Object.assign(col.colDef, {
        valueGetter: (params) => totalValueGetter(params),
      });
    });
  };
  useEffect(() => {
    if (!styleTableRef?.current?.columnApi) return;
    const allColumns = styleTableRef.current.columnApi.getAllColumns();

    attachValueGetter(styleTableRef);
  }, [
    styleTableRef.current,
    styleBudgetColumns,
    visibleMetrics,
    visibleVersions,
  ]);

  useEffect(() => {
    if (!styleColorTableRef?.current?.columnApi) return;
    attachValueGetter(styleColorTableRef);
  }, [
    styleColorTableRef.current,
    styleColorBudgetColumns,
    visibleMetrics,
    visibleVersions,
  ]);

  useEffect(() => {
    if (!skuTableRef?.current?.columnApi) return;
    attachValueGetter(skuTableRef);
  }, [skuTableRef.current, skuBudgetColumns, visibleMetrics, visibleVersions]);

  const fetchInitialData = async (body, pageIndex, params) => {
    const planCode = props.match.params.plancode;
    const postBody = {
      plan_code: planCode,
      level: {
        ...filtersForRows,
      },
      sku_level: {},
      meta: {
        search: [],
        range: [],
        sort: [],
        limit: {
          limit: 10,
          page: pageIndex || 1,
        },
      },
    };
    const styles = await props.fetchPlanBudgetSkuDetails(postBody);
    const budgetTableData = parserForSkuTable(styles.data, "style");
    setStyleBudgetData(budgetTableData);
    setStyleLoader(false);

    return {
      data: budgetTableData,
      totalCount: styles.total,
    };
  };

  const fetchStyleColumns = () => {
    const planCode = props.match.params.plancode;
    props.getStyleColDef(planCode, styleActionMap).then((data) => {
      setStyleBudgetColumns(data.columns);
      setMetricsList(uniqBy(data.metricList, "value"));
      allMetrics.current = data.metricList;
      setVisibleMetrics([data.metricList[0]]);
    });
  };

  const fetchStyleColorColumns = () => {
    const planCode = props.match.params.plancode;
    props.getStyleColorColDef(planCode, styleColorActionMap).then((data) => {
      setStyleColorBudgetColumns(data);
    });
  };

  const fetchSkuColumns = () => {
    const planCode = props.match.params.plancode;
    props.getSkuColDef(planCode).then((data) => {
      setSkuBudgetColumns(data);
    });
  };

  const fetchStyleColor = async (style, pageIndex) => {
    const planCode = props.match.params.plancode;
    const postBody = {
      plan_code: planCode,
      level: {
        ...filtersForRows,
      },
      sku_level: {
        l4_name: activeStyle.current,
      },
      meta: {
        search: [],
        range: [],
        sort: [],
        limit: {
          limit: 10,
          page: pageIndex || 1,
        },
      },
    };
    const styleColors = await props.fetchPlanBudgetSkuDetails(postBody);
    const budgetTableData = parserForSkuTable(styleColors.data, "styleColor");
    setStyleColorLoader(false);
    window.scrollTo(0, document.body.scrollHeight, "smooth");
    return {
      data: budgetTableData,
      totalCount: styleColors.total,
    };
  };

  const fetchSkus = async (style, pageIndex) => {
    const planCode = props.match.params.plancode;
    const postBody = {
      plan_code: planCode,
      level: {
        ...filtersForRows,
      },
      sku_level: {
        l4_name: activeStyle.current,
        article: activeStyleColor.current,
      },
      meta: {
        search: [],
        range: [],
        sort: [],
        limit: {
          limit: 10,
          page: pageIndex || 1,
        },
      },
    };
    const skuData = await props.fetchPlanBudgetSkuDetails(postBody);
    const budgetTableData = parserForSkuTable(skuData.data, "sku");
    setSkuLoader(false);
    window.scrollTo(0, document.body.scrollHeight, "smooth");

    return {
      data: budgetTableData,
      totalCount: skuData.total,
    };
  };

  useEffect(() => {
    fetchStyleColumns();
  }, []);

  useEffect(() => {
    if (styleTableRef && styleTableRef.current) {
      const versionsList = visibleVersions.map((v) => v.value);
      const metricsList = visibleMetrics.map((m) => m.value);
      const allColumns = styleTableRef.current.columnApi.getAllColumns();
      const columnsToGoVisible = [];
      const columnsToGoInvisible = [];
      allColumns.forEach((col) => {
        if (col.colDef?.extra?.version && col.colDef?.extra?.metric) {
          if (
            versionsList.includes(col.colDef?.extra?.version) &&
            metricsList.includes(col.colDef?.extra?.metric) &&
            (col.colDef.hide || !col.visible)
          ) {
            columnsToGoVisible.push(col.colDef.id);
          } else if (
            (!col.colDef.hide || col.visible) &&
            (!versionsList.includes(col.colDef?.extra?.version) ||
              !metricsList.includes(col.colDef?.extra?.metric))
          ) {
            columnsToGoInvisible.push(col.colDef.id);
          }
        }
      });
      columnsToGoVisible.forEach((col) => {
        styleTableRef.current.columnApi.setColumnVisible(col, true);
        if (styleColorTableRef?.current) {
          styleColorTableRef.current.columnApi.setColumnVisible(col, true);
        }
        if (skuTableRef?.current) {
          skuTableRef.current.columnApi.setColumnVisible(col, true);
        }
      });
      columnsToGoInvisible.forEach((col) => {
        styleTableRef.current.columnApi.setColumnVisible(col, false);
        if (styleColorTableRef?.current) {
          styleColorTableRef.current.columnApi.setColumnVisible(col, false);
        }
        if (skuTableRef?.current) {
          skuTableRef.current.columnApi.setColumnVisible(col, false);
        }
      });
    }
  }, [visibleVersions, visibleMetrics]);

  const showHideMetrics = function (selectedMetrics) {
    setVisibleMetrics(cloneDeep(selectedMetrics));
  };

  const showHideVersions = function (selectedVersions) {
    setVisibleVersions(cloneDeep(selectedVersions));
  };

  const setStyleTableRef = (tableRef) => {
    styleTableRef.current = tableRef.current;
  };

  const setStyleColorTableRef = (tableRef) => {
    styleColorTableRef.current = tableRef.current;
  };

  const setSkuTableRef = (tableRef) => {
    skuTableRef.current = tableRef.current;
  };

  //takes care of updating the dependent KPIs
  const updateKpis = (row, column, initialValue, rowNode, level) => {
    let updatedKpi = column.colDef.extra.kpi;
    const bucket = column.colDef.extra.bucket;
    updatedKpi = updatedKpi.replace(`${bucket}_`, "");
    const week = column.parent.parent.getColGroupDef().column_name;
    const dependentKpisMap = props.editableMetricFormulas[updatedKpi];
    const sortedFormulas = Object.keys(dependentKpisMap).sort(
      (a, b) => dependentKpisMap?.[a]?.ranking - dependentKpisMap?.[b]?.ranking
    );
    const updatedDependentKpis = { style: row.style };
    const uniqueKpis = [];
    allMetrics.current.forEach((metric) => {
      let kpi = metric.kpi.replace(`${metric.bucket}_`, "");
      if (!uniqueKpis.includes(kpi)) {
        uniqueKpis.push(kpi);
      }
    });

    const sku = row.id;

    updatedSkuDetails.current[level] = updatedSkuDetails.current[level] || {};
    updatedSkuDetails.current[level][sku] =
      { ...updatedSkuDetails.current[level][sku] } || {};
    updatedSkuDetails.current[level][sku][
      `${column.colDef.extra.bucket}_${column.colDef.extra.kpi}`
    ] =
      {
        ...updatedSkuDetails.current[level][sku][
          `${column.colDef.extra.bucket}_${column.colDef.extra.kpi}`
        ],
      } || {};
    updatedSkuDetails.current[level][sku][
      `${column.colDef.extra.bucket}_${column.colDef.extra.kpi}`
    ][week] = [initialValue, row[column.colId]];
    sortedFormulas.forEach((dependentKpi) => {
      if (dependentKpi === "total") {
        updateTotalBucket(row, rowNode, column, updatedKpi, uniqueKpis, week);
      } else {
        const formula = dependentKpisMap[dependentKpi].formula;
        const splitFormula = formula
          .replace(" ", "")
          ?.split(/([\+\-\*\(\)\[\]\/])/);
        let formulaToEval = "";
        if (splitFormula.length) {
          splitFormula.forEach((param) => {
            if (uniqueKpis.includes(param.trim())) {
              formulaToEval = formulaToEval.concat(
                row[
                  `${week}_${bucket}_${param.trim()}_${
                    column.colDef.extra.version
                  }`
                ]
              );
            } else {
              formulaToEval = formulaToEval.concat(param.trim());
            }
          });
        }
        let updatedValue = 0;
        try {
          updatedValue = eval(formulaToEval);
        } catch (err) {
          updatedValue = 0;
        }
        if (
          row[
            `${week}_${bucket}_${dependentKpi}_${column.colDef.extra.version}`
          ]
        ) {
          rowNode.setDataValue(
            `${week}_${bucket}_${dependentKpi}_${column.colDef.extra.version}`,
            updatedValue
          );
        }
        updatedDependentKpis[
          row[
            `${week}_${bucket}_${dependentKpi}_${column.colDef.extra.version}`
          ]
        ] = updatedValue;
        const oldValue = initialValue || 0; //this has to be removed once data is corrected

        updatedSkuDetails.current[level][sku][
          `${column.colDef.extra.bucket}_${dependentKpi}`
        ] =
          {
            ...updatedSkuDetails.current[level][sku][
              `${column.colDef.extra.bucket}_${dependentKpi}`
            ],
          } || {};
        updatedSkuDetails.current[level][sku][
          `${column.colDef.extra.bucket}_${dependentKpi}`
        ][week] = [oldValue, updatedValue];
      }
    });
  };

  const updateStyles = (
    _event,
    row,
    column,
    _isChanged,
    _value,
    initialValue,
    _cellData
  ) => {
    const rowNode = styleTableRef.current.api.getRowNode(row.id);
    updateKpis(row, column, initialValue, rowNode, "style");
  };

  const updateStyleColors = (
    _event,
    row,
    column,
    _isChanged,
    _value,
    initialValue,
    _cellData
  ) => {
    const rowNode = styleColorTableRef.current.api.getRowNode(row.id);
    updateKpis(row, column, initialValue, rowNode, "styleColor");
  };

  const updateSkus = (
    _event,
    row,
    column,
    _isChanged,
    _value,
    initialValue,
    _cellData
  ) => {
    const rowNode = skuTableRef.current.api.getRowNode(row.id);
    updateKpis(row, column, initialValue, rowNode, "sku");
  };

  //these functions (sum, first, last) are defined here to be evaluated as part of depedent KPIs formula. More such functions should be added if needed
  function sum() {
    const arr = Array.from(arguments);
    return arr.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0
    );
  }

  const first = (...args) => {
    return args[0];
  };
  const last = (...args) => {
    return args[args.length - 1];
  };

  //This function updates the total bucket value (eg, wp+clearance) of the metric when individual bucket value is edited 
  const updateTotalBucket = (
    row,
    rowNode,
    column,
    updatedKpi,
    uniqueKpis,
    week
  ) => {
    const formula = totalBucketAggregrationFormulas[updatedKpi];
    const splitFormula = formula
      .replace(" ", "")
      ?.split(/([\+\-\*\(\)\[\]\/])/);
    let formulaToEval = "";
    if (splitFormula.length) {
      splitFormula.forEach((param) => {
        if (uniqueKpis.includes(param)) {
          formulaToEval = formulaToEval
            .concat(row[`${week}_reg_${param}_${column.colDef.extra.version}`])
            .concat(`,`)
            .concat(row[`${week}_clr_${param}_${column.colDef.extra.version}`]);
        } else {
          formulaToEval = formulaToEval.concat(param);
        }
      });
      const updatedValue = eval(formulaToEval);
      rowNode.setDataValue(
        `${week}_total_${updatedKpi}_${column.colDef.extra.version}`,
        updatedValue
      );
    }
  };

  const updateFetchDependency = {
    style: [fetchStyleColor, fetchSkus],
    styleColor: [fetchInitialData, fetchSkus],
    sku: [fetchInitialData, fetchStyleColor],
  };

  //API integration for update data
  const saveSkuUpdates = async (level) => {
    const payload = {};
    payload.plan_code = props.match.params.plancode;
    payload.level = {
      ...filtersForRows,
    };
    if (level === "sku") {
      payload.style = activeStyle.current;
      payload.article = activeStyleColor.current;
    }
    if (level === "styleColor") {
      payload.style = activeStyle.current;
    }
    payload.metrics = updatedSkuDetails.current[level];
    await props.updateSkuKpis(payload);
    updatedSkuDetails.current = {};
    updateFetchDependency[level].forEach((callback) => callback());
  };

  const mertricsVersionsFields = [
    {
      accessor: "visibleMetrics",
      field_type: "dropdown",
      label: "Show/Hide Metrics",
      options: allMetricsList,
      isMulti: true,
      isClearable: true,
      value: visibleMetrics,
      onchange: showHideMetrics,
    },
    {
      accessor: "visibleVersions",
      field_type: "dropdown",
      label: "Show/Hide Versions",
      options: [
        { label: "WP", value: "wp" },
        { label: "IAF", value: "iaf" },
        { label: "LY", value: "ly" },
      ],
      isMulti: true,
      isClearable: true,
      value: visibleVersions,
      onchange: showHideVersions,
    },
  ];

  const metricsVersionsDefault = {
    visibleMetrics: visibleMetrics,
    visibleVersions: visibleVersions,
  };
  const handleMetricsVersionsUpdate = (
    updatedFormData,
    id,
    field,
    e,
    initialValue
  ) => {
    field.onchange(e);
  };
  const customheader = (param) => (
    <div className={classes.alignToEnd}>
      <Button onClick={() => saveSkuUpdates(param)}>Save updates</Button>
    </div>
  );

  return (
    <>
      <Grid
        container
        spacing={1}
        className={classes.metricVersionSelectContainer}
      >
        <Grid
          item
          direction="row"
          xs={6}
          className={globalClasses.verticalAlignCenter}
        >
          <Form
            maxFieldsInRow={2}
            handleChange={handleMetricsVersionsUpdate}
            fields={mertricsVersionsFields}
            defaultValues={metricsVersionsDefault}
            handleDropdownClose={true}
          ></Form>
        </Grid>
      </Grid>

      {Boolean(styleBudgetColumns.length) && (
        <CustomAccordion
          label={"Styles"}
          defaultExpanded={true}
          customheader={customheader("styles")}
        >
          <LoadingOverlay loader={styleLoader}>
            <PlansmartBudgetTable
              manualCallBack={(body, pageIndex, params) =>
                fetchInitialData(body, pageIndex, params)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              pagination={true}
              planBudgetColumns={styleBudgetColumns}
              skuViewMode={true}
              setBudgetTableRef={setStyleTableRef}
              onBlur={updateStyles}
              uniqueRowId="id"
              sideBar={false}
              tableId="style-data"
            />
          </LoadingOverlay>
        </CustomAccordion>
      )}
      {Boolean(styleColorBudgetColumns.length) && (
        <CustomAccordion
          label={"Style Colors"}
          defaultExpanded={true}
          customheader={customheader("styleColor")}
        >
          <LoadingOverlay loader={styleColorLoader}>
            <PlansmartBudgetTable
              manualCallBack={(body, pageIndex, params) =>
                fetchStyleColor(body, pageIndex, params)
              }
              rowModelType="serverSide"
              pagination={true}
              planBudgetColumns={styleColorBudgetColumns}
              skuViewMode={true}
              setBudgetTableRef={setStyleColorTableRef}
              onBlur={updateStyleColors}
              uniqueRowId="id"
              sideBar={false}
            />
          </LoadingOverlay>
        </CustomAccordion>
      )}
      {Boolean(skuBudgetColumns.length) && (
        <CustomAccordion
          label={"SKUs"}
          defaultExpanded={true}
          customheader={customheader("sku")}
        >
          <LoadingOverlay loader={skuLoader}>
            <PlansmartBudgetTable
              manualCallBack={(body, pageIndex, params) =>
                fetchSkus(body, pageIndex, params)
              }
              rowModelType="serverSide"
              pagination={true}
              planBudgetColumns={skuBudgetColumns}
              skuViewMode={true}
              setBudgetTableRef={setSkuTableRef}
              onBlur={updateSkus}
              uniqueRowId="id"
              sideBar={false}
            />
          </LoadingOverlay>
        </CustomAccordion>
      )}
    </>
  );
}

const mapStateToProps = (store) => {
  return {
    editableMetricFormulas: get(
      store,
      "plansmartReducer.planBudgetTableReducer.editableMetricFormulas",
      false
    ),
    plansmartConfigs: planSmartConfigSelector(store),
  };
};
const mapDispatchToProps = (dispatch) => ({
  fetchPlanBudgetSkuDetails: (payload) =>
    dispatch(fetchPlanBudgetSkuDetails(payload)),
  getStyleColDef: (payload, actionMap) =>
    dispatch(getStyleColDef(payload, actionMap)),
  getStyleColorColDef: (payload, actionMap) =>
    dispatch(getStyleColorColDef(payload, actionMap)),
  getSkuColDef: (payload) => dispatch(getSkuColDef(payload)),
  updateSkuKpis: (payload) => dispatch(updateSkuKpis(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(SkuLevelBudget));
