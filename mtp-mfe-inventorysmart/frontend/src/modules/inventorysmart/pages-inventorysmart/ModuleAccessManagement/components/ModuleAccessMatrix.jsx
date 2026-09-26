import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { Select, Switch } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import OverflowTooltip from "core/Utils/agGrid/OverflowTooltip";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useStyles } from "../styles";
import FullAccessIcon from "assets/ModuleAccessManagement/FullAccessIcon.svg";
import ViewOnlyTableIcon from "assets/ModuleAccessManagement/ViewOnlyTableIcon.svg";
import NoAccessIcon from "assets/ModuleAccessManagement/NoAccessIcon.svg";

/* ── Access icon config ── */

const ACCESS_ICON_CONFIG = {
  full: { Icon: FullAccessIcon },
  view: { Icon: ViewOnlyTableIcon },
  none: { Icon: NoAccessIcon },
};

/* ── Cell Renderers ── */

const EditAccessCellRenderer = ({ data, onEditAccessChange }) => (
  <Switch
    value={!!data?.editAccess}
    checked={!!data?.editAccess}
    onChange={(e) => onEditAccessChange && onEditAccessChange(data.id, e.target.checked)}
    color="primary"
  />
);

const ModuleCellRenderer = (params) => {
  const { data } = params;
  const classes = useStyles();
  return (
    <div className={classes.moduleCellContainer}>
      <div className={classes.moduleCellName}>
        <OverflowTooltip {...params} value={data?.name} />
      </div>
      {data?.description && (
        <div className={classes.moduleCellDesc}>
          <OverflowTooltip {...params} value={data?.description} />
        </div>
      )}
    </div>
  );
};

const AccessBadgeCellRenderer = ({ data, colDef, column: agColumn, onAccessChange, accessLevels }) => {
  const classes = useStyles();
  const { roleId } = colDef;
  const value = data?.access?.[roleId] || "none";

  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(accessLevels);
  const [selected, setSelected] = useState(
    () => accessLevels?.find((o) => o.value === value) || null
  );

  const userClearedRef = useRef(false);

  useEffect(() => {
    if (userClearedRef.current) {
      userClearedRef.current = false;
      return;
    }
    setSelected(accessLevels?.find((o) => o.value === value) || null);
  }, [value]);

  const handleSelect = (opt) => {
    if (!opt || (Array.isArray(opt) && opt.length === 0)) {
      userClearedRef.current = true;
      setSelected(null);
      onAccessChange(data.id, roleId, "none");
    } else {
      const chosen = Array.isArray(opt) ? opt[0] : opt;
      setSelected(chosen);
      onAccessChange(data.id, roleId, chosen.value);
    }
  };

  const iconCfg = selected ? ACCESS_ICON_CONFIG[selected.value] : null;

  const enrichedOptions = accessLevels?.map((opt) => {
    const cfg = ACCESS_ICON_CONFIG[opt.value];
    return {
      ...opt,
      label: (
        <span className={classes.accessOptionLabel}>
          {cfg && <cfg.Icon className={classes.accessOptionIcon} />}
          {opt.label}
        </span>
      ),
    };
  });

  return (
    <Select
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      initialOptions={enrichedOptions}
      currentOptions={enrichedOptions}
      setCurrentOptions={setCurrentOptions}
      selectedOptions={selected}
      setSelectedOptions={handleSelect}
      placeholder="Access Type"
      isWithIcon={!!iconCfg}
      icon={iconCfg ? <iconCfg.Icon className={classes.accessSelectIcon} /> : null}
      isWithSearch={false}
      isClearable
      isCloseWhenClickOutside
      isAgGridCellRenderer={true}
      column={agColumn}
      withPortal
    />
  );
};

/* ── Main Component ── */

const ModuleAccessMatrix = ({ modules, roles, accessLevels, onAccessChange, onEditAccessChange }) => {
  const classes = useStyles();
  const tableInstance = useRef(null);

  const loadTableInstance = useCallback((instance) => {
    tableInstance.current = instance;
  }, []);

  const columnDefs = useMemo(
    () => [
      {
        headerName: "Module",
        field: "name",
        cellRendererFramework: ModuleCellRenderer,
        tooltipValueGetter: (params) =>
          params.data
            ? `${params.data.name}${params.data.description ? ` — ${params.data.description}` : ""}`
            : "",
        flex: 2,
        minWidth: 220,
        sortable: true,
        filter: "agTextColumnFilter",
        floatingFilter: true,
        cellStyle: { display: "flex", alignItems: "center" },
      },
      {
        headerName: "Section",
        field: "section",
        tooltipField: "section",
        flex: 2,
        minWidth: 220,
        sortable: true,
        filter: "agTextColumnFilter",
        floatingFilter: true,
      },
      {
        headerName: "Edit Access",
        field: "editAccess",
        cellRendererFramework: EditAccessCellRenderer,
        cellRendererParams: { onEditAccessChange },
        flex: 2,
        minWidth: 220,
        sortable: false,
        filter: false,
        cellStyle: { display: "flex", alignItems: "center" },
      },
      ...roles.filter((role) => role.enabled).map((role) => ({
        headerName: role.name,
        roleId: role.id,
        valueGetter: (params) => params.data?.access?.[role.id] || "none",
        cellRendererFramework: AccessBadgeCellRenderer,
        cellRendererParams: { onAccessChange, accessLevels },
        flex: 2,
        minWidth: 220,
        sortable: false,
        filter: false,
        cellStyle: { display: "flex", alignItems: "center" },
      })),
    ],
    [roles, onAccessChange, onEditAccessChange, accessLevels]
  );

  return (
    <div className={classes.matrixCard}>
      <AgGridComponent
        columns={columnDefs}
        rowdata={modules}
        uniqueRowId="id"
        loadTableInstance={loadTableInstance}
        height="480px"
        tableHeader="Module Access Matrix"
        downloadAsExcel={true}
        sizeColumnsToFitFlag
        showSearchModalBtn={true}
        selectAllHeaderComponent
        hideHeaderCheckboxComponent
        rowSelection="single"
      />
    </div>
  );
};

export default ModuleAccessMatrix;
