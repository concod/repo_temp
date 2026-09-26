import { useEffect, useState } from "react";
import { forwardRef } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import { connect } from "react-redux";
import {
  getFilterModules,
  setFilterModules,
  ToggleLoader,
  getScreenList,
  setSelModules,
  getFilterfields,
  createNewFilterConfig,
  resetFilterConfigSelections,
  getFilterConfigsTableData,
  setSelectedApplication,
} from "../../../actions/filterAction";
import { addSnack, closeSnack } from "../../../actions/snackbarActions";
import LinearProgress from "@mui/material/LinearProgress";
import ReactSelect from "../../../Utils/select";
import makeStyles from "@mui/styles/makeStyles";
import ConfigName from "./configName";
import { isEmpty } from "lodash";
import {
  flattenSelectedFiltersData,
  checkForValidFilters,
} from "./common-functions";
import ModuleConfig from "./moduleConfig";
import globalStyles from "core/Styles/globalStyles";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

const useStyles = makeStyles((theme) => ({
  dialogButtons: {
    marginRight: theme.spacing(1),
  },
  title: {
    fontWeight: 500,
    fontSize: 16,
    marginBottom: 20,
  },
  select: {
    width: "80%",
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: 500,
  },
}));
/**
 * Filter Modules
 * @param {*} param0
 */
const FilterModules = ({
  modules = [],
  setSelModules,
  selectedModules,
  header,
}) => {
  const classes = useStyles();
  const getOptions = (items) => {
    return items.map((item) => {
      return {
        label: item.label.replace(
          /product/gi,
          captializeStringIfCamelCase(
            dynamicLabelsBasedOnTenant("product", "core")
          )
        ),
        value: item.id,
      };
    });
  };
  const onChange = (options) => {
    setSelModules(options);
  };
  return (
    <>
      <Typography>{header}</Typography>
      <ReactSelect
        menuPortalTarget={document.querySelector(".MuiDialog-root")}
        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
        className={classes.select}
        value={selectedModules}
        isMulti={false}
        isSearchable={false}
        options={getOptions(modules)}
        onChange={onChange}
        closeMenuOnSelect={false}
      />
    </>
  );
};

const CreateNewConfig = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <>
      <Typography classes={{ root: classes.title }} gutterBottom>
        Create New Config
      </Typography>
      {props.applicationList.length ? (
        <div style={{ width: "80%", marginLeft: "auto", marginRight: "auto" }}>
          <FilterModules
            modules={props.applicationList}
            setSelModules={props.setSelectedApplication}
            selectedModules={props.selectedApplication}
            header="Select Application"
          />
          <div className={globalClasses.marginTop}>
            {props.filterModules.length ? (
              <FilterModules
                modules={props.filterModules}
                setSelModules={props.setSelModules}
                selectedModules={props.selectedModules}
                header="Select Screen"
              />
            ) : (
              <Typography variant="body2" component="p">
                Please select an application with available screens.
              </Typography>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};
/**
 * Modal Component
 * @param {*} props
 */
const CreateModal = (props) => {
  const [createFilterConfigLoader, setcreateFilterConfigLoader] = useState(
    false
  );
  const [currentScr, setcurrentScr] = useState(0);
  const [maxWidth, setmaxWidth] = useState("xs");
  const classes = useStyles();
  const [applicationList, setApplicationList] = useState([]);
  const globalClasses = globalStyles();

  useEffect(() => {
    props.setFilterModules([]);
    props.setSelModules([]);
    props.setSelectedApplication([]);
  }, []);

  const goToNext = () => {
    if (currentScr < 2) {
      setcurrentScr(currentScr + 1);
    }
    props.closeSnack();
  };

  const handleClose = () => {
    setApplicationList([]);
    props.handleClose();
    props.resetFilterConfigSelections();
  };

  const showError = (errorMsg) => {
    props.addSnack({
      message: errorMsg,
      options: {
        variant: "error",
      },
    });
  };

  const fetchFromMasterTable = () => {
    if (props.selectedModules.length === 0) {
      const msg = "Please select application and screen to proceed";
      showError(msg);
      return;
    }
    goToNext();
  };

  const saveFilters = () => {
    if (checkForValidFilters(props.selectedModuleConfigData)) {
      const msg = "Please fill all required fields.";
      showError(msg);
      return;
    }
    goToNext();
  };

  const saveConfig = async () => {
    if (props.configName === "") {
      const msg = "please add a name to the configuration";
      showError(msg);
      return;
    }
    const screens = [props.selectedModules.value];
    const elements = flattenSelectedFiltersData(props.selectedModuleConfigData);
    const configJSON = {
      name: props.configName,
      screens: screens,
      elements: elements,
    };
    try {
      setcreateFilterConfigLoader(true);
      await props.createNewFilterConfig(props.id, configJSON);
      props.addSnack({
        message: "Configuration created successfully",
        options: {
          variant: "success",
        },
      });
      props.refreshTable();
      setcreateFilterConfigLoader(false);
      handleClose();
    } catch (error) {
      const msg = "Failed to add Configuration";
      showError(msg);
      setcreateFilterConfigLoader(false);
    }
  };

  const contentMap = {
    0: <CreateNewConfig {...props} applicationList={applicationList} />,
    1: (
      <>
        <Typography classes={{ root: classes.moduleTitle }}>
          New Configuration
        </Typography>
        <div className={globalClasses.marginTop}>
          <ModuleConfig />
        </div>
      </>
    ),
    2: <ConfigName />,
  };

  const buttonGrpMap = {
    0: (
      <>
        {" "}
        <Button
          onClick={handleClose}
          color="primary"
          disabled={createFilterConfigLoader}
        >
          Cancel
        </Button>
        <Button
          autoFocus
          color="primary"
          variant="contained"
          onClick={fetchFromMasterTable}
          disabled={createFilterConfigLoader}
        >
          Fetch From master Table
        </Button>
      </>
    ),
    1: (
      <>
        {" "}
        <Button
          onClick={handleClose}
          color="primary"
          disabled={createFilterConfigLoader}
        >
          Cancel
        </Button>
        <Button
          autoFocus
          color="primary"
          variant="contained"
          disabled={createFilterConfigLoader}
          onClick={saveFilters}
        >
          Save Filters
        </Button>
      </>
    ),
    2: (
      <>
        {" "}
        <Button
          disabled={createFilterConfigLoader}
          onClick={handleClose}
          color="primary"
        >
          Cancel
        </Button>
        <Button
          disabled={createFilterConfigLoader}
          autoFocus
          color="primary"
          variant="contained"
          onClick={saveConfig}
        >
          Save
        </Button>
      </>
    ),
  };

  useEffect(() => {
    if (props.applicationCodesList?.length) {
      const newApplicationList = props.applicationCodesList?.map((item) => {
        return { label: item.name, id: item.application_code };
      });
      setApplicationList(newApplicationList);
      setcreateFilterConfigLoader(false);
    } else {
      setcreateFilterConfigLoader(true);
    }
  }, [props.applicationCodesList]);

  useEffect(() => {
    setcreateFilterConfigLoader(props.showModalLoader);
  }, [props.showModalLoader]);

  useEffect(() => {
    const fetchData = async (scrIdx) => {
      switch (scrIdx) {
        case 0:
          setmaxWidth("sm");
          break;
        case 1:
          setmaxWidth("lg");
          props.getFilterfields(props.selectedModules.value.toLowerCase());
          return;
        case 2:
          setmaxWidth("xs");
          break;
      }
    };
    fetchData(currentScr);
  }, [currentScr]);

  useEffect(() => {
    const fetchScreenModules = async () => {
      setcreateFilterConfigLoader(true);
      props.setSelModules([]);
      try {
        if (isEmpty(props.selectedApplication)) {
          setcreateFilterConfigLoader(false);
          return;
        }
        const screenList_data = await props.getScreenList(
          props.selectedApplication.value
        );
        props.setFilterModules(
          screenList_data.data.data.map((module) => {
            return {
              label: module.attribute,
              id: module.attribute,
            };
          })
        );
        setcreateFilterConfigLoader(false);
      } catch (error) {
        setcreateFilterConfigLoader(false);
      }
    };
    fetchScreenModules();
  }, [props.selectedApplication]);

  return (
    <Dialog
      id="filterDialog"
      aria-labelledby="customized-dialog-title"
      open={props.open}
      maxWidth={maxWidth}
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.handleClose();
      }}
    >
      {createFilterConfigLoader && <LinearProgress />}
      <DialogContent className={globalClasses.paper} dividers>
        {contentMap[currentScr]}
      </DialogContent>
      <DialogActions classes={{ root: classes.dialogButtons }}>
        {buttonGrpMap[currentScr]}
      </DialogActions>
    </Dialog>
  );
};
const mapStateToProps = (state) => {
  return {
    showModalLoader: state.filterElementsReducer.showModalLoader,
    filterModules: state.filterElementsReducer.filterModules,
    selectedModules: state.filterElementsReducer.selectedModules,
    configName: state.filterElementsReducer.configName,
    selectedModuleConfigData:
      state.filterElementsReducer.selectedModuleConfigData,
    createdConfigs: state.filterElementsReducer.createdConfigs,
    applicationCodesList: state.filterReducer.applicationCodesList,
    selectedApplication: state.filterElementsReducer.selectedApplication,
  };
};

const mapActionsToProps = {
  getFilterModules,
  setFilterModules,
  setSelModules,
  getScreenList,
  setSelectedApplication,
  getFilterfields,
  ToggleLoader,
  createNewFilterConfig,
  addSnack,
  closeSnack,
  resetFilterConfigSelections,
  getFilterConfigsTableData,
};
const ConnectedCreateModal = connect(
  mapStateToProps,
  mapActionsToProps
)(CreateModal);

/**
 * Create Filter
 * @param {*} props
 */
const CreateFilter = forwardRef((props, ref) => {
  const [open, setOpen] = useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const refreshTable = () => {
    ref?.current.api.refreshServerSideStore({ purge: true });
  };

  return (
    <>
      <Button variant="contained" color="primary" onClick={handleClickOpen}>
        Create New
      </Button>
      {open && (
        <ConnectedCreateModal
          open={open}
          handleClose={handleClose}
          id={props.id}
          refreshTable={refreshTable}
        />
      )}
    </>
  );
});

export default CreateFilter;
