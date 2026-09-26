import React, { useEffect, useState } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import AgGridTable from "core/Utils/agGrid";
import { cloneDeep } from "lodash";
import {
  getProductList,
  setProductList,
  set2_1_Loader,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  getDateFilterSubractCompareYear,
  getLevelFiltersBigQuery,
} from "../../../utils-assortsmart/utilityFunctions";
import { getColumnsAg } from "core/actions/tableColumnActions";

const Level3ModalRT = (props) => {
  const [columns, setColumns] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      const planDetailsData = cloneDeep(props.planDetails.data);
      let cols = await getColumnsAg(
        "table_name=product_list",
        props.levelsJson
      )();
      setColumns(cols);
      if(props.levelOneSelected?.value){
        planDetailsData["l1_name"] = [props.levelOneSelected?.value];
      }
      if(props.levelTwoSelected?.value){
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
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      props.setProductList(response.data?.data?.data || []);
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
    <>
      <AgGridTable
        rowdata={props.productList || []}
        columns={columns}
        loadTableInstance={loadTableInstance}
        rowSelection="multiple"
        tableId={"create-new-l3"}
        uniqueRowId={"article"}
        sideBar={false}
        selectAllHeaderComponent={true}
        sizeColumnsToFitFlag={true}
        adjustTableHeight={props.productList?.length <= 2 ? true : false}
      />
    </>
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
  };
};

const mapDispatchToProps = (dispatch) => ({
  getProductList: (payload, endpoint) =>
    dispatch(getProductList(payload, endpoint)),
  setProductList: (payload) => dispatch(setProductList(payload)),
  set2_1_Loader: (payload) => dispatch(set2_1_Loader(payload)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Level3ModalRT));
