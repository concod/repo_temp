import axiosInstance from "../Utils/axios";

export const getTableConfiguration = async (screenCode) => {
  return axiosInstance({
    url: `/core/configuration/table-config/screen?screen_code=${screenCode}`,
    method: "GET",
  });
};

export const saveTableFormConfiguration = async (payload) => {
  return axiosInstance({
    url: "/core/configuration/table-config/save",
    method: "PUT",
    data: payload,
  })
}
