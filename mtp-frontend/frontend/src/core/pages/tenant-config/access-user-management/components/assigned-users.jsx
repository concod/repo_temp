import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  Accordion,
  Avatar,
  Card,
  Tooltip,
  Badge,
  Button,
  Modal,
} from "impact-ui";
import AccessibleHierarchyModal from "./accessible-hierarchy-modal";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { addSnack } from "core/actions/snackbarActions";
import {
  deleteRole,
  deleteUser,
  getUserDetails,
  setUserMgmtLoader,
  setUserTableDetails,
  setUnAssignedUserData,
} from "../services/TenantManagement/User-Management/user-management-service";
import {
  setEditMode,
  getTableConfig,
  getUnmappedUserRoles,
  getAccessHierachyData,
  setEditUserRoleMappingData,
} from "../services/TenantManagement/User-Role-Management/user-role-management-service";
import { userManagementRoutes } from "config/routes";
import { getInputNoun } from "core/Utils/formatter";
import { Divider } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles((theme) => ({
  card: {
    minWidth: "max(30rem, 32%)",
  },
  cardContainer: {
    flexWrap: "wrap",
  },
  cardSpacing: {
    gap: 5,
  },
  cardInput: {
    position: "absolute",
    display: "block",
    outline: "none",
    border: "none",
    background: "none",
    padding: 0,
    margin: 0,
    "-webkit-appearance": "none",
  },
  cardDesc: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  descDivider: {
    width: 1,
    height: 26,
    background: "#DEDEDE", // used temporarily as we don't have new colour's defined
  },
  selectedCard: {
    "& .card": {
      boxShadow: "0px 0px 8px #0055AF",
    },
  },
}));

const AssignedUsers = (props) => {
  const { applications, showLoader } = { ...props };
  const [activeAccordion, setActiveAccordion] = useState("");
  const [usersList, setUsersList] = useState([]);
  const globalClasses = globalStyles();

  useEffect(() => {
    const newList = props.listOfUserData.filter(
      (users) => users.application_name === activeAccordion
    );
    setUsersList(newList);
  }, [activeAccordion, props.listOfUserData]);

  /**
   * @function
   * @description set activeAccordion value onChange of accordion expansion
   * @param {String} label
   */
  const handleAccordion = (label) => {
    if (activeAccordion === label) {
      // set active accordion to "", as when clicked on an expanded accordion
      // an accordion is active when the activeAccordion holds same value as the as the accordion title
      // when not same it is collapsed, by this we can open only one accordion at a time.
      setActiveAccordion("");
    } else {
      setActiveAccordion(label);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const fetchUnassignedUserData = async () => {
    try {
      const usersData = await props.getUnmappedUserRoles();
      props.setUnAssignedUserData(usersData.data.data);
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
    }
  };

  return (
    <Loader loader={showLoader}>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.flexColumn}`}
      >
        {applications.map((appName) => {
          return (
            <Accordion
              label={appName}
              onChange={() => handleAccordion(appName)}
              isExpanded={activeAccordion === appName}
              key={appName}
            >
              <UserCards
                applications={applications}
                appName={appName}
                allUsers={usersList}
                listOfUserData={props.listOfUserData}
                displaySnackMessages={displaySnackMessages}
                deleteUser={props.deleteUser}
                deleteRole={props.deleteRole}
                setUserTableDetails={props.setUserTableDetails}
                getTableConfig={props.getTableConfig}
                setEditMode={props.setEditMode}
                setEditUserRoleMappingData={props.setEditUserRoleMappingData}
                fetchUnassignedUserData={fetchUnassignedUserData}
                fetchUserDetails={() => props.fetchUserDetails()}
              />
            </Accordion>
          );
        })}
      </div>
    </Loader>
  );
};

const UserCards = (props) => {
  const {
    applications,
    appName,
    allUsers,
    listOfUserData = [],
    displaySnackMessages,
    deleteUser,
    deleteRole,
    getTableConfig,
    setEditMode,
    fetchUserDetails,
    fetchUnassignedUserData,
    setEditUserRoleMappingData,
  } = { ...props };
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [showLoader, setShowLoader] = useState(false);
  const [allUsersData, setAllUsersData] = useState([]);
  const [checkedList, setCheckedList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [hierarchyIdInView, setHierarchyIdInView] = useState(null);
  const [showAccessibleDept, setShowAccessibleDept] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAllUsersData(allUsers);
  }, [allUsers]);

  /**
   * @function
   * @desc Update selected card list
   * @param {Object} event
   */
  const handleChange = (event) => {
    var updatedList = [...checkedList];
    const value = Number(event.target.value);
    if (updatedList.includes(value)) {
      updatedList.splice(checkedList.indexOf(value), 1);
    } else {
      updatedList = [...checkedList, value];
    }
    setCheckedList(updatedList);
  };

  /**
   * @function
   * @description Update checked list will all the user code
   */
  const handleSelectAll = () => {
    const updatedList = [...checkedList];
    allUsersData.forEach((data) => {
      if (!checkedList.includes(data.hierarchy_id)) {
        updatedList.push(data.hierarchy_id);
      }
    });
    setCheckedList(updatedList);
  };

  /**
   * @function
   * @desc Handle deletion of users/ roles
   */
  const handleConfirmBox = async (isDeleteUser) => {
    setShowLoader(true);
    try {
      if (isDeleteUser) {
        const deleteUsersList = {
          users: allUsersData.filter((data) =>
            checkedList.includes(data.hierarchy_id)
          ),
        };
        await deleteUser(deleteUsersList);
        const userString = getInputNoun("User", deleteUsersList.users.length);
        renderUserData(
          `${userString}${" "}${"deleted successfully"}`,
          "success"
        );
      } else {
        const promises = await checkedList.map((data) => {
          return deleteRole(data);
        });
        await Promise.all(promises).then((data) => {
          const rolesString = getInputNoun("Roles", promises.length);
          renderUserData(`${rolesString} deleted successfully`, "success");
        });
      }
    } catch (err) {
      setShowModal(false);
      setShowLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  /**
   * @function
   * @description Update local states and props after users deletion
   * @param {String} msg
   * @param {String} type
   */
  const renderUserData = async (msg, type) => {
    displaySnackMessages(msg, type);
    setShowModal(false);
    setShowLoader(false);
    setCheckedList([]);
    fetchUserDetails();
    fetchUnassignedUserData();
  };

  /**
   * @function
   * @description Handle edit role for exiting assigned user
   */
  const handleEdit = async () => {
    try {
      setShowLoader(true);
      const userToEdit = allUsersData.filter(
        (userData) => userData.hierarchy_id === checkedList[0]
      );
      if (userToEdit.length === 1) {
        if (userToEdit[0].hierarchy_present) {
          let resp = await getAccessHierachyData(userToEdit[0].hierarchy_id);
          userToEdit[0] = {
            ...userToEdit[0],
            access_hierarchy: resp.data.data,
          };
        } else {
          userToEdit[0] = {
            ...userToEdit[0],
            access_hierarchy: [],
          };
        }
        setEditMode(true);
        setEditUserRoleMappingData(userToEdit[0]);
        navigate(userManagementRoutes.role);
      }
      setShowLoader(false);
    } catch (error) {
      console.error(error);
      setShowLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  /**
   * @function
   * @description Render cards and add eventHandlers to every userData card
   * @param {Array} userData
   * @param {Array} selectedList
   * @returns {Node}
   */
  const renderCard = (userData, selectedList) => {
    const roles = [];
    const applicationsList = [];

    listOfUserData.forEach((data) => {
      if (userData.user_code === data.user_code) {
        if (
          !roles.includes(data.role_name) &&
          userData.role_name !== data.role_name
        ) {
          roles.push(data.role_name);
        }
        if (
          !applicationsList.includes(data.application_name) &&
          appName !== data.application_name &&
          applications.includes(data.application_name)
        ) {
          applicationsList.push(data.application_name);
        }
      }
    });

    /**
     * @function
     * @param {Object} _userData
     */
    const handleViewMapping = (_userData) => {
      setHierarchyIdInView(userData.hierarchy_id); // Current Heirarchy selected
      setShowAccessibleDept(true);
    };

    return (
      <label
        className={`${
          selectedList.includes(userData.hierarchy_id)
            ? classes.selectedCard
            : ""
        } ${classes.card}`}
        key={userData.hierarchy_id}
      >
        <Card className={classes.cardSpacing}>
          <input
            value={userData.hierarchy_id}
            type="checkbox"
            name={appName.replace(" ")}
            onChange={(e) => handleChange(e)}
            checked={selectedList.includes(userData.hierarchy_id)}
            className={classes.cardInput}
          />
          <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
            <Avatar
              initials={userData.user_name
                .split(" ")
                .slice(0, 2)
                .map((n) => (Boolean(n) ? n[0].toUpperCase() : ""))}
              size="small"
            />
            <div
              className={`${globalClasses.flexRow} ${globalClasses.flexColumn}`}
            >
              <h3 className={globalClasses.flexColumn}>{userData.user_name}</h3>
              <p className={`${globalClasses.marginBottom}`}>
                {userData.email}
              </p>
              <div
                className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.cardDesc}`}
              >
                <div
                  className={`${globalClasses.flexRow} ${classes.cardSpacing} ${globalClasses.flexColumn}`}
                >
                  <span>Roles Assigned</span>
                  <div
                    className={`${globalClasses.flexRow} ${classes.cardSpacing}`}
                  >
                    <Badge
                      label={userData.role_name}
                      variant="warning"
                      secondary
                    />
                    {roles.length ? (
                      <Tooltip text={roles.join(", ")} placement="top">
                        <Badge
                          label={`+${roles.length}`}
                          variant="info"
                          secondary
                        />
                      </Tooltip>
                    ) : null}
                  </div>
                </div>
                <div className={classes.descDivider}></div>
                <div
                  className={`${globalClasses.flexRow} ${classes.cardSpacing} ${globalClasses.flexColumn}`}
                >
                  <span>Accessible Apps</span>
                  <div
                    className={`${globalClasses.flexRow} ${classes.cardSpacing}`}
                  >
                    <Badge label={appName} variant="success" secondary />
                    {applicationsList.length ? (
                      <Tooltip
                        text={applicationsList.join(", ")}
                        placement="top"
                      >
                        <Badge
                          label={`+${applicationsList.length}`}
                          variant="info"
                          secondary
                        />
                      </Tooltip>
                    ) : null}
                  </div>
                </div>
              </div>
              <div>
                <Button
                  variant="secondary"
                  disabled={!Boolean(userData.hierarchy_present)}
                  onClick={() => handleViewMapping(userData)}
                >
                  View Department Mapping
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </label>
    );
  };

  return (
    <>
      <div
        className={`${globalClasses.verticalAlignCenter} ${globalClasses.layoutAlignEnd} ${globalClasses.marginBottom} ${globalClasses.gap}`}
      >
        {checkedList.length != allUsersData.length ? (
          <Button variant="url" onClick={handleSelectAll} disabled={showLoader}>
            Select All Users
          </Button>
        ) : (
          <Button
            variant="url"
            onClick={() => setCheckedList([])}
            disabled={showLoader}
          >
            Deselect All Users
          </Button>
        )}
        <Divider sx={{ height: 28 }} orientation="vertical" />
        {checkedList.length ? (
          <Button
            icon={DeleteIcon}
            variant="primary"
            onClick={() => {
              setShowModal(true);
            }}
            disabled={showLoader}
          />
        ) : null}
        {checkedList.length === 1 ? (
          <Button
            icon={EditIcon}
            variant="primary"
            onClick={() => handleEdit()}
            disabled={showLoader}
          />
        ) : null}
      </div>
      <Loader loader={showLoader}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.cardContainer}`}
        >
          {allUsersData.map((userData) => renderCard(userData, checkedList))}
        </div>
      </Loader>
      <Modal
        size="small"
        heading="Delete Users/Roles"
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        primaryButtonProps={{
          children: "Delete Roles",
          onClick: () => handleConfirmBox(),
        }}
        tertiaryButtonProps={{
          children: "Delete Users",
          variant: "primary",
          onClick: () => handleConfirmBox(true),
        }}
      >
        Do you want to delete selected roles or users?
      </Modal>
      {showAccessibleDept && (
        <AccessibleHierarchyModal
          closeModal={() => {
            setShowAccessibleDept(false);
            setHierarchyIdInView(null);
          }}
          hierarchyId={hierarchyIdInView}
          getTableConfig={getTableConfig}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { tenantUserRoleMgmtReducer } = store;
  return {
    listOfUserData:
      tenantUserRoleMgmtReducer.userManagementReducer.listOfUserData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setUserMgmtLoader: (body) => dispatch(setUserMgmtLoader(body)),
    setUserTableDetails: (body) => dispatch(setUserTableDetails(body)),
    deleteRole: (body, id) => deleteRole(body, id),
    deleteUser: (body) => dispatch(deleteUser(body)),
    getUserDetails: (body) => dispatch(getUserDetails(body)),
    getTableConfig: (body) => dispatch(getTableConfig(body)),
    setEditMode: (mode) => dispatch(setEditMode(mode)),
    setUnAssignedUserData: (userList) =>
      dispatch(setUnAssignedUserData(userList)),
    getUnmappedUserRoles: () => dispatch(getUnmappedUserRoles()),
    setEditUserRoleMappingData: (user) =>
      dispatch(setEditUserRoleMappingData(user)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AssignedUsers);
