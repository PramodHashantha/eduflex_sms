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
import { classesAPI, usersAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const ClassesManagement = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletedFilter, setDeletedFilter] = useState('false');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [page, rowsPerPage, searchTerm, deletedFilter]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const params = {
        isDeleted: deletedFilter,
        ...(searchTerm && { search: searchTerm }),
      };
      const response = await classesAPI.getAll(params);
      setClasses(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await usersAPI.getAll({ role: 'teacher', isDeleted: 'false' });
      setTeachers(response.data);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const handleCreate = () => {
    setSelectedClass(null);
    setDialogOpen(true);
  };

  const handleEdit = (classItem) => {
    setSelectedClass({
      ...classItem,
      teacher: classItem.teacher?._id || classItem.teacher,
    });
    setDialogOpen(true);
  };

  const handleDelete = (classItem) => {
    setSelectedClass(classItem);
    setDeleteDialogOpen(true);
  };

  const handleRestore = (classItem) => {
    setSelectedClass(classItem);
    setRestoreDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await classesAPI.delete(selectedClass._id);
      showSuccess('Class deleted successfully');
      setDeleteDialogOpen(false);
      fetchClasses();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete class');
    }
  };

  const confirmRestore = async () => {
    try {
      await classesAPI.restore(selectedClass._id);
      showSuccess('Class restored successfully');
      setRestoreDialogOpen(false);
      fetchClasses();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to restore class');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedClass) {
        await classesAPI.update(selectedClass._id, formData);
        showSuccess('Class updated successfully');
      } else {
        await classesAPI.create(formData);
        showSuccess('Class created successfully');
      }
      setDialogOpen(false);
      fetchClasses();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save class');
    }
  };

  const columns = [
    {
      id: 'className',
      label: 'Class Name',
    },
    {
      id: 'description',
      label: 'Description',
      format: (value) => value || '-',
    },
    {
      id: 'teacher',
      label: 'Teacher',
      format: (value) => {
        if (typeof value === 'object' && value) {
          return `${value.firstName} ${value.lastName} (${value.userId})`;
        }
        return '-';
      },
    },
    {
      id: 'schedule',
      label: 'Schedule',
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
      name: 'className',
      label: 'Class Name',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      multiline: true,
      rows: 3,
    },
    {
      name: 'schedule',
      label: 'Schedule',
    },
    {
      name: 'teacher',
      label: 'Teacher',
      type: 'select',
      required: true,
      options: teachers.map((t) => ({
        value: t._id,
        label: `${t.firstName} ${t.lastName} (${t.userId})`,
      })),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Classes Management</Typography>
        {deletedFilter === 'false' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Create Class
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
        data={classes}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={classes.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No classes found"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedClass ? 'Edit Class' : 'Create Class'}
        fields={formFields}
        initialValues={selectedClass || {}}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Class"
        message={`Are you sure you want to delete ${selectedClass?.className}? This action can be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
      />

      <ConfirmDialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onConfirm={confirmRestore}
        title="Restore Class"
        message={`Are you sure you want to restore ${selectedClass?.className}?`}
        confirmLabel="Restore"
        confirmColor="success"
      />
    </Box>
  );
};

export default ClassesManagement;
