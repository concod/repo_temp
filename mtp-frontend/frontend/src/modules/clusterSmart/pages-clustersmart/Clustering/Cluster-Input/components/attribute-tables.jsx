import { Clustering } from "modules/assortsmart/constants-assortsmart/stringContants";
import { Grid, Paper, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  fetchPerformanceAttributes,
  fetchProductAttributes,
  fetchClusterAttributes,
  setClusterAttributes,
  setSelectedPerformanceAttributes,
  setSelectedProductAttributes,
  setSelectedStoreAttributes,
  setIsMinAttributesSelected,
  setAttributerClusterLoaderStatus,
  setClusterInputLoader,
  perfDynamicCol,
} from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import * as clusterInputServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import _, { isEmpty } from "lodash";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import {
  isEcomPlan,
  isWholesalePlan,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  checkMinAttributes,
  onSelectionChangedPerformaceAttribute,
  onSelectionChangedProductAttribute,
  onSelectionChangedStoreAttribute,
} from "./attribute-table-functions";
const useStyles = makeStyles({
  cardMargin: {
    padding: "2.5rem",
  },
});
const AttributesTables = (props) => {
  const sharedClasses = sharedStyles();
  const classes = useStyles();
  const [performanceAttributes, setperformanceAttribues] = useState([]);
  const [productAttributes, setproductAttribues] = useState([]);
  const [storeAttributes, setStoreAttributes] = useState([]);
  const [performanceAttrbTableCols, setperformanceAttrbTableCols] = useState(
    []
  );
  const [productAttrbTableCols, setproductAttrbTableCols] = useState([]);
  const [frozenProductAttr, setFrozenProductAttr] = useState(null);
  const [frozenStoreAttr, setFrozenStoreAttr] = useState(null);
  let [selectedPerformancePlans, setSelectedPerformacePlans] = useState([]);
  let [selectedProductPlans, setSelectedProductPlans] = useState([]);
  let [selectedStorePlans, setSelectedStorePlans] = useState([]);
  const PerformanceInstance = useRef({});
  const ProductInstance = useRef({});
  const StoreInstance = useRef({});
  useEffect(() => {
    const fetchData = async () => {
      //Once the attributes tables are displayed, fetch the attributes data
      props.setClusterInputLoader({
        loader_type: "attributes_table",
        status: true,
      });
      try {
        if (props.planDetails?.channel?.length > 1) {
          let channels = [];
          props.planDetails?.channel.forEach((chan) => {
            if (!Plan.__Ecom_Channel.includes(chan)) {
              channels.push(chan);
            }
          });
          let perfDynamicColRes = await props.perfDynamicCol(
            {
              table_name: "assort_cluster_perf_input",
              channel: channels,
            },
            props.planDetails?.data?.cluster_plan_code
          );
          let performanceAttribCols = await agGridColumnFormatter(
            perfDynamicColRes?.data?.data
          );
          performanceAttribCols.push({
            headerCheckboxSelection: true,
            checkboxSelection: true,
          });
          setperformanceAttrbTableCols(performanceAttribCols);
        } else {
          let performanceAttribCols = await props.getColumnsAg(
            "table_name=assort_cluster_perf_input"
          );
          performanceAttribCols = performanceAttribCols.filter((col) => {
            return col.column_name !== "is_final";
          });
          performanceAttribCols.push({
            headerCheckboxSelection: true,
            checkboxSelection: true,
          });
          setperformanceAttrbTableCols(performanceAttribCols);
        }
        let productAttribCols = await props.getColumnsAg(
          "table_name=assort_cluster_product_input"
        );
        productAttribCols = productAttribCols.filter((col) => {
          return col.column_name !== "is_final";
        });
        let cols = _.cloneDeep(productAttribCols);
        cols = cols.map((col) => {
          if (col.column_name === "is_primary") {
            col.Cell = (tableData) => {
              return tableData.value ? "Primary" : "Secondary";
            };
          }
          return col;
        });
        cols.push({ headerCheckboxSelection: true, checkboxSelection: true });
        setproductAttrbTableCols(cols);
        const response = await props.fetchClusterAttributes(
          props.planDetails.cluster_plan_code
        );
        props.setClusterAttributes(response.data.data);
        let performanceMetrics =
          response.data.data.performance_attributes.metrics;
        let selectedPerfRow = [], //this array will have whole preformance row which is selected
          selectedProdRow = [], //this array will have whole product row which is selected
          selectedPerfAttr = [], //this array will have all selected performance attribute names
          selectedProdAttr = [],
          selectedStoreRow = [],
          selectedStoreAttr = []; //this array will have all selected product attribute names
        let isWholeSale = isWholesalePlan(props.planDetails);

        if (props.planDetails?.channel?.length > 1) {
          let groupedPerformance = groupByCustom({
            Group: performanceMetrics,
            By: ["attribute_name"],
          });
          let perfData = groupedPerformance.map((item) => {
            let eachRow = {};
            item.forEach((data) => {
              eachRow.attribute_name = data.attribute_name;
              eachRow.is_final = data.is_final;
              eachRow.is_selected = data.is_final;
              if (data.is_final || isWholeSale) {
                selectedPerfRow.push(data);
                selectedPerfAttr.push(data.attribute_name);
              }
              eachRow[`${data?.levels?.channel.toLowerCase()}_score`] =
                data.score;
              eachRow[`${data?.levels?.channel.toLowerCase()}_rank`] =
                data.rank;
            });
            return eachRow;
          });
          setperformanceAttribues(perfData);
        } else {
          let perfData = performanceMetrics.map((item) => {
            let eachRow = { ...item };
            if (item.is_final || isWholeSale) {
              // for wholesale channel all performace attribute should be selected by default
              selectedPerfRow.push(item);
              selectedPerfAttr.push(item.attribute_name);
            }
            eachRow.is_selected = eachRow.is_final;
            return eachRow;
          });
          setperformanceAttribues(perfData);
        }
        props.setSelectedPerformanceAttributes(selectedPerfRow);
        setSelectedPerformacePlans(selectedPerfAttr);
        let productMetrics = response.data.data.product_attributes.metrics;
        let attrJson = {};
        let prodData = productMetrics.map((item) => {
          let eachRow = { ...item };
          if (item.is_final) {
            // pushing default selected product rows
            if (props.levelsJson?.[item.attribute_name]) {
              attrJson[props.levelsJson?.[item.attribute_name]] =
                eachRow.attribute_name;
              eachRow.attribute_name = props.levelsJson?.[item.attribute_name];
            }
            selectedProdRow.push(eachRow);
            selectedProdAttr.push(eachRow.attribute_name);
          } else {
            if (props.levelsJson?.[item.attribute_name]) {
              attrJson[props.levelsJson?.[item.attribute_name]] =
                eachRow.attribute_name;
              eachRow.attribute_name = props.levelsJson?.[item.attribute_name];
            }
          }
          eachRow.is_selected = item.is_final;

          props.setAttributeJson(attrJson);
          return eachRow;
        });
        props.setSelectedProductAttributes(selectedProdRow);
        setSelectedProductPlans(selectedProdAttr);
        setproductAttribues(prodData);
        let storeMetrics = response?.data?.data?.store_attributes?.metrics;
        if (storeMetrics) {
          let storeData = storeMetrics?.map((item) => {
            let eachRow = { ...item };
            if (item.is_final) {
              // pushing default selected store rows
              if (props.levelsJson?.[item.attribute_name]) {
                attrJson[props.levelsJson?.[item.attribute_name]] =
                  eachRow.attribute_name;
                eachRow.attribute_name =
                  props.levelsJson?.[item.attribute_name];
              } else {
                if (props.levelsJson?.[item.attribute_name]) {
                  attrJson[props.levelsJson?.[item.attribute_name]] =
                    eachRow.attribute_name;
                  eachRow.attribute_name =
                    props.levelsJson?.[item.attribute_name];
                }
              }
              selectedStoreRow.push(eachRow);
              selectedStoreAttr.push(eachRow.attribute_name);
            }
            eachRow.is_selected = item.is_final;

            props.setAttributeJson(attrJson);
            return eachRow;
          });
          props.setSelectedStoreAttributes(selectedStoreRow);
          setSelectedStorePlans(selectedStoreAttr);
          setStoreAttributes(storeData);
        }
      } catch (error) {
        props.addSnack({
          message: "Couldn't fetch attributes data",
          options: {
            variant: "error",
          },
        });
      }
      props.setClusterInputLoader({
        loader_type: "attributes_table",
        status: false,
      });
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFrozenProductAttr(
      props.screenConfiguration?.["1.1"]?.assort_frozen_product_attr
    );
  }, [props.screenConfiguration]);

  useEffect(() => {
    if (!isEmpty(props.clusterAttributes)) {
      if (
        props.attributeSelection["performance"] ||
        props.attributeSelection["product"] ||
        props.attributeSelection["store"]
      ) {
        props.setIsMinAttributesSelected(
          checkMinAttributes(
            props,
            props.selectedPerformanceAttributes,
            props.selectedProductAttributes,
            props.selectedStoreAttributes,
            props.clusterAttributes,
            props.attributeSelection
          )
        );
      } else {
        props.setIsMinAttributesSelected(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.selectedProductAttributes,
    props.selectedPerformanceAttributes,
    props.selectedStoreAttributes,
    props.clusterAttributes,
  ]);
  const loadTablePerformanceInstance = (params) => {
    PerformanceInstance.current = params;
  };
  const loadTableProductInstance = (params) => {
    ProductInstance.current = params;
  };

  const loadTableStoreInstance = (params) => {
    StoreInstance.current = params;
  };

  return (
    <>
      <Paper className={classes.cardMargin}>
        <Grid container spacing={4}>
          {!(
            isEcomPlan(props.planDetails) &&
            props.planDetails?.channel.length === 1
          ) &&
            performanceAttrbTableCols?.length > 0 &&
            performanceAttributes?.length > 0 &&
            props.attributeSelection["performance"] && (
              <Grid
                item
                xs={
                  props.attributeSelection["product"] &&
                  props.attributeSelection["store"]
                    ? 6
                    : 8
                }
              >
                <Typography
                  gutterBottom={true}
                  variant="h5"
                  id="performance-attributes"
                >
                  Select Performance Attributes
                </Typography>
                <AgGridTable
                  columns={performanceAttrbTableCols}
                  rowdata={performanceAttributes}
                  loadTableInstance={loadTablePerformanceInstance}
                  rowSelection="multiple"
                  onSelectionChanged={(event) =>
                    onSelectionChangedPerformaceAttribute(
                      event,
                      props,
                      performanceAttributes,
                      setSelectedPerformacePlans
                    )
                  }
                  uniqueRowId={"attribute_name"}
                  selectedRows={selectedPerformancePlans}
                  sideBar={false}
                  pagination={false}
                  tableId={"performance attribute"}
                />
              </Grid>
            )}
          {isEcomPlan(props.planDetails) &&
            props.planDetails?.channel.length === 1 && (
              <Grid item xs={5}></Grid>
            )}
          {Clustering.__clustering_type === 1 &&
            productAttrbTableCols?.length > 0 &&
            productAttributes?.length > 0 &&
            props.attributeSelection["product"] && (
              <Grid
                item
                xs={
                  props.attributeSelection["performance"] &&
                  props.attributeSelection["store"]
                    ? 3
                    : props.attributeSelection["performance"] ||
                      props.attributeSelection["store"]
                    ? 4
                    : 8
                }
              >
                <Typography gutterBottom={true} variant="h5">
                  Select Product Attributes
                </Typography>
                <AgGridTable
                  columns={productAttrbTableCols}
                  rowdata={productAttributes}
                  loadTableInstance={loadTableProductInstance}
                  rowSelection="multiple"
                  onSelectionChanged={(event) =>
                    onSelectionChangedProductAttribute(
                      event,
                      props,
                      frozenProductAttr,
                      setSelectedProductPlans
                    )
                  }
                  uniqueRowId={"attribute_name"}
                  selectedRows={selectedProductPlans}
                  sideBar={false}
                  pagination={false}
                  tableId={"product attribute"}
                />
              </Grid>
            )}
          {Clustering.__clustering_type === 1 &&
            productAttrbTableCols?.length > 0 &&
            storeAttributes?.length > 0 &&
            props.attributeSelection["store"] && (
              <Grid
                item
                xs={
                  props.attributeSelection["performance"] &&
                  props.attributeSelection["product"]
                    ? 3
                    : props.attributeSelection["performance"] ||
                      props.attributeSelection["product"]
                    ? 4
                    : 8
                }
              >
                <Typography
                  gutterBottom={true}
                  variant="h5"
                  id="store-attributes"
                >
                  Select Store Attributes
                </Typography>
                <AgGridTable
                  columns={productAttrbTableCols}
                  rowdata={storeAttributes}
                  loadTableInstance={loadTableStoreInstance}
                  rowSelection="multiple"
                  onSelectionChanged={(event) =>
                    onSelectionChangedStoreAttribute(
                      event,
                      props,
                      frozenStoreAttr,
                      setSelectedStorePlans
                    )
                  }
                  uniqueRowId={"attribute_name"}
                  selectedRows={selectedStorePlans}
                  sideBar={false}
                  pagination={false}
                  tableId={"store attribute"}
                />
              </Grid>
            )}
        </Grid>
      </Paper>
      <Typography className={sharedClasses.legend}>
        Select atleast{" "}
        {props.attributeSelection["product"] &&
          `${props.clusterAttributes?.product_attributes?.min_selection} Product`}
        {!isEcomPlan(props.planDetails) &&
          props.attributeSelection["performance"] &&
          props.attributeSelection["product"] &&
          ` and `}
        {!isEcomPlan(props.planDetails) &&
          props.attributeSelection["performance"] &&
          `${props.clusterAttributes?.performance_attributes?.min_selection}
        Performance`}{" "}
        attributes
      </Typography>
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store)
      ?.data,
    clusterAttributes: clusterInputServiceActions.clusterAttributesSelector(
      store
    ),
    selectedProductAttributes: clusterInputServiceActions.selectedProductAttributesSelector(
      store
    ),
    selectedStoreAttributes: clusterInputServiceActions.selectedStoreAttributesSelector(
      store
    ),
    selectedPerformanceAttributes: clusterInputServiceActions.selectedPerformanceAttributesSelector(
      store
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      store
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(store),
  };
};
const mapActionsToProps = {
  fetchPerformanceAttributes,
  fetchProductAttributes,
  fetchClusterAttributes,
  setClusterAttributes,
  setSelectedPerformanceAttributes,
  setSelectedProductAttributes,
  setSelectedStoreAttributes,
  setIsMinAttributesSelected,
  getColumnsAg,
  addSnack,
  setAttributerClusterLoaderStatus,
  setClusterInputLoader,
  perfDynamicCol,
};
export default connect(mapStateToProps, mapActionsToProps)(AttributesTables);
