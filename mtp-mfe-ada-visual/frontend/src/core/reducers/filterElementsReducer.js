import {
  GET_FILTER_KEY,
  SET_FILTER_MODULES,
  SET_SELECTED_MODULES,
  SET_SELECTED_APPLICATION,
  SHOW_FILTER_MODAL_LOADER,
  SET_MODULE_CONFIG_DATA,
  CLEAR_MODULE_CONFIG_DATA,
  SET_EDIT_MODULE_CONFIG_DATA,
  SET_CONFIG_NAME,
  ADD_CONFIG,
  RESET_CONFIG,
  UPDATE_CONFIG,
  SET_CONFIGS,
  SET_MANDATORY_FILTERS_FOR_SCREEN,
} from "../actions/types";
import { firebaseobj } from "../../auth/firebase";

const initialState = {
  filterfields: [],
  selectedApplication: [],
  filterModules: [],
  selectedModules: [],
  showModalLoader: false,
  selectedModuleConfigData: {},
  editModuleConfigData: {},
  configName: "",
  createdConfigs: {},
  configs: [],
  mandatoryFilterFields: [],
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SHOW_FILTER_MODAL_LOADER:
      return {
        ...state,
        showModalLoader: action.payload,
      };
    case GET_FILTER_KEY:
      return {
        ...state,
        filterfields: action.payload,
      };
    case SET_FILTER_MODULES:
      return {
        ...state,
        filterModules: action.payload,
      };
    case SET_SELECTED_MODULES:
      return {
        ...state,
        selectedModules: action.payload,
      };
    case SET_MODULE_CONFIG_DATA:
      return {
        ...state,
        selectedModuleConfigData: {
          ...state.selectedModuleConfigData,
          [action.payload.dimension]: action.payload.moduleConfig,
        },
      };
    case CLEAR_MODULE_CONFIG_DATA:
      return {
        ...state,
        selectedModuleConfigData: {},
      }
    case SET_EDIT_MODULE_CONFIG_DATA:
      return {
        ...state,
        editModuleConfigData : {
          ...state.editModuleConfigData,
          [action.payload.dimension]: action.payload.moduleConfig,
        }
      }
    case SET_CONFIG_NAME:
      return {
        ...state,
        configName: action.payload,
      };
    case SET_SELECTED_APPLICATION:
      return {
        ...state,
        selectedApplication: action.payload,
      };
    case RESET_CONFIG:
      return {
        ...state,
        selectedApplication: [],
        selectedModules: [],
        selectedModuleConfigData: {},
        editModuleConfigData: {},
        configName: "",
      };
    case ADD_CONFIG:
      var months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      var d = new Date();
      var hr = d.getHours();
      var min = d.getMinutes();
      if (min < 10) {
        min = "0" + min;
      }
      var ampm = "AM";
      if (hr > 12) {
        hr -= 12;
        ampm = "PM";
      }
      var date = d.getDate();
      var month = months[d.getMonth()];
      var year = d.getFullYear();
      const id = action.payload;
      if (state.createdConfigs[id]) {
        return {
          ...state,
          createdConfigs: {
            ...state.createdConfigs,
            [id]: [
              ...state.createdConfigs[id],
              {
                id: Date.now(),
                configname: state.configName,
                createdby: firebaseobj.auth().currentUser.email,
                createdon: `${date} ${month} ${year}. ${hr}:${min} ${ampm}`,
                applicablemodules: [...state.selectedModules],
                dimensions: [...state.selectedDimensions],
                configdata: [...state.selectedModuleConfigData],
              },
            ],
          },
        };
      } else {
        return {
          ...state,
          createdConfigs: {
            ...state.createdConfigs,
            [id]: [
              {
                id: Date.now(),
                configname: state.configName,
                createdby: firebaseobj.auth().currentUser.email,
                createdon: `${date} ${month} ${year}. ${hr}:${min} ${ampm}`,
                applicablemodules: [...state.selectedModules],
                dimensions: [...state.selectedDimensions],
                configdata: [...state.selectedModuleConfigData],
              },
            ],
          },
        };
      }
    case UPDATE_CONFIG:
      const updatedData = state.createdConfigs[action.payload.tabId].map(
        (config) => {
          if (config.id === action.payload.configId) {
            return {
              ...config,
              configdata: [...state.selectedModuleConfigData],
            };
          }
          return config;
        }
      );
      return {
        ...state,
        createdConfigs: {
          ...state.createdConfigs,
          [action.payload.tabId]: [...updatedData],
        },
      };
    case SET_CONFIGS:
      return {
        ...state,
        configs: action.payload,
      };

    case SET_MANDATORY_FILTERS_FOR_SCREEN:
      return {
        ...state,
        mandatoryFilterFields: action.payload,
      };
    default:
      return state;
  }
}
