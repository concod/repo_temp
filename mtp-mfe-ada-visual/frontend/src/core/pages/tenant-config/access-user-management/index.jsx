import { useState, useEffect, useCallback, useRef } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { getApplicationMaster } from "core/actions/tenantConfigActions";
import { Button, Breadcrumbs, Modal, Menu } from "impact-ui-v3";
import Tabs from "core/commonComponents/tabs";
import AddIcon from "assets/uam/addIcon.svg";
import DownloadIcon from "assets/downloadIcon.svg";
import {
  getRolesMappedToUserData,
  setNewUsersList,
  setEditMode,
} from "./services/TenantManagement/User-Role-Management/user-role-management-service";
import { userManagementRoutes } from "config/routes";
import globalStyles from "core/Styles/globalStyles";
import AssignedUsers from "./components/assigned-users";
import UnassignedUsers from "./components/unassigned-users";
import { makeStyles } from "@mui/styles";
import { addSnack } from "core/actions/snackbarActions";
import FilterGroup from "core/commonComponents/filters/filterGroup";
import { USER_EMAIL_FILTER } from "./components/constants";
import {
  downloadData,
  setUserTableDetails,
  setUserNameDependency,
} from "./services/TenantManagement/User-Management/user-management-service";
import NotFound from "core/commonComponents/notFound/NotFound";
import { debounce } from "lodash";
import { pxToRem } from "core/Utils/functions/utils";
import Search from "./components/search";
import { cloneDeep } from "lodash";

const useStyles = makeStyles((theme) => ({
  menu: {
    width: pxToRem(160),
    "& .menu-container": {
      zIndex: 999,
    },
    "& .ia-styles.ia-btn.ia-btn-contained": {
      width: "100%",
    },
  },
  modelContent: {
    "& .modal-content-container": {
      minHeight: "14rem",
    },
  },
  header: {
    // marginBottom: "16px",
    fontSize: pxToRem(14),
    fontFamily: "Manrope",
    fontWeight: 700,
    lineHeight: pxToRem(16.1),
  },
  tabMargin: {
    marginTop: pxToRem(32),
  },
  tabsStyle: {
    "& .impact-tab-panel": {
      padding: `${pxToRem(20)} ${pxToRem(0)} !important`,
    },
    "& .css-ur2jdm-MuiContainer-root": {
      padding: `${pxToRem(0)} !important`,
    },
    marginTop: pxToRem(32),
  },
  breadCrumbStyle: {
    "& .ia-styles.ia-breadcrumb.ia-breadcrumb-noLink": {
      fontWeight: 700,
    },
  },
  buttonStyle: {
    "&.ia-styles.ia-btn": {
      padding: pxToRem(8),
    },
  },
  uamLanding: {
    padding: `${pxToRem(12)} ${pxToRem(24)}`,
  },
  mt12: {
    marginTop: pxToRem(12),
  },
}));

const UserMangement = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [activeTab, setActiveTab] = useState(0);
  const [applicationList, setApplicationList] = useState([]);
  const [nameSearchVal, setNameSearchVal] = useState("");
  const [roleSearchVal, setRoleSearchVal] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [emailFilterConfig, setEmailFilterConfig] = useState([]);
  const [emailDependency, setEmailDependency] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [showNoDataFound, setShowNoDataFound] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const [openMenu, setOpenMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();
  let allPromises = [];

  const tabs = [
    {
      label: "Application Users",
      id: "assigned",
      TabPanel: (
        <AssignedUsers
          applications={applicationList}
          fetchUserDetails={() => fetchUserDetails()}
          showLoader={showLoader}
        />
      ),
    },
    {
      label: "Unassigned Users",
      id: "unassigned",
      TabPanel: <UnassignedUsers showLoader={showLoader} />,
    },
  ];

  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "User access management",
      to: "#",
    },
  ];

  /**
   * Escapes special characters in a string to be used in a regular expression
   * @param {string} string - The string to escape
   * @returns {string} The escaped string with special regex characters escaped
   */
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const search = useCallback(
    debounce(
      (
        searchKey,
        column_name,
        roleVal,
        nameVal,
        isUserNameRoleSearch = false
      ) => {
        const escapedSearchKey = searchKey ? escapeRegExp(searchKey) : "";
        const escapedRoleVal = roleVal ? escapeRegExp(roleVal) : "";
        const escapedNameVal = nameVal ? escapeRegExp(nameVal) : "";
        fetchUserDetails(
          escapedSearchKey,
          column_name,
          escapedRoleVal,
          escapedNameVal,
          isUserNameRoleSearch
        );
      },
      300
    ),
    []
  );

  useEffect(() => {
    fetchUserDetails();

    return () => {
      setApplicationList([]);
      props.setUserTableDetails([]);
      props.setUserNameDependency("");
    };
  }, []);

  useEffect(() => {
    const applications = [];
    props.listOfUserData.forEach((item) => {
      if (
        item.application_name != "Workflow Input Center" &&
        !applications.includes(item.application_name)
      ) {
        applications.push(item.application_name);
      }
    });
    setApplicationList(applications);
  }, [props.listOfUserData]);

  const fetchUserDetails = async (
    searchKey,
    column_name,
    roleVal,
    nameVal,
    isUserNameRoleSearch = false
  ) => {
    try {
      setShowLoader(true);
      const isUserName = column_name === "user_name";
      const isRoleName = column_name === "role_name";
      (isUserName || isRoleName) && props.setUserNameDependency(searchKey);
      const metaPayload = [
        {
          column: isUserName ? "role_name" : "user_name",
          pattern: isUserName ? roleVal : nameVal,
        },
      ];
      const hasExtraPram = isUserName
        ? Boolean(roleVal?.length)
        : Boolean(nameVal?.length);
      let postBody = {
        meta: {
          search: [
            ...(searchKey && column_name
              ? [
                  {
                    column: column_name,
                    pattern: searchKey,
                  },
                ]
              : []),
            ...(hasExtraPram ? metaPayload : []),
          ],
          sort: [{ column: "user_name", order: "asc" }],
        },
        filters: [],
      };
      let resp = {};
      if (isUserNameRoleSearch) {
        let rolePayload = [
          {
            column: "role_name",
            pattern: searchKey,
          },
        ];
        let userNamePayload = [
          {
            column: "user_name",
            pattern: searchKey,
          },
        ];
        let postRoleBody = cloneDeep(postBody);
        postRoleBody.meta.search = rolePayload;
        let postUserNameBody = cloneDeep(postBody);
        postUserNameBody.meta.search = userNamePayload;
        const [roleResp, userResp] = await Promise.all([
          props.getRolesMappedToUserData(postRoleBody),
          props.getRolesMappedToUserData(postUserNameBody),
        ]);
        const seenHierarchyIds = new Set();
        let respData = [...roleResp.data.data, ...userResp.data.data].filter(
          (item) => {
            const duplicate = seenHierarchyIds.has(item.hierarchy_id);
            seenHierarchyIds.add(item.hierarchy_id);
            return !duplicate;
          }
        );
        resp = {
          data: {
            data: respData,
          },
        };
      } else {
        resp = await props.getRolesMappedToUserData(postBody);
      }
      let responseData = resp.data.data;
      props.setUserTableDetails(responseData || []);
      const emailFilterElem = USER_EMAIL_FILTER.map((key) => {
        const userEmails = new Set(responseData.map((item) => item.email));
        const allUsers = Array.from(userEmails)
          .map((item) => {
            let user;
            responseData.forEach((data) => {
              if (item.includes(data.email)) {
                user = data;
                return false;
              }
            });
            return {
              value: user.user_code,
              label: user.email,
              id: user.user_code,
            };
          })
          .sort((a, b) =>
            a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 1
          );
        return {
          ...key,
          filter_keyword: key.column_name,
          is_mandatory: true,
          initialData: allUsers,
          is_multiple_selection: false,
        };
      });
      setEmailFilterConfig(emailFilterElem);
      setShowLoader(false);
    } catch (error) {
      if (error?.response?.status === 403) {
        setShowNoDataFound(true);
        setShowLoader(false);
      } else {
        props.addSnack({
          message: "Failed to fetch user details.",
          options: {
            variant: "error",
          },
        });
        setShowLoader(false);
      }
    }
  };

  const handleEditFlow = () => {
    const users = [];
    emailDependency.forEach((item) => {
      if (item.values.length) {
        let selectedUser;
        props.listOfUserData?.forEach((user) => {
          if (user.email.includes(item.values[0].label)) {
            selectedUser = user;
            return false;
          }
        });
        users.push({
          user_code: selectedUser.user_code,
          user_name: selectedUser.name,
          email: selectedUser.email,
        });
      } else {
        props.addSnack({
          message: "Please select a user",
          options: {
            variant: "error",
          },
        });
      }
    });
    props.setEditMode(true);
    props.setNewUsersList(users);
    navigate(userManagementRoutes.role);
  };

  /**
   * @function
   * @description Handle UAM download application data
   */
  const downloadData = async () => {
    try {
      setIsDownloading(true);
      let getApplicationMasterData = await props.getApplicationMaster()();
      const appCodes = getApplicationMasterData.data.data.map((app) => app?.application_code);
      const resp = await props.downloadData({ application_codes: appCodes });
      props.addSnack({
        message:
          resp?.data?.message || "Download request submitted successfully.",
        options: {
          variant: "success",
        },
      });
      setIsDownloading(false);
    } catch (error) {
      props.addSnack({
        message: error?.data?.message || "Something went wrong.",
        options: {
          variant: "error",
        },
      });
      setIsDownloading(false);
    }
  };

  const handleUserNameSearch = (event, isUserNameRoleSearch = false) => {
    try {
      setNameSearchVal(event.target.value);
      setSearchVal(event.target.value);
      search(
        event.target.value,
        "user_name",
        roleSearchVal,
        nameSearchVal,
        isUserNameRoleSearch
      );
    } catch (error) {
      console.error("handleUserNameSearch error: ", error);
    }
  };

  return (
    <>
      <div className={classes.uamLanding}>
        <div className={classes.breadCrumbStyle}>
          <Breadcrumbs list={paths} />
        </div>
        {showNoDataFound ? (
          <NotFound />
        ) : (
          <>
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${classes.mt12}`}
            >
              <p className={classes.header}>User access management</p>
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.gap}`}
              >
                <Button
                  variant="tertiary"
                  onClick={() => downloadData()}
                  disabled={isDownloading}
                  className={classes.buttonStyle}
                >
                  <DownloadIcon />
                </Button>
                {activeTab === 0 ? (
                  <Search
                    handleSearch={(event) => {
                      handleUserNameSearch(event, true);
                    }}
                    searchVal={searchVal}
                  />
                ) : (
                  <Search
                    handleSearch={(event) => {
                      handleUserNameSearch(event);
                    }}
                    searchVal={searchVal}
                  />
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    setNameSearchVal("");
                    setRoleSearchVal("");
                    setSearchVal("");
                    search("");
                  }}
                  disabled={!nameSearchVal.length && !roleSearchVal.length}
                >
                  Clear
                </Button>
                <div className={classes.menu}>
                  <Button
                    variant="primary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                  >
                    Add & Assign Role
                  </Button>
                    <Menu
                      anchorEl={anchorEl}
                      iconPlacement="left"
                    onClose={() => setAnchorEl(null)}
                    open={anchorEl}
                    options={[
                      {
                        icon: <AddIcon />,
                        label: "Add new user",
                        onClick: () => {
                          navigate(userManagementRoutes.role);
                          setAnchorEl(null);
                        },
                        value: "opt1",
                      },
                      {
                        icon: <AddIcon />,
                        label: "Add existing user",
                        onClick: () => {
                          setShowModal(true);
                          setAnchorEl(null);
                        },
                        value: "opt2",
                      },
                    ]}
                  />
                  </div>
              </div>
            </div>
            <div className={classes.tabsStyle}>
              <Tabs
                tabPannelStyle={{ padding: "0px" }}
                tabsData={tabs}
                activeTab={activeTab}
                handleChange={(tabVal) => {
                  setActiveTab(tabVal);
                  fetchUserDetails(searchVal);
                  return true;
                }}
              />
            </div>
          </>
        )}
      </div>
      <div className={classes.modelContent}>
        <Modal
          className="test-modal"
          open={showModal}
          onClose={() => setShowModal(false)}
          onPrimaryButtonClick={() => handleEditFlow()}
          onSecondaryButtonClick={() => setShowModal(false)}
          primaryButtonLabel="Edit"
          secondaryButtonLabel="Cancel"
          size="small"
          title="Select user"
        >
          <FilterGroup
            style={{ border: "none", width: "100%" }}
            filters={emailFilterConfig}
            customFilter={true}
            inititalSelection={emailDependency}
            update={(dependency) => {
              setEmailDependency(dependency);
            }}
            withPortal={true}
          />
        </Modal>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  const { tenantUserRoleMgmtReducer } = store;
  return {
    listOfUserData:
      tenantUserRoleMgmtReducer.userManagementReducer.listOfUserData,
    userNameDependency:
      tenantUserRoleMgmtReducer.userManagementReducer.userNameDependency,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getRolesMappedToUserData: (body) =>
      dispatch(getRolesMappedToUserData(body)),
    setUserTableDetails: (body) => dispatch(setUserTableDetails(body)),
    setUserNameDependency: (dependency) =>
      dispatch(setUserNameDependency(dependency)),
    setEditMode: (mode) => dispatch(setEditMode(mode)),
    setNewUsersList: (users) => dispatch(setNewUsersList(users)),
    downloadData: (appCodes) => downloadData(appCodes),
    getApplicationMaster,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(UserMangement);
