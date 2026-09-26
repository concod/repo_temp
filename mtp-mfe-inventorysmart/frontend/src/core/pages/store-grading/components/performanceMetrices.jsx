import { useState } from "react";
import FilterGroup from "core/commonComponents/filters/filterGroup";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import Loader from "core/Utils/Loader/loader";
import { useEffect } from "react";
import { cloneDeep } from "lodash";
import {
  addGradingMatrices,
  createNewGrade,
  setGradingDetails,
  setGradingChannel,
  calculateAttributes,
  fetchPerformanceAttributes,
  setCreateGradeStep,
} from "../grading-services";
import { CLUSTER_POLL } from "../grading-constants/api-constants";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { addSnack } from "core/actions/snackbarActions";
import { Typography, Button } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { fetchFilterFieldValues } from "core/commonComponents/coreComponentScreen/utils";
import AgGridComponent from "core/Utils/agGrid";
import { useDispatch, useSelector } from "react-redux";

const PerformanceMetrices = () => {
  const globalClasses = globalStyles();
  const [showFilterLoader, setShowFilterLoader] = useState(false);
  const [filterData, setFilterData] = useState([]);
  const [showloader, setLoader] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const dispatch = useDispatch();
  const { gradingDetails, createGradeStep, channel } = useSelector(
    (store) => store?.createGradeReducer
  );
  const headerObj = [
    {
      sub_headers: [],
      column_name: "attribute_name",
      type: "str",
      label: "Performance Metrics",
      order_of_display: 1,
      dimension: "store",
      field: "attribute_name",
      accessor: "attribute_name",
      id: "attribute_name",
      headerName: "Performance Metrics",
      tooltipField: "attribute_name",
    },
    {
      sub_headers: [],
      column_name: "score",
      type: "int",
      label: "Significant Score",
      order_of_display: 1,
      dimension: "store",
      field: "score",
      accessor: "score",
      id: "score",
      headerName: "Significant Score",
      tooltipField: "score",
    },
  ];

  useEffect(() => {
    setShowFilterLoader(true);
    getInitialData();
    setTableData();
  }, []);

  /**
   * @func
   * @desc Fetch and update table configurations
   */
  const setTableData = () => {
    const fetchData = async () => {
      setLoader(true);
      // To be Updated once Header Config API's are ready.
      //   const data = await fetchFilterFieldValues(screenName);
      //   props.setViewGrpFilterValues(data);
      //   if (props.groupCols.length == 0) {
      //     let cols = await props.getColumnsAg("table_name=performance_matrices");
      //     cols = agGridColumnFormatter(cols);
      //     props.setGroupsCols(cols);
      //   }
      // setGroupClomuns(headerObj);
      setColumns(headerObj);
      setLoader(false);
    };
    fetchData();
  };

  /**
   * @func
   * @desc Fetch and Update filter configurations and data
   */
  const getInitialData = async () => {
    try {
      const filterConfig = await fetchFilterFieldValues("grade metrics", []);
      setFilterData(filterConfig);
    } catch (error) {
      console.error(error);
    } finally {
      setLoader(false);
      setShowFilterLoader(false);
    }
  };

  /**
   * @func
   * @desc Handle on Filter operations and update table data accordingly
   */
  const onFilter = async () => {
    if (!selectedFilters.length) {
      displaySnackMessages("Please select filters.", "error");
      return;
    }
    setLoader(true);
    setShowFilterLoader(true);
    try {
      const filters = cloneDeep(selectedFilters).map((filter) => {
        const values = filter.values.map((attr) =>
          attr.value ? attr.value : attr
        );
        return { name: [filter.filter_id][0], value: values };
      });
      let body = {
        filters: filters,
        ...gradingDetails,
      };
      body = gradingDetails.gradeID
        ? { ...body, grade_id: gradingDetails.gradeID }
        : body;
      const createdGradeData = await createNewGrade(body);
      const { grade_id, cluster_plan_code } = createdGradeData.data.data;
      if (cluster_plan_code) {
        const details = {
          ...gradingDetails,
          filters: filters,
          gradeID: grade_id,
          clusterPlanCode: cluster_plan_code,
        };
        let selectedChannel;
        filters.forEach((filterData) => {
          if (filterData.name === "channel") {
            selectedChannel = filterData.value;
          }
        });
        dispatch(setGradingDetails(details));
        dispatch(setGradingChannel(selectedChannel));
        const reqBody = {
          cluster_plan_code: cluster_plan_code,
          store_group_code: 0,
          channel: selectedChannel,
          start_date: gradingDetails.valid_time_period[0].start_date,
          end_date: gradingDetails.valid_time_period[0].end_date,
          compare_year: 0,
          filters: filters,
        };
        const onSuccess = await calculateAttributes(reqBody);
        if (onSuccess?.data?.data?.status) {
          const tableData = await fetchPerformanceAttributes(cluster_plan_code);
          setRowData(tableData.data.data.performance_attributes.metrics);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoader(false);
      setShowFilterLoader(false);
    }
  };

  /**
   * @func
   * @desc Reset filter changes
   */
  const onReset = () => {
    setSelectedFilters([]);
  };

  /**
   * @func
   * @desc Handle selection and deselections changes from Table
   * @param {Object} instance
   */
  const onSelectionChanged = (instance) => {
    let newSelectedRows = [];
    instance.api.forEachNode((node) => {
      node.selected &&
        newSelectedRows.push({ ...node.data, is_selected: true });
    });
    setSelectedRows(newSelectedRows);
  };

  const gotoPreviousStep = () => {
    dispatch(setCreateGradeStep(createGradeStep - 1));
  };

  /**
   * @func
   * @desc Validate and add selected matrices before moving to next step.
   */
  const gotoNextStep = async () => {
    setLoader(true);
    try {
      const metrices = selectedRows.map((row) => {
        return row.attribute_name;
      });
      const body = {
        cluster_plan_code: gradingDetails.clusterPlanCode,
        performance_attributes: metrices,
        filters: gradingDetails.filters,
        store_group_code: 0,
      };
      const addedMatrices = await addGradingMatrices(body);
      if (addedMatrices.data.data.status) {
        const reqId = addedMatrices.data.data.request_id;
        //Poll to the server till we receive the response
        pollingService(
          `${CLUSTER_POLL}${reqId}`,
          onClusteringSucess,
          onClusteringFailure
        );
        displaySnackMessages(
          "Please wait for sometime till we process the cluster",
          "success"
        );
      } else {
        displaySnackMessages("Clustering Failed", "error");
      }
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * @func
   * @desc Handle on Cluster creation success
   */
  const onClusteringSucess = () => {
    dispatch(setCreateGradeStep(createGradeStep + 1));
    displaySnackMessages("Successfully ran the clustering", "success");
    setLoader(false);
  };

  /**
   * @func
   * @desc Handle on Cluster creation failure
   * @param {Object} data
   */
  const onClusteringFailure = (data) => {
    displaySnackMessages(data.message, "error");
    setLoader(false);
  };

  /**
   * @func
   * @desc Show a variant snackbar with the provided message
   * @param {String} message
   * @param {String} variance
   */
  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  return (
    <>
      <CustomAccordion label="Select Filters" defaultExpanded={true}>
        <Loader loader={showFilterLoader}>
          <FilterGroup
            filters={filterData}
            inititalSelection={selectedFilters}
            screen={"filterGroup"}
            update={setSelectedFilters}
            customFilter={true}
          />
        </Loader>
      </CustomAccordion>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginTop} ${globalClasses.marginBottom}`}
      >
        <Button color="primary" variant="contained" onClick={onFilter}>
          Submit
        </Button>
        <Button color="primary" variant="text" onClick={onReset}>
          Clear Filter
        </Button>
      </div>
      <Typography variant="h5" gutterBottom>
        Select performance metrics
      </Typography>
      <Loader loader={showloader} spinner>
        <AgGridComponent
          columns={columns}
          rowdata={rowData}
          selectAllHeaderComponent={true}
          sizeColumnsToFitFlag
          uniqueRowId={"pg_code"}
          onSelectionChanged={onSelectionChanged}
        />
      </Loader>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginTop}`}
      >
        <Button color="primary" variant="outlined" onClick={gotoPreviousStep}>
          Back
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={() => {
            if (selectedRows.length) {
              gotoNextStep();
            }
          }}
        >
          Next
        </Button>
      </div>
    </>
  );
};

export default PerformanceMetrices;
