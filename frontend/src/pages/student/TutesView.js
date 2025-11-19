import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Link,
} from '@mui/material';
import { tutesAPI, enrollmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';

const TutesView = () => {
  const [tutes, setTutes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchTutes();
  }, [selectedClass]);

  const fetchTutes = async () => {
    setLoading(true);
    try {
      const params = {
        student: user._id,
        isDeleted: 'false',
        ...(selectedClass && { class: selectedClass }),
      };
      const response = await tutesAPI.getAll(params);
      setTutes(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch tutes');
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
      id: 'title',
      label: 'Title',
    },
    {
      id: 'description',
      label: 'Description',
      format: (value) => value || '-',
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
      id: 'fileUrl',
      label: 'File',
      format: (value, row) => {
        if (value) {
          return (
            <Link href={value} target="_blank" rel="noopener noreferrer">
              {row.fileName || 'Download'}
            </Link>
          );
        }
        return '-';
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Tutes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View assigned tutes and lesson materials
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
        data={tutes}
        loading={loading}
        page={0}
        rowsPerPage={10}
        totalRows={tutes.length}
        emptyMessage="No tutes assigned"
      />
    </Box>
  );
};

export default TutesView;
