import React, { useState, useEffect } from "react";
import { Modal, Badge } from "impact-ui-v3";
import { Tooltip, Divider } from "@mui/material";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";
import IS_ArrowRightIcon from "assets/IS_icons/IS_ArrowRight.svg";

const useStyles = makeStyles((theme) => ({
  changeSummaryHeader: {
    fontFamily: "Manrope",
    fontWeight: "800",
    fontSize: "16px",
    lineHeight: "24px",
  },
  sisterStoreMappingHeader: {
    fontFamily: "Manrope",
    fontSize: "16px",
    fontWeight: 600,
    color: colours.darkBlack,
    lineHeight: "24px",
  },
  changeItem: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #f0f0f0",
    borderRadius: "8px",
    overflow: "hidden",
    padding: "4px",
  },

  oldValue: {
    textDecoration: "line-through",
  },
  newValue: {
    color: colours.olive,
  },
  contentWrapper: {
    padding: theme.spacing(2),
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
    display: "flex",
  },
  sisterStoreMappingContainer: {
    marginTop: "10px",
    padding: "1rem",
  },
  columnValue: {
    fontFamily: "Manrope",
    fontWeight: "800",
    fontSize: "14px",
    lineHeight: "21px",
    color: colours.lightNeutrals,
    flex: 1,
    marginBottom: "4px",
    display: "flex",
    gap: "4px",
  },
  columnHeader: {
    fontFamily: "Manrope",
    fontWeight: "500",
    fontSize: "14px",
    flex: 1,
    color: colours.neutrals,
  },
  customTooltip: {
    fontSize: "12px",
    color: colours.doveGrayDark,
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    padding: "4px 8px",
    maxWidth: "300px",
    wordBreak: "break-word",
  },
  headersRow: { display: "flex", paddingBottom: "4px", marginBottom: "4px" },
  separator: { margin: "0 1rem", color: colours.separaterColor },
  valueRow: { display: "flex", gap: "4px" },
  tooltipText: { cursor: "pointer", marginLeft: "4px" },
  changedByText: {
    fontSize: "12px",
    color: colours.doveGrayDark,
    marginTop: 0,
    display: "block",
    textAlign: "center",
  },
}));

const NewApprovalSummaryPopup = (props) => {
  const [storeMappingChanges, setStoreMappingChanges] = useState([]);
  const [storeGroupMappingChanges, setStoreGroupMappingChanges] = useState([]);
  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    if (props.reviewSummaryData?.length > 0) {
      setStoreMappingChanges(
        props.reviewSummaryData.filter(
          (item) => item.data_type === "store_mapping"
        )
      );
      setStoreGroupMappingChanges(
        props.reviewSummaryData.filter(
          (item) => item.data_type === "store_group_mapping"
        )
      );
    }
  }, [props.reviewSummaryData]);

  const handleClose = () => {
    props.setShowReviewSummary(false);
  };

  // Common utility functions for both render functions
  const getChangeTypeInfo = (change_type) => {
    switch (change_type) {
      case "added":
        return { label: "Added", color: "success" };
      case "updated":
        return { label: "Modified", color: "warning" };
      case "deleted":
        return { label: "Deleted", color: "error" };
      default:
        return { label: change_type, color: "default" };
    }
  };

  const formatValuesWithCount = (values, isOld = false, colorValue = false) => {
    if (!values || values.length === 0) return "";

    const firstValue = Array.isArray(values) ? values[0] : values;
    const remainingCount = Array.isArray(values) ? values.length - 1 : 0;
    const remainingValues = Array.isArray(values) ? values.slice(1) : [];

    return (
      <span>
        <span
          className={
            isOld ? classes.oldValue : colorValue ? classes.newValue : ""
          }
        >
          {firstValue}
        </span>
        {remainingCount > 0 && (
          <Tooltip
            title={
              <div>
                {remainingValues.map((value, index) => (
                  <div key={index} className={isOld ? classes.oldValue : ""}>
                    {value}
                  </div>
                ))}
              </div>
            }
            arrow
            className={classes.customTooltip}
          >
            <span className={classes.tooltipText}>+{remainingCount}</span>
          </Tooltip>
        )}
      </span>
    );
  };

  const renderChangeBadge = (changeTypeInfo, changed_by_username) => (
    <div
      style={{
        minWidth: "85px",
        textAlign: "center",
      }}
    >
      <Badge
        color={changeTypeInfo.color}
        label={changeTypeInfo.label}
        size="default"
        variant="subtle"
      />
      <br />
      <span className={classes.changedByText}>by {changed_by_username}</span>
    </div>
  );

  const renderStoreMapping = (item) => {
    const { edit_details, changed_by_username, ref_key } = item;
    const { change_type, data } = edit_details;

    // Extract filters based on change type
    let filters = [];
    let oldFilters = [];
    if (change_type === "updated") {
      filters = data?.new?.filters || [];
      oldFilters = data?.old?.filters || [];
    } else if (change_type === "added") {
      filters = data?.filters || [];
    } else if (change_type === "deleted") {
      filters = data?.filters || [];
    }
    // Remove filters with attribute_name "created_by" or "created_by_code"
    const filterOutCreatedBy = (arr) =>
      Array.isArray(arr)
        ? arr.filter(
            (f) =>
              f?.attribute_name !== "created_by" &&
              f?.attribute_name !== "created_by_code"
          )
        : [];

    filters = filterOutCreatedBy(filters);
    oldFilters = filterOutCreatedBy(oldFilters);

    const changeTypeInfo = getChangeTypeInfo(change_type);

    // For updated case, we need to handle old and new filters differently
    if (change_type === "updated") {
      // Get the maximum number of filters to display all columns
      const maxLength = Math.max(filters.length, oldFilters.length);

      // Group filters into rows of 3, similar to added/deleted cases
      const filterRows = [];
      for (let i = 0; i < maxLength; i += 3) {
        const newFiltersSlice = filters.slice(i, i + 3);
        const oldFiltersSlice = oldFilters.slice(i, i + 3);

        // Create a row with up to 3 filter pairs
        const row = [];
        for (let j = 0; j < 3; j++) {
          const newFilter = newFiltersSlice[j];
          const oldFilter = oldFiltersSlice[j];

          if (newFilter || oldFilter) {
            row.push({ newFilter, oldFilter });
          }
        }

        if (row.length > 0) {
          filterRows.push(row);
        }
      }

      return (
        <div
          className={`${classes.changeItem} ${globalClasses.marginVertical1rem}`}
          key={`${change_type}-${ref_key}`}
        >
          {renderChangeBadge(changeTypeInfo, changed_by_username)}
          <span style={{ margin: "0 1rem", color: colours.separaterColor }}>
            {" "}
            |{" "}
          </span>
          <div style={{ flex: 1 }}>
            {filterRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                style={{
                  marginBottom: rowIndex < filterRows.length - 1 ? "38px" : "0",
                }}
              >
                {/* Headers Row */}
                <div
                  style={{
                    display: "flex",
                    paddingBottom: "4px",
                    marginBottom: "4px",
                  }}
                >
                  {row.map((filterPair, index) => {
                    const { newFilter, oldFilter } = filterPair;
                    const attributeName = props.sisterStoreMappedColumnConfig.find(
                      (item) =>
                        item.column_name === newFilter?.attribute_name ||
                        item.column_name === oldFilter?.attribute_name
                    )?.label;
                    return (
                      <div key={index} className={classes.columnHeader}>
                        {attributeName}
                      </div>
                    );
                  })}
                  {/* Add empty cells if row has less than 3 items */}
                  {row.length < 3 &&
                    Array.from({ length: 3 - row.length }).map((_, index) => (
                      <div key={`empty-${index}`} style={{ flex: 1 }} />
                    ))}
                </div>

                {/* Values Row */}
                <div style={{ display: "flex" }}>
                  {row.map((filterPair, index) => {
                    const { newFilter, oldFilter } = filterPair;

                    return (
                      <div className={classes.columnValue} key={index}>
                        {oldFilter && (
                          <div>
                            {formatValuesWithCount(oldFilter.values, true)}
                          </div>
                        )}
                        {oldFilter && newFilter && <IS_ArrowRightIcon />}
                        {newFilter && (
                          <div>
                            {formatValuesWithCount(
                              newFilter.values,
                              false,
                              true
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Add empty cells if row has less than 3 items */}
                  {row.length < 3 &&
                    Array.from({ length: 3 - row.length }).map((_, index) => (
                      <div key={`empty-value-${index}`} style={{ flex: 1 }} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // For added and deleted cases, keep the existing logic but also use the new format
    // Group filters into rows of 3
    const filterRows = [];
    for (let i = 0; i < filters.length; i += 3) {
      filterRows.push(filters.slice(i, i + 3));
    }

    return (
      <div
        className={`${classes.changeItem} ${globalClasses.marginVertical1rem}`}
        key={`${change_type}-${ref_key}`}
      >
        {renderChangeBadge(changeTypeInfo, changed_by_username)}
        <span style={{ margin: "0 1rem", color: colours.separaterColor }}>
          {" "}
          |{" "}
        </span>
        <div style={{ flex: 1 }}>
          {filterRows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                marginBottom: rowIndex < filterRows.length - 1 ? "38px" : "0",
              }}
            >
              {/* Headers Row */}
              <div className={classes.headersRow}>
                {row.map((filter, index) => {
                  const attributeName = props.sisterStoreMappedColumnConfig.find(
                    (item) => item.column_name === filter.attribute_name
                  )?.label;
                  return (
                    <div key={index} className={classes.columnHeader}>
                      {attributeName}
                    </div>
                  );
                })}
                {/* Add empty cells if row has less than 3 items */}
                {row.length < 3 &&
                  Array.from({ length: 3 - row.length }).map((_, index) => (
                    <div key={`empty-${index}`} style={{ flex: 1 }} />
                  ))}
              </div>

              {/* Values Row */}
              <div style={{ display: "flex" }}>
                {row.map((filter, index) => (
                  <div className={classes.columnValue} key={index}>
                    {formatValuesWithCount(filter.values, false)}
                  </div>
                ))}
                {/* Add empty cells if row has less than 3 items */}
                {row.length < 3 &&
                  Array.from({ length: 3 - row.length }).map((_, index) => (
                    <div key={`empty-value-${index}`} style={{ flex: 1 }} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStoreGroupMapping = (item) => {
    const { edit_details, changed_by_username, ref_key } = item;
    const { change_type, data } = edit_details;

    const changeTypeInfo = getChangeTypeInfo(change_type);

    // Extract data based on change type
    let storeGroups = [];
    let mappingDate = "";
    let sisterMappingDate = "";
    let oldStoreGroups = [];
    let oldMappingDate = "";
    let oldSisterMappingDate = "";

    if (change_type === "updated") {
      storeGroups = data?.new?.store_groups || [];
      mappingDate = data?.new?.store_group_mapping_date || "";
      sisterMappingDate = data?.new?.sister_store_mapping_date || "";
      oldStoreGroups = data?.old?.store_groups || [];
      oldMappingDate = data?.old?.store_group_mapping_date || "";
      oldSisterMappingDate = data?.old?.sister_store_mapping_date || "";
    } else if (change_type === "added") {
      storeGroups = data?.new?.store_groups || [];
      mappingDate = data?.new?.store_group_mapping_date || "";
      sisterMappingDate = data?.new?.sister_store_mapping_date || "";
    }

    return (
      <div
        className={`${classes.changeItem} ${globalClasses.marginVertical1rem}`}
        key={`group-${change_type}-${ref_key}`}
      >
        {renderChangeBadge(changeTypeInfo, changed_by_username)}
        <span className={classes.separator}> | </span>
        <div style={{ flex: 1 }}>
          {/* Headers Row */}
          <div className={classes.headersRow}>
            <div className={classes.columnHeader}>Store Groups</div>
            {!props.hideStoreGroupMappingDate && (
              <div className={classes.columnHeader}>
                Store Group Mapping Date
              </div>
            )}
            <div className={classes.columnHeader}>
              Sister Store Mapping Date
            </div>
          </div>

          {/* Values Row */}
          <div style={{ display: "flex" }}>
            {change_type === "updated" ? (
              <div className={classes.columnValue}>
                {!oldStoreGroups.length && !storeGroups.length && (
                  <span>-</span>
                )}
                {oldStoreGroups.length > 0 && (
                  <div>{formatValuesWithCount(oldStoreGroups, true)}</div>
                )}
                {oldStoreGroups.length > 0 && storeGroups.length > 0 && (
                  <IS_ArrowRightIcon />
                )}
                {storeGroups.length > 0 && (
                  <div>{formatValuesWithCount(storeGroups, false, true)}</div>
                )}
              </div>
            ) : (
              <div className={classes.columnValue}>
                {formatValuesWithCount(storeGroups, false)}
              </div>
            )}
            {!props.hideStoreGroupMappingDate && (
              <div className={classes.columnValue}>
                {change_type === "updated" ? (
                  <div className={classes.valueRow}>
                    {!oldMappingDate && !mappingDate && <span>-</span>}
                    {oldMappingDate && (
                      <span className={classes.oldValue}>{oldMappingDate}</span>
                    )}
                    {oldMappingDate && mappingDate && <IS_ArrowRightIcon />}
                    {mappingDate && (
                      <span className={classes.newValue}>{mappingDate}</span>
                    )}
                  </div>
                ) : (
                  mappingDate
                )}
              </div>
            )}
            <div className={classes.columnValue}>
              {change_type === "updated" ? (
                <div className={classes.valueRow}>
                  {!oldSisterMappingDate && !sisterMappingDate && (
                    <span>-</span>
                  )}
                  {oldSisterMappingDate && (
                    <span className={classes.oldValue}>
                      {oldSisterMappingDate}
                    </span>
                  )}
                  {oldSisterMappingDate && sisterMappingDate && (
                    <IS_ArrowRightIcon />
                  )}
                  {sisterMappingDate && (
                    <span className={classes.newValue}>
                      {sisterMappingDate}
                    </span>
                  )}
                </div>
              ) : (
                sisterMappingDate
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={props.showReviewSummary}
      onClose={() => handleClose()}
      onPrimaryButtonClick={() => props.handleTakeAction()}
      onSecondaryButtonClick={() => handleClose()}
      primaryButtonLabel="Approve"
      secondaryButtonLabel="Cancel"
      size="large"
      title="Change Log"
    >
      <div className={globalClasses.marginAround}>
        <span className={classes.changeSummaryHeader}>Change summary</span>
        {storeMappingChanges.length > 0 && (
          <div className={classes.sisterStoreMappingContainer}>
            <span className={classes.sisterStoreMappingHeader}>
              Sister store mapping changes
            </span>
            {storeMappingChanges.map((item, index) => renderStoreMapping(item))}
          </div>
        )}

        <Divider className={globalClasses.marginVertical2rem} />

        {storeGroupMappingChanges.length > 0 && (
          <>
            <div className={classes.sisterStoreMappingContainer}>
              <span className={classes.sisterStoreMappingHeader}>
                Store group mapping changes
              </span>
              {storeGroupMappingChanges.map((item, index) =>
                renderStoreGroupMapping(item)
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    reviewSummaryData:
      inventorysmartReducer.inventorySmartSisterStoreMappingService
        .reviewSummaryData?.approval_summary,
    hideStoreGroupMappingDate:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.hideStoreGroupMappingDate,
  };
};

export default connect(mapStateToProps, null)(NewApprovalSummaryPopup);
