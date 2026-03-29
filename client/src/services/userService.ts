import api from './api';
import type { User, UsersResponse, StatsResponse } from '../types';

interface UserListParams {
  search?: string;
  branch?: string;
  role?: string;
  status?: 'active' | 'delete' | 'all';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const userService = {
  async listUsers(params: UserListParams = {}): Promise<UsersResponse> {
    try {
      const response = await api.get<UsersResponse>('/users', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch users');
    }
  },

  async getUser(id: string): Promise<User> {
    try {
      const response = await api.get<User>(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch user');
    }
  },

  async createUser(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User> {
    try {
      const response = await api.post<User>('/users', user);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create user');
    }
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const response = await api.put<User>(`/users/${id}`, updates);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update user');
    }
  },

  async deleteUser(id: string): Promise<{ message: string; user: User }> {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete user');
    }
  },

  async getStats(): Promise<StatsResponse> {
    try {
      const response = await api.get<StatsResponse>('/users/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch stats');
    }
  },
};

