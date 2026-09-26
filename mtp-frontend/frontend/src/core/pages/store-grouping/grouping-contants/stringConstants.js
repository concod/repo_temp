export const FILE_UPLOAD_INSTRUCTIONS = [
  "Please ensure Store Group name is unique.",
  "Please ensure Store Group name is less than 40 characters.",
  "Please ensure Store code is valid.",
  "Update stores from the same channel.",
  "Store Codes and Channel are case sensitive.",
  "New Store cannot be added /delete from store groups before opening date."
];

export const CSV_CONFIG = [
  { label: "Store Group Name", key: "name" },
  { label: "Store Codes", key: "store_code" },
  { label: "Channel", key: "channel" },
];

export const CSV_CONFIG_WITH_DELETE = [
  { label: "Store Group Name", key: "name" },
  { label: "Store Codes", key: "store_code" },
  { label: "Channel", key: "channel" },
  { label: "Delete", key: "delete" },
];

export const MACROS_FILE_DETAILS = {
    store_group_vba_template: {
      fileName: "Store Group Template VBA.xlsm",
      filePath: "Store Group Template VBA.xlsm",
    },
    store_capacity_vba_template: {
      fileName: "Store Capacity Template VBA.xlsm",
      filePath: "Store Capacity Template VBA.xlsm",
    },
    constraints_upload_vba_template: {
      fileName: "Constraints Upload Template VBA.xlsm",
      filePath: "Constraints Upload Template VBA.xlsm",
    },
    product_store_group_vba_template: {
      fileName: "Product Store Group Template VBA.xlsm",
      filePath: "Product Store Group Template VBA.xlsm",
    },
    backdoor_allocation_vba_template: {
      fileName: "Backdoor Allocation Template VBA.xlsm",
      filePath: "Backdoor Allocation Template VBA.xlsm",
    },
    user_reserve_vba_template: {
      fileName: "User Reserve Template VBA.xlsm",
      filePath: "User Reserve Template VBA.xlsm"
    },
    product_supersession_vba_template: {
      fileName: "Product Supersession Template VBA.xlsm",
      filePath: "Product Supersession Template VBA.xlsm"
    },
    plr_upload_template: {
      fileName: "PLR Upload Template VBA.xlsm",
      filePath: "PLR Upload Template VBA.xlsm"
    }
};


export const CONSTRAINTS_FILE_UPLOAD_INSTRUCTIONS = [
  "The Store Number, Material Number, and Size must be valid",
  "Min Constraints, Max Constraints and WOS values should be non-negative integers.",
  "Duplicates at the Material, Store, and Size levels are prohibited.",
  "The Min constraint entered must not be greater than the Max constraint.",
  "At least one of Min Constraints, Max Constraints and WOS should be Non Null.",
  "Delete column can have value of 1, 0 or null values."
];

export const STORE_CAPACITY_FILE_UPLOAD_INSTRUCTIONS = [
  "The Store Number should be valid.",
  "Store/Receipt/Carton Capacity should be non negative integer value.",
  "No Duplicate Store number",
  "Atleast one capacity column must be non Null"
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
  "DC / User Reserve - ",
  "Data type validation -",
  "Plan name, Size, material ID, store ID, Source Priority code must be in text format.",
  "The “Instore date” must be in mm/dd/yyyy format; an error will be thrown in case of a different date format.",
  "The number of units to upload must be a positive integer or an error will be thrown.",
  "The Store Number, Material Number, and Size must be valid and present in the backend.",
  "If the DC inventory for a product is less than the aggregated inventory across the stores provided in the uploaded sheet, an error will be thrown.",
  "Duplicates at the Material, Store, and Size levels are prohibited.",
  "Plan Name, Material ID, Store ID, Units, Source ID, Channel, Nosize columns must be filled before upload, or an error will be thrown.",
  "The DC number will be IP DC number ( 448, 290, 357, 720) ",
  "User Reserve DC (8003)",
  "IP Size codes will be used.",
  "Cross-country allocations are allowed in NA.",
  "For Case pack allocations, users will ensure they provide the quantity in multiples of case pack.",
  "Size must be NULL for all 'No Size' 1",
  "Size must be entered for all 'No Size' 0",
  "No Size must be either 0 or 1 ",
  "The material ID cannot correspond to an 'Old Material' in a supersession mapping.",
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
  "Upload Type must be either 'O' for Overwrite or 'A' for Append, and it cannot be left blank.",
  "Upload Type can be one of ‘A' or 'O' but not both for same material-channel combination.",
];

export const USER_RESERVE_FILE_UPLOAD_INSTRUCTIONS = [
  "The Material Number must be present & should be valid.",
  "Material, Size, and SourceID must not have duplicates.",
  "Sizes must be non-null ",
  "The IsPrepack column can be null or 0 only.",
  "The Stockcat column should be blank.",
  "SourceID must be non-null, and must be a valid DC code.",
  "User Reserved Quantity must be non-negative , non-null & should be lesser than DC available.",
  "The file cannot contain more than 100,000 records.",
];

export const PRODUCT_SUPERSESSION_FILE_UPLOAD_INSTRUCTIONS = [
  "The Material Number and Old Material Number must be present & valid.",
  "Priority has to be either null for all Old ,New Material number combination or be a non zero integer starting from 1.",
  "The Mapping Start Date can  be null  but cannot be in the past and format must be MM/DD/YYYY.",
  "The Delete column must take either 0, 1, or null values.",
  "The file cannot contain more than 100,000 records.",
  "Duplicates at Material, Old Material and Priority levels are prohibited.",
];

export const PO_FILE_UPLOAD_INSTRUCTIONS = [
  "PO - ",
  "The Source ID column must have one of the wholesale DC values (8880,8882,8883,8884,8004) for placeholder PO Allocation.",
  "Upload file can contain either a normal backdoor allocation flow or Placeholder PO Allocation Flow details.",
  "Allocated quantity is not validated against inventory available for Placeholder PO Upload type.",
  "The 'No Size' column value must be 0",
  "Size must be entered for all rows"
];
