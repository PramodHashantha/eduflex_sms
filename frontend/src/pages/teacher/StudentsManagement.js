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
import { usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';

const StudentsManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchStudents();
  }, [page, rowsPerPage, searchTerm]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {
        role: 'student',
        isDeleted: 'false',
        ...(searchTerm && { search: searchTerm }),
      };
      const response = await usersAPI.getAll(params);
      setStudents(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedStudent(null);
    setDialogOpen(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setDialogOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedStudent) {
        await usersAPI.update(selectedStudent._id, formData);
        showSuccess('Student updated successfully');
      } else {
        await usersAPI.create({ ...formData, role: 'student' });
        showSuccess('Student created successfully');
      }
      setDialogOpen(false);
      fetchStudents();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save student');
    }
  };

  const columns = [
    {
      id: 'userId',
      label: 'Student ID',
    },
    {
      id: 'name',
      label: 'Name',
      format: (value, row) => `${row.firstName} ${row.lastName}`,
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
      id: 'dateOfBirth',
      label: 'Date of Birth',
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
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
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Students Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Create Student
        </Button>
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
      </Box>

      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={students.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No students found"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedStudent ? 'Edit Student' : 'Create Student'}
        fields={formFields}
        initialValues={selectedStudent || {}}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default StudentsManagement;
