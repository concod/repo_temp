import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import FilterGroup from "core/commonComponents/filters/filterGroup";
import AgGridComponent from "core/Utils/agGrid";
import { Typography } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import { userManagementRoutes } from "config/routes";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Form from "core/Utils/form";
import {
  ASSIGN_ROLE_USER_DETAILS_FILTERS,
  SUPER_USERS,
  USER_EMAIL_FILTER,
  USER_NAME_FORM,
} from "./constants";
import { common } from "core/Utils/constants/assortSmart-constants";
import { addSnack } from "core/actions/snackbarActions";
import {
  getCombinedFilterDashboardData,
  getCurrentApplicationDetails,
  mapDataToLabel,
  updateFilterDimension,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  saveNewUser,
  getUserDetails,
} from "../services/TenantManagement/User-Management/user-management-service";
import {
  getTableHierarchyOnAssignRole,
  setEditUserRoleMappingData,
  getUserDetailsFormFilter,
  getFilterConfiguration,
  updateUserRoleMappings,
  saveUserRoleMappings,
  setNewUsersList,
  getTableConfig,
  setEditMode,
} from "../services/TenantManagement/User-Role-Management/user-role-management-service";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep, isEmpty, debounce } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { Prompt } from "impact-ui";
import { Badge, Switch, Button } from "impact-ui-v3";
import Tabs from "core/commonComponents/tabs";
import { mapConvertToLowerCase } from "core/Utils/formatter";
import { useNavigate } from "react-router-dom-v5-compat";
import NotFound from "core/commonComponents/notFound/NotFound";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  filterContainer: {
    paddingTop: pxToRem(16.1),
    paddingBottom: pxToRem(15.72),
    borderBottom: `1px solid ${colours.linkWater1}`,
    border: "none",
    "&:last-child": {
      borderBottom: "none",
    },
    "& .css-ur2jdm-MuiContainer-root": {
      paddingLeft: pxToRem(0),
    },
    "& .ia-select-button-text": {
      width: pxToRem(165),
    }
  },
  positionedStep: {
    position: "relative",
    zIndex: 1,
  },
  assignUnassignRoleContainer: {
    background: colours.white,
    padding: `${pxToRem(16)} ${pxToRem(23)} ${pxToRem(19)} ${pxToRem(21)}`,
    borderRadius: pxToRem(8),
    marginBottom: pxToRem(16),
  },
  title: {
    fontSize: pxToRem(16),
    fontWeight: 400,
    color: colours.codGray,
    fontFamily: "Poppins",
    lineHeight: "normal",
  },
  subheaderContainer: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(10),
    padding: `${pxToRem(10.04)} ${pxToRem(5.58)} ${pxToRem(10.04)} ${pxToRem(
      17.42
    )}`,
    background: colours.appBackground,
    borderRadius: pxToRem(3),
    width: "fit-content",
  },
  subheaderTitle: {
    fontSize: pxToRem(14),
    fontWeight: 600,
    textAlign: "center",
    fontStyle: "normal",
    color: colours.lightNeutrals,
    lineHeight: pxToRem(20),
    fontFamily: "Manrope",
  },
  badgeContainer: {
    "& .MuiChip-root.impact_badges_only_label_filled": {
      width: pxToRem(20),
      height: pxToRem(20),
      padding: `${pxToRem(3)} ${pxToRem(7.17)}`,
      borderRadius: pxToRem(6),
    },
    "& .MuiChip-root.impact_badges_only_label_filled .MuiChip-label": {
      fontSize: pxToRem(12),
      fontWeight: 700,
      lineHeight: pxToRem(13.8),
      fontFamily: "Manrope",
      fontStyle: "normal",
      letterSpacing: pxToRem(-0.12),
    },
  },
  horizontalLine: {
    width: "100%",
    height: pxToRem(1),
    background: colours.geyser,
    marginTop: pxToRem(36),
  },
  tableContainer: { 
    "& .ag-theme-alpine .ia-basic-table-layout": {
      zIndex: 0,
    },
  },
}));

export const AssignUnAssignRole = (props) => {
  const {
    newUnmappedList,
    setNewUnmappedList,
    newMappedList,
    setNewMappedList,
    role,
    setRole,
    filterLoader,
    setFilterLoader,
  } = props;
  const [unfilteredHierarchyData, setUnfilteredHierarchyData] = useState([]);
  const [userFilterTableColumn, setUserFilterTableColumns] = useState([]);
  const [userFilterTableData, setUserFilterTableData] = useState([]);
  const [userMappedTableData, setUserMappedTableData] = useState([]);
  const [mappedSelectedRoles, setMappedSelectedRoles] = useState([]);
  const [userDetailsLoader, setUserDetailsLoader] = useState(false);
  const [userNameDependency, setUserNameDependency] = useState([]);
  const [selectedDependency, setSelectedDependency] = useState([]);
  const [emailFilterConfig, setEmailFilterConfig] = useState([]);
  const [activeTab, setActiveTab] = useState("current-mapping");
  const [showNoDataFound, setShowNoDataFound] = useState(false);
  const [isLoaderEnabled, setIsLoaderEnabled] = useState(false);
  const [userNameEditForm, setUserNameEditForm] = useState([]);
  const [currentTableData, setCurrentTableData] = useState([]);
  const [roleFilterConfig, setRoleFilterConfig] = useState([]);
  const [preSelectedRoles, setPreSelectedRoles] = useState([]);
  const [applicationCode, setApplicationCode] = useState(null);
  // const [newUnmappedList, setNewUnmappedList] = useState([]);
  const [emailDependency, setEmailDependency] = useState([]);
  const [roleDependency, setRoleDependency] = useState([]);
  // const [filterLoader, setFilterLoader] = useState(false);
  // const [newMappedList, setNewMappedList] = useState([]);
  const [filterConfig, setFilterConfig] = useState([]);
  const [isEditable, setIsEditable] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  // const [role, setRole] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const globalClasses = globalStyles();
  const tableInstance = useRef();
  const mappedTableInstance = useRef();
  const navigate = useNavigate();
  const classes = useStyles();
  const hasCalledCrossFilterRef = useRef(false);

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const mappedLoadTableInstance = (params) => {
    mappedTableInstance.current = params;
  };

  const getApplicationCode = (applicationName) => {
    try {
      const {
        applicationCode: applicationCodeValue,
      } = getCurrentApplicationDetails(applicationName);
      setApplicationCode(applicationCodeValue);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setFilterLoader(true);
    setUserNameEditForm(cloneDeep(USER_NAME_FORM));
    fetchUserList();
  }, []);

  useEffect(() => {
    if(applicationCode) {
      getFilterAndTableConfig();
    }
  }, [applicationCode]);

  useEffect(() => {
    if (props.editUserRoleMappingData?.application_name) {
      getApplicationCode(props.editUserRoleMappingData?.application_name);
    }
  }, []);

  useEffect(() => {
    return () => {
      resetData();
    };
  }, []);

  useEffect(() => {
    setFilterLoader(true);
    fetchUserList();
  }, [props.isEditMode]);

  useEffect(() => {
    if (
      !applicationCode ||
      !role ||
      !filterConfig?.length
    ) {
      return;
    }
    if (hasCalledCrossFilterRef.current) return;
  
    if (
      !mapConvertToLowerCase([
        ...SUPER_USERS,
        ...props.clientSpecificSuperUsers,
      ]).includes(mapConvertToLowerCase(role))
    ) {
      getFilterValues();
      hasCalledCrossFilterRef.current = true;
    }
  }, [
    applicationCode,
    role,
    filterConfig,
    props.clientSpecificSuperUsers,
  ]);

  useEffect(() => {
    hasCalledCrossFilterRef.current = false;
  }, [role]);

  useEffect(() => {
    fetchUserFilterTable();
  }, [showAll]);

  /**
   * @function
   * @description Redraw table once table data is updated
   */
  useEffect(() => {
    const updatedData = getUpdatedTableData(currentTableData);
    fetchUserFilterTable(updatedData);
  }, [userMappedTableData]);

  /**
   * @function
   * @description Updated table data to show the mapping changes
   * @param {Object} tableData
   * @returns {Object}
   */
  const getUpdatedTableData = (tableData) => {
    const selectedRowList = userMappedTableData.map((data) => data.id);
    const updatedData = cloneDeep(tableData).map((rowData) => {
      return {
        ...rowData,
        checkbox_disabled: selectedRowList.includes(rowData.id),
      };
    });
    return updatedData;
  };

  /**
   * @function
   * @description Update selected user email, application and role configuration
   */
  const fetchUserList = async () => {
    setUserDetailsLoader(true);
    setFilterLoader(true);
    try {
      const editUserRole = !isEmpty(props.editUserRoleMappingData);
      updateEmailFilterConfig(editUserRole);
      updateRoleFilterConfig(editUserRole);
      setFilterLoader(false);
      setUserDetailsLoader(false);
    } catch (err) {
      setUserDetailsLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const getFilterAndTableConfig = async () => {
    setFilterLoader(true);
    try {
      const resp = await getFilterConfiguration(applicationCode)();
      setFilterConfig(resp.data.data);
      let configColumns = await getTableConfig(applicationCode)();
      let formattedColumns = agGridColumnFormatter(configColumns.data?.data);
      setUserFilterTableColumns(
        formattedColumns.filter((col) => !col?.is_hidden)
      );
      setFilterLoader(false);
    } catch (err) {
      setFilterLoader(false);
    }
  }

  /**
   * @function
   * @description Update filter and filter configuration
   */
  const getFilterValues = async () => {
    setFilterLoader(true);
    try {
      if (filterConfig.length > 0) {
        const filterElementsData = await getCombinedFilterDashboardData(
          filterConfig,
          [],
          "",
          {},
          null,
          null,
          applicationCode
        );
        const filterElements = filterConfig.map(async (key) => {
          const configurationOptions = filterElementsData[key.column_name];
          return {
            ...key,
            filter_keyword: key.column_name,
            initialData: configurationOptions.map((item) => {
              return mapDataToLabel(item);
            }),
          };
        });
        let data = await Promise.all(filterElements);
        setFilterConfig(data);
        setFilterLoader(false);
      }
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      setFilterLoader(false);
    }
  };

  /**
   * @func
   * @description Update Email filter based on a role being edited or assigned first time
   * @param {Boolean} editUserRole
   */
  const updateEmailFilterConfig = async (editUserRole) => {
    const emailFilterElem = USER_EMAIL_FILTER.map(async (key) => {
      const postBody = {
        meta: {},
      };
      try {
        let response = await props.getUserDetails(postBody);
        let selectedValues = [];
        if (editUserRole) {
          selectedValues = getEmailOptions(
            response.data.data.filter(
              (item) =>
                item.user_code === props.editUserRoleMappingData.user_code
            )
          );
        } else if (props.newUsersList.length) {
          selectedValues = getEmailOptions(props.newUsersList);
        } else {
          selectedValues = getEmailOptions(response.data.data);
        }
        const newEmailDependency = constructDependencyObject(key, selectedValues)
        setEmailDependency([newEmailDependency]);
        return {
          ...key,
          filter_keyword: key.column_name,
          is_mandatory: true,
          initialData: selectedValues,
          is_multiple_selection: selectedValues.length > 1,
        };
      } catch (error) {
        if (error?.response?.status === 403) {
          props?.setShowNoDataFound(true);
        }
      }
    });
    const emailData = await Promise.all(emailFilterElem);
    setEmailFilterConfig(emailData);
  };

  /**
   * @function
   * @description Return structured array object that can be passed to dropdown as options.
   * @param {Array} list
   * @returns {Array} List of options
   */
  const getEmailOptions = (list) => {
    return list.map((item) => {
      return {
        value: item.user_code,
        label: item.email,
        id: item.user_code,
      };
    });
  };

  /**
   * @function
   * @description Return structed dependency object
   * @param {Object} key
   * @param {Array} values
   * @returns {Object}
   */
  const constructDependencyObject = (key, values) => {
    return {
      dimension: key.dimension,
      display_type: key.display_type,
      filter_id: key.filter_keyword,
      filter_type: key.type,
      values: values,
    };
  };

  /**
   * @func
   * @description Update Role filter based on a role being edited or assigned first time
   * @param {Boolean} editUserRole
   */
  const updateRoleFilterConfig = async (editUserRole) => {
    let filter = {};
    const newRoleDependency = [];
    ASSIGN_ROLE_USER_DETAILS_FILTERS.forEach((item) => {
      const val = props.editUserRoleMappingData[item.column_name];
      const selectedValues = editUserRole
        ? [
            {
              label: val,
              id: val,
              value: val,
            },
          ]
        : [];
      newRoleDependency.push(constructDependencyObject(item, selectedValues));
      filter = {
        dimension: item.dimension,
        display_type: item.display_type,
        filter_id: item.filter_keyword,
        filter_type: item.type,
      };
    });
    updateRoleOnChange(newRoleDependency, filter);
  };

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose, autoHideDuration: 3000 }),
      },
    });
  };

  /**
   * @function
   * @description Update role and application list and dependency on change of dropdown value and handle cascading
   * @param {Object} dependency
   * @param {Object} filter
   */
  const updateRoleOnChange = async (dependency, filter) => {
    let isApplicationSelected = false;
    dependency.forEach((item) => {
      if(item.filter_id === "application_name" && item?.values?.length) {
        isApplicationSelected = true;
        getApplicationCode(item?.values[0]?.value);
      }
    });
    setRoleDependency(dependency);
    if (filter?.filter_id === "role_name") {
      dependency.forEach((item) => {
        if (item?.filter_id === "role_name" && item.values.length) {
          setRole(item.values[0].value);
        }
      });
    }
    let selectionValueDependency = getSelectionValueDependency(dependency);
    try {
      if (!filter || filter.filter_type === "cascaded") {
        let initialFilterElements = !roleFilterConfig.length
          ? [...ASSIGN_ROLE_USER_DETAILS_FILTERS]
          : [...roleFilterConfig];
        const filterElements = initialFilterElements.map(async (key) => {
          let body = {
            attribute_name: key.column_name,
            filter_type: key.type,
            filters: selectionValueDependency.filter(
              (obj) => obj.attribute_name !== "user_email" && !isEmpty(...obj?.values)
            ),
          };
          const options = await props.getUserDetailsFormFilter(body);
          key.is_disabled =
            key.column_name === "application_name" &&
            !isEmpty(props.editUserRoleMappingData);
          // disabling role_name dropdown if application_name is not selected
          if (key.column_name === "role_name" && isApplicationSelected) {
            key.is_disabled = false;
          } else if (key.column_name === "role_name" && !isApplicationSelected) {
            key.is_disabled = true;
          }
          key.initialData = options.data.data
            .filter((item) => {
              return ["Notification", "Master Data View"].every(
                (key) => key !== item.attribute
              );
            })
            .map((opt) => {
              let appsConfig = JSON.parse(
                localStorage.getItem("applicationCodesList")
              );
              // Find the corresponding application in the appsConfig list
              const app = appsConfig.find((app) => app.name === opt.attribute);
              return {
                value: opt.attribute,
                label:
                  app && app?.extra && app?.extra?.label
                    ? app.extra.label
                    : opt.attribute,
                id: opt.attribute,
              };
            });
          return key;
        });
        await Promise.all(filterElements);
        setRoleFilterConfig(initialFilterElements);
      }
    } catch (err) {
      console.error("updateRoleOnChange error: ", err);
      displaySnackMessages("Something went wrong on filtering", "error");
    }
  };

  /**
   * @function
   * @description Create a structure dependency object, add dimension if addDimension is true to the object
   * @param {Object} dependency
   * @param {Boolean} addDimension
   * @returns {Object}
   */
  const getSelectionValueDependency = (dependency, addDimension) => {
    return dependency.length > 0
      ? dependency.map((opt) => {
          return {
            attribute_name: opt.filter_id,
            operator: "in",
            values: Array.isArray(opt.values)
              ? opt.values.map((option) => option.value)
              : opt.values,
            filter_type: opt.filter_type,
            ...(addDimension && { dimension: opt.dimension }),
          };
        })
      : [];
  };

  /**
   * @function
   * @description Update filter dependency on change of each filter values and update filter config
   * @param {Object} dependency
   * @param {Object} filter
   */
  const updateFilterValuesOnChange = async (dependency, filter) => {
    let selectionValueDependency = getSelectionValueDependency(
      dependency,
      true
    );
    setFilterLoader(true);
    try {
      if (!filter || filter.filter_type === "cascaded") {
        let initialFilterElements = cloneDeep(filterConfig);
        const filterElementsData = await getCombinedFilterDashboardData(
          updateFilterDimension(
            initialFilterElements,
            initialFilterElements,
            true,
            false
          ),
          updateFilterDimension(
            selectionValueDependency,
            initialFilterElements,
            false,
            true
          ),
          "",
          {},
          null,
          null,
          applicationCode
        );
        const filterElements = initialFilterElements.map(async (key) => {
          if (key.type === "cascaded") {
            const options = filterElementsData[key.column_name];
            key.initialData = options.map((item) => {
              return mapDataToLabel(item);
            });
          }
          return key;
        });
        await Promise.all(filterElements);
        setFilterConfig(initialFilterElements);
      }
      setSelectedDependency(selectionValueDependency);
      setUserFilterTableData([]);
      setCurrentTableData([]);
      setPreSelectedRoles([]);
      setNewUnmappedList([]);
      setNewMappedList([]);
      setUserMappedTableData([]);
      setFilterLoader(false);
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      setFilterLoader(false);
    }
  };

  /**
   * @function
   * @description Updating filter values on reset
   */
  const resetFilterValuesSelected = async () => {
    setFilterLoader(true);
    setSelectedDependency([]);
    try {
      let response = await getFilterConfiguration(applicationCode)();
      setFilterConfig(response.data.data);
      await getFilterValues();
      setFilterLoader(false);
    } catch (err) {
      setFilterLoader(false);
      displaySnackMessages("Error re-configuring filter.", "error");
    }
  };

  /**
   * @function
   * @description Fetch table values and update both mapped and unmapped roles table
   * @param {Boolean} _hideloader
   * @param {Object} initialDependency
   */
  const fetchValuesBasedOnFilterApplied = async (
    _hideloader,
    initialDependency
  ) => {
    setFilterLoader(true);
    if (isEmpty(selectedDependency)) {
      displaySnackMessages("Select atleast one filter", "warning");
    } else {
      let initialFilterElements = cloneDeep(filterConfig);
      let dependency = initialDependency
        ? initialDependency
        : selectedDependency;
      try {
        let body = {
          meta: {},
          application_code: applicationCode,
          filters: updateFilterDimension(
            dependency,
            initialFilterElements,
            false,
            true
          ),
        };
        let response = await getTableHierarchyOnAssignRole(body, applicationCode)();
        const editUserRole = !isEmpty(props.editUserRoleMappingData);
        if (editUserRole) {
          const mappedTableIds = [];
          const heirarchyIds = props.editUserRoleMappingData.access_hierarchy.map(
            (heirarchies) => heirarchies.id
          );
          const mappedTableData = cloneDeep(response?.data?.data || []).filter(
            (data) => {
              if (heirarchyIds.includes(data.id)) {
                mappedTableIds.push(data.id);
                return true;
              } else return false;
            }
          );
          const mappedUnfilteredData = cloneDeep(
            props.editUserRoleMappingData.access_hierarchy
          ).filter((data) => !mappedTableIds.includes(data.id));
          setUnfilteredHierarchyData(mappedUnfilteredData);
          setUserFilterTableData(response.data.data);
          setCurrentTableData(response.data.data);
          setUserMappedTableData(mappedTableData);
        } else {
          setUserFilterTableData(response.data.data);
          setCurrentTableData(response.data.data);
        }
        setFilterLoader(false);
      } catch (err) {
        displaySnackMessages("Something went wrong", "error");
        setFilterLoader(false);
      }
    }
  };

  /**
   * @function
   * @description Update hierarchy table selection changes
   * @param {Object} event
   */
  const onSelectionChanged = debounce((event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows().map((item) => item.id);
    setPreSelectedRoles(selections);
  }, 200);

  /**
   * @function
   * @description Update current mapped roles table selection changes
   * @param {Object} event
   */
const onMappedSelectionChanged = debounce((event) => {
    let selections = event.api.getSelectedRows().map((item) => item.id);
    setMappedSelectedRoles(selections);
}, 200);

  /**
   * @function
   * @description Update both table rows when a unmapped user role is added
   */
  const addMappings = () => {
    const newMappings = [];
    let newUnmappings = [...newUnmappedList];
    const addToOldList = [];
    setIsLoaderEnabled(true);
    cloneDeep(userFilterTableData).forEach((data) => {
      let unMappingUpdated = false;
      newUnmappings = newUnmappings.filter((unMappedData) => {
        if (
          data.id === unMappedData.id &&
          preSelectedRoles.includes(unMappedData.id)
        ) {
          addToOldList.push(unMappedData);
          unMappingUpdated = true;
          return false;
        }
        return true;
      });
      if (unMappingUpdated) {
        return false;
      }
      if (preSelectedRoles.includes(data.id)) {
        newMappings.push(cloneDeep(data));
      }
    });

    setPreSelectedRoles([]);
    tableInstance.current?.api.deselectAll();
    mappedTableInstance.current?.api.deselectAll();
    setNewMappedList([...newMappedList, ...newMappings]);
    setNewUnmappedList(newUnmappings);
    setUserMappedTableData([
      ...userMappedTableData,
      ...newMappings,
      ...addToOldList,
    ]);
    setIsLoaderEnabled(false);
  };

  /**
   * @function
   * @description Update both table rows when a mapped user role is deleted
   */
  const deleteMappings = () => {
    setIsLoaderEnabled(true);
    let newMappings = [...newMappedList];
    const newUnmappings = [];
    const mappedTableData = cloneDeep(userMappedTableData).filter((data) => {
      let mappedUpdated = false;
      newMappings = newMappings.filter((mappedData) => {
        if (
          data.id === mappedData.id &&
          mappedSelectedRoles.includes(mappedData.id)
        ) {
          mappedUpdated = true;
          return false;
        }
        return true;
      });
      if (mappedUpdated) {
        return false;
      }
      if (mappedSelectedRoles.includes(data.id)) {
        newUnmappings.push(data);
        return false;
      }
      return true;
    });
    setMappedSelectedRoles([]);
    tableInstance.current?.api.deselectAll();
    mappedTableInstance.current?.api.deselectAll();
    setNewMappedList(newMappings);
    setNewUnmappedList([...newUnmappedList, ...newUnmappings]);
    setUserMappedTableData(mappedTableData);
    setIsLoaderEnabled(false);
  };

  /**
   * @function
   * @description Create filter dependenyc for api filter payload from slected table rows
   * @param {Object} tableList
   * @returns
   */
  const configureSelectedFiltersIntoPayload = (tableList) => {
    let selectedFilters = [];
    filterConfig.forEach((item) => {
      selectedFilters.push({
        attribute_name: item.column_name,
        operator: "in",
        filter_type: item.type,
        dimension: item.dimension,
        values: [
          ...new Set([
            ...tableList.map((row) => row[item.column_name]),
            ...(item?.extra?.default_value || []),
          ]),
        ].filter((value) => value),
      });
      if (item?.extra?.uam_applicable_dimensions) {
        item.extra.uam_applicable_dimensions.forEach((dimension) => {
          selectedFilters.push({
            attribute_name: item.column_name,
            operator: "in",
            filter_type: item.type,
            dimension: dimension,
            values: [
              ...new Set([
                ...tableList.map((row) => row[item.column_name]),
                ...(item?.extra?.default_value || []),
              ]),
            ].filter((value) => value),
          });
        });
      }
    });
    return selectedFilters;
  };

  /**
   * @function
   * @description Validate chnages and update new hierarchies
   * @returns
   */
  const submitRoleMappings = async () => {
    const hasRoleChanged = role !== props.editUserRoleMappingData?.role_name;
    if (
      mapConvertToLowerCase(SUPER_USERS).includes(
        mapConvertToLowerCase(role)
      ) ||
      props.clientSpecificSuperUsers.includes(role) ||
      Boolean(newUnmappedList.length) ||
      Boolean(newMappedList.length) ||
      (props.editUserRoleMappingData?.access_hierarchy?.length &&
        hasRoleChanged)
    ) {
      setUserDetailsLoader(true);
      setFilterLoader(true);
      let emailSelected = emailDependency.some(
        (item) => item.filter_id === "user_email" && item.values.length
      );
      let applicationAndRolesSelected = roleDependency.every(
        (item) => item.values.length
      );
      let isSuperUser =
        mapConvertToLowerCase(SUPER_USERS).includes(
          mapConvertToLowerCase(role)
        ) || props.clientSpecificSuperUsers.includes(role);
      if (!emailSelected || !applicationAndRolesSelected) {
        displaySnackMessages(
          "Select mandatory fields and hierarchies to assign",
          "error"
        );
        setFilterLoader(false);
        setUserDetailsLoader(false);
        return;
      }
      try {
        const users = emailDependency[0].values.map((user) => user.value);
        if (props.newUsersList.length) {
          let filtersPayload = configureSelectedFiltersIntoPayload(
            cloneDeep(userMappedTableData)
          );
          const body = {
            users_id: users,
            attributes: [
              {
                application: roleDependency
                  .filter((item) => item.filter_id === "application_name")[0]
                  ?.values.map((item) => item.value),
                role: role,
                access_hierarchy: isSuperUser ? [] : userMappedTableData,
              },
            ],
            filters: isSuperUser ? [] : filtersPayload,
          };

          let response = await props.saveUserRoleMappings(body);
          displaySnackMessages(response.data.message, "success", () =>
            navigate(userManagementRoutes.user)
          );
        } else if (!isEmpty(props.editUserRoleMappingData)) {
          let heirarchyData = cloneDeep([
            ...userMappedTableData,
            ...unfilteredHierarchyData,
          ]);
          if (isEmpty(heirarchyData) && !isSuperUser) {
            displaySnackMessages(
              "Hierarchy cannot be empty for this role. Please add some hierarchy",
              "error"
            );
            setUserDetailsLoader(false);
            setFilterLoader(false);
            return;
          }
          heirarchyData = heirarchyData.length
            ? heirarchyData
            : props.editUserRoleMappingData?.access_hierarchy || [];
          let filtersPayload = configureSelectedFiltersIntoPayload(
            heirarchyData
          );
          let body = {
            updateBody: [
              {
                users_id: users,
                attributes: [
                  {
                    application: roleDependency
                      .filter(
                        (item) => item.filter_id === "application_name"
                      )[0]
                      ?.values.map((item) => item.value),
                    role: role,
                    access_hierarchy: isSuperUser ? [] : heirarchyData,
                    hierarchy_id: [props.editUserRoleMappingData.hierarchy_id],
                  },
                ],
                filters: isSuperUser ? [] : filtersPayload,
              },
            ],
          };
          let response = await props.updateUserRoleMappings(body);
          const userMappings = cloneDeep(props.editUserRoleMappingData);
          userMappings.access_hierarchy = heirarchyData;
          props.setEditUserRoleMappingData(userMappings);
          updateAllChanges();
          setFilterLoader(false);
          setUserDetailsLoader(false);
          displaySnackMessages(response.data.message, "success", () =>
            navigate(userManagementRoutes.user)
          );
        }
      } catch (_error) {
        setFilterLoader(false);
        setUserDetailsLoader(false);
        displaySnackMessages("Something went wrong.", "error");
      }
    } else {
      displaySnackMessages("No changes to save.", "warning");
    }
  };

  /**
   * @function
   * @description Reset configurations role/user assignment/creation config
   */
  const resetData = () => {
    props.setEditUserRoleMappingData({});
    props.setNewUsersList([]);
    props.setEditMode(false);
  };

  /**
   * @function
   * @description Update local states on saving changes to database.
   */
  const updateAllChanges = () => {
    setNewMappedList([]);
    setNewUnmappedList([]);
    setPreSelectedRoles([]);
    setMappedSelectedRoles([]);
  };

  /**
   * @function
   * @description Filter current tabledata to show only unmapped hierarchies if showAll is true
   * @param {Object} tabledata
   */
  const fetchUserFilterTable = (filterData = userFilterTableData) => {
    setIsLoaderEnabled(true);
    if (!showAll) {
      const uopdatedTableData = getUpdatedTableData(currentTableData);
      setUserFilterTableData(uopdatedTableData);
    } else {
      const tableData = cloneDeep(filterData).filter(
        (data) => !Boolean(data.checkbox_disabled)
      );
      setUserFilterTableData(tableData);
    }
    setIsLoaderEnabled(false);
  };

  const tabs = [
    {
      label: "Access hierarchy list",
      id: "hierarchy",
      TabPanel: (
        <>
          <div
            className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginBottom} ${globalClasses.verticalAlignCenter}`}
          >
            {Boolean(preSelectedRoles.length) && (
              <Button
                variant="primary"
                onClick={() => addMappings()}
                disabled={isLoaderEnabled}
              >
                Add To Existing Permission
              </Button>
            )}
            <Switch
              leftLabel="Show All"
              rightLabel="Show Unmapped"
              onChange={() => setShowAll(!showAll)}
              value={showAll}
            />
          </div>
          <Loader loader={isLoaderEnabled} spinner>
            <div className={classes.tableContainer}>
              <AgGridComponent
                rowdata={userFilterTableData}
                columns={userFilterTableColumn}
                selectAllHeaderComponent={true}
                onSelectionChanged={onSelectionChanged}
                uniqueRowId={"id"}
                rowSelection={"multiple"}
                // selectedRows={preSelectedRoles}
                sizeColumnsToFitFlag
                loadTableInstance={loadTableInstance}
                getRowStyle={(params) => {
                  if (params?.data?.checkbox_disabled) {
                    return { pointerEvents: "none", background: "#FFF9EB" };
                  }
                }}
              />
            </div>
          </Loader>
        </>
      ),
    },
    {
      label: "Current department mapping",
      id: "current-mapping",
      TabPanel: (
        <>
          <div
            className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginBottom}`}
          ></div>
          <Loader loader={isLoaderEnabled} spinner>
            <AgGridComponent
              rowdata={userMappedTableData}
              columns={userFilterTableColumn}
              selectAllHeaderComponent={true}
              onSelectionChanged={onMappedSelectionChanged}
              uniqueRowId={"id"}
              rowSelection={"multiple"}
              // selectedRows={mappedSelectedRoles}
              loadTableInstance={mappedLoadTableInstance}
              sizeColumnsToFitFlag
              topRightOptions={
                <>
                  {Boolean(mappedSelectedRoles.length) && (
                    <Button
                      variant="tertiary"
                      icon={<DeleteIcon />}
                      onClick={() => deleteMappings()}
                      disabled={isLoaderEnabled}
                    />
                  )}
                </>
              }
            />
          </Loader>
        </>
      ),
    },
  ];

  const handleRedirection = () => {
    if (Boolean(newUnmappedList.length) || Boolean(newMappedList.length)) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
      resetData();
      navigate(userManagementRoutes.user);
    }
  };

  /**
   * @function
   * @description Check for valid fields
   * @returns {Boolean}
   */
  const isValidData = () => {
    const editUserNameDependency = cloneDeep(userNameDependency);
    const userEditForm = cloneDeep(userNameEditForm);
    let requiredFieldsError = false;
    userEditForm.forEach((item) => {
      // remove whitespaces or avoid white space entries
      if (editUserNameDependency[item.accessor]) {
        editUserNameDependency[item.accessor] = editUserNameDependency[
          item.accessor
        ]?.trim();
      }
      requiredFieldsError = item.error =
        item.required && !editUserNameDependency[item.accessor];
    });
    setUserNameDependency(editUserNameDependency);
    setUserNameEditForm(userEditForm);
    return !requiredFieldsError;
  };

  /**
   * @function
   * @description Call BE api to update user name after validation
   * @returns {Boolean} // returns only if data not valid
   */
  const updateUserName = async () => {
    setUserDetailsLoader(true);
    if (!isValidData()) {
      displaySnackMessages("Please enter a valid user name.", "error");
      setUserDetailsLoader(false);
      return;
    }
    try {
      let userDetails = [
        { email: props.editUserRoleMappingData.email, ...userNameDependency },
      ];
      const body = {
        users: userDetails,
      };
      const response = await props.saveNewUser(body);
      if (response?.status) {
        const userMappingData = {
          ...cloneDeep(props.editUserRoleMappingData),
          ...userNameDependency,
        };
        setIsEditable(false);
        setUserDetailsLoader(false);
        setUserNameDependency([]);
        props.setEditUserRoleMappingData(userMappingData);
        displaySnackMessages("User name edited succesfully", "success");
      }
    } catch (err) {
      setUserDetailsLoader(false);
      displaySnackMessages("User name already exists", "error");
    }
  };

  const Subheader = (props) => {
    const { badgeNumber, title } = props;
    return (
      <div className={classes.subheaderContainer}>
        <div className={classes.badgeContainer}>
          <Badge
            color="default"
            label={badgeNumber}
            onClick={() => {}}
            variant="filled"
          />
        </div>
        <p className={classes.subheaderTitle}>{title}</p>
      </div>
    );
  };

  useEffect(() => {
    props.submitRoleMappings.current = submitRoleMappings;
  }, [newUnmappedList, role, filterLoader, newMappedList]);

  return (
    <>
      {showNoDataFound ? (
        <NotFound />
      ) : (
        <div className={classes.assignUnassignRoleContainer}>
          <p className={classes.title}>Assign a role to user</p>
          <Loader loader={userDetailsLoader}>
            <div className={classes.filterContainer}>
              <div
                className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.verticalAlignCenter} ${classes.positionedStep}`}
              >
                <Subheader badgeNumber={1} title="Edit Username" />
                {Boolean(
                  !isEmpty(props.editUserRoleMappingData) &&
                    emailDependency[0]?.values.length
                ) && (
                  <>
                    {!isEditable && (
                      <Typography variant="h5">
                        {`(${props.editUserRoleMappingData.user_name})`}
                      </Typography>
                    )}
                    <Button
                      icon={<EditIcon />}
                      variant="url"
                      onClick={() => {
                        setUserNameDependency({
                          user_name: props.editUserRoleMappingData.user_name,
                        });
                        setIsEditable(true);
                      }}
                      disabled={isEditable}
                    />
                  </>
                )}
              </div>
              {isEditable ? (
                <>
                  <Form
                    layout={"vertical"}
                    maxFieldsInRow={4}
                    handleChange={(dependency) => {
                      setUserNameDependency(dependency);
                    }}
                    fields={userNameEditForm}
                    updateDefaultValue={false}
                    defaultValues={userNameDependency}
                  ></Form>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginTop}`}
                  >
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setUserNameDependency([]);
                        setIsEditable(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        updateUserName();
                      }}
                    >
                      Update
                    </Button>
                  </div>
                </>
              ) : (
                <FilterGroup
                  style={{ border: "none" }}
                  filters={emailFilterConfig}
                  customFilter={true}
                  inititalSelection={emailDependency}
                  update={(dependency) => {
                    setEmailDependency(dependency);
                  }}
                />
              )}
            </div>
            <div className={classes.filterContainer}>
              <Subheader
                badgeNumber={2}
                title="Edit assigned Application & Role"
              />
              <FilterGroup
                style={{ border: "none" }}
                filters={roleFilterConfig}
                customFilter={true}
                inititalSelection={roleDependency}
                update={updateRoleOnChange}
              />
            </div>
          </Loader>
          {!mapConvertToLowerCase([
            ...SUPER_USERS,
            ...props.clientSpecificSuperUsers,
          ]).includes(mapConvertToLowerCase(role)) && role ? (
            <div className={classes.filterContainer}>
              <div className={globalClasses.marginBottom}>
                <Subheader badgeNumber={3} title="Edit hierarchy of access" />
              </div>
              <Loader loader={filterLoader}>
                <FilterGroup
                  filters={filterConfig.filter(
                    (filter) => !filter?.is_display_hidden
                  )}
                  onFilter={fetchValuesBasedOnFilterApplied}
                  doNotUpdateDefaultValue={true}
                  onReset={resetFilterValuesSelected}
                  update={updateFilterValuesOnChange}
                />
                <Tabs
                  tabsData={tabs}
                  activeTab={activeTab}
                  handleChange={(tabVal) => {
                    setActiveTab(tabVal);
                    return true;
                  }}
                />
              </Loader>
            </div>
          ) : null}

          <Prompt
            isOpen={showPrompt}
            title="Cancel Changes"
            subHeading="Are you sure you want to cancel, all changes will be deleted."
            infoList={[]}
            primaryButtonProps={{
              children: common.__ConfirmBtnText,
              onClick: () => {
                setShowPrompt(false);
                resetData();
                navigate(userManagementRoutes.user);
              },
            }}
            tertiaryButtonProps={{
              children: common.__RejectBtnText,
              onClick: () => setShowPrompt(false),
            }}
            variant="warning"
          />
        </div>
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  const { tenantUserRoleMgmtReducer } = state;
  return {
    isEditMode: tenantUserRoleMgmtReducer.userRoleManagementReducer.isEditMode,
    editUserRoleMappingData:
      tenantUserRoleMgmtReducer.userRoleManagementReducer
        .editUserRoleMappingData,
    newUsersList:
      tenantUserRoleMgmtReducer.userRoleManagementReducer.newUsersList,
    clientSpecificSuperUsers:
      tenantUserRoleMgmtReducer.userRoleManagementReducer
        .client_specific_super_users,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getUserDetails: (body) => dispatch(getUserDetails(body)),
    getUserDetailsFormFilter: (body) =>
      dispatch(getUserDetailsFormFilter(body)),
    getTableHierarchyOnAssignRole: (body) =>
      dispatch(getTableHierarchyOnAssignRole(body)),
    getFilterConfiguration: () => dispatch(getFilterConfiguration()),
    getTableConfig: (body) => dispatch(getTableConfig(body)),
    setEditMode: (mode) => dispatch(setEditMode(mode)),
    setEditUserRoleMappingData: (user) =>
      dispatch(setEditUserRoleMappingData(user)),
    setNewUsersList: (users) => dispatch(setNewUsersList(users)),
    saveNewUser: (body) => dispatch(saveNewUser(body)),
    saveUserRoleMappings: (body) => dispatch(saveUserRoleMappings(body)),
    updateUserRoleMappings: (body) => dispatch(updateUserRoleMappings(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AssignUnAssignRole);
