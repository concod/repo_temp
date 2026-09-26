import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { connect } from "react-redux";
import { Prompt, Toast } from "impact-ui-v3";
import { ACCESS_LEVELS } from "./constants";
import { ROLE_COLORS } from "./constants";
import { useStyles } from "./styles";
import SummaryBanner from "./components/SummaryBanner";
import DefineRoles from "./components/DefineRoles";
import ModuleAccessMatrix from "./components/ModuleAccessMatrix";
import {
  createRole,
  updateRole,
  updateModuleAccess,
  deleteRole,
  getRoles,
  getModuleAccessMatrix,
} from "modules/inventorysmart/services-inventorysmart/ModuleAccessManagement/uam-configurator-service";

// Reverse-map API access level strings → internal UI values
// Backend levels: full_access | limited_access | view_only | no_access | mixed
// "mixed" (legacy inconsistent data across a screen's modules) has no UI equivalent;
// it falls back to "none" so the admin can explicitly re-set (and normalize) the screen.
const ACCESS_LEVEL_REVERSE_MAP = {
  full_access: "full",
  limited_access: "view",
  view_only: "view",
  no_access: "none",
};

const DEFAULT_ROLE_NAMES = new Set(["superuser", "admin", "allocator"]);

const isDefaultRole = (name) => {
  const normalized = name?.toLowerCase().replace(/\s+/g, "") || "";
  return DEFAULT_ROLE_NAMES.has(normalized);
};

const parseModuleDescription = (raw) => {
  if (!raw || raw === "''" || raw === '""') return "";
  if (raw.startsWith("JSON:")) {
    try {
      const parsed = JSON.parse(raw.slice(5)); // strip the "JSON:" prefix
      return parsed.label || "";
    } catch {
      return raw; // fall back to raw if JSON is malformed
    }
  }
  return raw;
};

const ModuleAccessManagement = (props) => {
  const classes = useStyles();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);

  const rolesRef = useRef(roles);
  rolesRef.current = roles;
  const modulesRef = useRef(modules);
  modulesRef.current = modules;

  const pendingRoleUpdatesRef = useRef({});

  // Derive editAccess per module: false when ALL enabled roles are "view", true otherwise
  const derivedModules = useMemo(() => {
    const enabledRoleIds = roles.filter((r) => r.enabled).map((r) => r.id);
    return modules.map((mod) => {
      const allView =
        enabledRoleIds.length > 0 &&
        enabledRoleIds.every((rid) => (mod.access[rid] || "none") === "view");
      return { ...mod, editAccess: !allView };
    });
  }, [modules, roles]);

  useEffect(() => {
    if (!props.isAuthenticated) return;

    const fetchRoles = async () => {
      try {
        const response = await props.getRoles();
        if (response?.data?.data && Array.isArray(response.data.data)) {
          const apiRoles = response.data.data.map((r) => {
            const normalized = r.name?.toLowerCase().replace(/\s+/g, "") || "";
            const colorKey = Object.keys(ROLE_COLORS).find(
              (k) => k !== "default" && normalized.includes(k)
            );
            return {
              id: `role-${r.role_code}`,
              role_code: r.role_code,
              name: r.name,
              enabled: r.status,
              isDefault: isDefaultRole(r.name),
              userCount: 0,
              color: ROLE_COLORS[colorKey] || ROLE_COLORS.default,
              action_code: r.action_code,
            };
          });
          setRoles(apiRoles);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };
    fetchRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isAuthenticated]);

  useEffect(() => {
    if (!props.isAuthenticated) return;

    const fetchMatrixData = async () => {
      try {
        const response = await props.getModuleAccessMatrix();
        if (!response?.data?.data) return;

        const { roles: apiRoles, screens: apiScreens } = response.data.data;

        const mappedRoles = apiRoles.map((r) => {
          const normalized = r.name?.toLowerCase().replace(/\s+/g, "") || "";
          const colorKey = Object.keys(ROLE_COLORS).find(
            (k) => k !== "default" && normalized.includes(k)
          );
          return {
            id: `role-${r.role_code}`,
            role_code: r.role_code,
            name: r.name,
            enabled: true,
            isDefault: isDefaultRole(r.name),
            userCount: 0,
            color: ROLE_COLORS[colorKey] || ROLE_COLORS.default,
          };
        });
        setRoles(mappedRoles);

        // Access is granted per screen, but the grid renders one row per section
        // (module) under that screen. Every section row of a screen shares the same
        // per-role access values and drives a single screen-level update on change.
        const mappedModules = (apiScreens || []).flatMap((screen) => {
          const screenAccess = Object.entries(screen.access || {}).reduce(
            (acc, [role_code, level]) => {
              acc[`role-${role_code}`] = ACCESS_LEVEL_REVERSE_MAP[level] || "none";
              return acc;
            },
            {}
          );
          return (screen.sections || []).map((section) => ({
            id: `screen-${screen.screen_code}-module-${section.module_code}`,
            screen_code: screen.screen_code,
            module_code: section.module_code,
            name: screen.screen_name,
            description: "",
            section: parseModuleDescription(section.module_name),
            editAccess: true,
            access: { ...screenAccess },
          }));
        });
        setModules(mappedModules);
      } catch (error) {
        console.error("Error fetching module access matrix:", error);
      }
    };
    fetchMatrixData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isAuthenticated]);

  useEffect(() => {
    roles.forEach((role) => {
      if (!role.role_code) return;
      const queued = pendingRoleUpdatesRef.current[role.id];
      if (!queued?.length) return;

      // Dedupe by screen_code, keeping the latest queued value per screen.
      const byScreen = new Map();
      queued.forEach(({ screen_code, value }) => byScreen.set(screen_code, value));
      delete pendingRoleUpdatesRef.current[role.id];
      byScreen.forEach((value, screen_code) => {
        props.updateModuleAccess([
          { role_code: role.role_code, screen_code, access_level: value },
        ]).catch((err) => console.error("[UAM] Error flushing queued access update:", err));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  const [deleteRole, setDeleteRole] = useState(null);
  const [disableRole, setDisableRole] = useState(null);

  const [toast, setToast] = useState(null); 

  const showToast = useCallback((message, variant = "success") => {
    setToast({ message, variant });
  }, []);

  const handleSaveNewRole = useCallback(
    async (newRole, permissions) => {
      const tempId = newRole.id || `role-${Date.now()}`;
      const roleToAdd = { ...newRole, id: tempId };
      setRoles((prev) => [...prev, roleToAdd]);
      setModules((prev) =>
        prev.map((mod) => ({
          ...mod,
          access: {
            ...mod.access,
            [tempId]: permissions[mod.id] || "none",
          },
        }))
      );
      showToast(`Role "${newRole.name}" created successfully`, "success");

      try {
        const response = await props.createRole({ name: newRole.name });
        const apiData = response?.data?.data ?? response?.data;
        let role_code = apiData?.role_code;
        const resolvedName = apiData?.name ?? newRole.name;

        if (!role_code) {
          console.warn("[UAM] createRole response had no role_code — fetching roles list as fallback");
          try {
            const rolesResp = await props.getRoles();
            const list = rolesResp?.data?.data;
            if (Array.isArray(list)) {
              const found = list.find((r) => r.name === newRole.name);
              role_code = found?.role_code;
            }
          } catch (fallbackErr) {
            console.error("[UAM] getRoles fallback failed:", fallbackErr);
          }
        }

        if (role_code) {
          setRoles((prev) =>
            prev.map((r) =>
              r.id === tempId ? { ...r, role_code, name: resolvedName } : r
            )
          );
        }
      } catch (error) {
        console.error("Error creating role:", error);
        // Recovery step 1: API might have persisted the role despite an error
        // response — check getRoles() to find it by name.
        try {
          const recoveryResp = await props.getRoles();
          const recoveryList = recoveryResp?.data?.data;
          if (Array.isArray(recoveryList)) {
            const recoveryRole = recoveryList.find((r) => r.name === newRole.name);
            if (recoveryRole?.role_code) {
              setRoles((prev) =>
                prev.map((r) =>
                  r.id === tempId
                    ? { ...r, role_code: recoveryRole.role_code, name: recoveryRole.name ?? newRole.name }
                    : r
                )
              );
              return;
            }
          }
        } catch (_recoveryErr) { /* ignore */ }
        const tempRoleCode = Date.now() % 1000000;
        setRoles((prev) =>
          prev.map((r) =>
            r.id === tempId ? { ...r, role_code: tempRoleCode } : r
          )
        );
      }
    },
    [props.createRole, props.getRoles, props.updateModuleAccess, showToast]
  );

  const handleRenameRole = useCallback(
    async (role, newName) => {
      setRoles((prev) =>
        prev.map((r) => (r.id === role.id ? { ...r, name: newName } : r))
      );
      try {
        await props.updateRole({ role_code: role.role_code, name: newName });
        showToast(`Role renamed to "${newName}"`, "success");
      } catch (error) {
        console.error("Error renaming role:", error);
        showToast(
          error?.response?.data?.message || "Failed to rename role",
          "error"
        );
      }
    },
    [props.updateRole, showToast]
  );

  const handleDeleteRole = useCallback((role) => setDeleteRole(role), []);

  const handleConfirmDelete = useCallback(async () => {
    const roleToDelete = deleteRole;
    // Optimistically update UI
    setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
    setModules((prev) =>
      prev.map((mod) => {
        const access = { ...mod.access };
        delete access[roleToDelete.id];
        return { ...mod, access };
      })
    );
    setDeleteRole(null);

    try {
      await props.deleteRole(roleToDelete.role_code);
      showToast(`Role "${roleToDelete.name}" deleted`, "error");
    } catch (error) {
      console.error("Error deleting role:", error);
      showToast(
        error?.response?.data?.message || "Failed to delete role",
        "error"
      );
    }
  }, [deleteRole, props.deleteRole, showToast]);

  const handleDisableRole = useCallback(
    (role) => {
      if (role.enabled) {
        setDisableRole(role);
      } else {
        setRoles((prev) =>
          prev.map((r) => (r.id === role.id ? { ...r, enabled: true } : r))
        );
        showToast(`Role "${role.name}" enabled`, "success");
      }
    },
    [showToast]
  );

  const handleConfirmDisable = useCallback(() => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === disableRole.id ? { ...r, enabled: false } : r
      )
    );
    setDisableRole(null);
    showToast(`Role "${disableRole.name}" disabled`, "warning");
  }, [disableRole, showToast]);

  const handleEditAccessChange = useCallback(
    (moduleId, value) => {
      setModules((prev) =>
        prev.map((mod) =>
          mod.id === moduleId ? { ...mod, editAccess: value } : mod
        )
      );
    },
    []
  );

  const handleAccessChange = useCallback(
    async (moduleId, roleId, value) => {
      const targetModule = modulesRef.current.find((m) => m.id === moduleId);
      const targetRole = rolesRef.current.find((r) => r.id === roleId);
      const screenCode = targetModule?.screen_code;

      // Access is screen-level: optimistically update every section row that
      // belongs to the same screen so the whole group moves together.
      setModules((prev) =>
        prev.map((mod) =>
          mod.screen_code === screenCode
            ? { ...mod, access: { ...mod.access, [roleId]: value } }
            : mod
        )
      );

      if (screenCode == null) return;

      if (!targetRole?.role_code) {
        const queue = pendingRoleUpdatesRef.current;
        queue[roleId] = [
          ...(queue[roleId] || []),
          { screen_code: screenCode, value },
        ];
        return;
      }

      try {
        await props.updateModuleAccess([
          {
            role_code: targetRole.role_code,
            screen_code: screenCode,
            access_level: value,
          },
        ]);
      } catch (error) {
        console.error("Error updating module access:", error);
        showToast(
          error?.response?.data?.message || "Failed to update access",
          "error"
        );
      }
    },
    [modules, roles, props.updateModuleAccess, showToast]
  );

  return (
    <div className={classes.pageWrapper}>
      <SummaryBanner roles={roles} modules={derivedModules} />

      <DefineRoles
        roles={roles}
        onAddRole={handleSaveNewRole}
        onDeleteRole={handleDeleteRole}
        onRenameRole={handleRenameRole}
        onDisableRole={handleDisableRole}
      />

      <ModuleAccessMatrix
        modules={derivedModules}
        roles={roles}
        accessLevels={ACCESS_LEVELS}
        onAccessChange={handleAccessChange}
        onEditAccessChange={handleEditAccessChange}
      />

      <Prompt
        isOpen={!!deleteRole}
        title={"Delete, Are You Sure?"}
        variant="error"
        primaryButtonLabel="I Understand & Delete"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={handleConfirmDelete}
        onSecondaryButtonClick={() => setDeleteRole(null)}
        handleClose={() => setDeleteRole(null)}
      >
        {deleteRole
          ? `"${deleteRole.name}" Role Will Permanently Lose Access To The Tagged Modules.`
          : ""}
      </Prompt>

      <Prompt
        isOpen={!!disableRole}
        title="Disable Role?"
        variant="warning"
        primaryButtonLabel="I Understand & Disable"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={handleConfirmDisable}
        onSecondaryButtonClick={() => setDisableRole(null)}
        handleClose={() => setDisableRole(null)}
      >
        {disableRole
          ? `Users Mapped To ${disableRole.name} Role Will Temporarily Lose Access To The Tagged Modules Until Enabled Again.`
          : ""}
      </Prompt>

      <Toast
        isOpen={!!toast}
        message={toast?.message}
        variant={toast?.variant || "success"}
        position="top-right"
        autoHideDuration={3000}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.authReducer.isAuthenticated,
});

const mapDispatchToProps = (dispatch) => ({
  getRoles: () => dispatch(getRoles()),
  getModuleAccessMatrix: () => dispatch(getModuleAccessMatrix()),
  createRole: (payload) => dispatch(createRole(payload)),
  updateRole: (payload) => dispatch(updateRole(payload)),
  updateModuleAccess: (updates) => dispatch(updateModuleAccess(updates)),
  deleteRole: (role_code) => dispatch(deleteRole(role_code)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ModuleAccessManagement);
