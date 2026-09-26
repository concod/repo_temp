import { isMac } from "./utils";

// Define the modifier keys and other keys based on the platform
const altKey = "Alt";
const ctrlKey = isMac() ? "Meta" : "Control";
const shiftKey = "Shift";
const enterKey = "Enter";
const deleteKey = isMac() ? "Backspace" : "Delete";
const backspaceKey = "Backspace";
const tabKey = "Tab";
const escKey = "Escape";

//modified key list
const F = isMac() ? "ƒ" : "F";

//Filters
export const TOGGLE_FILTER = [altKey, F];
export const APPLY_FILTER = [altKey, "A"];

//General - Navigation
export const GO_TO_APPLICATION_LANDING_PAGE = [ctrlKey, shiftKey, "A"];
export const GO_TO_PLATFORM_LANDING_PAGE = [ctrlKey, shiftKey, "H"];
export const GO_TO_CURRENT_WORKFLOW_LANDING_PAGE = [ctrlKey, shiftKey, "L"];
export const TOGGLE_LEFT_PANE = [ctrlKey, "L"];
export const TOGGLE_NOTIFICATION_PANEL = [altKey, "N"];
