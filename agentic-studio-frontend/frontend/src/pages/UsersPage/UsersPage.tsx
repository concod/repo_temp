import React, { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/Header';
import { useUsers } from './hooks/useUsers.ts';
// import { SubtleGreenLabel } from '../../components/Label/LabelFactory';
import { UserModal } from '../../components/Modal';
import type { UserCreate } from './Users';
import { showError } from '../../utils/toast';
// import avatar from "../../assets/images/avatar.svg";
import { UserTableRow } from './components/UserTableRow';
import { Pagination } from './components/Pagination';

const USERS_PER_PAGE = 10;

const UsersPage: React.FC = () => {
  // Fetch users from API
  const { users, isLoading, error, addUser } = useUsers();
  
  // Modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sort users alphabetically by name
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedUsers.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const currentUsers = sortedUsers.slice(startIndex, endIndex);
  
  // Pagination handlers
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);
  
  const goToPrevious = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);
  
  const goToNext = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Modal handlers
  const handleOpenUserModal = useCallback(() => {
    setIsUserModalOpen(true);
  }, []);

  const handleCloseUserModal = useCallback(() => {
    setIsUserModalOpen(false);
  }, []);

  const handleSaveUser = useCallback(async (userData: UserCreate) => {
    setIsModalLoading(true);
    try {
      await addUser(userData);
      setIsUserModalOpen(false);
    } catch (error) {
      showError('Failed to add user', 'Add User Failed');
    } finally {
      setIsModalLoading(false);
    }
  }, [addUser]);

  return (
    <div className="users-page">
      <PageHeader 
        title="Users"
        description="Manage user accounts and permissions in your organization."
        onSearch={() => {}}
        onResetSearch={() => {}}
        buttons={[{
          id: 'invite-user',
          label: 'Invite User',
          type: 'primary',
          size: 'large',
          onClick: handleOpenUserModal
        }]}
        showSearchBar={false}
        showResetButton={false}
      />
      
      {/* Main content area */}
      <div className="users-content">
        {/* Users table section */}
        <div className="users-content-table">
          <div className="users-content-table-body">
            {isLoading ? (
              <div className="table-loading">
                <span className="body-small">Loading users...</span>
              </div>
            ) : error ? (
              <div className="table-error">
                <span className="body-small">Error loading users: {error}</span>
              </div>
            ) : sortedUsers.length === 0 ? (
              <div className="table-empty">
                <span className="body-small">No users found</span>
              </div>
            ) : (
              <>
                <div className="users-table">
                  <div className="table-header">
                    <div className="table-cell">Name</div>
                    <div className="table-cell">Email</div>
                    <div className="table-cell">Role</div>
                    <div className="table-cell" style={{paddingLeft: '28px'}}>Status</div>
                  </div>
                  {currentUsers.map((user) => (
                    <UserTableRow key={user.id} user={user} />
                  ))}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalItems={sortedUsers.length}
                    onPrevious={goToPrevious}
                    onNext={goToNext}
                    onPageChange={goToPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        onSave={handleSaveUser}
        onCancel={handleCloseUserModal}
        isLoading={isModalLoading}
        isEditing={false}
      />
    </div>
  );
};

export default UsersPage;