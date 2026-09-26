import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Button, Card, Avatar, Tooltip, Prompt, useTranslation } from "impact-ui-v3";
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
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";

const useStyles = makeStyles((theme) => ({
  card: {
    maxWidth: pxToRem(181),
    borderRadius: pxToRem(8),
    background: colours.white,
    cursor: "pointer",
    "& .MuiCard-root": {
      minHeight: pxToRem(112),
      height: pxToRem(112),
      padding: pxToRem(10),
      boxShadow: "none",
    },
    boxShadow: `0px 0px 4px 0px rgba(0, 0, 0, 0.12)`,
    width: "100%",
    "&.selected": {
      "& .MuiCard-root": {
        boxShadow: `0px 0px 4px 0px rgba(0, 0, 0, 0.12)`,
        border: `${pxToRem(1)} solid ${colours.brightRoyalBlue}`,
      },
    },
    // "&.selected": {
    //   boxShadow: `0px 0px 4px 0px rgba(0, 0, 0, 0.12)`,
    //   border: `${pxToRem(1)} solid ${colours.brightRoyalBlue}`,
    // },
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
  g12: {
    gap: pxToRem(12),
  },
  cardDescription: {
    overflow: "hidden",
  },
  cardUserName: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    fontFamily: "Manrope",
    fontSize: pxToRem(16),
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: pxToRem(30),
  },
  selectedCard: {
    "& .card": {
      boxShadow: `0px 0px 4px 0px rgba(0, 0, 0, 0.12)`,
      border: `${pxToRem(1)} solid ${colours.brightRoyalBlue}`,
    },
  },
  description: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    color: colours.darkGrey,
    fontFamily: "Manrope",
    fontSize: pxToRem(14),
    fontStyle: "normal",
    fontWeight: 500,
  },
  avatar: {
    minWidth: "2.25rem",
  },
  mt9: {
    marginTop: pxToRem(9),
  },
  buttonStyle: {
    "&.ia-styles.ia-btn": {
      width: "100%",
      maxWidth: pxToRem(123),
      minWidth: pxToRem(56),
    },
  },
}));

const UnassignedUsers = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { t } = useTranslation();
  const [showLoader, setShowLoader] = useState(false);
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
      setShowLoader(true);
      const usersData = await props.getUnmappedUserRoles();
      props.setUnAssignedUserData(usersData.data.data);
      setUsersList(usersData.data.data);
      setShowLoader(false);
    } catch (err) {
      displaySnackMessages(t("snackbarMessages.somethingWentWrong"), "error");
      setShowLoader(false);
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
      setShowPromt(false);
      setShowLoader(true);
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
          checkedList.length > 1 ? t("snackbarMessages.usersDeletedSuccessfully") : t("snackbarMessages.userDeletedSuccessfully"),
          "success"
        );
        fetchUnassignedUserData();
        setCheckedList([]);
        setShowLoader(false);
      }
    } catch (error) {
      displaySnackMessages(t("snackbarMessages.somethingWentWrong"), "error");
      setShowLoader(false);
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
        {/* <Button
          icon={DeleteIcon}
          variant="primary"
          onClick={() => {
            setShowPromt(true);
          }}
          disabled={props.showLoader || !checkedList.length}
        /> */}
        {checkedList.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setShowPromt(true)}
            disabled={showLoader || !checkedList.length}
          >
            <DeleteIcon />
          </Button>
        )}
      </div>
      <Loader loader={showLoader}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.cardContainer}`}
        >
          {usersList.map((user) => (
            <label
              className={`${
                checkedList.includes(user.user_code) ? "selected" : ""
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
                <div className={`${globalClasses.flexRow} ${classes.g12}`}>
                  <Avatar
                    // className={classes.avatar}
                    label={user.user_name}
                    size="small"
                  />
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${classes.cardDescription}`}
                  >
                    <Tooltip
                      title={user.user_name}
                      orientation="top"
                      variant="tertiary"
                    >
                      <p
                        className={`${globalClasses.flexColumn} ${classes.cardUserName}`}
                      >
                        {user.user_name}
                      </p>
                    </Tooltip>
                    <Tooltip
                      title={user.email}
                      orientation="top"
                      variant="tertiary"
                    >
                      <p title={user.email} className={classes.description}>
                        {user.email}
                      </p>
                    </Tooltip>
                    {/* 
                    <p title={user.email} className={classes.description}>
                      {user.email}
                    </p> */}
                    {/* <div>
                      <Button
                        variant="secondary"
                        onClick={() => assignUserRole(user)}
                        className={classes.buttonStyle}
                      >
                        Assign a Role
                      </Button>
                    </div> */}
                  </div>
                </div>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${classes.mt9}`}
                >
                  <Button
                    variant="tertiary"
                    onClick={() => assignUserRole(user)}
                    className={classes.buttonStyle}
                  >
                    {t("uam.unassigned.assignRole")}
                  </Button>
                </div>
              </Card>
            </label>
          ))}
        </div>
      </Loader>
      <Prompt
        isOpen={showPromt}
        title={t("uam.unassigned.deletePrompt.title")}
        primaryButtonLabel={t("uam.unassigned.deletePrompt.yes")}
        onPrimaryButtonClick={() => handleDelete()}
        secondaryButtonLabel={t("uam.unassigned.deletePrompt.no")}
        onSecondaryButtonClick={() => setShowPromt(false)}
        handleClose={() => setShowPromt(false)}
        variant="error"
      >
        <p>{t("uam.unassigned.deletePrompt.message")}</p>
      </Prompt>
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
