import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AgGridComponent from "core/Utils/agGrid";
import { setClusterBreakdownData } from "../../commonModulesServices/finalize-cluster-service";
import { setPlanDetails } from "../../commonModulesServices/plan-dashboard-service";
import {
  getFinalGradeList,
  setCreateGradeStep,
  setGradingDetails,
  setGradingChannel,
  setCreateGradeClassification,
} from "../grading-services";
import {
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom-v5-compat";

export const ReviewGrading = (props) => {
  const globalClasses = globalStyles();
  const [viewBy, setViewBy] = useState("store-view");
  const [showloader, setLoader] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { gradingDetails, createGradeStep } = useSelector(
    (store) => store?.createGradeReducer
  );
  // To be removed after Column Headers are configured
  const headerObj = [
    {
      sub_headers: [],
      column_name: "store",
      type: "str",
      label: "Store",
      order_of_display: 1,
      dimension: "store",
      field: "store",
      accessor: "store",
      id: "store",
      headerName: "Store",
      tooltipField: "store",
    },
    {
      sub_headers: [],
      column_name: "product_hierarchy_level",
      type: "str",
      label: "Product hierarchy Level",
      order_of_display: 1,
      dimension: "store",
      field: "product_hierarchy_level",
      accessor: "product_hierarchy_level",
      id: "product_hierarchy_level",
      headerName: "Product hierarchy Level",
      tooltipField: "product_hierarchy_level",
    },
    {
      sub_headers: [],
      column_name: "grading",
      type: "str",
      label: "Grading",
      order_of_display: 1,
      dimension: "store",
      field: "grading",
      accessor: "grading",
      id: "grading",
      headerName: "Grading",
      tooltipField: "grading",
    },
    {
      sub_headers: [],
      column_name: "grading_method",
      type: "str",
      label: "Grading Method",
      order_of_display: 1,
      dimension: "store",
      field: "grading_method",
      accessor: "grading_method",
      id: "grading_method",
      headerName: "Grading Method",
      tooltipField: "grading_method",
    },
  ];

  useEffect(async () => {
    setLoader(true);
    try {
      let body = {
        grade_id: gradingDetails.gradeID,
      };
      setColumns(headerObj);
      const list = await getFinalGradeList(body);
      setRowData(list.data.data);
      setLoader(false);
    } catch (error) {
      console.log(error);
      setLoader(false);
    }
  }, []);

  const gotoNextStep = () => {
    dispatch(setCreateGradeStep(0));
    dispatch(setGradingDetails({}));
    dispatch(setPlanDetails([]));
    dispatch(setGradingChannel(null));
    dispatch(setCreateGradeClassification(""));
    dispatch(setClusterBreakdownData([]));
    navigate("/store-grading");
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

  return (
    <>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween}`}
      >
        <RadioGroup
          row
          aria-label="view-by"
          name="controlled-radio-buttons-group"
          value={viewBy}
          onChange={(e) => {
            setViewBy(e.target.value);
          }}
        >
          <FormControlLabel
            value="store-view"
            control={<Radio color="primary" />}
            label="Store View"
          />
          <FormControlLabel
            value="grade-view"
            control={<Radio color="primary" />}
            label="Grade View"
          />
        </RadioGroup>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${globalClasses.gap} ${globalClasses.marginBottom}`}
        >
          <Tooltip title="Upload">
            <Button
              color="primary"
              variant="contained"
              onClick={() => {}}
              size="small"
              disabled={selectedRows.length}
            >
              <PublishOutlinedIcon />
            </Button>
          </Tooltip>
          <Tooltip title="Download">
            <Button
              color="primary"
              variant="contained"
              onClick={() => {}}
              size="small"
              disabled={selectedRows.length}
            >
              <DownloadOutlinedIcon />
            </Button>
          </Tooltip>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {}}
            disabled={selectedRows.length}
          >
            Update With Rules
          </Button>
        </div>
      </div>
      <Loader loader={showloader} spinner>
        {viewBy === "store-view" ? (
          <AgGridComponent
            columns={columns}
            rowdata={rowData}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            uniqueRowId={"pg_code"}
            onSelectionChanged={onSelectionChanged}
          />
        ) : (
          <></>
        )}
      </Loader>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginTop}`}
      >
        <Button
          color="primary"
          variant="outlined"
          onClick={() => dispatch(setCreateGradeStep(createGradeStep + 1))}
        >
          Back
        </Button>
        <Button color="primary" variant="contained" onClick={gotoNextStep}>
          Done
        </Button>
      </div>
    </>
  );
};

export default ReviewGrading;
