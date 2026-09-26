import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import { Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getApplicationMaster } from "core/actions/tenantConfigActions";
import { userManagementRoutes } from "config/routes";
import FilterGroup from "core/commonComponents/filters/filterGroup";
import {
  Breadcrumbs,
  Button,
  Input,
  Menu,
  MenuItem,
  Modal,
  Tabs,
} from "impact-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import AssignedUsers from "./components/assigned-users";
import { USER_EMAIL_FILTER } from "./components/constants";
import UnassignedUsers from "./components/unassigned-users";
import {
  downloadData,
  setUserNameDependency,
  setUserTableDetails,
} from "./services/TenantManagement/User-Management/user-management-service";
import {
  getRolesMappedToUserData,
  setEditMode,
  setNewUsersList,
} from "./services/TenantManagement/User-Role-Management/user-role-management-service";
import { debounce } from "lodash";
import NotFound from "core/commonComponents/notFound/NotFound";

const useStyles = makeStyles(() => ({
  menu: {
    "& .menu-container": {
      zIndex: 999,
    },
  },
  modelContent: {
    "& .modal-content-container": {
      minHeight: "14rem",
    },
  },
}));

const UserMangement = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [activeTab, setActiveTab] = useState("assigned");
  const [applicationList, setApplicationList] = useState([]);
  const [nameSearchVal, setNameSearchVal] = useState("");
  const [roleSearchVal, setRoleSearchVal] = useState("");
  const [emailFilterConfig, setEmailFilterConfig] = useState([]);
  const [emailDependency, setEmailDependency] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showNoDataFound, setShowNoDataFound] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();
  let allPromises = [];
  const tabs = [
    {
      label: "Application Users",
      value: "assigned",
      element: (
        <AssignedUsers
          applications={applicationList}
          fetchUserDetails={() => fetchUserDetails()}
          showLoader={showLoader}
        />
      ),
    },
    {
      label: "Unassigned Users",
      value: "unassigned",
      element: <UnassignedUsers showLoader={showLoader} />,
    },
  ];

  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "User Access Management",
      to: "#",
    },
  ];

  const search = useCallback(
    debounce((searchKey, column_name, roleVal, nameVal) => {
      fetchUserDetails(searchKey, column_name, roleVal, nameVal);
    }, 300),
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

  const fetchUserDetails = async (searchKey, column_name, roleVal, nameVal) => {
    try {
      setShowLoader(true);
      const isUserName = column_name === "user_name";
      isUserName && props.setUserNameDependency(searchKey);
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
      let resp = await props.getRolesMappedToUserData(postBody);
      let responseData = resp.data.data;
      props.setUserTableDetails(responseData || []);
      const emailFilterElem = USER_EMAIL_FILTER.map((key) => {
        const userEmails = new Set(
          responseData.map((item) => item.email)
        );
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
      if (error.response.status === 403) {
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
      const applicationLists = [
        "inventorysmart",
        "application access management",
        "plansmart",
        "ada",
      ];
      const appCodes = getApplicationMasterData.data.data
        .filter((app) => {
          return applicationLists.includes(app.name.toLowerCase());
        })
        .map((app) => app.application_code);
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

  return (
    <>
      <div className={globalClasses.paddingHorizontal}>
        <div className={globalClasses.marginVertical1rem}>
          <Breadcrumbs paths={paths} />
        </div>
        {showNoDataFound ? (
          <NotFound />
        ) : (
          <>
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
            >
              <Typography variant="h3">User Access Management</Typography>
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.gap}`}
              >
                <Button
                  variant="primary"
                  onClick={() => downloadData()}
                  icon={DownloadIcon}
                  disabled={isDownloading}
                />
                <Input
                  placeholder="Search User Name"
                  helperText="Enter a valid user name"
                  onChange={(event) => {
                    setNameSearchVal(event.target.value);
                    search(
                      event.target.value,
                      "user_name",
                      roleSearchVal,
                      nameSearchVal
                    );
                  }}
                  value={nameSearchVal}
                />
                {activeTab === "assigned" ? (
                  <Input
                    placeholder="Search User Role"
                    helperText="Enter a valid user role name"
                    onChange={(event) => {
                      setRoleSearchVal(event.target.value);
                      search(
                        event.target.value,
                        "role_name",
                        roleSearchVal,
                        nameSearchVal
                      );
                    }}
                    value={roleSearchVal}
                  />
                ) : null}
                <Button
                  variant="primary"
                  onClick={() => {
                    setNameSearchVal("");
                    setRoleSearchVal("");
                    search("");
                  }}
                  disabled={!nameSearchVal.length && !roleSearchVal.length}
                >
                  Clear
                </Button>
                <div className={classes.menu}>
                  <Menu
                    anchorRef={menuRef}
                    anchorElement={
                      <Button variant="primary" ref={menuRef}>
                        Add & Assign Role
                      </Button>
                    }
                  >
                    <MenuItem
                      icon={<AddIcon />}
                      label="Add New User"
                      onClick={() => {
                        navigate(userManagementRoutes.role);
                      }}
                    />
                    <MenuItem
                      icon={<AddIcon />}
                      label="Add Existing User"
                      onClick={() => setShowModal(true)}
                    />
                  </Menu>
                </div>
              </div>
            </div>
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabVal) => {
                setActiveTab(tabVal);
              }}
            />
          </>
        )}
      </div>
      {showModal && (
        <div className={classes.modelContent}>
          <Modal
            size="large"
            heading="Select User"
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            primaryButtonProps={{
              children: "Edit",
              onClick: () => handleEditFlow(),
            }}
            tertiaryButtonProps={{
              children: "Cancel",
              onClick: () => setShowModal(false),
            }}
          >
            <FilterGroup
              style={{ border: "none", width: "100%" }}
              filters={emailFilterConfig}
              customFilter={true}
              inititalSelection={emailDependency}
              update={(dependency) => {
                setEmailDependency(dependency);
              }}
            />
          </Modal>
        </div>
      )}
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
