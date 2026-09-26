import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Chip,
  Stack,
  Typography,
  Dialog,
  Button,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  DialogTitle,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Form from "core/Utils/form";
import globalStyles from "core/Styles/globalStyles";
import { setSavedFiltersList } from "core/actions/filterAction";
import { connect } from "react-redux";
import { find, isEmpty, trim, uniqueId } from "lodash";
import colours from "core/Styles/colours";
import { addSnack } from "core/actions/snackbarActions";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Prompt } from "impact-ui";
import Divider from "@mui/material/Divider";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles(() => ({
  paddingTop5px: {
    paddingTop: pxToRem(5),
    color: colours.lightslategray,
  },
  chipRoot: {
    "& .MuiChip-icon": {
      order: 1, // the label has a default order of 0, so this icon goes after the label
      marginRight: pxToRem(10), // add some space between icon and delete icon
      cursor: "pointer",
    },
    "& .MuiChip-deleteIcon": {
      order: 2, // since this is greater than an order of 1, it goes after the icon
    },
    "& .MuiSvgIcon-root": {
      "&:nth-last-child(2)": {
        marginRight: pxToRem(2),
      },
    },
  },
  addFilterIcon: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: colours.lightslategray,
  },
  chipContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: pxToRem(15),
    maxWidth: "100%",
    maxHeight: "9vh",
    overflow: "auto",
    "& .MuiChip-label": {
      marginLeft: pxToRem(9.5),
      marginRight: pxToRem(15),
      padding: pxToRem(0),
    },
  },
  actionIcon: {
    width: pxToRem(16),
    height: pxToRem(16),
    color: colours.lightslategray,
  },
  dividerStyle: {
    marginTop: pxToRem(15),
    marginBottom: pxToRem(15),
    border: `${pxToRem(0.7)} solid ${colours.silverChalice}`,
  },
  filterHeaderStyle: {
    font: `normal normal 500 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
  },
  chipStyles: {
    backgroundColor: colours.alabaster,
    padding: `${pxToRem(5)} ${pxToRem(10)} ${pxToRem(5)} ${pxToRem(5)}`,
    font: `normal normal normal ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    border: "none",
    "&.default": {
      border: `${pxToRem(1)} solid ${colours.webOrange}`,
      font: `normal normal normal ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    },
    "&.active": {
      border: `${pxToRem(1)} solid ${colours.slateGray}`,
      font: `normal normal 600 ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    },
    "&.default-active": {
      border: `${pxToRem(1)} solid ${colours.webOrange}`,
      font: `normal normal 600 ${pxToRem(12)}/${pxToRem(26)} Poppins`,
    },
  },
}));

const SavedFiltersSection = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const {
    filterSelected,
    setFilterSelected,
    isEditModalOpen,
    setIsEditModalOpen,
    onEditFilterClick,
  } = props;
  const [filterDetailsData, setFilterDetailsData] = useState([]);
  const [onConfirmAction, setOnConfirmAction] = useState({ action: null });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const onFilterChipClick = (filterName) => {
    if (filterName === filterSelected) {
      setFilterSelected("");
    } else {
      setFilterSelected(filterName);
    }
    handleFilterDetails([]);
  };

  const handleDelete = (filterName) => {
    setShowDeleteDialog(true);
    setOnConfirmAction({ action: () => props.onDeleteFilterClick(filterName) });
  };

  const onFilterChipEditClick = (e, filterName) => {
    handleFilterDetails([]);
    setFilterSelected(filterName);
    setIsEditModalOpen(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const EDIT_FILTER = useMemo(() => {
    let fields = [
      {
        label: "Filter Name",
        accessor: "filter_name",
        field_type: "TextField",
        required: true,
        maxLengthLimit: 40,
      },
    ];

    let applicable_to_fields = [
      {
        label: "Applicable to",
        field_type: "radioGroup",
        required: true,
        accessor: "screen_view_type",
        options: [
          {
            value: "this_screen",
            label: "This screen",
            isDisabled: false,
          },
          { value: "all_screen", label: "All screen", isDisabled: false },
        ],
      },
      {
        label: "View Type",
        field_type: "radioGroup",
        required: true,
        accessor: "users_view_type",
        options: [
          {
            value: "personal",
            label: "Personal",
            isDisabled: !isEmpty(filterSelected),
          },
          {
            value: "global",
            label: "Global",
            isDisabled: !isEmpty(filterSelected),
          },
        ],
      },
    ];
    fields.push({
      label: "Default for me",
      required: false,
      field_type: "BooleanField",
      accessor: "is_default_filter",
    });
    if (props.isFilterSaveGlobal) {
      fields = fields.concat(applicable_to_fields);
    }
    return fields;
  }, [filterSelected, props.isFilterSaveGlobal]);

  const handleFilterDetails = (data) => {
    setFilterDetailsData(data);
  };

  const saveFilterValidation = (formData) => {
    if (isEmpty(trim(formData?.filter_name))) {
      displaySnackMessages("Please provide a valid filter name", "error");
      return false;
    }
    return true;
  };

  const handleOnClickSave = (formData) => {
    if (!saveFilterValidation(formData)) {
      return;
    }
    let currentSelectionConfig = find(props.savedFilterData, [
      "name",
      filterSelected,
    ]);
    let isCloned = false;
    if (formData["screen_view_type"] || formData["users_view_type"]) {
      formData["applicable_to"] = `${formData["screen_view_type"]}${
        formData["users_view_type"] === "global" ? "_all_users" : ""
      }`;
    }
    if (
      currentSelectionConfig?.is_broadcast &&
      formData?.users_view_type === "personal"
    ) {
      isCloned = true;
    }
    onEditFilterClick(formData, isCloned);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const splitApplicableToDetails = () => {
    return filterSelected !== "" &&
      find(props.savedFilterData, ["name", filterSelected])?.screen_code ===
        3 &&
      !find(props.savedFilterData, ["name", filterSelected])?.is_broadcast
      ? "all_screen"
      : find(props.savedFilterData, ["name", filterSelected])?.screen_code ===
          3 &&
        find(props.savedFilterData, ["name", filterSelected])?.is_broadcast
      ? "all_screen_all_users"
      : !(
          find(props.savedFilterData, ["name", filterSelected])?.screen_code ===
          3
        ) && find(props.savedFilterData, ["name", filterSelected])?.is_broadcast
      ? "this_screen_all_users"
      : "this_screen";
  };
  const getDefaultValues = () => {
    const applicable_to_string = splitApplicableToDetails();
    const users_view_type = applicable_to_string?.includes("all_users")
      ? "global"
      : "personal";
    const screen_view_type = applicable_to_string?.includes("all_screen")
      ? "all_screen"
      : "this_screen";
    return {
      ["filter_name"]: filterSelected,
      ["is_default_filter"]: find(props.savedFilterData, [
        "name",
        filterSelected,
      ])?.is_default,
      ["screen_view_type"]: screen_view_type,
      ["users_view_type"]: users_view_type,
    };
  };

  const seperateGlobalPersonalFilters = (type = "personal") => {
    return props.savedFilterData.filter((eachFilter) => {
      return type === "global"
        ? eachFilter.is_broadcast
        : !eachFilter.is_broadcast;
    });
  };

  return (
    <div>
      {props.isFilterSaveGlobal ? (
        <>
          <Divider className={classes.dividerStyle}></Divider>
          <div
            className={`${globalClasses.marginTop} ${globalClasses.marginBottom}`}
          >
            <Typography className={classes.filterHeaderStyle}>
              Global Filters{" "}
            </Typography>
          </div>
          <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
            <Stack direction="row" className={classes.chipContainer}>
              {seperateGlobalPersonalFilters("global").length !== 0 ? (
                seperateGlobalPersonalFilters("global").map((filter) => {
                  return (
                    <Chip
                      classes={{
                        root: classes.chipRoot,
                      }}
                      label={filter.name}
                      variant={"outlined"}
                      onDelete={() => null}
                      avatar={
                        filterSelected === filter.name ? (
                          <>
                            <CheckCircleRoundedIcon color="success" />
                          </>
                        ) : null
                      }
                      deleteIcon={
                        <>
                          <EditOutlinedIcon
                            fontSize="small"
                            className={classes.actionIcon}
                            onClick={(e) =>
                              onFilterChipEditClick(e, filter.name)
                            }
                            id={uniqueId()}
                          />
                          <DeleteOutlinedIcon
                            id={uniqueId()}
                            className={classes.actionIcon}
                            fontSize="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(filter.name);
                            }}
                          />
                        </>
                      }
                      onClick={() => onFilterChipClick(filter.name)}
                      className={`${classes.chipStyles} ${
                        filter.is_default && filterSelected === filter.name
                          ? "default-active"
                          : filter.is_default
                          ? "default"
                          : filterSelected === filter.name
                          ? "active"
                          : ""
                      }`}
                    />
                  );
                })
              ) : (
                <Typography
                  variant="h7"
                  gutterBottom
                  className={classes.paddingTop5px}
                >
                  {"No global filter(s) have been added"}
                </Typography>
              )}
              {props.savedFilterData.length !== 0 && filterSelected !== "" && (
                <div className={classes.addFilterIcon}>
                  <AddRoundedIcon
                    fontSize="medium"
                    onClick={() => setFilterSelected("")}
                  />
                </div>
              )}
            </Stack>
          </div>
          <Divider className={classes.dividerStyle}></Divider>
          <div
            className={`${globalClasses.marginTop} ${globalClasses.marginBottom}`}
          >
            <Typography className={classes.filterHeaderStyle}>
              Personal Filters{" "}
            </Typography>
          </div>
          <div>
            <Stack direction="row" className={classes.chipContainer}>
              {seperateGlobalPersonalFilters("personal").length !== 0 ? (
                seperateGlobalPersonalFilters("personal").map((filter) => {
                  return (
                    <Chip
                      classes={{
                        root: classes.chipRoot,
                      }}
                      label={filter.name}
                      variant={"outlined"}
                      onDelete={() => null}
                      avatar={
                        filterSelected === filter.name ? (
                          <>
                            <CheckCircleRoundedIcon color="success" />
                          </>
                        ) : null
                      }
                      deleteIcon={
                        <>
                          <EditOutlinedIcon
                            fontSize="small"
                            className={classes.actionIcon}
                            onClick={(e) =>
                              onFilterChipEditClick(e, filter.name)
                            }
                            id={uniqueId()}
                          />
                          <DeleteOutlinedIcon
                            id={uniqueId()}
                            className={classes.actionIcon}
                            fontSize="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(filter.name);
                            }}
                          />
                        </>
                      }
                      onClick={() => onFilterChipClick(filter.name)}
                      className={`${classes.chipStyles} ${
                        filter.is_default && filterSelected === filter.name
                          ? "default-active"
                          : filter.is_default
                          ? "default"
                          : filterSelected === filter.name
                          ? "active"
                          : ""
                      }`}
                    />
                  );
                })
              ) : (
                <Typography
                  variant="h7"
                  gutterBottom
                  className={classes.paddingTop5px}
                >
                  {"No personal filter(s) have been added"}
                </Typography>
              )}
              {props.savedFilterData.length !== 0 && filterSelected !== "" && (
                <div className={classes.addFilterIcon}>
                  <AddRoundedIcon
                    fontSize="medium"
                    onClick={() => setFilterSelected("")}
                  />
                </div>
              )}
            </Stack>
          </div>
        </>
      ) : (
        <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
          <div>
            <Typography
              variant="h6"
              gutterBottom
              className={`${classes.paddingTop5px} ${classes.filterHeaderStyle}`}
            >
              {"All: "}
            </Typography>
          </div>
          <Stack direction="row" className={classes.chipContainer}>
            {props.savedFilterData.length !== 0 ? (
              props.savedFilterData.map((filter) => {
                return (
                  <Chip
                    classes={{
                      root: classes.chipRoot,
                    }}
                    label={filter.name}
                    variant={"outlined"}
                    onDelete={() => null}
                    avatar={
                      filterSelected === filter.name ? (
                        <>
                          <CheckCircleRoundedIcon color="success" />
                        </>
                      ) : null
                    }
                    deleteIcon={
                      <>
                        <EditOutlinedIcon
                          fontSize="small"
                          className={classes.actionIcon}
                          onClick={(e) => onFilterChipEditClick(e, filter.name)}
                          id={uniqueId()}
                        />
                        <DeleteOutlinedIcon
                          id={uniqueId()}
                          className={classes.actionIcon}
                          fontSize="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(filter.name);
                          }}
                        />
                      </>
                    }
                    onClick={() => onFilterChipClick(filter.name)}
                    className={`${classes.chipStyles} ${
                      filter.is_default && filterSelected === filter.name
                        ? "default-active"
                        : filter.is_default
                        ? "default"
                        : filterSelected === filter.name
                        ? "active"
                        : ""
                    }`}
                  />
                );
              })
            ) : (
              <Typography
                variant="h7"
                gutterBottom
                className={classes.paddingTop5px}
              >
                {"No saved filter(s) have been added"}
              </Typography>
            )}
            {props.savedFilterData.length !== 0 && filterSelected !== "" && (
              <div className={classes.addFilterIcon}>
                <AddRoundedIcon
                  fontSize="medium"
                  onClick={() => setFilterSelected("")}
                />
              </div>
            )}
          </Stack>
        </div>
      )}

      <Dialog
        onClose={() => {}}
        className={classes.root}
        maxWidth={"sm"}
        aria-labelledby="customized-dialog-title"
        open={isEditModalOpen}
        fullWidth={true}
        disableEscapeKeyDown={true}
      >
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5" gutterBottom>
              Save Filter
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setIsEditModalOpen(false)}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div className={classes.contentBody}>
            <Form
              handleChange={handleFilterDetails}
              fields={EDIT_FILTER}
              updateDefaultValue={true}
              defaultValues={getDefaultValues()}
              spacing={1.5}
            ></Form>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditModalOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleOnClickSave(filterDetailsData)}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Prompt
        isOpen={showDeleteDialog}
        title="Delete filter"
        subHeading={"Are you sure you want to delete this filter?"}
        infoList={[]}
        primaryButtonProps={{
          children: "Yes",
          onClick: () => {
            onConfirmAction.action?.();
            setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: "No",
          onClick: () => {
            setShowDeleteDialog(false);
            setOnConfirmAction({ action: null });
          },
        }}
        variant="error"
      />
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    isFilterSaveGlobal:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .isFilterSaveGlobal,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setSavedFiltersList: (data) => dispatch(setSavedFiltersList(data)),
    addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SavedFiltersSection);
