import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Panel } from "impact-ui";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TableViewType from "./tableViewType";
import TableViewColumnAction from "./tableViewColumnAction";
import { cloneDeep } from "lodash";
import Loader from "core/Utils/Loader/loader";

const useStyles = makeStyles((theme) => ({
  panelWrapper: {
    "& .panel-heading": {
      fontSize: theme.typography.pxToRem(18),
      lineHeight: theme.typography.pxToRem(27),
    },
    "& .panel-header": {
      padding: "0 1.5rem",
      height: "4rem",
    },
    "& .panel-body-container": {
      marginTop: "1.5rem",
      padding: "0.75rem 0",
    },
  },
  divider: {
    borderBottom: `1px solid ${theme.palette.text.disabled}`,
  },
  parentContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  viewTypeContainer: {
    padding: `0 1.5rem 0 ${theme.typography.pxToRem(6)}`,
  },
}));

const TableViewPanel = (props) => {
  const {
    agGrid,
    isPanelOpen,
    setIsTableViewPanelOpen,
    onApplyTableView,
    tableName,
  } = props;
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [value, setValue] = useState(0);
  const [viewSelected, setViewSelected] = useState(0);
  const [forceRerender, setForceRerender] = useState(false);
  const [showPanelLoader, setShowPanelLoader] = useState(true);

  const handleChange = (_event, newValue) => {
    // setReset(!reset);
    setViewSelected(0);
    setValue(newValue);
  };

  useEffect(() => {
    setForceRerender(!forceRerender);
  }, [props.tableViewConfigData]);

  return (
    <div className={`${classes.panelWrapper} ${globalClasses.panelWrapper}`}>
      <Panel
        size="large"
        isOpen={isPanelOpen}
        onClose={() => setIsTableViewPanelOpen(false)}
        title="Table Settings"
        disabled={true}
      >
        {showPanelLoader && (
          <div className={globalClasses.overlayLoader}>
            <Loader loader={showPanelLoader} spinner isCustomLoader />
          </div>
        )}
        <div
          data-test-id="table-view-panel-wrapper"
          className={classes.parentContainer}
        >
          <div
            className={classes.viewTypeContainer}
            data-test-id="table-view-type-container"
          >
            <Tabs value={value} onChange={handleChange}>
              <Tab label={"Global views"} />
              <Tab label={"Personal views"} />
            </Tabs>
            <div>
              <TabPanel value={value} index={0}>
                <TableViewType
                  tableViewData={cloneDeep(props.tableViewConfigData)?.filter(
                    (item) => {
                      return item.view_type === "global";
                    }
                  )}
                  viewSelected={viewSelected}
                  setViewSelected={setViewSelected}
                  tableName={tableName}
                  setShowPanelLoader={setShowPanelLoader}
                />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <TableViewType
                  tableViewData={cloneDeep(props.tableViewConfigData)?.filter(
                    (item) => {
                      return item.view_type === "personal";
                    }
                  )}
                  viewSelected={viewSelected}
                  setViewSelected={setViewSelected}
                  tableName={tableName}
                  setShowPanelLoader={setShowPanelLoader}
                />
              </TabPanel>
            </div>
          </div>
          <div className={classes.divider} />
          <div>
            <TableViewColumnAction
              tableViewData={props.tableViewConfigData}
              viewSelected={viewSelected}
              agGrid={agGrid}
              onApplyTableView={onApplyTableView}
              tableName={tableName}
              setShowPanelLoader={setShowPanelLoader}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

const mapDispatchToProps = {
  addSnack,
};

const mapStateToProps = (state) => {
  return {
    tableViewConfigData:
      state.tableViewConfigurationReducer?.tableViewConfigData,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(TableViewPanel);
