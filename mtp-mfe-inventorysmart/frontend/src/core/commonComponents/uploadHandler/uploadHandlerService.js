import axiosInstance from "core/Utils/axios/index";

export const getModuleCodes = async () => {
  const currentApp = sessionStorage.getItem("currentApp");
  const res = await axiosInstance({
    url: `/core/configuration/modules?app=${currentApp}`,
    method: "GET",
  });

  return res?.data?.data;
};
