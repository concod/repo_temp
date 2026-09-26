import { isMac } from "impact-ui-v3";
export const MOD_ORDER = ["ctrl", "alt", "shift", "meta"];
export const MOD_LABEL = isMac
  ? { meta: "⌘", ctrl: "⌃", alt: "⌥", shift: "⇧" }
  : { meta: "Win", ctrl: "Ctrl", alt: "Alt", shift: "Shift" };
export const SPECIAL_KEY_DISPLAY = {
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  enter: "↵",
  escape: "Esc",
  backspace: "⌫",
  delete: "⌦",
  tab: "⇥",
  " ": "Space",
};
export const COMBO_MOD_ORDER = ["ctrl", "alt", "shift", "meta"];

export const TAB_NAMES = [
  { label: "General", value: "general" },
  { label: "Table", value: "table" },
  // { label: "View", value: "view" },
];
export const KEYBOARD_SHORTCUTS_TABLE_NAME = "keyboard_shortcut_naming_convention";