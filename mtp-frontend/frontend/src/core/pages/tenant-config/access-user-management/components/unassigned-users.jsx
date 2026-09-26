import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Avatar, Button, Card, Prompt } from "impact-ui";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import DeleteIcon from "@mui/icons-material/Delete";
import { addSnack } from "core/actions/snackbarActions";
import { makeStyles } from "@mui/styles";
import { userManagementRoutes } from "config/routes";
import {
  setUnAssignedUserData,
  deleteUser,
} from "../services/TenantManagement/User-Management/user-management-service";
import {
  getUnmappedUserRoles,
  setEditMode,
  setNewUsersList,
} from "../services/TenantManagement/User-Role-Management/user-role-management-service";
import { cloneDeep } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles((theme) => ({
  card: {
    minWidth: "max(22rem, 24%)",
    flexBasis: "24%",
  },
  cardContainer: {
    flexWrap: "wrap",
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
  cardSpacing: {
    gap: 5,
  },
  cardDescription: {
    overflow: "hidden",
  },
  selectedCard: {
    "& .card": {
      boxShadow: "0px 0px 8px #0055AF",
    },
  },
  description: {
    textOverflow: "ellipsis",
  },
  avatar: {
    minWidth: "2.25rem",
  },
}));

const UnassignedUsers = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [usersList, setUsersList] = useState([]);
  const [checkedList, setCheckedList] = useState([]);
  const [showPromt, setShowPromt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnassignedUserData();

    return () => {
      props.setUnAssignedUserData([]);
      setUsersList([]);
    };
  }, []);

  useEffect(() => {
    const allUsersList = cloneDeep(props.listOfUnassignedUserData);
    const regEx = new RegExp(props.userNameDependency?.trim() || "", "gi");
    if (!props.userNameDependency?.trim().length) {
      setUsersList(allUsersList);
    } else {
      const filteredList = allUsersList.filter((user) =>
        user.user_name.match(regEx)
      );
      setUsersList(filteredList);
    }
  }, [props.userNameDependency, props.listOfUnassignedUserData]);

  const fetchUnassignedUserData = async () => {
    try {
      const usersData = await props.getUnmappedUserRoles();
      props.setUnAssignedUserData(usersData.data.data);
      setUsersList(usersData.data.data);
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
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

  /**
   * @function
   * @description
   * @param {Object} user
   */
  const assignUserRole = (user) => {
    // handle users
    props.setEditMode(true);
    props.setNewUsersList([user]);
    navigate(userManagementRoutes.role);
  };

  /**
   * @function
   * @description Handle delete users for unassigned users.
   */
  const handleDelete = async () => {
    try {
      const users = [];
      usersList.forEach((user) => {
        if (checkedList.includes(user.user_code)) {
          users.push({
            user_name: user.user_name,
            email: user.email,
          });
        }
      });
      const resp = await props.deleteUser({ users: users });
      if (resp.data.status) {
        displaySnackMessages(
          `User${checkedList.length > 1 ? "s" : ""} deleted successfully.`,
          "success"
        );
        fetchUnassignedUserData();
        setCheckedList([]);
        setShowPromt(false);
      }
    } catch (error) {
      displaySnackMessages("Something went wrong", "error");
    }
  };

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

  return (
    <>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd} ${globalClasses.marginBottom}`}
      >
        <Button
          icon={DeleteIcon}
          variant="primary"
          onClick={() => {
            setShowPromt(true);
          }}
          disabled={props.showLoader || !checkedList.length}
        />
      </div>
      <Loader loader={props.showLoader}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.cardContainer}`}
        >
          {usersList.map((user) => (
            <label
              className={`${
                checkedList.includes(user.user_code) ? classes.selectedCard : ""
              } ${classes.card}`}
              key={user.user_code}
            >
              <Card className={classes.cardSpacing}>
                <input
                  value={user.user_code}
                  type="checkbox"
                  onChange={(e) => handleChange(e)}
                  checked={checkedList.includes(user.user_code)}
                  className={classes.cardInput}
                />
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.gap}`}
                >
                  <Avatar
                    className={classes.avatar}
                    initials={user.user_name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => (Boolean(n) ? n[0].toUpperCase() : ""))}
                    size="small"
                  />
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${classes.cardDescription}`}
                  >
                    <h3 className={globalClasses.flexColumn}>
                      {user.user_name}
                    </h3>
                    <p
                      title={user.email}
                      className={`${globalClasses.marginBottom} ${classes.description}`}
                    >
                      {user.email}
                    </p>
                    <div>
                      <Button
                        variant="secondary"
                        onClick={() => assignUserRole(user)}
                      >
                        Assign a Role
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </label>
          ))}
        </div>
      </Loader>
      <Prompt
        isOpen={showPromt}
        title="Delete User"
        subHeading={`Are you sure you want to delete user${
          checkedList.length > 1 ? "s" : ""
        }?`}
        infoList={[]}
        primaryButtonProps={{
          children: "Yes",
          onClick: () => handleDelete(),
        }}
        tertiaryButtonProps={{
          children: "No",
          onClick: () => {
            setShowPromt(false);
          },
        }}
        variant="error"
      />
    </>
  );
};

const mapStateToProps = (store) => {
  const { tenantUserRoleMgmtReducer } = store;
  return {
    listOfUnassignedUserData:
      tenantUserRoleMgmtReducer.userManagementReducer.listOfUnassignedUserData,
    userNameDependency:
      tenantUserRoleMgmtReducer.userManagementReducer.userNameDependency,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    deleteUser: (users) => dispatch(deleteUser(users)),
    getUnmappedUserRoles: () => dispatch(getUnmappedUserRoles()),
    setEditMode: (mode) => dispatch(setEditMode(mode)),
    setNewUsersList: (users) => dispatch(setNewUsersList(users)),
    setUnAssignedUserData: (userList) =>
      dispatch(setUnAssignedUserData(userList)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(UnassignedUsers);
