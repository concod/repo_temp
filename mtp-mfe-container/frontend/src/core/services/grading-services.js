import axiosInstance from "core/Utils/axios";

export const ACTIVE_STORE_GRADE_LIST = "/core/grading/rank/list";

export const fetchGradeList = async () => {
  return axiosInstance({
    url: `${ACTIVE_STORE_GRADE_LIST}`,
    method: "POST",
  });
};