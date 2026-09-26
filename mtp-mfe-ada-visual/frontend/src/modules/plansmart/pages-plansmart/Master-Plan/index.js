import React, { useState, useEffect } from "react";
import MasterPlanFilterComponent from "./master-plan-filter-component";
import MasterPlanTableComponent from "./master-plan-table-component";
import { useHistory, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { Box, Button } from "@mui/material";
import cloneDeep from "lodash/cloneDeep";
import {
  getFiltersOptions,
  getFilterDependency,
  getDefaultValues,
  createPlanGetSeasonType,
  generateFilterConfig,
  getMasterPlanCrumbsUrl,
  configureAttributeOptions,
} from "../plansmart-utility";
import { CreatePlan } from "../../constants-plansmart/stringConstants";
import {
  clearMasterPlanAllData,
  fetchMasterPlanFormula,
  fetchMasterPlanHistoryColDef,
  fetchMasterPlanHistoryData,
  getMasterPlanFilterConfiguration,
  setDimensionUpdateLoader,
  setMasterPlanFilterLoader,
} from "../../services-plansmart/Master-Plan/master-plan-services";
import { addSnack } from "../../../../core/actions/snackbarActions";
import MasterPlanStatusComponent from "./master-plan-status-component";
import MasterPlanSnapshotComponent from "./master-plan-snapshot-component";
import { useStyles } from "../plansmart-styles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import {
  handleMasterPlanAndReportSubmission,
  updateDefaultFilterValue,
} from "modules/plansmart/utils-plansmart";
import { getFiltersValues } from "core/actions/filterAction";
import { filterHierarchyOptions } from "core/Utils/filter-accessible-data";
import MasterPlanHistoryModal from "./MasterPlanHistoryModal";
import { getSeasonOptions } from "modules/plansmart/services-plansmart/CreateNewPlan/create-new-plan-service";

const MasterPlanRootComponent = (props) => {
  const {
    fetchMasterPlanFormulaReq,
    fetchMasterPlanHistoryColDefReq,
    fetchMasterPlanHistoryDataReq,
  } = props;
  const [masterPlanFilterElements, setMasterPlanFilterElements] = useState([]);
  const [masterPlanFilterDependency, setMasterPlanFilterDependency] = useState(
    {}
  );
  const [masterPlanFilterPayload, setMasterPlanFilterPayload] = useState([]);
  const [masterPlanStatusModal, setMasterPlanStatusModal] = useState(false);
  const [masterPlanSnapshotModal, setMasterPlanSnapshotModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);

  const classes = useStyles();
  const seasonType = createPlanGetSeasonType(props.location.search);
  const history = useHistory();
  /**
   * @function
   * @description Initialize component on first load.
   */
  useEffect(() => {
    fetchMasterPlanFilterConfig();
    // fetchMasterPlanFormulaReq();
    return () => {
      props.clearMasterPlanAllDataReq();
    };
  }, []);

  /**
   * @function
   * @description Fetch the inital form Attributes to setup the form.
   */
  const fetchMasterPlanFilterConfig = async () => {
    props.setMasterPlanFilterLoader(true);
    try {
      const filterData = await props.getMasterPlanFilterConfiguration();
      const fields = generateFilterConfig(
        filterData?.data?.data,
        props.userAccessList,
        seasonType,
        null,
        "Plansmart MasterPlan",
        props.addSnack,
        props.tenantFilterUamConfig
      );

      fields.then(async (data) => {
        const formattedData = data.map((filterObj) => ({
          ...filterObj,
        }));
        const updatedFilterDependency = await updateDefaultFilterValue({
          filterElements: formattedData,
          setFilter: masterPlanFilterChange,
        });
        formattedData.forEach((filter, filterInx) => {
          if (filter.dimension === "product") {
            filter.options = [];
          }
          if (filter.dimension === "store" && !filter.required) {
            filter.options = [];
          }
        });
        setMasterPlanFilterElements(formattedData);
        props.setMasterPlanFilterLoader(false);
      });
    } catch (error) {
      props.setMasterPlanFilterLoader(false);
    }
  };

  /**
   * @function
   * @description Handle filter operations to show to the table.
   */
  const onMasterPlanTableFetch = () => {
    handleMasterPlanAndReportSubmission({
      addSnack: props.addSnack,
      filterElements: masterPlanFilterElements,
      filterDependency: masterPlanFilterDependency,
      setFilterPayload: setMasterPlanFilterPayload,
    });
  };

  const checkUpdateProductDimension = ({ formDataObj, formFields }) => {
    let isValid = true;
    for (let inx = 0; inx < formFields.length; inx++) {
      const formField = formFields[inx];
      if (formField.dimension !== "product") {
        if (
          !formDataObj[formField.accessor] ||
          formDataObj[formField.accessor]?.length === 0
        ) {
          isValid = false;
          break;
        }
      }
    }
    if (!isValid) {
      formFields.forEach((formField) => {
        if (formField.dimension === "product") {
          formDataObj[formField.accessor] = [];
          formField.options = [];
        }
      });
      setMasterPlanFilterDependency(formDataObj);
      setMasterPlanFilterElements(formFields);
    } else {
      formFields.forEach(async (filter, filterInx) => {
        if (
          filter.dimension === "product" &&
          filterInx > 0 &&
          formFields[filterInx - 1].dimension !== "product"
        ) {
          try {
            props.setDimensionUpdateLoader(true);
            let body = {
              attribute_name: filter.column_name,
              filter_type: filter.type || "cascaded",
              filters: [],
            };
            const options = await getFiltersValues("product", body)();
            let accessibleOptions = filterHierarchyOptions(
              options.data.data.attribute,
              filter.accessor,
              props.userAccessList
            );
            filter.options = configureAttributeOptions(accessibleOptions);
            setMasterPlanFilterElements(formFields);
            props.setDimensionUpdateLoader(false);
          } catch (error) {
            filter.options = [];
            setMasterPlanFilterElements(formFields);
            props.setDimensionUpdateLoader(false);
          }
        }
      });
    }
  };

  /**
   * @function
   * @description Handle Data on every change of form Element
   * @param {String} formObjectName
   * @param {Object} formObjectValue
   */
  const masterPlanFilterChange = async (updatedFormData, id) => {
    props.setMasterPlanFilterLoader(true);
    const newUpdatedData = {
      ...masterPlanFilterDependency,
      ...updatedFormData,
    };
    const filterData = [...masterPlanFilterElements];
    if (id === "plansmart_year_value") {
      props.setMasterPlanFilterLoader(true);
      let seasonResponse = updatedFormData[id]
        ? await props.getSeasonOptions({
            filters: [
              {
                attribute_name: "year",
                value: updatedFormData[id] ? [updatedFormData[id]] : [],
                operator: "in",
              },
            ],
          })
        : null;
      if (seasonResponse?.data?.status || seasonResponse === null) {
        let updatedPlanFilterConfig = masterPlanFilterElements;
        updatedPlanFilterConfig.forEach((item) => {
          if (item.accessor === "season") {
            newUpdatedData[item.accessor] = [];
            item.options = seasonResponse
              ? seasonResponse?.data?.data.map((opt) => {
                  return {
                    label: opt.name,
                    value: opt.attribute_value.incremental_id,
                    id: opt.attribute_value.incremental_id,
                  };
                })
              : [];
          }
        });
        checkUpdateProductDimension({
          formDataObj: newUpdatedData,
          formFields: updatedPlanFilterConfig,
        });
        setMasterPlanFilterElements(updatedPlanFilterConfig);
        props.setMasterPlanFilterLoader(false);
      }
    }
    // Check if Id is present in the plan_levels
    if (CreatePlan.__plan_levels.indexOf(id) > -1) {
      // Retrieve array index where the update happened
      const filterIdx = filterData.findIndex((filter) => {
        return filter.column_name === id;
      });
      // Delete all depedency above the current updated array index
      filterData.forEach((filter, idx) => {
        if (idx > filterIdx) {
          delete newUpdatedData[filter.column_name];
        }
      });
      // Update the dependency to reset the Filter
      setMasterPlanFilterDependency(newUpdatedData);
      const Idx = masterPlanFilterElements.findIndex((filter) => {
        return filter.accessor === id;
      });
      let newdependency = getFilterDependency(
        masterPlanFilterElements,
        newUpdatedData,
        Idx,
        masterPlanFilterElements[Idx]?.dimension
      );
      let productCount = 0;
      newdependency = newdependency.filter((dep) => {
        productCount++;
        return dep.values.length > 0;
      });
      // Fetch filter options witht the updated depedency.
      const options = getFiltersOptions(
        masterPlanFilterElements,
        newdependency.length === productCount ? newdependency : [],
        Idx,
        "Plansmart MasterPlan",
        masterPlanFilterElements[Idx]?.dimension,
        props.tenantFilterUamConfig
      );
      options.then((data) => {
        setMasterPlanFilterElements(data);
        props.setMasterPlanFilterLoader(false);
      });
    } else if (CreatePlan.__store_levels.indexOf(id) > -1) {
      // Retrieve array index where the update happened
      const filterIdx = filterData.findIndex((filter) => {
        return filter.column_name === id;
      });
      // Delete all depedency above the current updated array index
      filterData.forEach((filter, idx) => {
        if (idx > filterIdx) {
          delete newUpdatedData[filter.column_name];
        }
      });
      // Update the dependency to reset the Filter
      setMasterPlanFilterDependency(newUpdatedData);
      const Idx = masterPlanFilterElements.findIndex((filter) => {
        return filter.accessor === id;
      });
      let newdependency = getFilterDependency(
        masterPlanFilterElements,
        newUpdatedData,
        Idx,
        masterPlanFilterElements[Idx]?.dimension
      );
      let storeCount = 0;
      newdependency = newdependency.filter((dep) => {
        storeCount++;
        return dep.values.length > 0;
      });
      // Fetch filter options witht the updated depedency.
      const options = getFiltersOptions(
        masterPlanFilterElements,
        newdependency.length === storeCount ? newdependency : [],
        Idx,
        "Plansmart MasterPlan",
        masterPlanFilterElements[Idx]?.dimension,
        props.tenantFilterUamConfig
      );
      options.then((data) => {
        setMasterPlanFilterElements(data);
        props.setMasterPlanFilterLoader(false);
      });
    } else {
      checkUpdateProductDimension({
        formDataObj: newUpdatedData,
        formFields: filterData,
      });
      setMasterPlanFilterDependency(newUpdatedData);
      props.setMasterPlanFilterLoader(false);
    }
  };

  /**
   * @function
   * @description Reset Filter Elements on click of Reset Button
   */
  const onMasterPlanFilterReset = () => {
    setMasterPlanFilterDependency({});
    setMasterPlanFilterPayload([]);
    checkUpdateProductDimension({
      formDataObj: {},
      formFields: masterPlanFilterElements,
    });
    props.clearMasterPlanAllDataReq();
  };

  const handleMasterPlanStatusModal = (value) => {
    setMasterPlanStatusModal(value);
  };

  const handleMasterPlanSnapShotModal = (value) => {
    setMasterPlanSnapshotModal(value);
  };

  const handleDownload = () => {
    props.addSnack({
      message: "Plan Downloaded Successfully",
      options: {
        variant: "success",
      },
    });
  };

  const handleOpenHistory = () => {
    setHistoryModal(true);
    fetchMasterPlanHistoryColDefReq();
    fetchMasterPlanHistoryDataReq();
  };

  const dashboardRedirectionUrl = getMasterPlanCrumbsUrl(seasonType);
  return (
    <div className={classes.root}>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Dashboard",
            id: 1,
            action: () => {
              history.push(dashboardRedirectionUrl);
            },
          },
          {
            label: "Master Plan",
            id: 1,
          },
        ]}
      />
      <Box
        display="none"
        justifyContent="flex-end"
        className={classes.actionBtnGroup}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleMasterPlanStatusModal(true)}
        >
          Status
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleMasterPlanSnapShotModal(true)}
        >
          Take Snapshot
        </Button>
        <Button variant="contained" color="primary" onClick={handleDownload}>
          Download
        </Button>
      </Box>
      <MasterPlanFilterComponent
        filterData={masterPlanFilterElements}
        handleChange={masterPlanFilterChange}
        getDefaultValues={getDefaultValues(
          masterPlanFilterElements,
          masterPlanFilterDependency
        )}
        onMasterPlanTableFilter={onMasterPlanTableFetch}
        onReset={onMasterPlanFilterReset}
        screen="master_plan"
        filterDependency={masterPlanFilterDependency}
        seasonType={seasonType}
        handleHistoryModal={handleOpenHistory}
      />

      {masterPlanFilterPayload.length > 0 && (
        <MasterPlanTableComponent
          masterPlanFilterPayload={masterPlanFilterPayload}
          filterDependency={masterPlanFilterDependency}
        />
      )}
      <MasterPlanStatusComponent
        open={masterPlanStatusModal}
        onClose={() => handleMasterPlanStatusModal(false)}
      />
      <MasterPlanSnapshotComponent
        open={masterPlanSnapshotModal}
        onClose={() => handleMasterPlanSnapShotModal(false)}
      />
      <MasterPlanHistoryModal
        show={historyModal}
        handleClose={setHistoryModal}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccessList:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};
const mapDispatchToProps = (dispatch) => ({
  getMasterPlanFilterConfiguration: (payload) =>
    dispatch(getMasterPlanFilterConfiguration(payload)),
  setMasterPlanFilterLoader: (payload) =>
    dispatch(setMasterPlanFilterLoader(payload)),
  setDimensionUpdateLoader: (payload) =>
    dispatch(setDimensionUpdateLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getSeasonOptions: (payload) => dispatch(getSeasonOptions(payload)),
  clearMasterPlanAllDataReq: () => dispatch(clearMasterPlanAllData()),
  fetchMasterPlanFormulaReq: () => dispatch(fetchMasterPlanFormula()),
  fetchMasterPlanHistoryColDefReq: () =>
    dispatch(fetchMasterPlanHistoryColDef()),
  fetchMasterPlanHistoryDataReq: () => dispatch(fetchMasterPlanHistoryData()),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(MasterPlanRootComponent));
