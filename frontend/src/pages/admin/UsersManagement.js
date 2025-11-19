import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usersAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deletedFilter, setDeletedFilter] = useState('false');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { showSuccess, showError, showConfirm } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, searchTerm, roleFilter, deletedFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        isDeleted: deletedFilter,
        ...(roleFilter && { role: roleFilter }),
        ...(searchTerm && { search: searchTerm }),
      };
      const response = await usersAPI.getAll(params);
      setUsers(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleRestore = (user) => {
    setSelectedUser(user);
    setRestoreDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await usersAPI.delete(selectedUser._id);
      showSuccess('User deleted successfully');
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const confirmRestore = async () => {
    try {
      await usersAPI.restore(selectedUser._id);
      showSuccess('User restored successfully');
      setRestoreDialogOpen(false);
      fetchUsers();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to restore user');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedUser) {
        await usersAPI.update(selectedUser._id, formData);
        showSuccess('User updated successfully');
      } else {
        await usersAPI.create(formData);
        showSuccess('User created successfully');
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleResetPassword = async (user) => {
    const confirmed = await showConfirm(
      'Reset Password',
      `Are you sure you want to reset password for ${user.firstName} ${user.lastName}? The new password will be "eduflex".`
    );
    if (confirmed) {
      try {
        await usersAPI.resetPassword(user._id);
        showSuccess('Password reset successfully');
      } catch (error) {
        showError(error.response?.data?.message || 'Failed to reset password');
      }
    }
  };

  const columns = [
    {
      id: 'userId',
      label: 'User ID',
    },
    {
      id: 'name',
      label: 'Name',
      format: (value, row) => `${row.firstName} ${row.lastName}`,
    },
    {
      id: 'role',
      label: 'Role',
      format: (value) => (
        <Chip
          label={value.charAt(0).toUpperCase() + value.slice(1)}
          color={value === 'admin' ? 'error' : value === 'teacher' ? 'warning' : 'primary'}
          size="small"
        />
      ),
    },
    {
      id: 'email',
      label: 'Email',
      format: (value) => value || '-',
    },
    {
      id: 'mobile',
      label: 'Mobile',
      format: (value) => value || '-',
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (value, row) => (
        <Box>
          {!row.isDeleted && (
            <>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => handleEdit(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset Password">
                <IconButton size="small" onClick={() => handleResetPassword(row)}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => handleDelete(row)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {row.isDeleted && (
            <Tooltip title="Restore">
              <IconButton size="small" onClick={() => handleRestore(row)} color="success">
                <RestoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const formFields = [
    {
      name: 'firstName',
      label: 'First Name',
      required: true,
    },
    {
      name: 'lastName',
      label: 'Last Name',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
    },
    {
      name: 'mobile',
      label: 'Mobile',
    },
    {
      name: 'dateOfBirth',
      label: 'Date of Birth',
      type: 'date',
    },
    {
      name: 'gender',
      label: 'Gender',
      type: 'select',
      options: [
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' },
        { value: 'Other', label: 'Other' },
      ],
    },
    ...(selectedUser
      ? []
      : [
          {
            name: 'role',
            label: 'Role',
            type: 'select',
            required: true,
            options: [
              { value: 'student', label: 'Student' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'admin', label: 'Admin' },
            ],
          },
        ]),
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Users Management</Typography>
        {deletedFilter === 'false' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Create User
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <TextField
          select
          label="Role"
          variant="outlined"
          size="small"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </TextField>
        <TextField
          select
          label="Status"
          variant="outlined"
          size="small"
          value={deletedFilter}
          onChange={(e) => setDeletedFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <option value="false">Active</option>
          <option value="true">Deleted</option>
        </TextField>
      </Box>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={users.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No users found"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedUser ? 'Edit User' : 'Create User'}
        fields={formFields}
        initialValues={selectedUser || {}}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.firstName} ${selectedUser?.lastName}? This action can be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
      />

      <ConfirmDialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onConfirm={confirmRestore}
        title="Restore User"
        message={`Are you sure you want to restore ${selectedUser?.firstName} ${selectedUser?.lastName}?`}
        confirmLabel="Restore"
        confirmColor="success"
      />
    </Box>
  );
};

export default UsersManagement;
