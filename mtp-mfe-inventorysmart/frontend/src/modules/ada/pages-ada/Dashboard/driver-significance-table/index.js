import { makeStyles } from "@mui/styles";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import React from "react";
import { useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { useEffect } from "react";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { chartDataPayload } from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import { getDriverSignificancetData } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

const DriverSignificanceTable = () => {
  const classes = useStyles();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [driverForecastLoader, setDriverForecastLoader] = useState(true);
  const [columnData, setColumnData] = useState([]);
  const [rowdata, setRowdata] = useState([]);

  useEffect(() => {
    const formattedColumnResponse = agGridColumnFormatter(columnConfig);
    setColumnData(formattedColumnResponse);
    const payload = chartDataPayload(adaReducer);
    const getRowData = async () => {
      try {
        setDriverForecastLoader(true);

        let response = await getDriverSignificancetData(payload);
        let formattedResponse = response?.data?.data || {};

        setRowdata(formattedResponse);
      } catch (error) {
      } finally {
        setDriverForecastLoader(false);
      }
    };
    getRowData();
  }, []);

  return (
    <div className={classes.driverForecastContainer}>
      {/* <CustomAccordion label={"Drivers Significance"}> */}
      <LoadingOverlay loader={driverForecastLoader} isCustomLoader={true}>
        <AgGridComponent
          hideTableFormat={true}
          uniqueRowId="ML_Driver"
          pagination={false}
          sizeColumnsToFitFlag
          minWidth={200}
          rowdata={rowdata}
          columns={columnData}
          showSearchModalBtn={false}
        />
      </LoadingOverlay>
      {/* </CustomAccordion> */}
    </div>
  );
};

export default DriverSignificanceTable;

const useStyles = makeStyles((theme) => ({
  driverForecastContainer: {
    display: "flex",
    flexDirection: "column",
  },
  customheader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    margin: "0.25rem 0 0.75rem",
  },
  panelContainer: {
    "& .panel-container": {
      top: `calc(${theme.customVariables.headerHeight} + 2rem)`,
    },
  },
}));

let columnConfig = [
  {
    column_name: "ML_Driver",
    label: "M/L Driver",
    is_frozen: false,
    is_hidden: false,
    is_editable: false,
    is_aggregated: false,
    type: "str",
    order_of_display: 3,
    footer: "",
    is_row_span: false,
    formatter: "",
    is_searchable: false,
    sub_headers: [],
    is_lockable: false,
    width: 200,
  },
  {
    column_name: "Driver_Rank",
    label: "Driver Rank",
    is_frozen: false,
    is_hidden: false,
    is_editable: false,
    is_aggregated: false,
    type: "str",
    order_of_display: 3,
    footer: "",
    is_row_span: false,
    formatter: "",
    is_searchable: false,
    sub_headers: [],
    is_lockable: false,
    width: 200,
  },
];
