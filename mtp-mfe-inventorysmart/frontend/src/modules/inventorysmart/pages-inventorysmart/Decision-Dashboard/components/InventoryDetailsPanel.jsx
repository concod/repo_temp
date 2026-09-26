import React, { useState, useEffect } from "react";
import { Panel, Select, Tooltip } from "impact-ui-v3";
import {
  getInventoryDetails,
  getAlanSummary,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import { connect } from "react-redux";
import {
  tableConfigurationMetaData,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import ProductIcon from "assets/IS_icons/IS_product.svg";
import ProductTagIcon from "assets/IS_icons/IS_productTagIcon.svg";
import BookmarkIcon from "assets/IS_icons/IS_bookmark.svg";
import CartIcon from "assets/IS_icons/IS_cart.svg";
import CalendarIcon from "assets/IS_icons/IS_calendar.svg";
import ChartIcon from "assets/IS_icons/IS_chart.svg";
import Charts from "core/Utils/charts";
import AiIcon from "../../../../../assets/IS_icons/IS_AI.svg";
import InventoryDistributionSection from "./InventoryDistributionSection";
import StoreInventoryPositions from "./StoreInventoryPositions";
import moment from "moment";
import { isEmpty, cloneDeep, isUndefined } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import "../AISummaryData/AISummaryCard.css";
import AISummaryCard from "../AISummaryData/AISummaryCard";
import { Button } from "impact-ui-v3";
import { parseAlanSummary } from "../AISummaryData/AISummaryContent";

const InventoryDetailsPanel = (props) => {
  const [productOptions, setProductOptions] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [panelLoader, setPanelLoader] = useState(false);
  const [articleDetails, setArticleDetails] = useState([]);
  const [structured, setStructured] = useState();
  const [articleLevelAggData, setArticleLevelAggData] = useState({
    total_dc_oh: 0,
    total_dc_it: 0,
    total_dc_oo: 0,
    total_store_oh: 0,
    total_store_it: 0,
    total_store_oo: 0,
    total_system_inv: 0,
  });
  const [selectedRowData, setSelectedRowData] = useState({});
  const [inventoryDetailsAiStatus, setInventoryDetailsAiStatus] = useState(
    false
  );
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [insightsResult, setInsightsResult] = useState("");

  useEffect(() => {
    if (props.selectedRows?.length > 0) {
      let options = props.selectedRows.map((item) => {
        return {
          label: replaceSpecialCharacter(
            props.articleKey ? item[props.articleKey] : item.article
          ),
          value: props.articleKey ? item[props.articleKey] : item.article,
        };
      });
      setProductOptions(options);
      setSelectedArticleId(options[0]);
      setSelectedRowData(cloneDeep(props.selectedRows[0]));
    }
  }, [props.selectedRows]);

  useEffect(() => {
    // RESET SUMMARY WHEN PRODUCT CHANGES
    setInventoryDetailsAiStatus(false);
    setStructured(null);
    setInsightsResult("");
    setInsightsError(null);
  }, [selectedArticleId?.value]);

  useEffect(() => {
    if (selectedArticleId?.value) {
      let data = cloneDeep(props.selectedRows) || [];
      if (props.articleKey) {
        let matched = data.find(
          (item) => item[props.articleKey] === selectedArticleId.value
        );
        if (matched) {
          setSelectedRowData(matched);
        }
      } else {
        const matched = Array.isArray(data)
          ? data.find((item) => item?.article === selectedArticleId.value)
          : undefined;
        if (matched) {
          setSelectedRowData(matched);
        }
      }
      fetchInventoryDetails(selectedArticleId.value);
    }
  }, [selectedArticleId, props.articleKey]);

  useEffect(() => {
    if (!isEmpty(articleDetails)) {
      let total_sys_inv_aggregated =
        articleDetails[0]?.total_sys_inv_aggregated;
      const total_dc_aggregated = articleDetails[0]?.total_dc_aggregated;
      let data = {
        total_dc_oh: 0,
        total_dc_it: 0,
        total_dc_oo: 0,
        total_store_oh: 0,
        total_store_it: 0,
        total_store_oo: 0,
        total_system_inv: 0,
      };
      const total_store_count = articleDetails?.length;

      // Aggregate the inventory values across all stores
      articleDetails.forEach((store) => {
        data.total_store_oh += Number(store.total_store_oh) || 0;
        data.total_store_it += Number(store.total_store_it) || 0;
        data.total_store_oo += Number(store.total_store_oo) || 0;
        data.total_dc_oh += Number(store.total_dc_oh) || 0;
        data.total_dc_it += Number(store.total_dc_it) || 0;
        data.total_dc_oo += Number(store.total_dc_oo) || 0;
        data.total_system_inv += Number(store.total_system_inv) || 0;
      });
      if (!total_dc_aggregated) {
        data.total_dc_oh = Math.round(Number(data.total_dc_oh) / total_store_count);
        data.total_dc_it = Math.round(Number(data.total_dc_it) / total_store_count);
        data.total_dc_oo = Math.round(Number(data.total_dc_oo) / total_store_count);
      }
      data.total_system_inv = total_sys_inv_aggregated
        ? Math.round(Number(data.total_system_inv) / total_store_count)
        : Math.round(data.total_system_inv);

      setArticleLevelAggData(data);
    }
  }, [articleDetails]);

  
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
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

  const fetchInventoryDetails = async (article) => {
    if (props.articleKey) {
      let rowData = props.selectedRows?.find(
        (item) => item[props.articleKey] === article
      );
      article = rowData?.article;
    }
    let payload = {
      filters: props.selectedFilters?.filter(
        (filterItem) => filterItem?.values?.length > 0
      ),
      meta: {
        ...tableConfigurationMetaData.meta,
      },
      article: article,
    };
    try {
      setPanelLoader(true);
      const response = await props.getInventoryDetails(payload);
      if (response?.data?.status) {
        setArticleDetails(response?.data?.data ?? []);
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      setPanelLoader(false);
    }
  };

  const closeSidePanel = () => {
    props.setInventoryDetailsPanelStatus(false);
  };

  const buildWaterFallChartComponent = () => {
    return {
      type: "waterfall",
      chartType: "waterfallChart",
      chartTitle: "",
      chartHeight: 250,
      legend: {
        enabled: false,
      },
      pointFormat: "<b>{point.y}</b>",
      xAxis: {
        categories: [
          "Total DC OH",
          "Total DC IT",
          "Total DC OO",
          "Total Store OH",
          "Total Store IT",
          "Total Store OO",
          "Total system inv",
        ],
        labels: {
          style: {
            fontSize: "12px",
            fontFamily: "Manrope",
            fontWeight: "500",
            lineHeight: "125%",
            color: "#60697D",
          },
        },
        tickLength: 0,
      },
      yAxis: {
        title: {
          text: "units",
        },
        labels: {
          style: {
            fontSize: "12px",
            fontFamily: "Manrope",
            fontWeight: "500",
            lineHeight: "125%",
            color: "#60697D",
          },
        },
      },
      axisLegends: {
        xaxis: {
          title: "",
        },
        yaxis: {
          title: "Units",
          style: {
            fontSize: "14px",
            fontWeight: "500",
            lineHeight: "20px",
            fontFamily: "Manrope",
            color: "#60697D",
          },
        },
      },
      exporting: "false",
      plotOptions: {
        waterfall: {
          borderColor: "#658EC4",
          borderRadius: 8,
        },
        series: {
          pointWidth: 40,
        },
      },
      series: [
        {
          data: [
            articleLevelAggData.total_dc_oh || 0,
            articleLevelAggData.total_dc_it || 0,
            articleLevelAggData.total_dc_oo || 0,
            articleLevelAggData.total_store_oh || 0,
            articleLevelAggData.total_store_it || 0,
            articleLevelAggData.total_store_oo || 0,
            {
              isIntermediateSum: true,
              y: articleLevelAggData.total_system_inv || 0,
            },
          ],
          color: "#658EC4",
          dataLabels: {
            enabled: false,
          },
          marker: {
            enabled: false,
          },
          pointPadding: 0,
        },
      ],
    };
  };

  const getAverageDiscount = () => {
    if (!isEmpty(selectedRowData)) {
      let discount =
        selectedRowData?.promo ?? selectedRowData?.promo_percentage;
      discount = Number(discount);
      if (!isNaN(discount)) {
        return Math.round(discount * 100);
      } else {
        return 0;
      }
    } else {
      return "-";
    }
  };

  const getMarginPercent = () => {
    let margin =
      selectedRowData?.last_week_margin_percentage ??
      selectedRowData?.lw_margin_perc;
    if (margin !== undefined && margin !== null) {
      const marginValue = Number(margin) * 100;
      return marginValue % 1 !== 0
        ? Number(marginValue.toFixed(1))
        : marginValue;
    } else if (!isEmpty(articleDetails)) {
      let data = cloneDeep(articleDetails);
      let sumMargin = 0;
      let sumRevenue = 0;
      data.map((item) => {
        sumMargin += item?.lw_margin || 0;
        sumRevenue += item?.lw_revenue || 0;
      });
      return sumRevenue > 0 ? Math.round((sumMargin / sumRevenue) * 100) : 0;
    } else {
      return "-";
    }
  };

  const getPrice = () => {
    if (props.usePriceFromDetailsTable) {
      const price = selectedRowData?.price;
      return price % 1 !== 0 ? Number(price)?.toFixed(2) : price;
    } else {
      if (!isEmpty(articleDetails)) {
        let sumRevenue = 0;
        let sumUnits = 0;
        let data = cloneDeep(articleDetails) || [];
        data.map((item) => {
          sumRevenue += item?.lw_revenue || 0;
          sumUnits += item?.w1 || 0;
        });
        return sumUnits > 0 ? Math.round(sumRevenue / sumUnits) : 0;
      } else {
        return "-";
      }
    }
  };

  const getProductTag = () => {
    const tagsCounter = {};
    const list = Array.isArray(articleDetails) ? articleDetails : [];
    list.forEach((item) => {
      const tag = item?.product_tag;
      if (!tag) return;
      tagsCounter[tag] = (tagsCounter[tag] || 0) + 1;
    });
    const entries = Object.entries(tagsCounter);
    if (entries.length === 0) return "-";
    const [maxTag] = entries.reduce((maxEntry, current) =>
      current[1] > maxEntry[1] ? current : maxEntry
    );
    return maxTag;
  };

  const hashString = (str = "") => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return h >>> 0; // unsigned
  };


  const handleFetchInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    setInsightsResult("");

    try {
      const payload = {
        product_codes: [selectedArticleId?.value],
      };

      const response = await props?.getAlanSummary(payload);
      const rawText = response?.data?.result;

      setStructured(parseAlanSummary(rawText));

      if (response?.data?.result) {
        setInsightsResult(response?.data?.result);
      } else {
        setInsightsError("No insights returned.");
      }
    } catch (error) {
      setInsightsError("Error fetching insights.");
    } finally {
      setInsightsLoading(false);
    }
  };

  return (
    <Panel
      title="Inventory Details"
      size="large"
      anchor="right"
      open={props.inventoryDetailsPanelStatus}
      onClose={closeSidePanel}
      style={{
        width: "896px",
      }}
      className={classes.inventoryDetailsPanel}
    >
      {props?.advanceFilter === true ? (
        <>
          <div
            className={`idp-headerRow ${globalClasses.paddingBottom_16} ${classes.idpStickyHeader}`}
          >
            <Select
              label="Selected Product"
              setIsOpen={setIsDropdownOpen}
              isOpen={isDropdownOpen}
              isSearchable={true}
              isClearable={false}
              isCloseWhenClickOutside={true}
              isMulti={false}
              initialOptions={productOptions}
              currentOptions={productOptions}
              selectedOptions={selectedArticleId}
              setSelectedOptions={setSelectedArticleId}
              labelOrientation="right"
            />
            <div className={classes.inventoryDetailsBtnContainer}>
              {/* When Insights is CLOSED → show Alan Insights button */}
              {!inventoryDetailsAiStatus && (
                <Tooltip title="" disabled variant="secondary">
                  <div
                    className="inventory-details-btn"
                    onClick={() => {
                      setInventoryDetailsAiStatus(true);
                      handleFetchInsights();
                    }}
                    role="button"
                  >
                    <AiIcon />
                    Iris Insights
                  </div>
                </Tooltip>
              )}

              {/* When Insights is OPEN → show Close Insights Impact-UI button */}
              {inventoryDetailsAiStatus && (
                <Button
                  variant="tertiary"
                  size="large"
                  onClick={() => setInventoryDetailsAiStatus(false)}
                >
                  Close Insights
                </Button>
              )}
            </div>
          </div>

          {inventoryDetailsAiStatus && (
            <div style={{ width: "100%", minHeight: "200px" }}>
              {insightsLoading ? (
                <div className="ai-insights-loader-wrapper">
                  <Loader
                    loader={true}
                    size="medium"
                    text="Fetching Iris Insights..."
                    minHeight="200px"
                  />
                </div>
              ) : (
                <AISummaryCard
                  content={structured}
                  onClose={() => setInventoryDetailsAiStatus(false)}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <div
          className={`${globalClasses.paddingBottom_16} ${classes.idpStickyHeader}`}
        >
          <Select
            label="Selected Product"
            setIsOpen={setIsDropdownOpen}
            isOpen={isDropdownOpen}
            isSearchable={true}
            isClearable={false}
            isCloseWhenClickOutside={true}
            isMulti={false}
            initialOptions={productOptions}
            currentOptions={productOptions}
            selectedOptions={selectedArticleId}
            setSelectedOptions={setSelectedArticleId}
            labelOrientation="right"
          />
        </div>
      )}
      <div
        className={`${globalClasses.flexColumn} ${globalClasses.layoutAlignStart} ${globalClasses.gap}`}
      >
        <Loader
          loader={panelLoader}
          size="medium"
          text="Loading Details"
          minHeight={"100vh"}
        >
          {!isEmpty(articleDetails) && (
            <div
              className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap_16}`}
            >
              <div className={classes.productDetailsContainer}>
                <div
                  className={`${globalClasses.flexColumn} ${globalClasses.layoutAlignStart} `}
                  style={{ alignSelf: "stretch", gap: "24px" }}
                >
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.gap}`}
                  >
                    <div className={classes.productDetailsTile1}>
                      <ProductIcon className="productIcon" />
                      <div className="details">
                        <p>
                          {props?.side_panel_labels?.product_description ||
                            "Product Description"}
                        </p>
                        {(() => {
                          const displayText = replaceSpecialCharacter(
                            articleDetails[0]?.product_description
                          );
                          return displayText?.length > 20 ? (
                            <Tooltip
                              title={displayText}
                              orientation="top"
                              variant="tertiary"
                            >
                              <p>
                                {displayText?.slice(0, 20)}
                                ...
                              </p>
                            </Tooltip>
                          ) : (
                            <p>{displayText}</p>
                          );
                        })()}
                      </div>
                    </div>
                    <div className={classes.productDetailsTile1}>
                      <ProductTagIcon />
                      <div className="details">
                        <p>
                          {props?.side_panel_labels?.product_type ||
                            "Product Type"}
                        </p>
                        <p>{getProductTag()}</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.gap}`}
                    style={{ alignSelf: "stretch" }}
                  >
                    {!isUndefined(articleDetails[0]?.launch_date) &&
                      !props.hiddenMetrics?.includes("launch_date") && (
                        <div className={classes.productDetailsTile2}>
                          <CalendarIcon />
                          <div className="details">
                            <p>Launch Date</p>
                            <p>
                              {articleDetails[0]?.launch_date
                                ? moment(articleDetails[0]?.launch_date).format(
                                    localStorage.getItem("tenantDateFormat")
                                  )
                                : "-"}
                            </p>
                          </div>
                        </div>
                      )}
                    {!props.hiddenMetrics?.includes("price") && (
                      <div className={classes.productDetailsTile2}>
                        <BookmarkIcon />
                        <div className="details">
                          <p>Price</p>
                          <p>${getPrice()}</p>
                        </div>
                      </div>
                    )}
                    {!props.hiddenMetrics?.includes("margin") && (
                      <div className={classes.productDetailsTile2}>
                        <ChartIcon />
                        <div className="details">
                          <p>Margin</p>
                          <p>{getMarginPercent()}%</p>
                        </div>
                      </div>
                    )}
                    {!props.hiddenMetrics?.includes("average_discount") && (
                      <div className={classes.productDetailsTile2}>
                        <CartIcon />
                        <div className="details">
                          <p>Average Discount</p>
                          <p>{getAverageDiscount()}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className={classes.productDetailsContainer}>
                <div className={classes.waterFallChartContainer}>
                  <div className={classes.waterFallChartTitle}>
                    <p>Inventory distribution - units</p>
                  </div>
                  <Charts
                    options={buildWaterFallChartComponent()}
                    hideButton={true}
                  />
                </div>
              </div>
              <InventoryDistributionSection articleDetails={articleDetails} />
              <StoreInventoryPositions
                articleDetails={articleDetails}
                side_panel_labels={props.side_panel_labels}
              />
            </div>
          )}
        </Loader>
      </div>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    side_panel_labels:
      store.inventorysmartReducer.inventorySmartDashboardService.ddScreenConfigs
        ?.dashboard?.side_panel_labels,
    articleKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig
        ?.articleKey,
    hiddenMetrics:
      store?.inventorysmartReducer?.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.drillDown?.hidden_metrics,
    usePriceFromDetailsTable:
      store?.inventorysmartReducer?.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.drillDown?.usePriceFromDetailsTable,
    advanceFilter:
      store.inventorysmartReducer.inventorySmartDashboardService?.advanceFilter,
  };
};

const mapActionToProps = (dispatch) => ({
  getInventoryDetails: (body) => dispatch(getInventoryDetails(body)),
  getAlanSummary: (body) => dispatch(getAlanSummary(body)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapActionToProps
)(InventoryDetailsPanel);
