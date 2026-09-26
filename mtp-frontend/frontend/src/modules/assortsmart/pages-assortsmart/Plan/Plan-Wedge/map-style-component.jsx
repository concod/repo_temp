import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  Button,
  DialogActions,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import LoadingOverlay from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import AgGridTable from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getSeasonOptions } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  getMapStyleDetails,
  setMapStyleLoader,
  mapCarryoverStyleDetails,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  filterView,
  getLevelFiltersBigQuery,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { cloneDeep } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { generateDropDownOptions } from "./plan-wedge-functions";

const MapStyleComponent = (props) => {
  const [level3Value, setLevel3Value] = useState({});
  const [mapStyleData, setMapStyleData] = useState([]);
  const [mapStyleColumns, setMapStyleColumns] = useState([]);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const classes = useStyles();
  const mapStyleInstance = useRef({});
  const styleColumns = useRef({});
  const mapStyleDetails = useRef({});

  useEffect(() => {
    const fetchData = async () => {
      setLevel3Value(props.selectedLevel3Value);
      props.setMapStyleLoader(true);
      let cols = await getColumnsAg(
        "table_name=map_style",
        props.columnHeaderJson
      )();
      const seasonOptions = await props.getSeasonOptions({
        filters: [],
      });
      if (cols.length) {
        if (seasonOptions?.data?.status) {
          cols.forEach((item) => {
            if (item.column_name === "season") {
              const seasonData = seasonOptions?.data?.data?.map((season) => {
                return season.name;
              });
              item.options = generateDropDownOptions(seasonData);
            }
          });
        }
        setMapStyleColumns(cols);
        styleColumns.current = cols;
        const tableData = [];
        const tableObj = {};
        tableObj["season"] = "";
        tableObj["style_id"] = "";
        tableObj["style_description"] = "";
        tableData.push(tableObj);
        setMapStyleData(tableData);
        props.setMapStyleLoader(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveMapStyleData = async () => {
    const tempData = [];
    mapStyleInstance?.current?.api?.forEachNode((node) => {
      tempData.push(node.data);
    });
    try {
      props.setMapStyleLoader(true);
      const attributeValue = mapStyleDetails.current.filter((item) => {
        return (
          item.season === tempData[0].season &&
          item.style === tempData[0].style_id &&
          item.style_description === tempData[0].style_description
        );
      });
      const payload = props.selectedStyleId?.map((item) => {
        return {
          plan_code: props.planDetails?.data?.plan_code,
          style_id: item.style_id,
          attribute_value: attributeValue[0],
        };
      });
      const reqBody = payload.length === 1 ? payload[0] : payload;
      const mapStyleData = await props.mapCarryoverStyleDetails(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (mapStyleData?.data?.status) {
        props.addSnack({
          message: mapStyleData?.data?.data?.message,
          options: {
            variant: "success",
          },
        });
        props.setShowMapStyleModal(false);
        props.setMapStyleLoader(false);
        props.setUpdateStyleWedge(true);
      }
    } catch (error) {
      props.setMapStyleLoader(false);
      props.addSnack({
        message: "Fetching map style data failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const onChangeL3 = (option) => {
    setLevel3Value(option);
  };

  const setColumnOptions = async (column, value, data) => {
    try {
      props.setMapStyleLoader(true);
      const levels = getLevelFiltersBigQuery(
        props.planDetails?.data,
        props.planLevels
      );
      levels.push({
        attribute_name: "l3_name",
        value: [level3Value?.value],
        operator: "in",
      });
      const payload = {
        plan_code: props.planDetails?.data?.plan_code,
        filters: levels,
      };
      if (column === "season") {
        payload["season_name"] = value;
        const mapStyleData = await props.getMapStyleDetails(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (mapStyleData?.data?.status) {
          const styleIdOptions = mapStyleData?.data?.data?.map((option) => {
            return option.style;
          });
          mapStyleDetails.current = mapStyleData?.data?.data;
          if (styleIdOptions?.length) {
            let columns = cloneDeep(styleColumns.current);
            columns.forEach((col) => {
              if (col.column_name === "style_id") {
                col.options = generateDropDownOptions(styleIdOptions);
              }
            });
            columns = agGridColumnFormatter(columns);
            setMapStyleColumns(columns);
            styleColumns.current = columns;
          }
        }
      } else if (column === "style_id") {
        const styleDescOptions = mapStyleDetails.current
          .filter((item) => {
            return item.style === value && item.season === data.season;
          })
          .map((option) => {
            return option.style_description;
          });
        if (styleDescOptions?.length) {
          let columns = cloneDeep(styleColumns.current);
          columns.forEach((col) => {
            if (col.column_name === "style_description") {
              col.options = generateDropDownOptions(styleDescOptions);
            }
          });
          columns = agGridColumnFormatter(columns);
          setMapStyleColumns(columns);
          styleColumns.current = columns;
        }
      }
      props.setMapStyleLoader(false);
    } catch (error) {
      props.setMapStyleLoader(false);
    }
  };

  const updateMapStyleData = async (
    e,
    data,
    column,
    isChanged,
    value,
    initialValue,
    cellData,
    initValue,
    previousValue
  ) => {
    const columnId = column.colDef.accessor;
    const tempdata = [];
    let flag = true;
    //Enable the save button if all the columns have values selected for table data
    for (const key in data) {
      if (data[key] === "") {
        flag = false;
        break;
      }
    }
    if (flag) {
      setIsSaveDisabled(false);
    }
    if (value !== previousValue) {
      mapStyleInstance?.current?.api?.forEachNode((node) => {
        tempdata.push(node.data);
      });
      tempdata.forEach((item) => {
        item[columnId] = value;
      });
      if (columnId === "season" || columnId === "style_id") {
        setColumnOptions(columnId, value, data);
      }
      mapStyleInstance.current.api.refreshCells({
        update: tempdata,
      });
    }
  };

  const loadTableInstance = (params) => {
    mapStyleInstance.current = params;
  };

  return (
    <Dialog
      maxWidth={"md"}
      aria-labelledby="customized-dialog-title"
      open={props.showMapStyleModal}
      fullWidth={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          classes={{ root: classes.dialog }}
        >
          <Typography variant="h4">Map Style</Typography>
          <IconButton
            aria-label="close"
            size="large"
            color="primary"
            onClick={() => props.setShowMapStyleModal(false)}
          >
            <Close />
          </IconButton>
        </Grid>
      </DialogTitle>
      <LoadingOverlay loader={props.loader}>
        <DialogContent className={classes.contentBody}>
          <div>
            <div className={classes.heading}>
              {filterView(
                props.levelsJson["l3_name"],
                "l3_name",
                props.l3Options,
                onChangeL3,
                level3Value
              )}
            </div>
            <div className={classes.depthMultiplierDivContainer}>
              <AgGridTable
                rowdata={mapStyleData || []}
                columns={mapStyleColumns || []}
                loadTableInstance={loadTableInstance}
                onBlur={updateMapStyleData}
                sideBar={false}
                onGridChanged
                sizeColumnsToFitFlag
                adjustTableHeight={true}
                staticColId={true}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions className={classes.NLEFooter}>
          <div>
            <Button
              variant="contained"
              onClick={handleSaveMapStyleData}
              id="mapStyleSaveBtn"
              color="primary"
              className={classes.smallPrimaryButton}
              disabled={isSaveDisabled}
            >
              Save
            </Button>
          </div>
        </DialogActions>
      </LoadingOverlay>
    </Dialog>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    loader: planWedgeServiceActions.mapStyleLoaderSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getSeasonOptions,
      getMapStyleDetails,
      setMapStyleLoader,
      addSnack,
      mapCarryoverStyleDetails,
    },
    dispatch
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(MapStyleComponent);
