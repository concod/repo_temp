import { useState, useEffect, useRef, useMemo } from "react";
import { connect } from "react-redux";
import { Button, Avatar, Card, Badge, Tooltip, Prompt } from "impact-ui-v3";
import AccessibleHierarchyModal from "./accessible-hierarchy-modal";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import EditIcon from "assets/outlinedEdit.svg";
import DeleteIcon from "assets/outlinedDelete.svg";
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
import { makeStyles } from "@mui/styles";
import { useNavigate } from "react-router-dom-v5-compat";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import CustomGroupAccordion from "core/commonComponents/custom-group-accordian";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";

const useStyles = makeStyles((theme) => ({
  card: {
    width: "100%",
    maxWidth: pxToRem(384),
  },
  cardContainer: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: pxToRem(36),
    rowGap: pxToRem(16),
    flexWrap: "wrap",
  },
  cardStyle: {
    borderRadius: `${pxToRem(8)} !important`,
    border: `${pxToRem(1)} solid ${colours.separaterColor} !important`,
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(4)} ${pxToRem(
      0
    )} rgba(0, 0, 0, 0.12) !important`,
    minHeight: `${pxToRem(194)} !important`,
    cursor: "pointer",
    padding: `${pxToRem(10)} ${pxToRem(10)} ${pxToRem(17)} ${pxToRem(
      10
    )} !important`,
  },
  cardSpacing: {
    gap: pxToRem(4),
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
    "& .MuiCard-root ": {
      boxShadow: "0px 0px 4px 0px rgba(0, 0, 0, 0.12) !important",
      border: `${pxToRem(1)} solid ${colours.darkBlue} !important`,
    },
  },
  accordianStyle: {
    "& .impact_accordion_main_container": {
      border: "none",
      padding: pxToRem(0),
    },
    "& .ia-styles.ia-btn.ia-btn-outlined.ia-btn-disabled": {
      backgroundColor: `${colours.athensGray1} !important`,
    },
    "& .impact_accordion_main_container .accordion_main_container .accordion_header .MuiAccordionSummary-content": {
      fontSize: pxToRem(16),
      fontFamily: "Poppins",
      fontWeight: 400,
      lineHeight: "normal",
    },
    "& .impact_accordion_main_container .accordion_main_container .accordion_body": {
      padding: `${pxToRem(12)} ${pxToRem(20)} !important`,
    },
    "& .impact_accordion_main_container .accordion_main_container .accordion_header.Mui-expanded": {
      minHeight: `${pxToRem(0)} !important`,
      margin: `${pxToRem(0)} ${pxToRem(20)} !important`,
      height: pxToRem(0),
      marginTop: `${pxToRem(20)} !important`,
    },
  },
  buttonStyle: {
    "&.ia-styles.ia-btn": {
      padding: pxToRem(8),
    },
  },
  cardName: {
    fontSize: pxToRem(16),
    fontFamily: "Manrope",
    fontWeight: 800,
    lineHeight: pxToRem(30),
    color: colours.lightNeutrals,
  },
  cardEmail: {
    fontSize: pxToRem(14),
    fontFamily: "Manrope",
    fontWeight: 500,
    color: colours.lighGrey,
  },
  chipInfo: {
    fontSize: pxToRem(12),
    fontFamily: "Manrope",
    fontWeight: 500,
    lineHeight: pxToRem(30),
    color: colours.lighGrey,
  },
  cardDivider: {
    width: "100%",
    height: pxToRem(1),
    background: colours.linkWater1,
    border: pxToRem(0),
    marginTop: pxToRem(10),
  },
  cardsSeperationDivider: {
    height: pxToRem(147),
    width: pxToRem(1),
    border: pxToRem(0),
    background: colours.linkWater1,
  },
  verticleDivider: {
    width: pxToRem(1),
    height: pxToRem(18),
    background: colours.linkWater1,
  },
  gap: {
    gap: pxToRem(12),
  },
}));

const AssignedUsers = (props) => {
  const { applications, showLoader } = { ...props };
  const [organizedUserData, setOrganizedUserData] = useState({});
  const globalClasses = globalStyles();

  let appsConfig = JSON.parse(
    localStorage.getItem("applicationCodesList")
  ) || [];

  const applicationMapping = useMemo(
    () => {
      const mapping = {};
      applications?.forEach((app) => {
        const appConfig = appsConfig.find((appConfig) => appConfig?.name === app);
        mapping[app] = appConfig?.extra?.label || app;
      });
      return mapping;
    },
    [applications, appsConfig]
  );

  const organizeUsersByApplication = (userList) => {
    // First, get unique application names
    const uniqueApps = [
      ...new Set(userList.map((user) => user.application_name)),
    ];

    // Create initial object with empty arrays
    const organizedUsers = uniqueApps.reduce((acc, appName) => {
      acc[appName] = [];
      return acc;
    }, {});

    // Populate arrays with matching users
    userList.forEach((user) => {
      if (organizedUsers.hasOwnProperty(user.application_name)) {
        organizedUsers[user.application_name].push(user);
      }
    });

    return organizedUsers;
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

  useEffect(() => {
    const organizedUserData = organizeUsersByApplication(props.listOfUserData);
    setOrganizedUserData(organizedUserData);
  }, [props.listOfUserData]);

  return (
    <Loader loader={showLoader}>
      <div className={`${globalClasses.flexRow} ${globalClasses.flexColumn}`}>
        <CustomGroupAccordion>
          {applications.map((appName) => {
            return (
              <UserCards
                applications={applications}
                appName={appName}
                allUsers={organizedUserData[appName]}
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
                accordionName={applicationMapping[appName] || appName}
                accordionChildCount={organizedUserData[appName]?.length}
                applicationMapping={applicationMapping}
              />
            );
          })}
        </CustomGroupAccordion>
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
  const [showLoader, setShowLoader] = useState(false);
  const [allUsersData, setAllUsersData] = useState([]);
  const [checkedList, setCheckedList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [hierarchyIdInView, setHierarchyIdInView] = useState(null);
  const [showAccessibleDept, setShowAccessibleDept] = useState(false);
  const [numberOfCardsInRow, setNumberOfCardsInRow] = useState(10);
  const applicationNameInViewRef = useRef(null);
  const cardContainerRef = useRef(null);
  const navigate = useNavigate();
  const classes = useStyles({ numberOfCardsInRow });
  const applicationCode = getCurrentApplicationDetails(appName).applicationCode;

  useEffect(() => {
    setAllUsersData(allUsers);
  }, [allUsers]);

  const calculateNoOfCardsInARow = () => {
    if (cardContainerRef.current) {
      let numberOfCards = 10;
      const newWidth = cardContainerRef.current.getBoundingClientRect().width;
      let widthOfOneCard = 384 + 36 + 1; // CardWidth + gap b/w card and separator + separator width
      let totalWidthOfCards =
        numberOfCards * widthOfOneCard + (numberOfCards - 1);
      while (totalWidthOfCards > newWidth) {
        numberOfCards = numberOfCards - 1;
        totalWidthOfCards =
          numberOfCards * widthOfOneCard + (numberOfCards - 1);
      }
      setNumberOfCardsInRow(numberOfCards);
    }
  };

  useEffect(() => {
    // Initial width calculation
    calculateNoOfCardsInARow();

    // Recalculate width on window resize
    window.addEventListener("resize", calculateNoOfCardsInARow);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", calculateNoOfCardsInARow);
    };
  }, []);

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
        const promises = await checkedList.map((hierarchyId) => {
          return deleteRole(hierarchyId, applicationCode)
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
          let resp = await getAccessHierachyData(userToEdit[0].hierarchy_id, applicationCode);
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
  const renderCard = (userData, selectedList, index) => {
    const roles = [];
    const applicationsList = [];
    let actualCardCount = index + 1;
    let lastCardIndex = allUsersData.length - 1;

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
      applicationNameInViewRef.current = _userData.application_name;
      setShowAccessibleDept(true);
    };

    return (
      <>
        <label
          className={`${
            selectedList.includes(userData.hierarchy_id)
              ? classes.selectedCard
              : ""
          } ${classes.card}`}
          key={userData.hierarchy_id}
        >
          <Card className={`${classes.cardSpacing} ${classes.cardStyle}`}>
            <input
              value={userData.hierarchy_id}
              type="checkbox"
              name={appName.replace(" ")}
              onChange={(e) => handleChange(e)}
              checked={selectedList.includes(userData.hierarchy_id)}
              className={classes.cardInput}
            />
            <div className={`${globalClasses.flexRow} ${classes.gap}`}>
              <Avatar label={userData.user_name} size="small" />
              <div
                className={`${globalClasses.flexRow} ${globalClasses.flexColumn}`}
              >
                <p className={classes.cardName}>{userData.user_name}</p>
                <p className={`${classes.cardEmail}`}>{userData.email}</p>
              </div>
            </div>
            <hr className={classes.cardDivider} />
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignEnd}`}
            >
              <div
                className={`${globalClasses.flexRow} ${classes.cardSpacing} ${globalClasses.flexColumn}`}
              >
                <span className={classes.chipInfo}>Roles Assigned</span>
                <div
                  className={`${globalClasses.flexRow} ${classes.cardSpacing}`}
                >
                  <Badge
                    label={userData.role_name}
                    variant="stroke"
                    color="success"
                  />
                  {roles.length ? (
                    <Tooltip
                      title={roles.join(", ")}
                      orientation="top"
                      variant="tertiary"
                    >
                      <div>
                        <Badge
                          label={`+${roles.length}`}
                          variant="stroke"
                          color="info"
                        />
                      </div>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
              <div className={classes.descDivider}></div>
              <div
                className={`${globalClasses.flexRow} ${classes.cardSpacing} ${globalClasses.flexColumn}`}
              >
                <span className={classes.chipInfo}>Accessible Apps</span>
                <div
                  className={`${globalClasses.flexRow} ${classes.cardSpacing}`}
                >
                  <Badge
                    label={props?.applicationMapping?.[appName] || appName}
                    variant="stroke"
                    color="warning"
                  />
                  {applicationsList.length ? (
                    <Tooltip
                      title={applicationsList
                        .map((app) => props?.applicationMapping?.[app] || app)
                        .join(", ")}
                      orientation="top"
                      variant="tertiary"
                    >
                      <div>
                        <Badge
                          label={`+${applicationsList.length}`}
                          variant="stroke"
                          color="info"
                        />
                      </div>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            </div>
            <div
              className={`${globalClasses.marginTop} ${globalClasses.centerAlign}`}
            >
              <Button
                variant="tertiary"
                disabled={!Boolean(userData.hierarchy_present)}
                onClick={() => handleViewMapping(userData)}
              >
                View Department Mapping
              </Button>
            </div>
          </Card>
        </label>
        {actualCardCount % numberOfCardsInRow !== 0 &&
          lastCardIndex !== index && (
            <span className={classes.cardsSeperationDivider} />
          )}
      </>
    );
  };

  return (
    <>
      <div
        className={`${globalClasses.verticalAlignCenter} ${globalClasses.layoutAlignEnd} ${globalClasses.marginBottom} ${globalClasses.gap}`}
      >
        {checkedList.length ? (
          <>
            {checkedList.length != allUsersData.length ? (
              <Button
                variant="url"
                onClick={handleSelectAll}
                disabled={showLoader}
              >
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
            <div className={classes.verticleDivider} />
            {checkedList.length === 1 ? (
              <Button
                variant="tertiary"
                onClick={() => handleEdit()}
                disabled={showLoader}
                className={classes.buttonStyle}
              >
                <EditIcon />
              </Button>
            ) : null}
            <Button
              variant="tertiary"
              onClick={() => setShowModal(true)}
              disabled={showLoader}
              className={classes.buttonStyle}
            >
              <DeleteIcon />
            </Button>
          </>
        ) : null}
      </div>
      <Loader loader={showLoader}>
        <div className={`${classes.cardContainer}`} ref={cardContainerRef}>
          {allUsersData?.map((userData, index) =>
            renderCard(userData, checkedList, index)
          )}
        </div>
      </Loader>
      <Prompt
        isOpen={showModal}
        title="Delete Users/Roles"
        primaryButtonLabel="Delete Roles"
        onPrimaryButtonClick={() => handleConfirmBox()}
        secondaryButtonLabel="Delete Users"
        onSecondaryButtonClick={() => handleConfirmBox(true)}
        handleClose={() => setShowModal(false)}
        variant="error"
      >
        <p>Do you want to delete selected roles or users?</p>
      </Prompt>
      {showAccessibleDept && (
        <AccessibleHierarchyModal
          closeModal={() => {
            setShowAccessibleDept(false);
            setHierarchyIdInView(null);
          }}
          hierarchyId={hierarchyIdInView}
          getTableConfig={getTableConfig}
          applicationNameInView={applicationNameInViewRef.current}
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
    deleteRole: (hierarchyId, applicationCode) =>
      deleteRole(hierarchyId, applicationCode),
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