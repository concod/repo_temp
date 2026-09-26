import axiosInstance from "core/Utils/axios";
import { SESSION_CREATE, SESSION_REFRESH, SESSION_LOGOUT } from "core/constants/apiConstants"

const getCsrfToken = () => {
    const token = document.cookie
        .split("; ")
        .find(row => row.startsWith("csrf_token="))
        ?.split("=")[1];

    if (!token) {
        console.error("CSRF token missing");
    }

    return token;
};
export const createSession = () => {
    return axiosInstance({
        url: SESSION_CREATE,
        method:"POST",
        withCredentials: true,
    })
}

export const refreshSession = () => {
    return axiosInstance({
        url:SESSION_REFRESH,
        method:"POST",
        withCredentials: true,
        headers: {
            "X-CSRF-Token": getCsrfToken(),
        }
    })
}

export const logoutSession = () => {
    return axiosInstance({
        url: SESSION_LOGOUT,
        method: "POST",
        withCredentials: true,
        headers: {
            "X-CSRF-Token": getCsrfToken(),
        }
    })
}