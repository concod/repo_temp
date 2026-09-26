// An array of DOM elements where shortcuts should be ignored
export const BLACKLISTED_DOM_TARGETS = ["TEXTAREA", "INPUT"];
export const BLACKLISTED_CUSTOM_DOM_TARGETS = ["DIV"];

//Default configuration options for the hook.
export const DEFAULT_OPTIONS = {
  overrideSystem: false, //Overrides the default browser behavior for that specific keyboard shortcut
  ignoreInputFields: true, //Allows enabling and disabling the keyboard shortcuts when pressed inside of BLACKLISTED_DOM_TARGETS fields.
  repeatOnHold: true, //Determines whether the callback function should fire on repeat when keyboard shortcut is held down.
};

//Custom configuration options for the hook
export const CUSTOM_OPTIONS = {
  overrideSystem: true,
  ignoreInputFields: true,
  repeatOnHold: false,
};

export const IS_NOT_AN_ARRAY_MESSAGE =
  "The first parameter to `useShortcutBinding` must be an ordered array of `KeyboardEvent.key` strings";
export const EMPTY_ARRAY_MESSAGE =
  "The first parameter to `useShortcutBinding` must contain atleast one `KeyboardEvent.key` string";
export const NOT_A_FUNCTION_MESSAGE =
  "The second parameter to `useShortcutBinding` must be a function that will be envoked when the keys are pressed";

// Map modifier keys to a common identifier, so that left modifier and right modifier are treated equally
export const MODIFIER_MAP = {
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  ControlLeft: "Control",
  ControlRight: "Control",
  AltLeft: "Alt",
  AltRight: "Alt",
  MetaLeft: "Meta",
  MetaRight: "Meta",
};
