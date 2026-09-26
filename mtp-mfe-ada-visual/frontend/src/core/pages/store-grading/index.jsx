import { useEffect, useState, useRef } from "react";
import { Link as RouterLink } from "react-router-dom-v5-compat";
import {
  Button,
  Container,
  Link,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import Fade from "@mui/material/Fade";
import RefreshIcon from "@mui/icons-material/Refresh";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import LoadingOverlay from "core/Utils/Loader/loader";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { fetchGradingHeaders, fetchGradingColumns } from "./grading-services";
import AgGridComponent from "core/Utils/agGrid";

const useStyles = makeStyles((theme) => ({
  createGradingModal: {
    width: "25rem",
    padding: "0.75rem 1rem",
    background: theme.palette.common.white,
  },
  optionList: {
    gap: "0.75rem",
    borderBottom: `1px solid ${theme.palette.colours.disabledBorder}`,

    "&:last-child": {
      borderBottom: 0,
    },
  },
  popoverStyles: {
    background: "transparent",
    marginTop: "0.25rem",
  },
  ImageWrapper: {
    height: "3.75rem",
    minWidth: "3.75rem",
    borderRadius: "50%",
    boxShadow: "0px 0px 6px #00000029",
    border: `1px solid ${theme.palette.background.primary}`,
  },
}));

function StoreGrading(props) {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [loader, setLoader] = useState(false);
  const [columns, setColumns] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const routeOptions = [
    {
      id: "store_grading",
      label: "Grading",
      action: () => null,
    },
  ];

  // To be removed one configurations are updated.s
  const headerObj = [
    {
      sub_headers: [],
      column_name: "name",
      type: "str",
      label: "Store Gading Name",
      order_of_display: 1,
      dimension: "store",
      field: "name",
      accessor: "name",
      id: "name",
      headerName: "Store Gading Name",
      tooltipField: "name",
    },
    {
      sub_headers: [],
      column_name: "product_level",
      type: "str",
      label: "Product Level",
      order_of_display: 2,
      dimension: "store",
      field: "product_level",
      accessor: "product_level",
      id: "product_level",
      headerName: "Product Level",
      tooltipField: "Product Level",
    },
    {
      sub_headers: [],
      column_name: "grade_level",
      type: "int",
      label: "Grade Level",
      order_of_display: 3,
      dimension: "store",
      field: "grade_level",
      accessor: "grade_level",
      id: "grade_level",
      headerName: "Grade Level",
      tooltipField: "Grade Level",
    },
    {
      sub_headers: [],
      column_name: "special_classification",
      type: "str",
      label: "Grading Method",
      order_of_display: 4,
      dimension: "store",
      field: "special_classification",
      accessor: "special_classification",
      id: "special_classification",
      headerName: "Grading Method",
      tooltipField: "Grading Method",
    },
    {
      sub_headers: [],
      column_name: "valid_time_period",
      type: "dateStr",
      label: "Valid Time Period",
      order_of_display: 5,
      dimension: "store",
      field: "valid_time_period",
      accessor: "valid_time_period",
      id: "valid_time_period",
      headerName: "Valid Time Period",
      tooltipField: "Valid Time Period",
    },
  ];

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

  useEffect(() => {
    const fetchData = async () => {
      setLoader(true);
      try {
        // TO be updated once we have data
        // const col = await fetchGradingHeaders();
        // const colData = agGridColumnFormatter(data.data);
        setColumns(headerObj);
        const data = await fetchGradingColumns();
        setRowData(data.data.data);
        setLoader(false);
      } catch (error) {
        console.error(error);
        setLoader(false);
      }
    };
    fetchData();
  }, []);

  const renderPopper = () => {
    return (
      <div className={classes.createGradingModal}>
        <Typography variant="body1" className={globalClasses.marginBottom}>
          Create New Grading
        </Typography>
        <div
          className={`${classes.optionList} ${globalClasses.flexRow} ${globalClasses.paddingVertical}`}
        >
          <div className={classes.ImageWrapper}></div>
          <div className={classes.discriptionWrapper}>
            <Link
              component={RouterLink}
              underline="none"
              to="/store-grading/create-grading"
              variant="button"
            >
              Performance based
            </Link>
            <Typography component="p" variant="body1">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry. Lorem Ipsum has been
            </Typography>
          </div>
        </div>
        <div
          className={`${classes.optionList} ${globalClasses.flexRow} ${globalClasses.paddingVertical}`}
        >
          <div className={classes.ImageWrapper}></div>
          <div className={classes.discriptionWrapper}>
            <Link
              component={RouterLink}
              underline="none"
              to="/store-grading"
              variant="button"
            >
              Rule based
            </Link>
            <Typography component="p" variant="body1">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry. Lorem Ipsum has been
            </Typography>
          </div>
        </div>
        <div
          className={`${classes.optionList} ${globalClasses.flexRow} ${globalClasses.paddingVertical}`}
        >
          <div className={classes.ImageWrapper}></div>
          <div className={classes.discriptionWrapper}>
            <Link
              component={RouterLink}
              underline="none"
              to="/store-grading"
              variant="button"
            >
              Manual upload
            </Link>
            <Typography component="p" variant="body1">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry. Lorem Ipsum has been
            </Typography>
          </div>
        </div>
      </div>
    );
  };

  const open = Boolean(anchorEl);
  const id = open ? "storeCreateNewGrading" : undefined;

  return (
    <>
      <HeaderBreadCrumbs options={routeOptions} />
      <Container maxWidth={false}>
        <Typography
          variant="h3"
          component="h3"
          className={`${globalClasses.pageHeader} ${globalClasses.marginBottom}`}
        >
          Grading
        </Typography>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
        >
          <Typography style={{ flex: 1 }} variant="h6" gutterBottom>
            Store Grading
          </Typography>
          <div>
            <Tooltip
              title="Refresh"
              placement="top-end"
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 600 }}
            >
              <Button
                id="storeGradingREfresh"
                color="primary"
                variant="contained"
                onClick={() => console.log("Refreshed")}
              >
                <RefreshIcon />
              </Button>
            </Tooltip>
            <Popover
              id={id}
              open={open}
              onClose={() => setAnchorEl(null)}
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              PaperProps={{ className: classes.popoverStyles }}
            >
              {renderPopper()}
            </Popover>
            <Tooltip
              title="Create New Grading"
              placement="top-start"
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 600 }}
            >
              <Button
                color="primary"
                aria-describedby={id}
                variant="contained"
                className={globalClasses.marginLeft1rem}
                onClick={(event) => {
                  setAnchorEl(event.currentTarget);
                }}
              >
                Create New Grading
              </Button>
            </Tooltip>
          </div>
        </div>
        <LoadingOverlay loader={loader} spinner>
          <AgGridComponent
            columns={columns}
            rowdata={rowData}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            uniqueRowId={"name"}
            onSelectionChanged={onSelectionChanged}
          />
        </LoadingOverlay>
      </Container>
    </>
  );
}

export default StoreGrading;
