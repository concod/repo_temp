import React, { useState, useEffect, useRef } from "react";
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
import { cloneDeep, isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { Button, Prompt, Switch, Tabs } from "impact-ui";
import { mapConvertToLowerCase } from "core/Utils/formatter";
import { useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles((theme) => ({
  filterContainer: {
    paddingBlock: 20,
    borderBottom: "1px solid #DEDEDE",
  },
  positionedStep: {
    position: "relative",
    zIndex: 1,
  },
}));

export const AssignUnAssignRole = (props) => {
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
  const [isLoaderEnabled, setIsLoaderEnabled] = useState(false);
  const [userNameEditForm, setUserNameEditForm] = useState([]);
  const [currentTableData, setCurrentTableData] = useState([]);
  const [roleFilterConfig, setRoleFilterConfig] = useState([]);
  const [preSelectedRoles, setPreSelectedRoles] = useState([]);
  const [newUnmappedList, setNewUnmappedList] = useState([]);
  const [emailDependency, setEmailDependency] = useState([]);
  const [roleDependency, setRoleDependency] = useState([]);
  const [filterLoader, setFilterLoader] = useState(false);
  const [newMappedList, setNewMappedList] = useState([]);
  const [filterConfig, setFilterConfig] = useState([]);
  const [isEditable, setIsEditable] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [role, setRole] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const globalClasses = globalStyles();
  const tableInstance = useRef();
  const mappedTableInstance = useRef();
  const navigate = useNavigate();
  const classes = useStyles();

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const mappedLoadTableInstance = (params) => {
    mappedTableInstance.current = params;
  };

  useEffect(() => {
    setFilterLoader(true);
    setUserNameEditForm(cloneDeep(USER_NAME_FORM));
    fetchUserList();
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
      !mapConvertToLowerCase([
        ...SUPER_USERS,
        ...props.clientSpecificSuperUsers,
      ]).includes(mapConvertToLowerCase(role))
    ) {
      getFilterValues();
    }
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
      const resp = await getFilterConfiguration()();
      setFilterConfig(resp.data.data);
      const editUserRole = !isEmpty(props.editUserRoleMappingData);
      updateEmailFilterConfig(editUserRole);
      updateRoleFilterConfig(editUserRole);
      let configColumns = await getTableConfig()();
      let formattedColumns = agGridColumnFormatter(configColumns.data?.data);
      setUserFilterTableColumns(
        formattedColumns.filter((col) => !col?.is_hidden)
      );
      setFilterLoader(false);
      setUserDetailsLoader(false);
    } catch (err) {
      setUserDetailsLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

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
          []
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
        const newEmailDependency = [
          constructDependencyObject(key, selectedValues),
        ];
        setEmailDependency(newEmailDependency);
        return {
          ...key,
          filter_keyword: key.column_name,
          is_mandatory: true,
          initialData: selectedValues,
          is_multiple_selection: selectedValues.length > 1,
        };
      } catch (error) {
        if (error.response.status === 403) {
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
    setRoleDependency(dependency);
    if (filter.filter_id === "role_name") {
      dependency.forEach((item) => {
        if (item.filter_id === "role_name" && item.values.length) {
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
              (obj) => obj.attribute_name !== "user_email"
            ),
          };
          const options = await props.getUserDetailsFormFilter(body);
          key.is_disabled =
            key.column_name === "application_name" &&
            !isEmpty(props.editUserRoleMappingData);
          key.initialData = options.data.data
            .filter((item) => {
              return ["Notification", "Master Data View"].every(
                (key) => key !== item.attribute
              );
            })
            .map((opt) => {
              return {
                value: opt.attribute,
                label: opt.attribute,
                id: opt.attribute,
              };
            });
          return key;
        });
        await Promise.all(filterElements);
        setRoleFilterConfig(initialFilterElements);
      }
    } catch (err) {
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
    setIsLoaderEnabled(true);
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
          )
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
      setIsLoaderEnabled(false);
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      setFilterLoader(false);
      setIsLoaderEnabled(false);
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
      let response = await getFilterConfiguration()();
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
    setIsLoaderEnabled(true);
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
          filters: updateFilterDimension(
            dependency,
            initialFilterElements,
            false,
            true
          ),
        };
        let response = await getTableHierarchyOnAssignRole(body)();
        const editUserRole = !isEmpty(props.editUserRoleMappingData);
        if (editUserRole) {
          const mappedTableIds = [];
          const heirarchyIds =
            props.editUserRoleMappingData.access_hierarchy.map(
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
        setIsLoaderEnabled(false);
      } catch (err) {
        displaySnackMessages("Something went wrong", "error");
        setIsLoaderEnabled(false);
        setFilterLoader(false);
      }
    }
  };

  /**
   * @function
   * @description Update hierarchy table selection changes
   * @param {Object} event
   */
  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows().map((item) => item.id);
    setPreSelectedRoles(selections);
  };

  /**
   * @function
   * @description Update current mapped roles table selection changes
   * @param {Object} event
   */
  const onMappedSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows().map((item) => item.id);
    setMappedSelectedRoles(selections);
  };

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
          heirarchyData = heirarchyData.length
            ? heirarchyData
            : props.editUserRoleMappingData?.access_hierarchy || [];
          let filtersPayload =
            configureSelectedFiltersIntoPayload(heirarchyData);
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
      label: "Current Department Mapping",
      value: "current-mapping",
      element: (
        <>
          <div
            className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginBottom}`}
          >
            {Boolean(mappedSelectedRoles.length) && (
              <Button
                variant="primary"
                icon={DeleteIcon}
                onClick={() => deleteMappings()}
                disabled={isLoaderEnabled}
              />
            )}
          </div>
          <Loader loader={isLoaderEnabled} spinner>
            <AgGridComponent
              rowdata={userMappedTableData}
              columns={userFilterTableColumn}
              selectAllHeaderComponent={true}
              onSelectionChanged={onMappedSelectionChanged}
              uniqueRowId={"id"}
              rowSelection={"multiple"}
              selectedRows={mappedSelectedRoles}
              loadTableInstance={mappedLoadTableInstance}
              sizeColumnsToFitFlag
            />
          </Loader>
        </>
      ),
    },
    {
      label: "Access hierarchy list",
      value: "hierarchy",
      element: (
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
              id="hierarchy-view-switch"
              checked={showAll}
              onChange={() => setShowAll(!showAll)}
              leftLabel="Show All"
              rightLabel="Show Unmapped"
              disabled={isLoaderEnabled}
            />
          </div>
          <Loader loader={isLoaderEnabled} spinner>
            <AgGridComponent
              rowdata={userFilterTableData}
              columns={userFilterTableColumn}
              selectAllHeaderComponent={true}
              onSelectionChanged={onSelectionChanged}
              uniqueRowId={"id"}
              rowSelection={"multiple"}
              selectedRows={preSelectedRoles}
              sizeColumnsToFitFlag
              loadTableInstance={loadTableInstance}
              getRowStyle={(params) => {
                if (params?.data?.checkbox_disabled) {
                  return { pointerEvents: "none", background: "#FFF9EB" };
                }
              }}
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
        editUserNameDependency[item.accessor] =
          editUserNameDependency[item.accessor]?.trim();
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
      if (response.status) {
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
      displaySnackMessages("Something went wrong", "error");
    }
  };

  return (
    <>
      <div className={classes.filterContainer}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.verticalAlignCenter} ${classes.positionedStep}`}
        >
          <Typography variant="h5">STEP 1 : Edit Username</Typography>
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
                icon={EditIcon}
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
        <Loader loader={userDetailsLoader}>
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
        </Loader>
      </div>
      <div className={classes.filterContainer}>
        <Typography variant="h5">
          STEP 2 : Edit assigned Application & Role
        </Typography>
        <Loader loader={userDetailsLoader}>
          <FilterGroup
            style={{ border: "none" }}
            filters={roleFilterConfig}
            customFilter={true}
            inititalSelection={roleDependency}
            update={updateRoleOnChange}
          />
        </Loader>
      </div>
      {!mapConvertToLowerCase([
        ...SUPER_USERS,
        ...props.clientSpecificSuperUsers,
      ]).includes(mapConvertToLowerCase(role)) && role ? (
        <div className={classes.filterContainer}>
          <div className={globalClasses.marginBottom}>
            <Typography variant="h5">
              STEP 3 : Edit hierarchy of access
            </Typography>
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
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabVal) => setActiveTab(tabVal)}
            />
          </Loader>
        </div>
      ) : null}
      <div
        className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginTop}`}
      >
        <Button
          variant="secondary"
          onClick={handleRedirection}
          disabled={filterLoader}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            submitRoleMappings();
          }}
          disabled={
            !(
              Boolean(newUnmappedList.length) ||
              Boolean(newMappedList.length) ||
              role
            ) || filterLoader
          }
        >
          Save Changes
        </Button>
      </div>
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
