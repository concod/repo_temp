import { useState, useEffect, useCallback } from "react";
import { UsersService } from "../../../services/usersService";
import type { User, UserCreate } from "../Users";

interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addUser: (user: UserCreate) => Promise<{ success: boolean; message?: string; data?: any }>;
  clearError: () => void;
}

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await UsersService.getUsers();
      setUsers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addUser = useCallback(async (user: UserCreate) => {
    setError(null);
    
    try {
      const response = await UsersService.addUser(user);
  
      await fetchUsers();
      
      return {
        success: true,
        message: response.message || 'User added successfully',
        data: response
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }, [fetchUsers]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { 
    users, 
    isLoading, 
    error, 
    refetch: fetchUsers, 
    addUser,
    clearError 
  };
};