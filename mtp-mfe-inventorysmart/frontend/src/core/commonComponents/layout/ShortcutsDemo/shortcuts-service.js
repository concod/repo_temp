import { UPDATE_SHORTCUTS_DEMO_PREFERENCE } from "core/actions/types";
import axiosInstance from "core/Utils/axios";

export const updateShortcutsDemoPreference = async (applicationCode = 3) => {
  return axiosInstance({
    url: UPDATE_SHORTCUTS_DEMO_PREFERENCE,
    method: "POST",
    data: {
      keyboard_demo_seen: false,
      application_code: applicationCode,
    },
  });
}