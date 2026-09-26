import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import Form from "core/Utils/form";
import { Button } from "impact-ui";
import { getAllFilters } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getInputNoun } from "core/Utils/formatter";
import {
  saveNewUser,
  setUserMgmtLoader,
} from "../services/TenantManagement/User-Management/user-management-service";
import {
  setEditMode,
  setNewUsersList,
} from "../services/TenantManagement/User-Role-Management/user-role-management-service";
import { userManagementRoutes } from "config/routes";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { emailIdValidation } from "./emailValidator";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import Loader from "core/Utils/Loader/loader";
import DeleteIcon from "@mui/icons-material/Delete";
import { cloneDeep, isEmpty } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles(() => ({
  form: {
    alignItems: "flex-end",
    display: "flex",
    paddingBottom: "1rem",
    borderBottom: "1px solid #DEDEDE",
  },
  descDivider: {
    width: 1,
    height: 26,
    background: "#DEDEDE", // used temporarily as we don't have new colour's defined
  },
}));

const AddNewUser = (props) => {
  const [loadAddUserColumns, setLoadAddUserColumns] = useState(false);
  const [staticFormFields, setStaticFormFields] = useState([]);
  const [userFormFields, setUserFormFields] = useState([]);
  const [userFormData, setUserFormData] = useState({});
  const [counter, setCounter] = useState(1);
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  const classes = useStyles();

  useEffect(() => {
    const fetchFormFields = async () => {
      setLoadAddUserColumns(true);
      const formFieldsData = await props.getAllFilters("uam screen");
      if (formFieldsData?.data?.status) {
        const newFormFields = formFieldsData.data.data.map((data) => {
          return {
            ...data,
            required: data.is_required,
            error: false,
            accessor: data.column_name,
            field_type: data.display_type,
            value_type: data.column_name === "email" ? "email" : "text",
            helperText: data?.extra?.helperText || "Please enter a valid input.",
          };
        });
        setStaticFormFields(newFormFields);
        setUserFormFields([newFormFields]);
        setLoadAddUserColumns(false);
      }
    };

    fetchFormFields();
  }, []);

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
   * @description Checks for values and corresponding validation to it and assign error as true or false to the same.
   * @returns {Object}
   */
  const validateFormFields = () => {
    let formFieldsList = cloneDeep(userFormFields);
    formFieldsList = formFieldsList.map((fieldSet) => {
      return fieldSet.map((item) => {
        if (item.accessor.includes("user_name")) {
          // accept only letter and spaces
          let regexp = /^[a-zA-Z0-9 ]+$/;
          if (!regexp.test(userFormData[item.accessor])) {
            return formItemValueAfterValidation(item, true);
          } else {
            return formItemValueAfterValidation(item, false);
          }
        } else if (item.accessor.includes("email")) {
          let result = emailIdValidation(userFormData[item.accessor]);
          if (!result) {
            return formItemValueAfterValidation(item, true);
          } else {
            return formItemValueAfterValidation(item, false);
          }
        } else return fieldSet;
      });
    });
    setUserFormFields(formFieldsList);
    return formFieldsList.some((obj) => {
      if (Array.isArray(obj)) {
        return obj.some((item) => item.error);
      } else return obj.error;
    });
  };

  /**
   * @function
   * @description Add error key and value to the provide object
   * @param {Objet} item
   * @param {Boolean} value
   * @returns {Object} Modified object param
   */
  const formItemValueAfterValidation = (item, value) => {
    return {
      ...item,
      error: value,
    };
  };

  /**
   * @function
   * @description Validate form for duplicates, required and accepted value
   * @returns {Boolean}
   */
  const validateForm = () => {
    let requiredFieldsError = false;
    let duplicates = false;
    let formFieldCheck = false;
    const formFields = cloneDeep(userFormFields);
    const userFormDataCopy = cloneDeep(userFormData);
    //  check for empty values
    formFields.flat().forEach((item) => {
      // remove whitespaces or avoid white space entries
      if (userFormDataCopy[item.accessor]) {
        userFormDataCopy[item.accessor] = userFormData[item.accessor]?.trim();
      }
      requiredFieldsError = item.required && !userFormDataCopy[item.accessor];
    });

    if (requiredFieldsError) {
      displaySnackMessages(
        "Please Enter the data in all the required fields",
        "error"
      );
    } else {
      formFieldCheck = validateFormFields();
    }
    // To check duplicate email id entries
    const allIds = [];
    Object.keys(userFormDataCopy).forEach((key) => {
      if (key.includes("email") && userFormDataCopy[key]) {
        allIds.push(userFormDataCopy[key]);
      }
    });
    duplicates = Boolean(
      allIds.filter((val, index) => allIds.indexOf(val) !== index).length
    );
    if (duplicates) {
      displaySnackMessages("Entered email id already exists", "warning");
    }
    setUserFormData(userFormDataCopy);
    return !requiredFieldsError && !duplicates && !formFieldCheck;
  };

  /**
   * @function
   * @description Add new row into form to careate more user
   */
  const addNewFormField = () => {
    const newStaticFields = cloneDeep(staticFormFields);
    newStaticFields.forEach((item) => {
      item.accessor = item.accessor + "_" + counter;
    });
    const formFields = [...userFormFields];
    formFields.push(newStaticFields);
    setUserFormFields(formFields);
    setCounter((prev) => prev + 1);
  };

  /**
   * @function
   * @description Delete paticular row from form at given index
   * @param {Number} index
   */
  const handleDelete = (index) => {
    const formFields = [...userFormFields];
    const accessors = userFormFields[index].map((field) => field.accessor);
    const newFormData = cloneDeep(userFormData);
    accessors.forEach((accessor) => {
      newFormData[accessor] && delete newFormData[accessor];
    });
    formFields.splice(index, 1);
    setUserFormFields(formFields);
  };

  /**
   * @function
   * @description Create users from the values entered in the form and update usersList
   */
  const createUser = async (assignRole = false) => {
    if (validateForm()) {
      setLoadAddUserColumns(true);
      props.setUserMgmtLoader(true);
      let userDetails = userFormFields.map((userFields) => {
        return {
          user_name:
            userFormData[userFields[0].accessor][0].toUpperCase() +
            userFormData[userFields[0].accessor].slice(1),
          email: userFormData[userFields[1].accessor].toLowerCase(),
          ...(userFields[2]?.accessor && {
            custom_attributes: {
              retail_pro_id:
                userFields[2]?.accessor &&
                userFormData[userFields[2]?.accessor]?.retail_pro_id,
            },
          }),
        };
      });
      let body = {
        users: userDetails,
      };
      try {
        const response = await props.saveNewUser(body);
        const userString = `${getInputNoun(
          "User",
          body.users.length
        )} added successfully`;
        if (response) {
          if (assignRole) {
            props.setNewUsersList(response.data.data);
            props.setEditMode(true);
            displaySnackMessages(userString, "success");
          } else {
            displaySnackMessages(userString, "success", () => {
              navigate(userManagementRoutes.user);
            });
          }
          setLoadAddUserColumns(true);
        }
      } catch (err) {
        props.setUserMgmtLoader(false);
        setLoadAddUserColumns(false);
        if (!isEmpty(err?.response?.data?.message)) {
          displaySnackMessages(err.response.data?.message, "error");
        } else {
          displaySnackMessages("Something went wrong", "error");
        }
        return false;
      }
    } else {
      return false;
    }
  };

  return (
    <>
      {userFormFields.map((formField, index) => (
        <div className={`${classes.form} ${globalClasses.marginBottom}`}>
          <Loader loader={loadAddUserColumns}>
            <Form
              layout={"vertical"}
              maxFieldsInRow={3}
              handleChange={(dependency) => setUserFormData(dependency)}
              fields={formField}
              updateDefaultValue={false}
              defaultValues={userFormData}
            ></Form>
          </Loader>
          <Button
            variant="url"
            onClick={() => handleDelete(index)}
            id="deleteBtn"
            disabled={loadAddUserColumns || userFormFields.length === 1}
            icon={DeleteIcon}
          />
        </div>
      ))}
      <div className={globalClasses.layoutAlignSpaceBetween}>
        <Button
          variant="url"
          onClick={addNewFormField}
          id="addNewForm"
          disabled={loadAddUserColumns || !userFormFields.length}
          icon={AddCircleIcon}
        >
          Add New User
        </Button>
        <div className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap}`}>
          <Button
            variant="secondary"
            onClick={() => {
              navigate(userManagementRoutes.user);
            }}
            id="deleteBtn"
            disabled={loadAddUserColumns}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => createUser(true)}
            id="nextBtn"
            disabled={loadAddUserColumns}
          >
            Next
          </Button>
          <div className={classes.descDivider}></div>
          <Button
            variant="secondary"
            onClick={() => createUser()}
            id="deleteBtn"
            disabled={loadAddUserColumns}
          >
            Save & Assign Role Later
          </Button>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    loaderUserMgmt:
      store.tenantUserRoleMgmtReducer.userManagementReducer.loaderUserMgmt,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getAllFilters: (body) => dispatch(getAllFilters(body)),
    saveNewUser: (body) => dispatch(saveNewUser(body)),
    setUserMgmtLoader: (body) => dispatch(setUserMgmtLoader(body)),
    setEditMode: (mode) => dispatch(setEditMode(mode)),
    setNewUsersList: (users) => dispatch(setNewUsersList(users)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddNewUser);
