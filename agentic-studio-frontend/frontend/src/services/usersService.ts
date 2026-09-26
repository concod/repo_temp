import { httpClient } from './httpClient';
import { USERS_ENDPOINTS } from './endpoints';
import type { NewUserResponse, User, UserCreate } from '../pages/UsersPage/Users';

/**
 * Users Service
 * Handles all user-related API calls
 */
export class UsersService {
  /**
   * Fetch all users
   */
  static async getUsers(): Promise<User[]> {
    try {
      console.log('[UsersService] Fetching users from', USERS_ENDPOINTS.GET_ALL_USERS);
      
      const response = await httpClient.get<User[]>(USERS_ENDPOINTS.GET_ALL_USERS);
      
      console.log('[UsersService] Users fetched successfully:', response.data);
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected array of users');
      }
      
      return response.data;
    } catch (error) {
      console.error('[UsersService] Error fetching users:', error);
      throw error;
    }
  }

  static async addUser(userData: UserCreate): Promise<NewUserResponse> {
    try {
      const response = await httpClient.post<NewUserResponse>(USERS_ENDPOINTS.ADD_USER, userData);
      return response.data;
    } catch (error) {
      console.error('[UsersService] Error adding user:', error);
      throw error;
    }
  }
}

export default UsersService;
