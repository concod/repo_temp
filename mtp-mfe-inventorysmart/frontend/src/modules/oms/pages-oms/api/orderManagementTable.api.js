import axiosInstance from "../../../../core/Utils/axios/index";
import {
  OMS_ORDER_MANAGEMENT_COPY_PASTE,
  OMS_ORDER_MANAGEMENT_CALCULATE,
  OMS_ORDER_MANAGEMENT_UNDO,
  OMS_ORDER_MANAGEMENT_RESET,
  OMS_ORDER_MANAGEMENT_SAVE,
} from "../../../../config/api/index";
import {
  setOrderManagementLoader,
  setOrderManagementResp,
} from "../OrderManagement/slices/grid.slice";

/**
 * Sends clipboard paste data to the OMS grid backend.
 * Routes to /api/v3/oms/order-management/copy-paste via isV3: true.
 */
export const orderManagementTableCopyPasteApi =
  (params = {}) =>
  async (dispatch) => {
    dispatch(setOrderManagementLoader(true));
    try {
      const response = await axiosInstance({
        url: OMS_ORDER_MANAGEMENT_COPY_PASTE,
        method: "POST",
        data: { module: "order-management", ...params },
        isV3: true,
      });
      return response?.data;
    } catch (error) {
      console.error("[OMS] copy-paste api failed", error);
    } finally {
      dispatch(setOrderManagementLoader(false));
    }
  };

/**
 * Triggers a calculation run on the OMS grid backend.
 * Routes to /api/v3/oms/order-management/calculate via isV3: true.
 */
export const orderManagementTableCalculateApi =
  (params = {}) =>
  async (dispatch) => {
    dispatch(setOrderManagementLoader(true));
    try {
      const response = await axiosInstance({
        url: OMS_ORDER_MANAGEMENT_CALCULATE,
        method: "POST",
        data: { module: "order-management", ...params },
        isV3: true,
      });
      return response?.data;
    } catch (error) {
      console.error("[OMS] calculate api failed", error);
    } finally {
      dispatch(setOrderManagementLoader(false));
    }
  };

/**
 * Triggers an undo operation on the OMS grid backend.
 * Routes to /api/v3/oms/order-management/undo via isV3: true.
 */
export const orderManagementTableUndoApi =
  (params = {}) =>
  async (dispatch) => {
    dispatch(setOrderManagementLoader(true));
    try {
      const response = await axiosInstance({
        url: OMS_ORDER_MANAGEMENT_UNDO,
        method: "POST",
        data: { module: "order-management", ...params },
        isV3: true,
      });
      return response?.data;
    } catch (error) {
      console.error("[OMS] undo api failed", error);
    } finally {
      dispatch(setOrderManagementLoader(false));
    }
  };

/**
 * Resets all unsaved edits to the last saved state.
 * Routes to /api/v3/oms/order-management/reset via isV3: true.
 */
export const orderManagementTableResetApi =
  (params = {}) =>
  async (dispatch) => {
    dispatch(setOrderManagementLoader(true));
    try {
      const response = await axiosInstance({
        url: OMS_ORDER_MANAGEMENT_RESET,
        method: "POST",
        data: { module: "order-management", ...params },
        isV3: true,
      });
      if (response?.data) {
        dispatch(setOrderManagementResp(response.data?.data ?? response.data));
      } else {
        dispatch(setOrderManagementResp({ col_def: [], data_row: [] }));
      }
    } catch (error) {
      console.error("[OMS] reset api failed", error);
      dispatch(setOrderManagementResp({ col_def: [], data_row: [] }));
    } finally {
      dispatch(setOrderManagementLoader(false));
    }
  };

/**
 * Saves pending edits to the OMS grid backend.
 * Routes to /api/v3/oms/order-management/save via isV3: true.
 */
export const orderManagementTableSaveApi =
  (params = {}) =>
  async (dispatch) => {
    dispatch(setOrderManagementLoader(true));
    try {
      const response = await axiosInstance({
        url: OMS_ORDER_MANAGEMENT_SAVE,
        method: "POST",
        data: { module: "order-management", ...params },
        isV3: true,
      });
      return response?.data;
    } catch (error) {
      console.error("[OMS] save api failed", error);
    } finally {
      dispatch(setOrderManagementLoader(false));
    }
  };
