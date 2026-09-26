import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Breadcrumbs, Stepper } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { userManagementRoutes } from "config/routes";
import { makeStyles } from "@mui/styles";
import {
  setEditMode,
  setNewUsersList,
  setEditUserRoleMappingData,
} from "../services/TenantManagement/User-Role-Management/user-role-management-service";
import AddNewUser from "./addNewUser";
import AssignUnAssignRole from "./assignUnassignRole";
import NotFound from "core/commonComponents/notFound/NotFound";
import { useNavigate } from "react-router-dom-v5-compat";
import AddAssignRoleFooter from "./add-assign-role-footer";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";

const useStyles = makeStyles((theme) => ({
  title: {
    fontSize: pxToRem(14),
    fontWeight: 700,
    color: colours.cloudBurst,
    fontFamily: "Manrope",
    fontStyle: "normal",
    lineHeight: pxToRem(16.1),
    letterSpacing: pxToRem(-0.14),
  },
  stepperContainer: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    "& .ia-styles.ia-stepper.ia-stepper": {
      maxWidth: pxToRem(1187),
      width: "100%",
    },
    "& .ia-styles.ia-stepper.ia-stepper .MuiStep-horizontal": {
      maxWidth: pxToRem(583),
      width: "100%",
    },
  },
}));

const UserRoleManagement = (props) => {
  const { setEditUserRoleMappingData, setEditMode, setNewUsersList } = props;
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [accordionIsOpen, setAccordionIsOpen] = useState(true);
  const [showNoDataFound, setShowNoDataFound] = useState(false);
  const [loadAddUserColumns, setLoadAddUserColumns] = useState(false);
  const [newUnmappedList, setNewUnmappedList] = useState([]);
  const [newMappedList, setNewMappedList] = useState([]);
  const [filterLoader, setFilterLoader] = useState(false);
  const [role, setRole] = useState(null);

  const [activeStep, setActiveStep] = useState(0);
  const createNewUser = useRef(() => {});
  const submitRoleMappings = useRef(() => {});
  const navigate = useNavigate();
  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "User access management",
      to: "/user-management",
    },
    {
      label: "Add and assign roles",
      to: "#",
    },
  ];

  useEffect(() => {
    if (props.isEditMode) {
      setActiveStep(1);
    }
    return () => {
      props.setEditMode(false);
    };
  }, []);

  const onChangeStep = (step) => setActiveStep(step)

  return (
    <>
      {showNoDataFound ? (
        <NotFound />
      ) : (
        <div>
          <div className={globalClasses.paddingHorizontal}>
            <div className={globalClasses.marginVertical1rem}>
              <Breadcrumbs list={paths} />
            </div>
            <p className={classes.title}>Add and assign roles</p>
            <div
              className={`${globalClasses.marginVertical1rem} ${classes.stepperContainer}`}
            >
              <Stepper
                activeStep={activeStep}
                handleStep={onChangeStep}
                orientation="horizontal"
                steps={[
                  {
                    label: "Basic Details",
                  },
                  {
                    label: "Assign a role to user",
                  },
                ]}
              />
            </div>

            <div
              className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.flexColumn}`}
            >

              {activeStep === 0 ? (
                <AddNewUser
                  createNewUser={createNewUser}
                  onChangeStep={onChangeStep}
                  loadAddUserColumns={loadAddUserColumns}
                  setLoadAddUserColumns={setLoadAddUserColumns}
                />
              ) : (
                <AssignUnAssignRole
                  setShowNoDataFound={setShowNoDataFound}
                  submitRoleMappings={submitRoleMappings}
                  newUnmappedList={newUnmappedList}
                  setNewUnmappedList={setNewUnmappedList}
                  newMappedList={newMappedList}
                  setNewMappedList={setNewMappedList}
                  role={role}
                  setRole={setRole}
                  filterLoader={filterLoader}
                  setFilterLoader={setFilterLoader}
                />
              )}
            </div>
          </div>
          <AddAssignRoleFooter
            setEditUserRoleMappingData={setEditUserRoleMappingData}
            setEditMode={setEditMode}
            setNewUsersList={setNewUsersList}
            createNewUser={createNewUser}
            onChangeStep={onChangeStep}
            activeStep={activeStep}
            submitRoleMappings={submitRoleMappings}
            loadAddUserColumns={loadAddUserColumns}
            newUnmappedList={newUnmappedList}
            newMappedList={newMappedList}
            role={role}
            filterLoader={filterLoader}
          />
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { tenantUserRoleMgmtReducer } = store;
  return {
    isEditMode: tenantUserRoleMgmtReducer.userRoleManagementReducer.isEditMode,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setEditMode: (mode) => dispatch(setEditMode(mode)),
    setEditUserRoleMappingData: (user) =>
      dispatch(setEditUserRoleMappingData(user)),
    setNewUsersList: (users) => dispatch(setNewUsersList(users)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(UserRoleManagement);
