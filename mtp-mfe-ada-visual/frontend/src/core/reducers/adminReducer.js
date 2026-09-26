import {
  SET_GROUPS,
  SET_PERMISSIONS,
  SET_GRP_DATA_FETCH_STATUS,
  SET_ROLES,
  SET_USERS,
  SET_USER_DATA_FETCH_STATUS,
  SET_ROLE_DATA_FETCH_STATUS,
  SET_PERMISSION_DATA_STATUS,
} from "../actions/types";

const initialState = {
  groups: [],
  permissions: [],
  users: [],
  roles: [],
  isGrpDataFetched: false,
  isRoleDataFetched: false,
  isUserDataFetched: false,
  isPermissionDataFetched: false,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_GROUPS:
      return {
        ...state,
        groups: [...action.payload],
      };
    case SET_PERMISSIONS:
      return {
        ...state,
        permissions: [...action.payload],
      };
    case SET_ROLES:
      return {
        ...state,
        roles: [...action.payload],
      };
    case SET_USERS:
      return {
        ...state,
        users: [...action.payload],
      };
    case SET_GRP_DATA_FETCH_STATUS:
      return {
        ...state,
        isGrpDataFetched: true,
      };
    case SET_USER_DATA_FETCH_STATUS:
      return {
        ...state,
        isUserDataFetched: true,
      };
    case SET_ROLE_DATA_FETCH_STATUS:
      return {
        ...state,
        isRoleDataFetched: true,
      };
    case SET_PERMISSION_DATA_STATUS:
      return {
        ...state,
        isPermissionDataFetched: true,
      };
    default:
      return state;
  }
}
