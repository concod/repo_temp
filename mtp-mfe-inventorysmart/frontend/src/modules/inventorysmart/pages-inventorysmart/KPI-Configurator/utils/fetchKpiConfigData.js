import { showSnackMessage } from "core/Utils/utils";

/**
 * Fetches KPI config data from API
 * @param {Object} params - Configuration object
 * @param {Function} params.setData - State setter function for the data
 * @param {Function} params.setLoading - State setter function for loading state
 * @param {string} params.errorMessage - Error message to display on failure
 * @param {Object} params.props - Component props containing getKpiConfigList and addSnack
 * @returns {Promise<void>}
 */
export const fetchKpiConfigData = async ({
  setData,
  setLoading,
  errorMessage,
  props,
}) => {
  setLoading(true);
  try {
    const response = await props.getKpiConfigList();

    if (response?.data?.success || response?.data?.data) {
      const data = response?.data?.data || response?.data || [];
      setData(data);
    } else {
      setData([]);
    }
  } catch (error) {
    console.error(`Error fetching ${errorMessage}:`, error);
    setData([]);
    showSnackMessage(
      props.addSnack,
      error?.response?.data?.message || `Failed to fetch ${errorMessage}`,
      "error"
    );
  } finally {
    setLoading(false);
  }
};

/**
 * Fetches Calculated Fields data from API
 * @param {Object} params - Configuration object
 * @param {Function} params.setData - State setter function for the data
 * @param {Function} params.setLoading - State setter function for loading state
 * @param {string} params.errorMessage - Error message to display on failure
 * @param {Object} params.props - Component props containing getCalculatedFields and addSnack
 * @returns {Promise<void>}
 */
export const fetchFields = async ({
  setData,
  setLoading,
  errorMessage,
  props,
}) => {
  setLoading(true);
  try {
    const response = await props.getCalculatedFields();

    if (response?.data?.success || response?.data?.data) {
      const data = response?.data?.data || response?.data || [];
      setData(data);
    } else {
      setData([]);
    }
  } catch (error) {
    setData([]);
    showSnackMessage(
      props.addSnack,
      error?.response?.data?.message || `Failed to fetch ${errorMessage}`,
      "error"
    );
  } finally {
    setLoading(false);
  }
};