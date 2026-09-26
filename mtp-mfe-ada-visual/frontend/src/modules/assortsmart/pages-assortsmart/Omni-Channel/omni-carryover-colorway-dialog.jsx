import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { fetchCarryOverColorway } from "modules/assortsmart/services-assortsmart/OmniChannel/omni-channel-service";
import { downloadExcelLink } from "core/Utils/csv-download/index";

const OmniCarryoverColorwayDialog = (props) => {
  const [columns, setColumns] = useState([]);
  const [carryoverColorwayTableData, setCarryoverColorwayTableData] = useState(
    []
  );
  const [loader, setLoader] = useState(false);
  const [dataForDownload, setDataForDownload] = useState([]);
  const [headerList, setHeaderList] = useState([]);
  const classes = useStyles();
  const downloadCarryoverColorway = useRef(null);
  const carryOverColorwayInstance =useRef({});
  useEffect(() => {
    const fetchColumns = async () => {
      setLoader(true);
      let cols = await getColumnsAg(
        "table_name=carryover_colorway",
        props.columnHeaderJson,
        true
      )();
      if (cols.length) {
        setColumns(cols);
        getHeadersForExcelDownload(cols);
        fetchCarryoverColorwayData();
      }
    };
    fetchColumns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fetchCarryoverColorwayData = async () => {
    let planData = props.planDetails?.data;
    let colorwayResponse = await props.fetchCarryOverColorway({
      l0_name: planData?.l0_name?.[0],
      l1_name: planData?.l1_name?.[0],
      l2_name: planData?.l2_name?.[0],
      season_code: planData?.season_id,
    },
    props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    if (colorwayResponse?.data?.status) {
      setLoader(false);
      let tableData = colorwayResponse.data.data.map((colorwayObj) => {
        return {
          product_id: colorwayObj.details.product_id,
          colorway_season_id: colorwayObj.colorway_season_id,
          colorway_id: colorwayObj.colorway_id,
          l0_name: colorwayObj.details.l0_name,
          l1_name: colorwayObj.details.l1_name,
          l2_name: colorwayObj.details.l2_name,
          style_no: colorwayObj.details.style_no,
          style_des: colorwayObj.details.style_des,
          color_name: colorwayObj.details.color_name,
          style_name: colorwayObj.details.style_name,
        };
      });
      setCarryoverColorwayTableData(tableData);
      getDataForExcelDownlaod(tableData)
    }
  };

  const getDataForExcelDownlaod = (instance) => {
    let dataClone = [];
    instance?.forEach((data) => {
      dataClone.push(data);
      if (data?.subRows?.length) {
        dataClone.push(...data.subRows);
      }
    });
    setDataForDownload(dataClone);
  };

  const getHeadersForExcelDownload = (columns) => {
    const attributeData = columns;
    let headers = [];
    attributeData?.length &&
      attributeData.forEach((data) => {
        headers.push({ label: data["headerName"], key: data["id"] });
      });
    setHeaderList(headers);
  };

  const loadTableInstance = (params) => {
    carryOverColorwayInstance.current = params;
  };
  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={() => props.onToggleCarryoverColorway(false)}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          classes={{ root: classes.dialog }}
        >
          <Typography variant="h3">Carryover Colorway</Typography>
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={() => props.onToggleCarryoverColorway(false)} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent className={classes.contentBody}>
        <div>
          <Grid container direction="row" className={classes.dialogGrid}>
            <LoadingOverlay loader={loader}>
              {carryoverColorwayTableData && (
                <React.Fragment>
                  <div className={classes.paperStyle}>
                    <Button
                      variant="contained"
                      color="primary"
                      title={"Download wedge data"}
                      id={"download-wedge-data"}
                      onClick={() => {
                        downloadCarryoverColorway.current.link.click();
                      }}
                      className={classes.buttonFitMargin}
                    >
                      {<DownloadIcon />}
                    </Button>
                    {downloadExcelLink(
                      dataForDownload,
                      `PO_Carryover_colorway_Sheet_${props.planDetails?.data?.["name"]}`,
                      downloadCarryoverColorway,
                      headerList,
                      "",
                      "",
                      true
                    )}
                  </div>
                  <AgGridTable
                    rowdata={carryoverColorwayTableData}
                    columns={columns}
                    loadTableInstance={loadTableInstance}
                  />
                </React.Fragment>
              )}
            </LoadingOverlay>
          </Grid>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    columnHeaderJson:
      store.assortsmartReducer.planDashboardReducer.columnHeaderJson,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  fetchCarryOverColorway: (payload, endpoint) =>
    dispatch(fetchCarryOverColorway(payload, endpoint)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(OmniCarryoverColorwayDialog));
