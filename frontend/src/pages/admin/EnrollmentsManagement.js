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
import { enrollmentsAPI, usersAPI, classesAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const EnrollmentsManagement = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deletedFilter, setDeletedFilter] = useState('false');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchEnrollments();
    fetchStudents();
    fetchClasses();
  }, [page, rowsPerPage, deletedFilter]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params = { isDeleted: deletedFilter };
      const response = await enrollmentsAPI.getAll(params);
      setEnrollments(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch enrollments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await usersAPI.getAll({ role: 'student', isDeleted: 'false' });
      setStudents(response.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll({ isDeleted: 'false' });
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handleCreate = () => {
    setSelectedEnrollment(null);
    setDialogOpen(true);
  };

  const handleEdit = (enrollment) => {
    setSelectedEnrollment({
      ...enrollment,
      student: enrollment.student?._id || enrollment.student,
      class: enrollment.class?._id || enrollment.class,
    });
    setDialogOpen(true);
  };

  const handleDelete = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setDeleteDialogOpen(true);
  };

  const handleRestore = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setRestoreDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await enrollmentsAPI.delete(selectedEnrollment._id);
      showSuccess('Enrollment deleted successfully');
      setDeleteDialogOpen(false);
      fetchEnrollments();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete enrollment');
    }
  };

  const confirmRestore = async () => {
    try {
      await enrollmentsAPI.restore(selectedEnrollment._id);
      showSuccess('Enrollment restored successfully');
      setRestoreDialogOpen(false);
      fetchEnrollments();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to restore enrollment');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedEnrollment) {
        await enrollmentsAPI.update(selectedEnrollment._id, formData);
        showSuccess('Enrollment updated successfully');
      } else {
        await enrollmentsAPI.create(formData);
        showSuccess('Enrollment created successfully');
      }
      setDialogOpen(false);
      fetchEnrollments();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save enrollment');
    }
  };

  const columns = [
    {
      id: 'student',
      label: 'Student',
      format: (value) => {
        if (typeof value === 'object' && value) {
          return `${value.firstName} ${value.lastName} (${value.userId})`;
        }
        return '-';
      },
    },
    {
      id: 'class',
      label: 'Class',
      format: (value) => {
        if (typeof value === 'object' && value) {
          return value.className;
        }
        return '-';
      },
    },
    {
      id: 'status',
      label: 'Status',
      format: (value) => (
        <Chip
          label={value}
          color={value === 'active' ? 'success' : value === 'inactive' ? 'warning' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'dateJoined',
      label: 'Date Joined',
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      id: 'dateLeft',
      label: 'Date Left',
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
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
      name: 'student',
      label: 'Student',
      type: 'select',
      required: true,
      options: students.map((s) => ({
        value: s._id,
        label: `${s.firstName} ${s.lastName} (${s.userId})`,
      })),
    },
    {
      name: 'class',
      label: 'Class',
      type: 'select',
      required: true,
      options: classes.map((c) => ({
        value: c._id,
        label: c.className,
      })),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Enrollments Management</Typography>
        {deletedFilter === 'false' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Create Enrollment
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
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
        data={enrollments}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={enrollments.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No enrollments found"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedEnrollment ? 'Edit Enrollment' : 'Create Enrollment'}
        fields={formFields}
        initialValues={selectedEnrollment || {}}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Enrollment"
        message="Are you sure you want to delete this enrollment? This action can be undone."
        confirmLabel="Delete"
        confirmColor="error"
      />

      <ConfirmDialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onConfirm={confirmRestore}
        title="Restore Enrollment"
        message="Are you sure you want to restore this enrollment?"
        confirmLabel="Restore"
        confirmColor="success"
      />
    </Box>
  );
};

export default EnrollmentsManagement;
