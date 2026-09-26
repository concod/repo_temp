import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import AddRolePopup from "./AddRoleDrawer";
import RenameRolePopup from "./RenameRoleModal";
import { useStyles, useRoleCardStyles } from "../styles";
import AddIcon from "@mui/icons-material/Add";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import RenameIcon from "assets/ModuleAccessManagement/RenameIcon.svg";
import DeleteIcon from "assets/ModuleAccessManagement/DeleteIcon.svg";
import SuperuserIcon from "assets/ModuleAccessManagement/Superuser.svg";
import AllocatorIcon from "assets/ModuleAccessManagement/Allocator.svg";
import ViewOnlyIcon from "assets/ModuleAccessManagement/ViewOnly.svg";
import AdminIcon from "assets/ModuleAccessManagement/Admin.svg";

const ROLE_SVG_MAP = {
  superuser: SuperuserIcon,
  allocator: AllocatorIcon,
  viewonly: ViewOnlyIcon,
  admin: AdminIcon,
};

const RoleCard = ({ role, onDelete, onRename, onDisable }) => {
  const classes = useStyles();
  const dynamicClasses = useRoleCardStyles({
    gradient: role.color.gradient,
    enabled: role.enabled,
    bg: role.color.bg,
    iconColor: role.color.color,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [renamePos, setRenamePos] = useState({ top: 0, right: 0 });
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const RoleIconSvg = ROLE_SVG_MAP[role.id];

  return (
    <div
      className={`${classes.roleCard} ${dynamicClasses.roleCardOverrides}`}
    >
      <div
        className={`${!RoleIconSvg ? classes.roleIconCircle : ""} ${dynamicClasses.roleIconDynamic}`}
      >
        {RoleIconSvg
          ? <RoleIconSvg width={40} height={40} />
          : role.name.charAt(0).toUpperCase()}
      </div>

      <div className={classes.roleCardContent}>
        <div className={classes.roleNameRow}>
          <span className={classes.roleName}>{role.name}</span>
        </div>
      </div>

      <div className={classes.roleActions}>
        <div
          className={`${classes.toggle} ${!role.enabled ? classes.toggleOff : ""}`}
          onClick={(e) => { e.stopPropagation(); onDisable(role); }}
        />
        {!role.isDefault && (
          <div className={classes.menuAnchor} ref={menuRef}>
            <button
              ref={btnRef}
              className={classes.moreBtn}
              onClick={(e) => {
                e.stopPropagation();
                const rect = btnRef.current.getBoundingClientRect();
                setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                setMenuOpen((o) => !o);
              }}
            >
              <MoreHorizIcon className={classes.moreIcon} />
            </button>

            {menuOpen && ReactDOM.createPortal(
              <div
                ref={dropdownRef}
                className={classes.dropdownMenu}
                style={{ "--menu-top": `${menuPos.top}px`, "--menu-right": `${menuPos.right}px` }}
              >
                <div
                  className={classes.dropdownItem}
                  onClick={() => {
                    setMenuOpen(false);
                    const rect = btnRef.current.getBoundingClientRect();
                    setRenamePos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    setRenameOpen(true);
                  }}
                >
                  <RenameIcon width={16} height={16} />
                  Rename
                </div>
                <div
                  className={classes.dropdownItemDanger}
                  onClick={() => { setMenuOpen(false); onDelete(role); }}
                >
                  <DeleteIcon width={16} height={16} />
                  Delete
                </div>
              </div>,
              document.body
            )}

            {renameOpen && ReactDOM.createPortal(
              <div
                className={classes.renamePortalWrapper}
                style={{ "--rename-top": `${renamePos.top}px`, "--rename-right": `${renamePos.right}px` }}
              >
                <RenameRolePopup
                  role={role}
                  anchorRef={menuRef}
                  onClose={() => setRenameOpen(false)}
                  onSave={(newName) => {
                    setRenameOpen(false);
                    onRename(role, newName);
                  }}
                />
              </div>,
              document.body
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DefineRoles = ({ roles, onAddRole, onDeleteRole, onRenameRole, onDisableRole }) => {
  const classes = useStyles();
  const [addOpen, setAddOpen] = useState(false);
  const addBtnRef = useRef(null);
  const rolesRowRef = useRef(null);
  const prevRolesCountRef = useRef(roles.length);

  useEffect(() => {
    const prev = prevRolesCountRef.current;
    prevRolesCountRef.current = roles.length;
    // Only scroll when a new role was added, not on initial render or deletion
    if (roles.length <= prev || !rolesRowRef.current) return;
    rolesRowRef.current.scrollTo({ left: rolesRowRef.current.scrollWidth, behavior: "smooth" });
  }, [roles.length]);

  const handleSave = useCallback((newRole, permissions) => {
    onAddRole(newRole, permissions);
    setAddOpen(false);
  }, [onAddRole]);

  return (
    <div className={classes.sectionCard}>
      <div className={classes.sectionHeader}>
        <p className={classes.sectionTitle}>Define Roles</p>
        <div className={classes.headerActions}>
          <div className={classes.addRoleBtnWrapper}>
            <button
              ref={addBtnRef}
              className={classes.addRoleBtn}
              onClick={() => setAddOpen((o) => !o)}
            >
              <AddIcon className={classes.addIcon} />
              Add Role
            </button>
            {addOpen && (
              <AddRolePopup
                anchorRef={addBtnRef}
                onClose={() => setAddOpen(false)}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      </div>
      <div className={classes.rolesRow} ref={rolesRowRef}>
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            onDelete={onDeleteRole}
            onRename={onRenameRole}
            onDisable={onDisableRole}
          />
        ))}
      </div>
    </div>
  );
};

export default DefineRoles;
