import React, { useState, useEffect, useRef } from "react";
import AgGridTable from "core/Utils/agGrid";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { common } from "../../../constants-assortsmart/stringContants";
import { times, cloneDeep, uniqBy, isEmpty, isArray } from "lodash";
import { getDepthMultiplierData } from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  filterView,
  getPlanPayload,
} from "../../../utils-assortsmart/utilityFunctions";
import { groupByCustom } from "core/Utils/formatter";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";

const DepthMultiplierComponent = (props) => {
  const [
    depthMultiplierTableColumns,
    setDepthMultiplierTableColumns,
  ] = useState([]);
  const [depthMultiplierTableData, setDepthMultiplierTableData] = useState([]);
  const [depthMultiplierLoader, setShowDepthMultiplierLoader] = useState(true);
  const classes = useStyles();
  const depthMultiplierInstance = useRef({});
  const [channelSelected, setChannelSelected] = useState({});
  const depthMultiplierData = useRef({});
  const depthMultiplierColumns = useRef({});
  const [channelOptions, setChannelOptions] = useState([]);

  useEffect(() => {
    if (!isEmpty(channelSelected)) {
      let filteredDepthMulData = depthMultiplierData?.current?.filter(
        (tableData) => {
          return tableData.special_classification === channelSelected?.value;
        }
      );
      let groupedData = groupByCustom({
        Group: filteredDepthMulData,
        By: ["l3_name"],
      });
      let dynamicRangeData = times(
        groupedData?.[0]?.length,
        (rangeIndex) => {
          return {
            label: `Range ${rangeIndex + 1}`,
            column_name: `range${rangeIndex + 1}`,
            ...common.__default_column_attributes,
            type: "str",
            order_of_display: 6 + rangeIndex,
            tc_code: 57,
          };
        }
      );
      const columns = cloneDeep(depthMultiplierColumns.current);
      setDepthMultiplierTableColumns(
        agGridColumnFormatter(columns.concat(dynamicRangeData))
      );
      let rangePercentArray = [], rangeMulArray = [];
      
      for (let items of groupedData) {
      let rangePercentObj = { metric: "Bottom Of Range (%)", l3_name:  items[0].l3_name};
      for (let i = 0; i < items.length; i++) {
        rangePercentObj[`range${i + 1}`] = parseFloat(
          items[i].range
        ).toFixed(2);
      }

      let rangeMulObj = { metric: "Range Index (Avg. Depth Multiplier)" , l3_name:  items[0].l3_name};
      for (let index = 0; index < items.length; index++) {
        rangeMulObj[`range${index + 1}`] = parseFloat(
          items[index].range_multiplier
        ).toFixed(2);
      }
      rangePercentArray.push(rangePercentObj)
      rangeMulArray.push(rangeMulObj)
    }
      const tableData = [ ...rangePercentArray, ...rangeMulArray];
      setDepthMultiplierTableData(tableData);
      setShowDepthMultiplierLoader(false);
    }
  }, [channelSelected?.value]);

  useEffect(() => {
    const fetchDepthMultiplierData = async () => {
      setShowDepthMultiplierLoader(true);
      depthMultiplierColumns.current = await props.getColumnsAg(
        "table_name=assort_depth_multiplier",
        props.levelsJson
      );
      let selectedL3ValueArr =
        isArray(props.selectedL3FilterValue) &&
        props.selectedL3FilterValue.map((obj) => obj.value);
      let planData = cloneDeep(props.planDetails?.data);
      if (props.selectedL1FilterValue?.value) {
        planData.l1_name = [props.selectedL1FilterValue?.value];
      }
      if (props.selectedL2FilterValue?.value) {
        planData.l2_name = [props.selectedL2FilterValue?.value];
      }
      planData.l3_name = selectedL3ValueArr?.length
        ? selectedL3ValueArr
        : [props.selectedL3FilterValue?.value];
      let depthMultiplierPayload = getPlanPayload(
        planData,
        props.planLevels,
        false,
        true
      );
      let endDate = new Date(planData.selling_period_edate);
      depthMultiplierPayload.filters.push({
        attribute_name: "l3_name",
        operator: "in",
        value: selectedL3ValueArr?.length
          ? selectedL3ValueArr
          : [props.selectedL3FilterValue?.value],
      });
      depthMultiplierPayload.filters.push(
        {
          attribute_name: "special_classification",
          operator: "in",
          value: props.planDetails?.data?.channel,
        },
        {
          attribute_name: "yearly_flag",
          operator: "in",
          value: [endDate.getMonth() > 5 ? "H2" : "H1"],
        }
      );

      if (props.planDetails?.data?.sub_channel) {
        depthMultiplierPayload.filters.push({
          attribute_name: "sub_channel",
          operator: "in",
          value: props.planDetails?.data?.sub_channel,
        });
      }

      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        depthMultiplierPayload.filters.map((payload) => {
          payload["prefix"] = "levels";
        });
      }
      let payload = {
        filters: depthMultiplierPayload.filters.filter((payloadData) => {
          return payloadData.attribute_name !== "plan_code";
        }),
      };
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        payload["wedge_level"] = "choice_level";
      }
      let depthMultiplierResponse = await props.getDepthMultiplierData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );

      depthMultiplierData.current = depthMultiplierResponse?.data?.data;

      const channelData = uniqBy(
        depthMultiplierResponse?.data?.data,
        "special_classification"
      );

      const channelOptions = channelData?.map((item) => {
        return {
          label: item.special_classification,
          value: item.special_classification,
          id: item.special_classification,
        };
      });
      setChannelSelected(channelOptions[0]);
      setChannelOptions(channelOptions);
      depthMultiplierData.current = depthMultiplierResponse?.data?.data;
    };
    fetchDepthMultiplierData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChannelChange = (option) => {
    setChannelSelected(option);
    setDepthMultiplierTableColumns([]);
    setDepthMultiplierTableData([]);
  };

  const loadTableInstance = (params) => {
    depthMultiplierInstance.current = params;
  };

  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={props.showDepthMultiplierModal}
      fullWidth={true}
      onClose={() => props.toggleViewDepthMultiplier(false)}
    >
      <LoadingOverlay loader={depthMultiplierLoader}>
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            Depth multiplier
            <IconButton aria-label="close" size="large">
              <CloseIcon
                onClick={() => props.toggleViewDepthMultiplier(false)}
              />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div className={classes.omniMappingFilterRow}>
            {filterView(
              "Channel",
              "channel",
              channelOptions,
              handleChannelChange,
              channelSelected,
              classes.formContainer,
              classes.inputLabel
            )}
          </div>
          <div className={classes.depthMultiplierDivContainer}>
            <AgGridTable
              rowdata={depthMultiplierTableData || []}
              columns={depthMultiplierTableColumns || []}
              loadTableInstance={loadTableInstance}
              pagination={false}
              sideBar={false}
              adjustTableHeight={true}
            />
          </div>
        </DialogContent>
      </LoadingOverlay>
    </Dialog>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getColumnsAg,
      getDepthMultiplierData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DepthMultiplierComponent));
