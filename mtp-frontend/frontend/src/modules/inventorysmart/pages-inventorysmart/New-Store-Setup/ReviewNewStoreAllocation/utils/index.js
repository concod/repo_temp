//
// Table names
//

export const STORE_TABLE_NAME = "new_store_review_allocation_store_details";
export const STORE_GROUP_TABLE_NAME =
  "new_store_review_allocation_store_groups";
export const SELECTED_PRODUCTS_TABLE_NAME =
  "new_store_review_allocation_selected_products";

//
// Notification message
//

export const STORE_DETAILS_COLUMN_FETCH_ERROR =
  "Store details table fetch failed";
export const STORE_DETAILS_DATA_FETCH_ERROR = "Store details data fetch failed";
export const STORE_GROUP_COLUMN_FETCH_ERROR = "Store group table fetch failed";
export const SELECTED_PRODUCTS_COLUMN_FETCH_ERROR =
  "Selected products table fetch failed";
export const SELECTED_PRODUCTS_DATA_FETCH_ERROR =
  "Selected products data fetch failed";
export const SELECTED_PRODUCTS_DATA_DOWNLOAD_INFO =
  "Download request is running in the background. You will get a notification once data is ready for download";
export const SELECTED_PRODUCTS_DATA_DOWNLOAD_ERROR =
  "Selected products data download failed";

export const SNACK_MSG_VARIANTS = {
  ERROR: "error",
  INFO: "info",
};

//
// Helpers
//

export const displaySnackMessages = (addSnack = () => {}, message, variant) => {
  addSnack({
    message,
    options: {
      variant,
    },
  });
};

export const displaySnackMessagesByType = (addSnack = () => {}, variant) => (
  message
) => {
  addSnack({
    message,
    options: {
      variant,
    },
  });
};

export const getBreadCrumbWithAction = (action) => [
  {
    id: 1,
    label: "Configurations",
    action,
  },
  {
    id: 2,
    label: "Review New Store Allocation",
  },
];

export const getStoreId = (location) => {
  const urlSearchParams = new URLSearchParams(location.search);
  const storeIdStr = urlSearchParams.get("store_id");
  const storeId = Number(storeIdStr);

  return storeId;
};
