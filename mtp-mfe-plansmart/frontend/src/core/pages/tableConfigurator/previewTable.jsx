import React, { useEffect, useState } from "react";
import AgGrid from "core/Utils/agGrid";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import Popover from "@mui/material/Popover";
import { Button } from "impact-ui";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsIcon from "@mui/icons-material/Settings";
import TableFormRenderer from "./tableFormRenderer";
import { isEmpty, cloneDeep } from "lodash";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import { Typography } from "@mui/material";
import { hasCaseInsensitiveDuplicates } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { SEARCHABLE_TYPES } from "./constant";

const useStyles = makeStyles((theme) => ({
  colSettingsWrapper: {
    minWidth: "15rem",
    background: theme.palette.common.white,
    padding: "1rem",
  },
  colSettingsHeaderConatiner: {
    gap: "0.25rem",
  },
  colSettingsHeaderIcon: {
    "&.MuiSvgIcon-fontSizeSmall": {
      fontSize: "1rem",
    },
  },
  menuDivider: {
    borderBottom: `1px solid ${theme.palette.text.disabled}`,
  },
}));

const CustomHeader = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { column, displayName, allMappings = [] } = props;
  const [anchorEl, setAnchorEl] = useState(null);
  const [formState, setFormState] = useState(null);
  const [colId, setColId] = useState(null);
  const [disableForm, setDisableForm] = useState(false);

  useEffect(() => {
    initializeConfigurationForm();
  }, [props]);

  /**
   * @function
   * @description Declare and update state with primary values.
   */
  const initializeConfigurationForm = () => {
    const colConfig = {
      label: displayName,
      is_editable: Boolean(column?.colDef?.is_editable),
      is_searchable: Boolean(column?.colDef?.is_searchable),
      is_frozen: Boolean(column?.colDef?.is_frozen),
      is_sortable: Boolean(column?.colDef?.is_sortable),
    };
    setDisableForm(!["product", "store"].includes(column?.colDef?.dimension));
    setColId(column?.colId);
    setFormState(colConfig);
  };

  /**
   * @function
   * @description Handle click operation and assign target to the popup
   * @param {Object} event
   */
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  /**
   * @function
   * @description Update states as the changes are made to form
   * @param {Object} change
   * @param {String} key
   */
  const handelChange = (change, key) => {
    let newFormObj = cloneDeep(formState);
    newFormObj[key] = change[key];
    setFormState(newFormObj);
  };

  /**
   * @function
   * @description Handle save operation and close popup
   */
  const handleSave = () => {
    const allLabels = [];
    allMappings.forEach((col) => {
      if (col.column_name != colId) {
        allLabels.push(col.label);
      }
    });
    allLabels.push(formState.label.trim());
    if (hasCaseInsensitiveDuplicates(allLabels)) {
      props.addSnack({
        message: `Label shouldn't match other attribute labels.`,
        options: {
          variant: "error",
        },
      });
      return;
    }
    props.updateTableConfig({
      ...formState,
      label: formState.label.trim(),
      column_name: colId,
    });
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? "column-settings" : undefined;

  return (
    <div className={`custom-header-container`}>
      <span className="ag-header-cell-text">
        {column?.getColDef()?.headerName}
      </span>

      <div className="icon-div">
        <MoreVertIcon
          aria-describedby={id}
          variant="contained"
          onClick={handleClick}
        />
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
        >
          <div
            className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.colSettingsWrapper} ${classes.colSettingsHeaderConatiner} ${globalClasses.paddingAround} ${classes.colSettingsWrapper}`}
          >
            <Typography
              className={`${globalClasses.flexRow} ${classes.colSettingsHeaderConatiner} ${globalClasses.verticalAlignCenter} ${globalClasses.marginBottom}`}
              variant="h6"
            >
              <SettingsIcon
                className={classes.colSettingsHeaderIcon}
                fontSize="small"
              />{" "}
              Column Settings
            </Typography>
            {!isEmpty(formState) &&
              Object.keys(formState)?.map((form, index) => {
                // if(SEARCHABLE_TYPES.includes(formState[form]))
                // Handle for searchable types
                return (
                  <>
                    <TableFormRenderer
                      onChange={(change) => handelChange(change, form)}
                      value={formState[form]}
                      formKey={form}
                      disableForm={disableForm}
                    />
                    {Object.keys(formState).length !== index + 1 && (
                      <div className={classes.menuDivider} />
                    )}
                  </>
                );
              })}
            <div
              className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.layoutAlignEnd} ${globalClasses.marginTop}`}
            >
              <Button variant="url" onClick={initializeConfigurationForm} disabled={disableForm}>
                Reset
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={disableForm}>
                Save
              </Button>
            </div>
          </div>
        </Popover>
      </div>
    </div>
  );
};

export const PreviewTable = (props) => {
  const { tablePayloadConfiguration, allMappings } = { ...props };
  const [updatedConfig, setUpdatedConfig] = useState({});
  const [columns, setColumns] = useState([]);

  // will be removed later if not required
  // const previewTableInstance = useRef({});
  // const loadTableInstance = (params) => {
  //   previewTableInstance.current = params;
  // };

  useEffect(() => {
    setUpTableColumns();
  }, [tablePayloadConfiguration]);

  /**
   * @function
   * @description Call Parent update function to update the configuration on changes
   */
  useEffect(() => {
    props.updateConfig(updatedConfig);
  }, [updatedConfig]);

  /**
   * @function
   * @desc Update table column data based on user form input
   */
  const setUpTableColumns = () => {
    const groupedCol = (cloneDeep(tablePayloadConfiguration?.groups) || []).map(
      (group) => {
        return {
          column_name: group.column_name,
          is_deleted: group.is_deleted,
          label: group.label,
          dimension: group.dimension,
          order_of_display: group.order_of_display,
          sub_headers: cloneDeep(group?.mappings),
        };
      }
    );
    let cols = [
      ...(cloneDeep(tablePayloadConfiguration?.mappings) || []),
      ...groupedCol,
    ];
    cols = agGridColumnFormatter(cols);
    setColumns(cols);
  };

  return (
    <div>
      <AgGrid
        columns={columns}
        rowdata={[]}
        skipAutoSizeColumn
        sizeColumnsToFitFlag
        sideBar={false}
        pagination={false}
        tableId="configuration-table-preview"
        customHeaderComponent={(tableProps) => (
          <CustomHeader
            {...tableProps}
            allMappings={allMappings}
            addSnack={props.addSnack}
            updateTableConfig={(config) => setUpdatedConfig(config)}
          />
        )}
      />
    </div>
  );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      addSnack,
    },
    dispatch
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(PreviewTable);
