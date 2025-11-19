import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
} from '@mui/material';
import { feesAPI, enrollmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';

const FeesView = () => {
  const [fees, setFees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchFees();
  }, [selectedClass, statusFilter]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const params = {
        student: user._id,
        isDeleted: 'false',
        ...(selectedClass && { class: selectedClass }),
        ...(statusFilter && { status: statusFilter }),
      };
      const response = await feesAPI.getAll(params);
      setFees(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch fees');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await enrollmentsAPI.getAll({
        student: user._id,
        status: 'active',
        isDeleted: 'false',
      });
      setClasses(response.data.map(e => e.class).filter(c => c));
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const columns = [
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
      id: 'paymentType',
      label: 'Payment Type',
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
      id: 'dueDate',
      label: 'Due Date',
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      id: 'notes',
      label: 'Notes',
      format: (value) => value || '-',
    },
  ];

  const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalPending = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Fees
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View your fee payment history
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Filter by Class"
          variant="outlined"
          size="small"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          sx={{ minWidth: 200 }}
          SelectProps={{ native: true }}
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.className}
            </option>
          ))}
        </TextField>
        <TextField
          select
          label="Filter by Status"
          variant="outlined"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
          SelectProps={{ native: true }}
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </TextField>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2, color: 'white' }}>
          <Typography variant="body2">Total Paid</Typography>
          <Typography variant="h6">${totalPaid.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2, color: 'white' }}>
          <Typography variant="body2">Total Pending</Typography>
          <Typography variant="h6">${totalPending.toFixed(2)}</Typography>
        </Box>
      </Box>

      <DataTable
        columns={columns}
        data={fees}
        loading={loading}
        page={0}
        rowsPerPage={10}
        totalRows={fees.length}
        emptyMessage="No fee records found"
      />
    </Box>
  );
};

export default FeesView;
