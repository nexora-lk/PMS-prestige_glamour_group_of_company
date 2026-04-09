/**
 * Users service — re-exports the user-related DB operations from the
 * shared dbStore so module routes have a clean import path.
 */

export {
  dbGetAllUsers as getAllUsers,
  dbGetUser as getUser,
  dbCreateUser as createUser,
  dbUpdateUser as updateUser,
  dbDeleteUser as deleteUser,
} from '../../services/dbStore';
