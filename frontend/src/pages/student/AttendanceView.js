import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
} from '@mui/material';
import { attendanceAPI, enrollmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';

const AttendanceView = () => {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchAttendance();
    }
  }, [selectedClass]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = {
        student: user._id,
        ...(selectedClass && { class: selectedClass }),
        isDeleted: 'false',
      };
      const response = await attendanceAPI.getAll(params);
      setAttendance(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch attendance');
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
      id: 'sessionDate',
      label: 'Date',
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      id: 'isPresent',
      label: 'Status',
      format: (value) => (
        <Chip
          label={value ? 'Present' : 'Absent'}
          color={value ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      id: 'notes',
      label: 'Notes',
      format: (value) => value || '-',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Attendance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View your attendance records
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
      </Box>

      <DataTable
        columns={columns}
        data={attendance}
        loading={loading}
        page={0}
        rowsPerPage={10}
        totalRows={attendance.length}
        emptyMessage="No attendance records found"
      />
    </Box>
  );
};

export default AttendanceView;
