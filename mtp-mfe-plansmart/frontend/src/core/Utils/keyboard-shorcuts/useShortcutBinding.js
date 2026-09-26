import { useEffect, useCallback, useRef, useMemo } from "react";
import {
  overrideSystemShortcut,
  checkAllHeldKeys,
  removeDuplicate,
} from "./utils";
import {
  BLACKLISTED_DOM_TARGETS,
  DEFAULT_OPTIONS,
  IS_NOT_AN_ARRAY_MESSAGE,
  EMPTY_ARRAY_MESSAGE,
  NOT_A_FUNCTION_MESSAGE,
  MODIFIER_MAP,
} from "./constants";

const useShortcutBinding = (shortcutKeys, callback, userOptions) => {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  //Ensure shortcutKeys is an array, non-empty, and callback is a function.
  if (!Array.isArray(shortcutKeys)) {
    console.error(IS_NOT_AN_ARRAY_MESSAGE);
    return;
  }
  if (!shortcutKeys.length) {
    console.error(EMPTY_ARRAY_MESSAGE);
    return;
  }
  if (!callback || typeof callback !== "function") {
    console.error(NOT_A_FUNCTION_MESSAGE);
    return;
  }

  // A unique identifier for the shortcut keys to use in dependencies.
  const shortcutKeysId = useMemo(() => shortcutKeys.join(), [shortcutKeys]);

  // Normalizes the shortcut keys a deduplicated array of lowercased keys.
  const shortcutArray = useMemo(
    () => removeDuplicate(shortcutKeys).map((key) => String(key).toLowerCase()),
    [shortcutKeysId]
  );

  // useRef to avoid a constant re-render on keydown and keyup.
  const heldKeys = useRef([]);

  //clear the heldKeys array when "shortcutKeysId" or "flushHeldKeys" changes
  const flushHeldKeys = useCallback(() => {
    heldKeys.current = [];
  }, []);

  const keydownListener = useCallback(
    (keydownEvent) => {
      let loweredKey = String(keydownEvent.code?.replace(/^(Key|Digit)/, ""));

      if (MODIFIER_MAP[loweredKey]) {
        loweredKey = MODIFIER_MAP[loweredKey];
      }
      loweredKey = loweredKey?.toLowerCase();
      
      if (shortcutArray.indexOf(loweredKey) < 0) {
        flushHeldKeys(); //flushing when undefined/wrong shortcut clicked without overriding the system shortcuts
        return;  
      }

      if (
        options.ignoreInputFields &&
        BLACKLISTED_DOM_TARGETS.indexOf(keydownEvent.target.tagName) >= 0
      ) {
        return;
      }

      if (keydownEvent.repeat && !options.repeatOnHold) return;

      if (options.overrideSystem) {
        overrideSystemShortcut(keydownEvent);
      }
      // This needs to be checked to avoid all option checks that might prevent default behaviour of the key press.
      // i.e. If shortcut is "Shift + A", we shouldn't prevent the
      // default browser behavior of Select All Text just because
      // "A" is being observed for our custom behavior shortcut.
      const isHeldKeyCombinationValid = checkAllHeldKeys(
        loweredKey,
        null,
        shortcutArray,
        heldKeys.current
      );

      if (!isHeldKeyCombinationValid) {
        flushHeldKeys();
        return;
      }

      const nextHeldKeys = [...heldKeys.current, loweredKey];
      if (nextHeldKeys.join() == shortcutArray.join()) {
        callback();
        return false;
      }
      heldKeys.current = nextHeldKeys;

      return false;
    },
    [
      shortcutKeysId,
      callback,
      options.overrideSystem,
      options.ignoreInputFields,
    ]
  );

  const keyupListener = useCallback(
    (keyupEvent) => {
      let raisedKey = String(keyupEvent.code?.replace(/^(Key|Digit)/, ""));

      if (MODIFIER_MAP[raisedKey]) {
        raisedKey = MODIFIER_MAP[raisedKey];
      }
      raisedKey = raisedKey?.toLowerCase();

      if (shortcutArray.indexOf(raisedKey) < 0) {
        return;
      }

      // Finds the index of the released key in the heldKeys array.
      const raisedKeyHeldIndex = heldKeys.current?.indexOf(raisedKey);
      if (raisedKeyHeldIndex < 0) return;

      //Loops through heldKeys.current and remove one that was just released.
      let nextHeldKeys = [];
      let loopIndex;
      for (loopIndex = 0; loopIndex < heldKeys.current?.length; ++loopIndex) {
        if (loopIndex !== raisedKeyHeldIndex) {
          nextHeldKeys.push(heldKeys.current[loopIndex]);
        }
      }
      heldKeys.current = nextHeldKeys;

      return false; //Prevents the default action associated with the key release event and stops the event from propagating further up the DOM tree.
    },
    [shortcutKeysId]
  );

  useEffect(() => {
    window.addEventListener("keydown", keydownListener);
    window.addEventListener("keyup", keyupListener);
    window.addEventListener("blur", flushHeldKeys);
    return () => {
      window.removeEventListener("keydown", keydownListener);
      window.removeEventListener("keyup", keyupListener);
      window.removeEventListener("blur", flushHeldKeys); //usecase? press alt+tab, so "alt" is correct but due to "tab" window lost the focus and "alt" got stored in the heldkeys. Now, when focus regains, then heldKeys=[alt] would be appended with "alt+f" which is a correct shortcut to toggle the filter but still won't work due to [alt,alt,f], so flush when focus changes
    };
  }, [keydownListener, keyupListener, shortcutKeysId]);

  // Resets the held keys array if the shortcut keys are changed.
  useEffect(() => {
    flushHeldKeys();
  }, [shortcutKeysId, flushHeldKeys]);

  return {
    flushHeldKeys,
  };
};

export default useShortcutBinding;
