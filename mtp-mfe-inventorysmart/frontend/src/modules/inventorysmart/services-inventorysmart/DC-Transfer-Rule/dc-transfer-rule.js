import axiosInstance from "core/Utils/axios";
import {
  DC_SELECTION_FILTER_CONFIGURATION,
  DC_TRANSFER_RULE_CREATION,
  DC_TRANSFER_RULE_DELETE,
  DC_TRANSFER_RULE_DUPLICATE,
  DC_TRANSFER_RULE_MAPPING,
  DC_TRANSFER_RULE_SAVE,
  DC_TRANSFER_RULE_SET_ALL,
  DC_TRANSFER_RULE_UPDATE,
  DC_TRANSFER_RULES_LIST,
} from "../../constants-inventorysmart/apiConstants";

export const fetchDCTransferRules = () => () => {
  return axiosInstance({
    url: DC_TRANSFER_RULES_LIST,
    method: "GET",
  });
};

export const fetchDCSelectionFilterConfiguration = () => () => {
  return axiosInstance({
    url: DC_SELECTION_FILTER_CONFIGURATION,
    method: "GET",
  });
};

export const createDCTransferRuleMapping = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_RULE_CREATION,
    method: "POST",
    data: postBody,
  });
};

export const fetchDCTransferRuleMapping = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_RULE_MAPPING,
    method: "POST",
    data: postBody,
  });
};

export const applyDCTransferRuleSetAll = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_RULE_SET_ALL,
    method: "POST",
    data: postBody,
  });
};

export const saveDCTransferRule = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_RULE_SAVE,
    method: "POST",
    data: postBody,
  });
};

export const deleteDCTransferRules = (ruleIds) => () => {
  return axiosInstance({
    url: DC_TRANSFER_RULE_DELETE,
    method: "DELETE",
    data: { rule_ids: ruleIds },
  });
};

export const duplicateDCTransferRule = (ruleId) => () => {
  return axiosInstance({
    url: DC_TRANSFER_RULE_DUPLICATE,
    method: "POST",
    data: { rule_id: ruleId },
  });
};

export const updateDCTransferRule = (postBody) => () => {
  return axiosInstance({
    url: DC_TRANSFER_RULE_UPDATE,
    method: "PUT",
    data: postBody,
  });
};