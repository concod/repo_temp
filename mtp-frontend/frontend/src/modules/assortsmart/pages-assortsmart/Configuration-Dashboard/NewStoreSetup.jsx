import { useState, useEffect } from "react";
import {
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
} from "@mui/material";
import { Prompt, Switch } from "impact-ui";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import globalStyles from "Styles/globalStyles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "actions/tableColumnActions";
import { fetchNewStoreDashboardList } from "modules/assortsmart/services-assortsmart/New-Store/new-store-dashboard";
import Form from "core/Utils/form";
import {
  MAP_TO_NEW_STORE_MSG,
  NO_DUMMY_STORE_VALIDATION_MSG,
  NO_NEW_STORE_VALIDATION_MSG,
} from "../../constants-assortsmart/stringContants";
import { ADD_NEW_STORE } from "../../constants-assortsmart/routesContants";
import { cloneDeep } from "lodash";
import AgGridTable from "core/Utils/agGrid";

const NewStoreSetup = (props) => {
  const history = useHistory();
  const title = history.location.pathname;
  const globalClasses = globalStyles();

  const [columns, setColumns] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [mapExistingStore, setMapExistingStore] = useState(false);
  const [mapExistingStoreToggle, setMapExistingStoreToggle] = useState(false);

  const navigateToAddNewStore = (id) => {
    history.push({ pathname: ADD_NEW_STORE });
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    const reqBody = {
      status: 0,
      meta: {
        sort: manualbody.sort,
        search: manualbody.search,
        range: manualbody.range,
      },
    };
    try {
      pageIndex = pageIndex || 0;
      let res = {};
      setDashboardData({});

      res = await props.fetchNewStoreDashboardList(reqBody, pageIndex);

      let dashboardTableData = cloneDeep(res?.data?.data);
      setDashboardData({
        data: dashboardTableData,
        count: res?.data?.total,
      });
      return {
        data: dashboardTableData,
        totalCount: res?.data?.total,
      };
    } catch (error) {
      console.log("error:", error)
      //Error handling
    }
  };

  const callDashboardColumns = async () => {
    let cols = await getColumnsAg(
      "table_name=new_store_assort_dashboard",
      {},
      null,
      null,
      false
    )();
    cols = agGridColumnFormatter(cols, {}, null, null, null, false);
    setColumns(cols);
  };

  useEffect(() => {
    callDashboardColumns();
  }, []);

  const renderDummyStoreMappingModal = () => {
    console.log("do modal gets called?");
    return (
      <Dialog
        maxWidth={"sm"}
        aria-labelledby="customized-dialog-title"
        open={true}
        fullWidth={true}
        disableEscapeKeyDown={true}
      >
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5" gutterBottom>
              Add New Store
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setMapExistingStore(false)}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div className={globalClasses.layoutAlignSpaceBetween}>
            <Typography gutterBottom className={globalClasses.marginVertical}>
              {MAP_TO_NEW_STORE_MSG}
            </Typography>
            <Switch
              defaultChecked={false}
              id="storetoDcfcToggleBtn"
              onChange={() => {}}
              leftLabel="NO"
              rightLabel="Yes"
              disabled={false}
            />
          </div>
          <div>
            {
              <Typography
                variant="h6"
                className={`${globalClasses.marginVertical}`}
                color="error"
              >
                {true
                  ? NO_DUMMY_STORE_VALIDATION_MSG
                  : NO_NEW_STORE_VALIDATION_MSG}
              </Typography>
            }
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            variant="contained"
            onClick={
              () => {
                navigateToAddNewStore();
              }
              //needed while integrating dummy story popup
              // mapExistingStoreToggle? mapToDummyStore(): navigateToAddNewStore()
            }
          >
            {mapExistingStoreToggle ? "Save" : "Add New Store"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <div className={globalClasses.marginAround}>
        <div className={globalClasses.marginVertical1rem}>
          <div className={globalClasses.layoutAlignSpaceBetween}>
            <Typography variant="h4">New Stores</Typography>
            <div>
              <Button
                title="Add New Store"
                color="primary"
                variant="contained"
                id="assort-new-store-button"
                onClick={() => 
                  navigateToAddNewStore()
                }
              >
                <AddIcon />
              </Button>
            </div>
          </div>
        </div>
        <AgGridTable
          columns={columns}
          tableId={"add-new-store"}
          rowModelType="serverSide"
          rowSelection="multiple"
          pagination={true}
          serverSideStoreType="partial"
          cacheBlockSize={10}
          manualCallBack={(body, pageIndex, params) =>
            manualCallBack(body, pageIndex, params)
          }
          uniqueRowId={"store_code"}
          onRowSelected
          onGridChanged
        />
      </div>
      <div> {mapExistingStore && renderDummyStoreMappingModal()}</div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapActionsToProps = {
    fetchNewStoreDashboardList,
};

export default connect(mapStateToProps, mapActionsToProps)(NewStoreSetup);
