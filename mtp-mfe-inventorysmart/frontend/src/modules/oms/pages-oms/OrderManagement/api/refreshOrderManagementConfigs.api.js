import axiosInstance from "core/Utils/axios";
import { OMS_ORDER_MANAGEMENT_REFRESH_CONFIGS } from "modules/oms/constants-oms/apiConstants.js";

export async function refreshOrderManagementConfigs(screenId) {
  const response = await axiosInstance({
    url: OMS_ORDER_MANAGEMENT_REFRESH_CONFIGS,
    method: "POST",
    isV3: true,
    data: { screen_id: screenId },
  });

  return response?.data?.data ?? null;
}
