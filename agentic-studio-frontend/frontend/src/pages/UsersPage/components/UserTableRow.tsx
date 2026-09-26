import type {UserTableRowProps} from "../Users";
import React from "react";
import { useLazyAvatar } from "../hooks/useLazyAvatar";
import avatar from "../../../assets/images/avatar.svg"
import { SubtleGreenLabel } from "../../../components/Label";

const formatStatus = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
};
  
const formatRole = (role: string, isAdmin: boolean) => {
    if (isAdmin) return 'Admin';
        return role.charAt(0).toUpperCase() + role.slice(1);
};

export const UserTableRow: React.FC<UserTableRowProps> = React.memo(({ user }) => {
    const { imgRef, imgSrc, isLoading } = useLazyAvatar(user.picture, {
      fallbackSrc: avatar,
      rootMargin: '100px', // Start loading 100px before visible
      threshold: 0.01
    });
  
    return (
      <div className="table-row">
        <div className="table-cell">
          <div className="user-info">
            <img 
              ref={imgRef}
              src={imgSrc} 
              alt={user.name} 
              className={`user-avatar ${isLoading ? 'loading' : ''}`}
              loading="lazy"
            />
            <span>{user.name}</span>
          </div>
        </div>
        <div className="table-cell">{user.email}</div>
        <div className="table-cell">
          {formatRole(user.role, user.is_admin)}
        </div>
        <div className="table-cell">
          {user.is_active ? (
            <SubtleGreenLabel style={{fontSize: '12px !important'}}>
              {formatStatus(user.is_active)}
            </SubtleGreenLabel>
          ) : (
            <span>{formatStatus(user.is_active)}</span>
          )}
        </div>
      </div>
    );
  });