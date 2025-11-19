import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { tutesAPI, classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const TutesManagement = () => {
  const [tutes, setTutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTute, setSelectedTute] = useState(null);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsForClass();
      fetchTutes();
    }
  }, [selectedClass, page, rowsPerPage]);

  const fetchTutes = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const response = await tutesAPI.getAll({ class: selectedClass, isDeleted: 'false' });
      setTutes(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch tutes');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll({ isDeleted: 'false', teacher: user._id });
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudentsForClass = async () => {
    try {
      const enrollments = await enrollmentsAPI.getAll({ class: selectedClass, status: 'active', isDeleted: 'false' });
      const studentIds = enrollments.data.map(e => e.student?._id || e.student);
      if (studentIds.length > 0) {
        const studentsRes = await Promise.all(studentIds.map(id => usersAPI.getById(id)));
        setStudents(studentsRes.map(res => res.data));
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents([]);
    }
  };

  const handleCreate = () => {
    if (!selectedClass) {
      showError('Please select a class first');
      return;
    }
    setSelectedTute(null);
    setDialogOpen(true);
  };

  const handleEdit = (tute) => {
    setSelectedTute({
      ...tute,
      student: tute.student?._id || tute.student,
      class: tute.class?._id || tute.class,
    });
    setDialogOpen(true);
  };

  const handleDelete = (tute) => {
    setSelectedTute(tute);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await tutesAPI.delete(selectedTute._id);
      showSuccess('Tute deleted successfully');
      setDeleteDialogOpen(false);
      fetchTutes();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete tute');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedTute) {
        await tutesAPI.update(selectedTute._id, formData);
        showSuccess('Tute updated successfully');
      } else {
        await tutesAPI.create({ ...formData, class: selectedClass });
        showSuccess('Tute assigned successfully');
      }
      setDialogOpen(false);
      fetchTutes();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save tute');
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
      id: 'title',
      label: 'Title',
    },
    {
      id: 'description',
      label: 'Description',
      format: (value) => (value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '-'),
    },
    {
      id: 'month',
      label: 'Month',
      format: (value) => value || '-',
    },
    {
      id: 'year',
      label: 'Year',
      format: (value) => value || '-',
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (value, row) => (
        <Box>
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
      name: 'title',
      label: 'Title',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      multiline: true,
      rows: 4,
    },
    {
      name: 'month',
      label: 'Month',
      type: 'number',
      helperText: '1-12',
    },
    {
      name: 'year',
      label: 'Year',
      type: 'number',
    },
    {
      name: 'fileUrl',
      label: 'File URL',
    },
    {
      name: 'fileName',
      label: 'File Name',
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tutes Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!selectedClass}>
          Assign Tute
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Class"
          variant="outlined"
          size="small"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          sx={{ minWidth: 200 }}
          SelectProps={{ native: true }}
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.className}
            </option>
          ))}
        </TextField>
      </Box>

      <DataTable
        columns={columns}
        data={tutes}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={tutes.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No tutes found. Select a class to view tutes."
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedTute ? 'Edit Tute' : 'Assign Tute'}
        fields={formFields}
        initialValues={selectedTute || {}}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Tute"
        message="Are you sure you want to delete this tute?"
        confirmLabel="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default TutesManagement;
