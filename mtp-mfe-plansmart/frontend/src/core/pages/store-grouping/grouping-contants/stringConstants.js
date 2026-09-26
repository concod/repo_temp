export const FILE_UPLOAD_INSTRUCTIONS = [
  "Please ensure Store Group name is unique.",
  "Please ensure Store Group name is less than 40 characters.",
  "Please ensure Store code is valid.",
  "Update stores from the same channel.",
  "Store Codes and Channel are case sensitive.",
];

export const CSV_CONFIG = [
  { label: "Store Group Name", key: "name" },
  { label: "Store Codes", key: "store_code" },
  { label: "Channel", key: "channel" },
];

export const MACROS_FILE_DETAILS = {
  rl_eu: {
    store_group_vba_template: {
      fileName: "Store Group VBA Template.xlsm",
      filePath: "rl_eu/Store Group VBA Template.xlsm",
    },
    store_capacity_vba_template: {
      fileName: "Store Capacity VBA Template.xlsm",
      filePath: "rl_eu/Store Capacity VBA Template.xlsm",
    },
    constraints_upload_vba_template: {
      fileName: "Constraints Upload Template VBA.xlsm",
      filePath: "rl_eu/Constraints Upload Template VBA.xlsm",
    },
  },
  rl_na: {
    store_group_vba_template: {
      fileName: "Store Group VBA Template.xlsm",
      filePath: "rl_na/Store Group VBA Template.xlsm",
    },
    constraints_upload_vba_template: {
      fileName: "Constraints Upload Template VBA.xlsm",
      filePath: "rl_na/Constraints Upload Template VBA.xlsm",
    },
    product_store_group_vba_template: {
      fileName : "Product Store Group Template VBA.xlsm",
      filePath : "rl_na/Product Store Group Template VBA.xlsm"
    }
  },
};

export const CONSTRAINTS_FILE_UPLOAD_INSTRUCTIONS = [
  "The Store Number, Material Number, and Size must be valid",
  "Min Constraints, Max Constraints and WOS values should be non-negative integers.(A value of -1 is permissible for the Min Constraints)",
  "Duplicates at the Material, Store, and Size levels are prohibited.",
  "The Min constraint entered must not be greater than the Max constraint.",
  "At least one of Min Constraints, Max Constraints and WOS should be Non Null.",
];


export const STORE_CAPACITY_FILE_UPLOAD_INSTRUCTIONS = [
  "Please ensure Store number is valid.",
  "Update stores from the same channel.",
  "Store Number and Channel are case sensitive.",
];


export const BACKDOOR_CSV_CONFIG = [
  { label: "Plan Name", key: "name" },
  { label: "Size", key: "sizes" },
  { label: "Material ID", key: "article" },
  { label: "Store ID", key: "stores" },
  { label: "IsPrepack", key: "isPack" },
  { label: "Units", key: "units" },
  { label: "Source ID", key: "source_id" },
  { label: "PO ID", key: "po_id" },
  { label: "Priority Code", key: "priority_code" },
  { label: "Instore date", key: "instore_date" },
  { label: "channel", key: "channel" },
];

export const BACKDOOR_FILE_UPLOAD_INSTRUCTIONS = [
  "Data type validation -",
  "Plan name, Size, material ID, store ID, Source Priority code, and IsPrepack must be in text format. If DC ID is not available, do not throw an error.",
  "The “Instore date” must be in dd/mm/yyyy format; an error will be thrown in case of a different date format.",
  "The IsPrepack flag must be written as Y. Any other text would indicate allocation units in eaches to indicate pre-pack quantity.",
  "The number of units to upload must be a positive integer or an error will be thrown.",
  "The Store Number, Material Number, and Size must be valid and present in the backend.",
  "If the DC inventory for a product is less than the aggregated inventory across the stores provided in the uploaded sheet, an error will be thrown.",
  "Duplicates at the Material, Store, and Size levels are prohibited.",
  "All fields must be filled before upload, or an error will be thrown.",
  "The DC number will be IP DC number ( 448, 290, 357, 3619,…) ",
  "IP Size codes will be used.",
  "Cross-country allocations are allowed in EMEA & NA.?",
  "EU Upload Allocation should restrict the pre-packs to the countries that are able to receive them.",
  "For Case pack allocations, users will ensure they provide the qty in multiples of case pack.",
  "In case of prepack allocation, if Store currency is not matching with Prepack Stock Cat currency for any available Stock_Cat, upload will be failed and error will be thrown.",
];

export const PRODUCT_STOREGROUP_MAPPING = [
  { label: "Channel", key: "channel" },
  { label: "Material Number", key: "article" },
  { label: "Available Store Group Name", key: "store-group_names" },
  { label: "Default", key: "default" },
];
export const PRODUCT_STOREGROUP_MAPPING_INSTRUCTIONS = [
  "Ensure that the Material Number and the corresponding Available Store Group Name are valid and exist in the backend system for the specified Channel.",
  "Ensure that the Channel specified is also valid.",
  "Enumerate all Store Groups that should appear in the Store Eligibility Group Dropdown on the CNA screen in the Available Store Group Name Column.",
  "Set  1 in the Default column to designate a Store Group as the Default Store Group. Conversely, use 0 or leave the Default  column as Null to indicate that the Store Group should not be considered as a Default Store Group.",
  "Duplicates at the Channel, Material Number and Store Group Name are prohibited.",
  "If a User wants to delete the  Store Group Mapping for a Material they can provide 1 in the Delete column in the Upload template containing   Channel, Material Number, Store Group Names and Default.",
  "If a user enters 1 in the Delete column corresponding to a Material - Channel combination  for  at least one row in the  upload file, all existing Store Group Mapping entries for that Material and Channel combination will be removed ( both Available and Default Store Groups )",
];
