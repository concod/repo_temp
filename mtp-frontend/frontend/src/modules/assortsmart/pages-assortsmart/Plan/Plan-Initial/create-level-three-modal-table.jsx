import React, { useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import AgGridTable from "core/Utils/agGrid";
import { cloneDeep } from "lodash";
import { Card, InputLabel, TextField, Button, Box } from "@mui/material";
import {
  getProductList,
  setProductList,
  set2_1_Loader,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  getDateFilterSubractCompareYear,
  getLevelFiltersBigQuery,
} from "../../../utils-assortsmart/utilityFunctions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";

const Level3ModalRT = (props) => {
  const [styleViewColumns, setStyleViewColumns] = useState([]);
  const [styleViewProductsData, setStyleViewProductsData] = useState([]);
  const [subdeptViewColumns, setSubdeptViewColumns] = useState([]);
  const [subDeptViewProductsData, setSubDeptViewProductsData] = useState([]);
  const classes = useStyles();

  useEffect(() => {
    if (props.productList?.data?.length && props.productList?.l3_data?.length) {
      let tableData1 = [],
        tableData2 = [];
      props.productList.data.forEach((prod) => {
        let obj1 = { ...prod };
        obj1.uniqueID =
          obj1.l3_name + obj1.channel + obj1.article + obj1.style_name;
        tableData1.push(obj1);
      });
      props.productList.l3_data.forEach((prod) => {
        let obj2 = { ...prod };
        obj2.uniqueID =
          obj2.l3_name + obj2.channel + obj2.article + obj2.style_name;
        tableData2.push(obj2);
      });
      setStyleViewProductsData(tableData1);
      setSubDeptViewProductsData(tableData2);
    }
  }, [props.productList]);
  useEffect(() => {
    const fetchData = async () => {
      const planDetailsData = cloneDeep(props.planDetails.data);
      let styleViewCols = await getColumnsAg(
        "table_name=product_list",
        props.levelsJson
      )();
      setStyleViewColumns(styleViewCols);
      let subDeptCols = await getColumnsAg(
        "table_name=product_list_l3",
        props.levelsJson
      )();
      setSubdeptViewColumns(subDeptCols);
      if (props.levelOneSelected?.value) {
        planDetailsData["l1_name"] = [props.levelOneSelected?.value];
      }
      if (props.levelTwoSelected?.value) {
        planDetailsData["l2_name"] = [props.levelTwoSelected?.value];
      }
      let response = await props.getProductList(
        {
          filters: [
            {
              attribute_name: "plan_code",
              operator: "in",
              value: [planDetailsData.plan_code.toString()],
            },
            {
              attribute_name: "channel",
              operator: "in",
              value: props.formData.channel_list || planDetailsData.channel,
            },
            {
              attribute_name: "sub_channel",
              operator: "in",
              value:
                planDetailsData?.sub_channel?.length > 0
                  ? planDetailsData?.sub_channel
                  : props.formData.channel_list || planDetailsData.channel,
            },
            ...getLevelFiltersBigQuery(planDetailsData, props.planLevels),
            getDateFilterSubractCompareYear(planDetailsData),
          ],
          data_pull_source: planDetailsData?.data_pull_source || "",
          compare_season: planDetailsData?.compare_season || "",
          optimization_level:
            props.screenConfiguration?.common?.final_level || "l3_name",
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setProductList(response.data?.data || []);
      props.set2_1_Loader(false);
    };
    if (props.planDetails.status) {
      props.set2_1_Loader(true);
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails]);

  const loadTableInstance = (params) => {
    props.createNewL3Instance.current = params;
  };

  useEffect(() => {
    return () => {
      props.setProductList([]);
    };
  }, []);
  return (
    <Card className={`${classes.paperPadding}`}>
      {props.selectedTab === "Style View" && (
        <AgGridTable
          rowdata={styleViewProductsData || []}
          columns={styleViewColumns}
          loadTableInstance={loadTableInstance}
          rowSelection="multiple"
          tableId={"create-new-l3"}
          uniqueRowId={"uniqueID"}
          sideBar={false}
          selectAllHeaderComponent={true}
          sizeColumnsToFitFlag={true}
          adjustTableHeight={props.productList?.length <= 2 ? true : false}
        />
      )}
      {props.selectedTab === `${props?.columnHeaderJson?.l3_name} View` && (
        <>
          <AgGridTable
            rowdata={subDeptViewProductsData || []}
            columns={subdeptViewColumns}
            loadTableInstance={loadTableInstance}
            rowSelection="single"
            tableId={"create-new-l3"}
            uniqueRowId={"uniqueID"}
            sideBar={false}
            selectAllHeaderComponent={true}
            hideHeaderCheckboxComponent={true}
            sizeColumnsToFitFlag={true}
            adjustTableHeight={props.productList?.length <= 2 ? true : false}
          />
          <Box className={classes.flexRowContentCenter}>
            <InputLabel className={classes.inputLableStyle}>
              {Plan.__Index_Factor}
            </InputLabel>
            <TextField
              type="number"
              variant="outlined"
              className={classes.indexFactorInput}
              id="index factor"
              onChange={(e) => props.setIndexFactor(e.target.value)}
              placeholder={"Enter Index Factor"}
              value={props.indexFactor}
              name="index factor"
            />
          </Box>
        </>
      )}
    </Card>
  );
};

const mapStateToProps = (store) => {
  return {
    productList: store.assortsmartReducer.planInitialReducer.productList,
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      store
    ),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      store
    ),
  };
};

const mapDispatchToProps = (dispatch) => ({
  getProductList: (payload, endpoint, objId) =>
    dispatch(getProductList(payload, endpoint, objId)),
  setProductList: (payload) => dispatch(setProductList(payload)),
  set2_1_Loader: (payload) => dispatch(set2_1_Loader(payload)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Level3ModalRT));
