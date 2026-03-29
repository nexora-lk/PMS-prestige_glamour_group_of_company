import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import type { User, UsersResponse } from '../types';

interface UseUsersOptions {
  search?: string;
  department?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  skip?: boolean;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<UsersResponse | null>(null);

  useEffect(() => {
    if (options.skip) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await userService.listUsers(options);
        setUsers(data.users);
        setResponse(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [
    options.search,
    options.department,
    options.role,
    options.status,
    options.page,
    options.limit,
    options.sortBy,
    options.sortOrder,
    options.skip,
  ]);

  const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newUser = await userService.createUser(userData);
      setUsers([...users, newUser]);
      return newUser;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const updated = await userService.updateUser(id, updates);
      setUsers(users.map((u) => (u.id === id ? updated : u)));
      return updated;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await userService.deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const refreshUsers = async () => {
    try {
      const data = await userService.listUsers(options);
      setUsers(data.users);
      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    users,
    loading,
    error,
    response,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers,
  };
};

