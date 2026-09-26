import {
    CLUSTER_PLAN_CREATE,
    SAVE_DEFAULT_ATTRIBUTES,
    GET_ATTRIBUTE_LIST,
    UPDATE_PREVIEW_TABLE,
    FETCH_DEFAULT_ATTRIBUTES,
    GET_CLUSTER_HYPERMETER_DATA,
    FETCH_DEFAULT_CLUSTER_HYPERPARAMETER_DATA,
    SET_CLUSTER_HYPERPARAMETER_DATA,
    FETCH_CUSTOM_CLUSTER_HYPERPARAMETER_DATA,
    UPDATE_CLUSTER_HYPERPARAMETER_DATA
} from "core/Utils/apiConstants/assortSmartapiConstants";
import axiosInstance from "core/Utils/axios";

export const getClusterCreatePlan = async () => {
    return axiosInstance.get(CLUSTER_PLAN_CREATE);
};

export const saveDefaultAttributes = async (body) => {
    return axiosInstance({
        url: SAVE_DEFAULT_ATTRIBUTES,
        method: "POST",
        data: body,
    });
}

export const getAttributesList = async (body) => {
    return axiosInstance({
        url: GET_ATTRIBUTE_LIST,
        method: "POST",
        data: body
    })
}

export const updateAttributeTable = async (body) => {
    return axiosInstance({
        url: UPDATE_PREVIEW_TABLE,
        method: "POST",
        data: body
    })
}

export const fetchDefaultAttributes = async () => {
    return axiosInstance({
        url: FETCH_DEFAULT_ATTRIBUTES,
        method: "GET",
    })
}

export const getClusterHyperParameter = async () => {
    return axiosInstance({
        url: GET_CLUSTER_HYPERMETER_DATA,
        method: "GET",
    })
}

export const getDefaultClusterHyperParameterData = async () => {
    return axiosInstance({
        url: FETCH_DEFAULT_CLUSTER_HYPERPARAMETER_DATA,
        method: "GET",
    })
}

export const setClusterHyperParameterData = async (body) => {
    return axiosInstance({
        url: SET_CLUSTER_HYPERPARAMETER_DATA,
        method: "POST",
        data: body
    })
}

export const getCustomClusterHyperParameterData = async () => {
    return axiosInstance({
        url: FETCH_CUSTOM_CLUSTER_HYPERPARAMETER_DATA,
        method: "GET",
    })
}

export const updateClusterHyperParameterData = async (body) => {
    return axiosInstance({
        url: UPDATE_CLUSTER_HYPERPARAMETER_DATA,
        method: "POST",
        data: body
    })
}