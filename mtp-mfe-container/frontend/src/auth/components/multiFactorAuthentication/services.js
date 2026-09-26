import axiosInstance from "core/Utils/axios";
import { MFA_VERIFY, MFA_RESEND, MFA_CREATE } from "config/api";

export const verifyOtp = (reqBody) => {
  return axiosInstance({
    url: MFA_VERIFY,
    method: "POST",
    data: reqBody,
  });
};

export const createOtp = (reqBody) => {
  return axiosInstance({
    url: MFA_CREATE,
    method: "POST",
    data: reqBody,
  });
};

export const resendOtp = (reqBody)=>{
  return axiosInstance({
    url: MFA_RESEND,
    method: "POST",
    data: reqBody,
  });
}