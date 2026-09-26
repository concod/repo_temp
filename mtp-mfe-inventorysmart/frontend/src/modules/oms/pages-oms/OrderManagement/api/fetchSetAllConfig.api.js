import axiosInstance from "core/Utils/axios";
import { GET_SETALL_KPI_VALUES } from "modules/oms/constants-oms/apiConstants.js";

export async function fetchSetAllConfig() {
  const response = await axiosInstance({
    url: GET_SETALL_KPI_VALUES,
    method: "GET",
  });

  return response?.data?.data?.[0]?.attribute_value || null;
}
