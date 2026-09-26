import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Accordion, Breadcrumbs, Button } from "impact-ui";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { userManagementRoutes } from "config/routes";
import {
  setEditMode,
  setNewUsersList,
  setEditUserRoleMappingData,
} from "../services/TenantManagement/User-Role-Management/user-role-management-service";
import AddNewUser from "./addNewUser";
import AssignUnAssignRole from "./assignUnassignRole";
import NotFound from "core/commonComponents/notFound/NotFound";
import { useNavigate } from "react-router-dom-v5-compat";

const UserRoleManagement = (props) => {
  const globalClasses = globalStyles();
  const [accordionIsOpen, setAccordionIsOpen] = useState(true);
  const [showNoDataFound, setShowNoDataFound] = useState(false);
  const navigate = useNavigate();
  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "User Access Management",
      to: "/user-management",
    },
    {
      label: "Add & Assign Role",
      to: "#",
    },
  ];

  useEffect(() => {
    return () => {
      props.setEditMode(false);
    };
  }, []);

  return (
    <>
      {showNoDataFound ? (
        <NotFound />
      ) : (
        <div className={globalClasses.paddingHorizontal}>
          <div className={globalClasses.marginVertical1rem}>
            <Breadcrumbs paths={paths} />
          </div>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
          >
            <Typography variant="h3">Add & Assign Role</Typography>
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.gap}`}
            >
              <Button
                variant="url"
                onClick={() => {
                  props.setEditUserRoleMappingData({});
                  props.setEditMode(false);
                  props.setNewUsersList([]);
                  navigate(userManagementRoutes.user);
                }}
              >
                Back to list
              </Button>
            </div>
          </div>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.flexColumn}`}
          >
            <Accordion
              label={"Basic Details"}
              onChange={() => setAccordionIsOpen(!accordionIsOpen)}
              isExpanded={!props.isEditMode && accordionIsOpen}
              disabled={props.isEditMode}
            >
              <AddNewUser />
            </Accordion>
            <Accordion
              label={"Assign a role to user"}
              onChange={() =>
                props.isEditMode && setAccordionIsOpen(!accordionIsOpen)
              }
              isExpanded={props.isEditMode && accordionIsOpen}
              disabled={!props.isEditMode}
            >
              <AssignUnAssignRole setShowNoDataFound={setShowNoDataFound}/>
            </Accordion>
          </div>
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
