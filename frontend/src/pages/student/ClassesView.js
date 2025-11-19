import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { enrollmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';

const ClassesView = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const response = await enrollmentsAPI.getAll({
        student: user._id,
        status: 'active',
        isDeleted: 'false',
      });
      setEnrollments(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      id: 'class',
      label: 'Class Name',
      format: (value) => {
        if (typeof value === 'object' && value) {
          return value.className;
        }
        return '-';
      },
    },
    {
      id: 'teacher',
      label: 'Teacher',
      format: (value, row) => {
        const classObj = row.class;
        if (typeof classObj === 'object' && classObj?.teacher) {
          const teacher = classObj.teacher;
          return `${teacher.firstName} ${teacher.lastName} (${teacher.userId})`;
        }
        return '-';
      },
    },
    {
      id: 'description',
      label: 'Description',
      format: (value, row) => {
        const classObj = row.class;
        if (typeof classObj === 'object') {
          return classObj.description || '-';
        }
        return '-';
      },
    },
    {
      id: 'schedule',
      label: 'Schedule',
      format: (value, row) => {
        const classObj = row.class;
        if (typeof classObj === 'object') {
          return classObj.schedule || '-';
        }
        return '-';
      },
    },
    {
      id: 'dateJoined',
      label: 'Date Joined',
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      id: 'status',
      label: 'Status',
      format: (value) => (
        <Chip
          label={value}
          color={value === 'active' ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Classes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View all classes you are enrolled in
      </Typography>

      <DataTable
        columns={columns}
        data={enrollments}
        loading={loading}
        page={0}
        rowsPerPage={10}
        totalRows={enrollments.length}
        emptyMessage="You are not enrolled in any classes"
      />
    </Box>
  );
};

export default ClassesView;
