import { isArray } from "lodash";
import { KEY_SYMBOL_MAP } from "../constants"
import { isMac } from 'impact-ui-v3'

export const formatShortcutsModalData = (data) => {
  if (!data) return [];
  let result = {}
   Object.keys(data).map((key) => {
     result[key] = isArray(data?.[key]) && data?.[key].map(({ action_title="", action_description="", keys }) => ({
      title: action_title,
      description: action_description,
      keys: keys?.map(key => {
        if (isMac && KEY_SYMBOL_MAP[key]) return KEY_SYMBOL_MAP[key];
        if (!isMac && key === " ") return "Space";
        return key?.length === 1 ? key.toUpperCase() : key;
      })
    }))
  })
  return result
}