import useShortcutBinding from "./useShortcutBinding";
import { CUSTOM_OPTIONS } from "./constants";

const useKeyboardShortcut = (shortcuts) => {
  shortcuts?.length &&
    shortcuts?.forEach(
      ({ shortcutKey, callback, userOptions = CUSTOM_OPTIONS }) => {
        useShortcutBinding(shortcutKey, callback, userOptions);
      }
    );
};

export default useKeyboardShortcut;
