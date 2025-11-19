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
import { feesAPI, classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const FeesManagement = () => {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsForClass();
      fetchFees();
    }
  }, [selectedClass, page, rowsPerPage]);

  const fetchFees = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const response = await feesAPI.getAll({ class: selectedClass, isDeleted: 'false' });
      setFees(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch fees');
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
    setSelectedFee(null);
    setDialogOpen(true);
  };

  const handleEdit = (fee) => {
    setSelectedFee({
      ...fee,
      student: fee.student?._id || fee.student,
      class: fee.class?._id || fee.class,
      paymentDate: fee.paymentDate ? new Date(fee.paymentDate).toISOString().split('T')[0] : '',
      dueDate: fee.dueDate ? new Date(fee.dueDate).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (fee) => {
    setSelectedFee(fee);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await feesAPI.delete(selectedFee._id);
      showSuccess('Fee record deleted successfully');
      setDeleteDialogOpen(false);
      fetchFees();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete fee');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedFee) {
        await feesAPI.update(selectedFee._id, formData);
        showSuccess('Fee updated successfully');
      } else {
        await feesAPI.create({ ...formData, class: selectedClass });
        showSuccess('Fee recorded successfully');
      }
      setDialogOpen(false);
      fetchFees();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save fee');
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
      id: 'paymentType',
      label: 'Type',
      format: (value) => <Chip label={value} size="small" />,
    },
    {
      id: 'amount',
      label: 'Amount',
      format: (value) => `$${value?.toFixed(2) || '0.00'}`,
    },
    {
      id: 'status',
      label: 'Status',
      format: (value) => (
        <Chip
          label={value}
          color={value === 'paid' ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
    {
      id: 'paymentDate',
      label: 'Payment Date',
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
      name: 'paymentType',
      label: 'Payment Type',
      type: 'select',
      required: true,
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'per-session', label: 'Per Session' },
        { value: 'monthly', label: 'Monthly' },
      ],
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      required: true,
    },
    {
      name: 'paymentDate',
      label: 'Payment Date',
      type: 'date',
      required: true,
    },
    {
      name: 'dueDate',
      label: 'Due Date',
      type: 'date',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'paid', label: 'Paid' },
        { value: 'pending', label: 'Pending' },
      ],
    },
    {
      name: 'notes',
      label: 'Notes',
      multiline: true,
      rows: 3,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Fees Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!selectedClass}>
          Record Fee
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
        data={fees}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={fees.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No fee records found. Select a class to view fees."
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedFee ? 'Edit Fee' : 'Record Fee'}
        fields={formFields}
        initialValues={selectedFee || {}}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Fee"
        message="Are you sure you want to delete this fee record?"
        confirmLabel="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default FeesManagement;
