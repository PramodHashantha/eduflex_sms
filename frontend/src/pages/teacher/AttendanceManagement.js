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
import EventIcon from '@mui/icons-material/Event';
import { attendanceAPI, classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const AttendanceManagement = () => {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsForClass();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && sessionDate) {
      fetchAttendance();
    }
  }, [selectedClass, sessionDate, page, rowsPerPage]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = {
        class: selectedClass,
        sessionDate: sessionDate,
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
      // Teacher can only see their own classes
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
    setSelectedAttendance(null);
    setDialogOpen(true);
  };

  const handleBulkMark = async () => {
    if (!selectedClass || !sessionDate) {
      showError('Please select a class and date');
      return;
    }
    // Fetch enrolled students
    const enrollments = await enrollmentsAPI.getAll({ class: selectedClass, status: 'active', isDeleted: 'false' });
    const studentList = enrollments.data.map(e => ({
      id: e.student?._id || e.student,
      name: `${e.student?.firstName} ${e.student?.lastName}`,
      isPresent: true,
    }));

    const bulkData = {
      class: selectedClass,
      sessionDate: sessionDate,
      students: studentList.map(s => ({ student: s.id, isPresent: s.isPresent })),
    };

    try {
      await attendanceAPI.bulkCreate(bulkData);
      showSuccess('Attendance marked for all students');
      fetchAttendance();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const handleEdit = (attendance) => {
    setSelectedAttendance({
      ...attendance,
      student: attendance.student?._id || attendance.student,
      class: attendance.class?._id || attendance.class,
      sessionDate: attendance.sessionDate ? new Date(attendance.sessionDate).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (attendance) => {
    setSelectedAttendance(attendance);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await attendanceAPI.delete(selectedAttendance._id);
      showSuccess('Attendance record deleted successfully');
      setDeleteDialogOpen(false);
      fetchAttendance();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete attendance');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedAttendance) {
        await attendanceAPI.update(selectedAttendance._id, formData);
        showSuccess('Attendance updated successfully');
      } else {
        await attendanceAPI.create({ ...formData, class: selectedClass });
        showSuccess('Attendance marked successfully');
      }
      setDialogOpen(false);
      fetchAttendance();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save attendance');
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
      name: 'sessionDate',
      label: 'Session Date',
      type: 'date',
      required: true,
    },
    {
      name: 'isPresent',
      label: 'Present',
      type: 'checkbox',
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
        <Typography variant="h4">Attendance Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={handleBulkMark}
            disabled={!selectedClass || !sessionDate}
          >
            Bulk Mark
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Mark Attendance
          </Button>
        </Box>
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
        <TextField
          type="date"
          label="Session Date"
          variant="outlined"
          size="small"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      <DataTable
        columns={columns}
        data={attendance}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={attendance.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No attendance records found. Select a class and date to view records."
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedAttendance ? 'Edit Attendance' : 'Mark Attendance'}
        fields={formFields}
        initialValues={selectedAttendance || { sessionDate, class: selectedClass }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Attendance"
        message="Are you sure you want to delete this attendance record?"
        confirmLabel="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default AttendanceManagement;
