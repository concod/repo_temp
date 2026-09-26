import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import { isEmpty } from "lodash";
import { makeStyles } from "@mui/styles";
import { displayFormattedDate } from "../../../utils-inventorysmart/utilityFunctions";

import { getDcOutboundProjectionGraphData } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/dc-outbound-projection-service";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { DC_OUTBOUND_PRODUCTION_DROP_DOWN } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { mapDataToLabel } from "core/commonComponents/coreComponentScreen/utils";
import Form from "core/Utils/form";
import { Button } from "impact-ui-v3";
import { getStartDateAndEndDateStringFromFiscalWeekObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { getCustomDateFilterObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { setDcOutboundProjectionGraphLoader } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/dc-outbound-projection-service";

const DCOutboundProjectionGraph = (props) => {
  const [requestBody, setRequestBody] = useState(null);
  const filterDependencyRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [graphFilters, setGraphFilters] = useState({
    article: [],
    channel: [],
  });

  const globalClasses = globalStyles();

  const useStyles = makeStyles((theme) => ({
    graphContainer: {
      flexGrow: 1,
      border: "1px solid #ebebf0",
      borderRadius: "12px",
      backgroundColor: "#fff",
      padding: "0px 15px",
      width: "75%",
    },
  }));

  const classes = useStyles();

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencyRef.current = props.filterDependency;
      setManualCallBackRequestBody();
    }
  }, [props.filterDependency]);

  const setManualCallBackRequestBody = () => {
    let filters = [];
    let date_range = {};
    let customFilters = [];

    filterDependencyRef?.current.forEach((filterKeysValue) => {
      if (filterKeysValue.attribute_name !== "fiscal_date_range") {
        filters.push(filterKeysValue);
      } else {
        date_range = {
          start_date: filterKeysValue.values[0],
          end_date: filterKeysValue.values[1],
        };

        const {
          startDate,
          endDate,
        } = getStartDateAndEndDateStringFromFiscalWeekObject(filterKeysValue);
        date_range = {
          start_date: startDate,
          end_date: endDate,
        };
        customFilters = [
          getCustomDateFilterObject("start_date", "start_date", [startDate]),
          getCustomDateFilterObject("end_date", "end_date", [endDate]),
        ];
      }
    });

    let manualFilterbody = { range: [], sort: [], search: [] };
    let body = {
      meta: {
        ...manualFilterbody,
      },
      filters: [...filters, ...customFilters],
      date_range: date_range,
    };
    setRequestBody(body);
  };

  const applyGraphFilters = () => {
    const search_payload = [];
    const article_payload = graphFilters["article"]
      ? {
          column: "article",
          pattern: graphFilters["article"].join(","),
          search_type: "contains",
        }
      : null;
    const channel_payload = graphFilters["channel"]
      ? {
          column: "channel",
          pattern: graphFilters["channel"].join(","),
          search_type: "contains",
        }
      : null;
    if (article_payload) search_payload.push(article_payload);
    if (channel_payload) search_payload.push(channel_payload);
    reloadGraph(search_payload);
  };

  const reloadGraph = (search_payload) => {
    requestBody["meta"]["search"] = search_payload;
    fetchOutboundProjectionGraph(requestBody);
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      props.displaySnackMessages(errObj?.message, "error");
    else props.displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const buildGraphData = () => {
    const inventory_outflow = [];
    const on_order_quantity = [];
    const projected_bop = [];
    const projected_eop = [];
    graphData.map((item) => {
      inventory_outflow.push(item.inventory_outflow);
      on_order_quantity.push(item.on_order_quantity);
      projected_bop.push(item.projected_bop);
      projected_eop.push(item.projected_eop);
    });
    const series = [
      {
        name: "Inventory Outflow",
        data: inventory_outflow,
      },
      {
        name: "On Order Quantity",
        data: on_order_quantity,
      },
      {
        name: "Projected BOP",
        data: projected_bop,
      },
      {
        name: "Projected EOP",
        data: projected_eop,
      },
    ];
    return series;
  };

  const buildOutboundProjectionGraphComponent = () => {
    return {
      chartType: "simpleLineChart",
      chartTitle: "DC Outbound Projection",
      credits: {
        enabled: false,
      },
      axisLegends: {
        xaxis: {
          categories: graphData.map((item) => 
            displayFormattedDate(
              item?.week_ending_date,
              localStorage.getItem("tenantDateFormat")
            )
        ), 
          title: "Week Ending Date",
        },
        yaxis: {
          title: "Units",
        },
      },
      series: buildGraphData(),
      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal'
      },
    };
  };

  const fetchOutboundProjectionGraph = async (requestBody) => {
    try {
      props.setDcOutboundProjectionGraphLoader(true);
      let response = await props.getDcOutboundProjectionGraphData(requestBody);

      setGraphData(response?.data?.data?.data || []);
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setDcOutboundProjectionGraphLoader(false);
    }
  };

  useEffect(() => {
    if (requestBody) fetchOutboundProjectionGraph(requestBody);
  }, [requestBody]);

  const graphDropdowns = [
    {
      label: "Choice",
      column_name: "article",
      dimension: "product",
      type: "cascaded",
      accessor: "article",
    },
    {
      label: "Channel",
      column_name: "channel",
      dimension: "store",
      type: "cascaded",
      accessor: "channel",
    },
  ];
  const buildFormFields = async () => {
    const graphFormFields = DC_OUTBOUND_PRODUCTION_DROP_DOWN;
    const channel_options = props?.filterDependency?.filter((filter) => filter.attribute_name === "channel")

    await Promise.all(
      graphDropdowns.map(async (filter, index) => {
        let body = {
          filter_type: filter.type,
          filters: [],
          application_code: 1,
          is_urm_filter: true,
          screen_name: "DC Outbound Projection Report",
          attributes: [
            {
              attribute_name: filter.column_name,
              dimension: filter.dimension,
              filter_type: filter.type,
            },
          ],
        };
        const options = filter.column_name !== "channel" ? await getCombinedCrossDimensionFiltersData(body)() : {channel: channel_options[0].values} ;
        let dropdown_options = filter.column_name !== "channel"? options?.data?.data : options ;
        graphFormFields.map((formfield) => {
          if (formfield.accessor === filter.accessor) {
            formfield.options = dropdown_options[filter.accessor]?.map((item) =>
              mapDataToLabel(item)
            );
          }
        });
      })
    );
    setFormFields(graphFormFields);
  };

  const handleChange = (updatedFormData) => {
    setGraphFilters(updatedFormData);
  };

  useEffect(() => {
    setFormFields([]);
    buildFormFields();
  }, [props.filterDependency]);

  return (
    <>
      {requestBody && graphData && (
        <>
          <div
            className={` ${globalClasses.layoutAlignEnd} ${globalClasses.verticalAlignCenter} ${globalClasses.gap}`}
          >
            <div className={`${globalClasses.widthFitContent}`}>
              <Form
                layout={"vertical"}
                maxFieldsInRow={2}
                handleChange={handleChange}
                fields={formFields}
                updateDefaultValue={false}
                defaultValues={graphFilters}
              ></Form>
            </div>
            <div className={`${globalClasses.marginTop}`}  >
            <Button
              variant="contained"
              color="primary"
              id="applyGraphFiltersButton"
              onClick={applyGraphFilters}
            >
              Apply
            </Button>
            </div>
          </div>
          <div
            className={`${globalClasses.centerAlign} ${globalClasses.marginAround}`}
          >
            <div className={classes.graphContainer}>
              <Charts
                options={buildOutboundProjectionGraphComponent()}
                hideButton={true}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    dcOutboundProjectionTableData:
      inventorysmartReducer.inventorySmartDcOutboundProjectionService
        .dcOutboundProjectionTableData,
    allocationReportsConfiguration:
      inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    dcOutboundProjectionGraphLoader:
      inventorysmartReducer.inventorySmartDcOutboundProjectionService
        .dcOutboundProjectionGraphLoader,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getDcOutboundProjectionGraphData: (body) =>
      dispatch(getDcOutboundProjectionGraphData(body)),
    setDcOutboundProjectionGraphLoader: (body) =>
      dispatch(setDcOutboundProjectionGraphLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DCOutboundProjectionGraph);
