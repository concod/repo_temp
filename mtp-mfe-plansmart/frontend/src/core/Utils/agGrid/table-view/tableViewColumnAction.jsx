import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import React, { useState, useMemo, useEffect } from "react";
import { connect } from "react-redux";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TableViewColumnSetting from "./tableViewColumnSetting";
import { cloneDeep, isNil } from "lodash";
import Form from "core/Utils/form";
import { isEmpty } from "lodash";
import { Button } from "@mui/material";
import { saveTableView } from "./table-view-panel-service";
import { setTableViewConfigData } from "./table-view-panel-service";
import { useDispatch } from "react-redux";
import { getTableViewConfigData } from "./table-view-panel-service";
import {
  getColumnSettingsRowConfig,
  getColumnDefData,
} from "./table-view-functions";
import { SAVE_TABLE_VIEW } from "./constants";

const useStyles = makeStyles((theme) => ({
  requiredField: {
    color: theme.palette.error.main,
    marginLeft: theme.typography.pxToRem(2),
  },
  BottomDiv: {
    marginTop: "auto",
  },
  divider: {
    borderBottom: `1px solid ${theme.palette.text.disabled}`,
  },
  customMargin: {
    margin: `1rem 1.5rem 1rem ${theme.typography.pxToRem(14)}`,
  },
  leftPadding: {
    paddingLeft: theme.typography.pxToRem(10),
  },
}));

const TableViewColumnAction = (props) => {
  const {
    viewSelected,
    agGrid,
    tableViewData,
    onApplyTableView,
    tableName,
    setShowPanelLoader,
  } = props;
  const dispatch = useDispatch();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [showloader, setLoader] = useState(true);
  const [columnActionSelected, setColumnActionSelected] = useState(0);

  const [enableSaveViewSection, setEnableSaveViewSection] = useState(false);
  const [enableUpdateView, setEnableUpdateView] = useState(false);
  const [enableSaveNewView, setEnableSaveNewView] = useState(false);
  const [saveSectionFormData, setSaveSectionFormData] = useState([]);
  const [columnSettingGridInstance, setColumnSettingGridInstance] = useState(
    []
  );
  const [selectedViewColumnData, setSelectedViewColumnData] = useState([]);

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

  useEffect(() => {
    setEnableUpdateView(false);
    setEnableSaveNewView(false);
    if (isNil(viewSelected)) {
      setSaveSectionFormData([]);
    }
    setShowPanelLoader(false);
  }, [viewSelected]);

  const handleChange = (_event, newValue) => {
    setColumnActionSelected(newValue);
  };

  const setColumnSettingInstance = (params) => {
    setViewColumnSettingsData(params);
  };

  const handleSaveSectionForm = (
    obj,
    id,
    field,
    fieldEvent,
    initialValue,
    checkConfiguration = []
  ) => {
    setSaveSectionFormData(cloneDeep(obj));
  };

  const getDefaultFieldValues = useMemo(() => {
    const test = cloneDeep(tableViewData).filter((item) => {
      return item.id === viewSelected;
    });

    const defualtValues = {
      view_name: enableSaveNewView
        ? `${"View"}${" "}${new Date().getTime()}`
        : test?.[0]?.view_name,
      view_type: test?.[0]?.view_type,
      view_setting: {
        is_default: test[0]?.is_default,
      },
    };
    setSaveSectionFormData(cloneDeep(defualtValues));
    return defualtValues;
  }, [enableSaveNewView, enableUpdateView]);

  const getCurrentColumnPreference = () => {
    const selectedViewTypeData = cloneDeep(tableViewData).filter((item) => {
      return item.id === viewSelected;
    })[0];
    const updatedColumnSettings = !isEmpty(columnSettingGridInstance)
      ? getColumnSettingsRowConfig(columnSettingGridInstance)
      : selectedViewTypeData?.preference;

    return { selectedViewTypeData, updatedColumnSettings };
  };

  const isRequiredFieldsEmpty = (saveSectionFormData, SAVE_TABLE_VIEW) => {
    //check if all the required fields of SAVE_TABLE_VIEW are present along with value
    return SAVE_TABLE_VIEW.some(({ accessor, required }) => {
      if (
        required &&
        (!saveSectionFormData.hasOwnProperty(accessor) ||
          !saveSectionFormData[accessor].trim())
      ) {
        return true;
      }
      return false;
    });
  };

  const onSaveButtonClick = async () => {
    try {
      setShowPanelLoader(true);
      const {
        selectedViewTypeData,
        updatedColumnSettings,
      } = getCurrentColumnPreference();

      if (isRequiredFieldsEmpty(saveSectionFormData, SAVE_TABLE_VIEW)) {
        displaySnackMessages("Required fields are empty", "error");
        return;
      }

      let payload = {};

      payload = {
        table_name: tableName,
        view_name: saveSectionFormData?.view_name,
        view_type: saveSectionFormData?.view_type,
        is_default: saveSectionFormData?.view_setting?.is_default,
        preference: updatedColumnSettings,
      };

      if (enableUpdateView) {
        payload["id"] = viewSelected;
        payload["created_by"] = selectedViewTypeData?.created_by;
      }
      await saveTableView(payload)();
      const tableViewConfiguration = await getTableViewConfigData(
        "",
        tableName
      );
      props.setTableViewConfigData(tableViewConfiguration);
      displaySnackMessages(
        `${"Table View configuration successfully"} ${
          enableUpdateView ? "updated" : "saved"
        }`,
        "success"
      );
      setShowPanelLoader(false);
    } catch (err) {
      setShowPanelLoader(false);
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
    }
  };

  useEffect(() => {
    const viewColumnData = tableViewData.filter((item) => {
      return item.id === viewSelected;
    });

    setSelectedViewColumnData(viewColumnData);
  }, [tableViewData, viewSelected]);

  const getSelectedViewData = useMemo(() => {
    const selectedViewData = tableViewData.filter((item) => {
      return item.id === viewSelected;
    });

    if (isEmpty(selectedViewData)) {
      // if no view selected, take config from aggrid
      const gridColumns = getColumnDefData(agGrid);
      return [gridColumns];
    } else {
      return selectedViewData;
    }
  }, [tableViewData, viewSelected]);

  const onCancelClick = () => {
    setEnableSaveNewView(false);
    setEnableUpdateView(false);
  };

  const saveAsNewViewHandler = () => {
    const max_views_limit = 50;
    if (props.tableViewConfigData?.length < max_views_limit) {
      setEnableSaveNewView(true);
    } else {
      displaySnackMessages(
        `Max ${max_views_limit} views reached. Delete views to create new`,
        "error"
      );
    }
  };

  return (
    <div className={classes.customMargin}>
      <Tabs value={columnActionSelected} onChange={handleChange}>
        <Tab label={"Column Settings"} />
        <Tab label={"Font Settings"} />
      </Tabs>
      <div>
        <TabPanel value={columnActionSelected} index={0}>
          <TableViewColumnSetting
            viewSelected={viewSelected}
            selectedViewData={getSelectedViewData}
            setColumnSettingGridInstance={setColumnSettingGridInstance}
          />
        </TabPanel>
        <TabPanel value={columnActionSelected} index={1}>
          <div>Coming soon....</div>
        </TabPanel>
      </div>
      <div className={`${classes.BottomDiv}`}>
        <div
          className={`${classes.divider} ${globalClasses.marginBottom} ${globalClasses.marginTop}`}
        />
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.leftPadding}`}
        >
          {!enableSaveNewView && !enableUpdateView && (
            <>
              <Button
                variant="contained"
                color="primary"
                id="updateView"
                onClick={() => setEnableUpdateView(true)}
                disabled={viewSelected === 0}
              >
                Update view
              </Button>
              <Button
                variant="contained"
                color="primary"
                id="saveView"
                onClick={() => saveAsNewViewHandler()}
              >
                Save as new view
              </Button>
              <Button
                variant="contained"
                color="primary"
                id="applyView"
                onClick={() => {
                  const {
                    selectedViewTypeData,
                    updatedColumnSettings,
                  } = getCurrentColumnPreference();
                  onApplyTableView(
                    selectedViewTypeData?.view_name,
                    updatedColumnSettings
                  );
                }}
              >
                Apply table view
              </Button>
            </>
          )}
          {(enableSaveNewView || enableUpdateView) && (
            <div>
              <Form
                handleChange={handleSaveSectionForm}
                fields={SAVE_TABLE_VIEW}
                updateDefaultValue={false}
                defaultValues={getDefaultFieldValues}
                spacing={1.5}
              ></Form>
              <>
                <div
                  className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap} `}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    id="downloadCSV"
                    onClick={() => onCancelClick()}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    id="downloadCSV"
                    onClick={() => onSaveButtonClick()}
                  >
                    Save
                  </Button>
                </div>
              </>
            </div>
          )}
        </div>
      </div>
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

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack,
    setTableViewConfigData: (payload) =>
      dispatch(setTableViewConfigData(payload)),
  };
};

const mapStateToProps = (state) => {
  return {
    tableViewConfigData:
      state.tableViewConfigurationReducer?.tableViewConfigData,
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TableViewColumnAction);
