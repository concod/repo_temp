import { useState, useEffect } from "react";
import { Panel, AccordionModern, Select } from "impact-ui-v3";
import Charts from "core/Utils/charts";
import AISummaryPanelBackendContent from "./AISummaryPanelBackendContent";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getAlanSummary,
  getAlanSummaryForAlerts,
  getAlanExplainatory,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import {
  STATUS_MAP,
  ALAN_SUMMARY_TEXT,
  getDefaultMetricOption,
  getMetricOptions,
} from "./AISummaryContent";
import "./AISummaryCard.css";

const AlanSummaryPanel = ({
  open,
  onClose,
  selectedRows,
  getAlanSummary,
  getAlanSummaryForAlerts,
  getAlanExplainatory,
  addSnack,
  summaryPlan,
  selectedStoreColorId = null,
  explainatoryAllocationCode = null,
  setStoreCode = null,
  alanExplainability = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [deepDiveData, setDeepDiveData] = useState(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedXAxis, setSelectedXAxis] = useState(null);
  const [selectedYAxis, setSelectedYAxis] = useState(null);
  const [xAxisOptions, setXAxisOptions] = useState([]);
  const [yAxisOptions, setYAxisOptions] = useState([]);
  const [articleOptions, setArticleOptions] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [articleDropdownOpen, setArticleDropdownOpen] = useState(false);
  const [xDropdownOpen, setXDropdownOpen] = useState(false);
  const [yDropdownOpen, setYDropdownOpen] = useState(false);

  const displaySnackMessages = (message, variance) => {
    addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const fetchAlanSummary = async () => {
    if (!selectedRows || selectedRows.length !== 1) {
      displaySnackMessages(
        ALAN_SUMMARY_TEXT.SELECT_ONE_ROW,
        "error"
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      if (alanExplainability) {
        // Use alanExplainatory payload structure and API
        const payload = {
          allocation_code: explainatoryAllocationCode,
          article: selectedStoreColorId,
          store: setStoreCode,
        };
        response = await getAlanExplainatory(payload);
      } else if (summaryPlan) {
        const allocationCode =
          selectedRows[0]?.allocation_code ||
          selectedRows[0]?.plan_code ||
          "6_199_Women_20260325T011736";

        const payload = {
          allocation_code: allocationCode,
        };

        response = await getAlanSummaryForAlerts(payload);
      } else {
        const allocationCode =
          selectedRows[0]?.allocation_code ||
          selectedRows[0]?.plan_code ||
          "6_199_Women_20260325T011736";

        const payload = {
          allocation_code: allocationCode,
        };

        response = await getAlanSummary(payload);
      }

      if (response?.data) {
        setApiData(response?.data);

        // Set dropdown options from API response when summaryPlan is true
        if (summaryPlan && response?.data?.scatter_plot?.allowed_metrics) {
          const metricsOptions = getMetricOptions(
            response.data.scatter_plot.allowed_metrics
          );
          setXAxisOptions(metricsOptions);
          setYAxisOptions(metricsOptions);

          // Set article dropdown options from scatter_plot.articles
          if (response.data.scatter_plot.articles) {
            const articlesFromApi = response.data.scatter_plot.articles.map(
              (article) => ({
                label: article,
                value: article,
              })
            );
            setArticleOptions(articlesFromApi);
          }
        }
      } else {
        setError(ALAN_SUMMARY_TEXT.NO_DATA_RECEIVED);
      }
    } catch (err) {
      console.error(ALAN_SUMMARY_TEXT.ERROR_FETCHING_ALAN_SUMMARY, err);
      handleErrorMessage(err);
      setError(ALAN_SUMMARY_TEXT.FAILED_TO_FETCH_ALAN_SUMMARY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && selectedRows && selectedRows.length === 1) {
      fetchAlanSummary();
    }
  }, [open, selectedRows]);

  const formattedData = apiData;

  const getScatterChartOptions = () => {
    if (!selectedXAxis || !selectedYAxis || !selectedArticle) return {};

    const rawData =
      apiData.scatter_plot.points_by_article[selectedArticle.value] || [];

    const xKey = selectedXAxis.value;
    const yKey = selectedYAxis.value;

    const groupedSeries = {
      "Under allocated": [],
      "Over allocated": [],
      Normal: [],
    };

    rawData.forEach((item) => {
      const statusInfo = STATUS_MAP[item.status] || STATUS_MAP[2];

      groupedSeries[statusInfo.name].push({
        x: Number(item[xKey]) || 0,
        y: Number(item[yKey]) || 0,
        name: item.store,
        allocation: item.allocated_units,
        demand: item.demand_units,
        ros: item.ros,
        stock: item.updated_oh_oo_it,
      });
    });
    const fetchAlanExplainatoryFromPoint = async ({ article, store }) => {
      if (!apiData) {
        displaySnackMessages(
          ALAN_SUMMARY_TEXT.NO_DATA_FOR_DEEP_DIVE,
          "error"
        );
        return;
      }

      const allocation_code = apiData.allocation_code;

      if (!allocation_code || !article || !store) {
        displaySnackMessages(
          ALAN_SUMMARY_TEXT.MISSING_DEEP_DIVE_PARAMS,
          "error"
        );
        return;
      }

      setDeepDiveLoading(true);
      setDeepDiveError(null);

      try {
        const payload = {
          allocation_code,
          article,
          store,
        };

        const response = await getAlanExplainatory(payload);
        setDeepDiveData(response.data);
      } catch (e) {
        handleErrorMessage(e);
        setDeepDiveError(ALAN_SUMMARY_TEXT.FAILED_TO_FETCH_DEEP_DIVE);
      } finally {
        setDeepDiveLoading(false);
      }
    };

    const finalSeries = Object.keys(groupedSeries).map((status) => ({
  name: status,
  color:
    STATUS_MAP[
      Object.keys(STATUS_MAP).find((k) => STATUS_MAP[k].name === status)
    ].color,

  data: groupedSeries[status].map((point) => ({
    ...point,
    events: {
      click: () => {
        const clickedData = {
          article: selectedArticle?.value,
          store: point.name,
        };

        setSelectedPoint(clickedData);

        // ✅ Auto open Deep Dive accordion
        setExpanded((prev) =>
          prev.includes("deep_dive_summary")
            ? prev
            : [...prev, "deep_dive_summary"]
        );

        // ✅ Trigger API
        fetchAlanExplainatoryFromPoint(clickedData);
      },
    },
  })),
}));

    return {
      chartType: "scatterChart",
      type: "scatter",

      chartTitle: ALAN_SUMMARY_TEXT.CHART_TITLE,

      axisLegends: {
        xaxis: { title: selectedXAxis.label },
        yaxis: { title: selectedYAxis.label },
      },

      series: finalSeries,

      plotOptions: {
        scatter: {
          events: {
            click: function (event) {
              console.log("hello world");
            },
          },
          point: {
            events: {
              click: function (event) {
                console.log("hello world");
              },
            },
          },
        },
      },

      tooltip: {
        pointFormat: ALAN_SUMMARY_TEXT.TOOLTIP_TEMPLATE(
          selectedXAxis.label,
          selectedYAxis.label
        ),
      },
    };
  };
  useEffect(() => {
    if (!apiData?.scatter_plot) return;

    const scatter = apiData.scatter_plot;

    // 1. Set article options dynamically
    const articles = scatter.articles || [];
    const articleOpts = articles.map((a) => ({
      label: a,
      value: a,
    }));
    setArticleOptions(articleOpts);

    // 2. Set default article (first one)
    if (articles.length > 0) {
      setSelectedArticle({
        label: articles[0],
        value: articles[0],
      });
    }

    // 3. Set X & Y options (from allowed_metrics)
    const metricOptions = getMetricOptions(scatter.allowed_metrics || []);

    setXAxisOptions(metricOptions);
    setYAxisOptions(metricOptions);

    // 4. Set default X axis
    const defaultXOption = getDefaultMetricOption(
      metricOptions,
      scatter.default_x_metric
    );
    setSelectedXAxis(defaultXOption);

    // 5. Set default Y axis
    const defaultYOption = getDefaultMetricOption(
      metricOptions,
      scatter.default_y_metric
    );
    setSelectedYAxis(defaultYOption);
  }, [apiData]);

  const accordionData = [
    {
      header: ALAN_SUMMARY_TEXT.DISTRIBUTION_SUMMARY_HEADER,
      content: (
        // stopPropagation prevents clicks inside content from bubbling to the
        // accordion item's onClick handler, which would toggle the accordion closed.
        <div onClick={(e) => e.stopPropagation()}>
          <div className="alan-summary-controls">
            <Select
              label="Article"
              setIsOpen={setArticleDropdownOpen}
              isOpen={articleDropdownOpen}
              isSearchable={true}
              isClearable={false}
              isCloseWhenClickOutside={true}
              isMulti={false}
              initialOptions={articleOptions}
              currentOptions={articleOptions}
              selectedOptions={selectedArticle}
              setSelectedOptions={setSelectedArticle}
              labelOrientation="top"
              width={"300px"}
              minWidth={"300px"}
              containerStyle={{ zIndex: 9999 }}
            />
            <Select
              label="X-axis"
              setIsOpen={setXDropdownOpen}
              isOpen={xDropdownOpen}
              isSearchable={true}
              isClearable={false}
              isCloseWhenClickOutside={true}
              isMulti={false}
              width={"300px"}
              minWidth={"300px"}
              initialOptions={xAxisOptions}
              currentOptions={xAxisOptions}
              selectedOptions={selectedXAxis}
              setSelectedOptions={setSelectedXAxis}
              labelOrientation="top"
              containerStyle={{ zIndex: 9999 }}
            />
            <Select
              label="Y-axis"
              setIsOpen={setYDropdownOpen}
              isOpen={yDropdownOpen}
              isSearchable={true}
              isClearable={false}
              width={"300px"}
              minWidth={"300px"}
              isCloseWhenClickOutside={true}
              isMulti={false}
              initialOptions={yAxisOptions}
              currentOptions={yAxisOptions}
              selectedOptions={selectedYAxis}
              setSelectedOptions={setSelectedYAxis}
              labelOrientation="top"
              containerStyle={{ zIndex: 9999 }}
            />
          </div>
          <div className="alan-summary-info-cards">
            <div className="alan-summary-info-card">
              <div className="alan-summary-info-label">
                {ALAN_SUMMARY_TEXT.ALLOCATION_LABEL}
              </div>
              <div className="alan-summary-info-value">
                {apiData?.allocation_code || ALAN_SUMMARY_TEXT.NA}
              </div>
            </div>
            <div className="alan-summary-info-card">
              <div className="alan-summary-info-label">
                {ALAN_SUMMARY_TEXT.ARTICLE_LABEL}
              </div>
              <div className="alan-summary-info-value">
                {selectedArticle?.label || ALAN_SUMMARY_TEXT.NA}
              </div>
            </div>
            <div className="alan-summary-info-card">
              <div className="alan-summary-info-label">
                {ALAN_SUMMARY_TEXT.STORES_LABEL}
              </div>
              <div className="alan-summary-info-value">
                {apiData?.scatter_plot?.article_store_count?.[
                  selectedArticle?.value
                ] || ALAN_SUMMARY_TEXT.NA}
              </div>
            </div>
          </div>
          {selectedXAxis &&
          selectedYAxis &&
          apiData?.scatter_plot?.points_by_article?.[selectedArticle?.value] ? (
            <div className="alan-summary-chart-container">
              <Charts options={getScatterChartOptions()} hideButton={true} />
            </div>
          ) : (
            <div className="alan-summary-debug-container">
              <div className="alan-summary-debug-title">
                {ALAN_SUMMARY_TEXT.CHART_DEBUG_INFO}
              </div>
              <div className="alan-summary-debug-info">
                selectedXAxis:{" "}
                {selectedXAxis ? JSON.stringify(selectedXAxis) : "null"}
              </div>
              <div className="alan-summary-debug-info">
                selectedYAxis:{" "}
                {selectedYAxis ? JSON.stringify(selectedYAxis) : "null"}
              </div>
              <div className="alan-summary-debug-info">
                apiData?.scatter_plot?.points_by_article?.[selectedArticle?.value]:{" "}
                {apiData?.scatter_plot?.points_by_article?.[
                  selectedArticle?.value
                ]
                  ? `${
                      apiData.scatter_plot.points_by_article[
                        selectedArticle?.value
                      ].length
                    }${ALAN_SUMMARY_TEXT.ITEMS_SUFFIX}`
                  : "null"}
              </div>
            </div>
          )}
        </div>
      ),
      id: 1,
      value: "distribution_summary",
    },
    {
      header: ALAN_SUMMARY_TEXT.DEEP_DIVE_SUMMARY_HEADER,
      content: (
        <div onClick={(e) => e.stopPropagation()}>
          {!selectedPoint && !deepDiveLoading && (
            <div className="alan-summary-deep-dive-placeholder">
              {ALAN_SUMMARY_TEXT.DEEP_DIVE_PLACEHOLDER}
            </div>
          )}

          {deepDiveLoading && (
            <div className="alan-summary-deep-dive-loading">
              <div>{ALAN_SUMMARY_TEXT.DEEP_DIVE_LOADING}</div>
            </div>
          )}

          {deepDiveError && (
            <div className="alan-summary-deep-dive-error">{deepDiveError}</div>
          )}

          {selectedPoint && deepDiveData && !deepDiveLoading && (
            <AISummaryPanelBackendContent
              content={deepDiveData}
              loading={false}
              error={null}
            />
          )}
        </div>
      ),
      id: 2,
      value: "deep_dive_summary",
    },
  ];

  return (
    <Panel
      title={ALAN_SUMMARY_TEXT.PANEL_TITLE}
      size="large"
      anchor="right"
      open={open}
      onClose={onClose}
      className="alan-summary-panel"
    >
      <div>
        <AISummaryPanelBackendContent
          content={formattedData}
          loading={loading}
          error={error}
        />
      </div>
      {summaryPlan && (
        <div className="alan-summary-accordion-container">
          <AccordionModern
            data={accordionData}
            isMultiExpanded={true}
            expanded={expanded}
            onChange={(activeAccordion) => {
              const isCurrentlyExpanded = expanded.includes(activeAccordion);
              const newExpanded = isCurrentlyExpanded
                ? expanded.filter((val) => val !== activeAccordion)
                : [...expanded, activeAccordion];

              setExpanded(newExpanded);
            }}
            setExpanded={(activeAccordion) => {
              if (Array.isArray(activeAccordion)) {
                setExpanded(activeAccordion);
              }
            }}
          />
        </div>
      )}
    </Panel>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getAlanSummary: (payload) => dispatch(getAlanSummary(payload)),
  getAlanSummaryForAlerts: (payload) =>
    dispatch(getAlanSummaryForAlerts(payload)),
  getAlanExplainatory: (payload) => dispatch(getAlanExplainatory(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(AlanSummaryPanel);
