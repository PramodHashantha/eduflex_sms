import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Grid,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import { attendanceAPI, classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const AttendanceManagement = () => {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);

  // History View State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [students, setStudents] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && sessionDate) {
      fetchAttendance();
    }
  }, [selectedClass, sessionDate, page, rowsPerPage]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedMonth) {
      fetchAttendanceHistory();
    }
  }, [selectedClass, selectedMonth]);

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
      const response = await classesAPI.getAll({ isDeleted: 'false' });
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
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
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      const startDate = `${yearStr}-${monthStr}-01`;
      const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];

      const params = {
        class: selectedClass,
        startDate: startDate,
        endDate: endDate,
        isDeleted: 'false'
      };

      const response = await attendanceAPI.getAll(params);
      setAttendanceHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history", error);
    }
  };

  const handleCreate = () => {
    setSelectedAttendance(null);
    setDialogOpen(true);
  };

  const handleBulkMark = async () => {
    if (!selectedClass || !sessionDate) {
      showError('Please select a class and date');
      return;
    }
    setBulkDialogOpen(true);
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
      fetchAttendanceHistory();
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
        await attendanceAPI.create(formData);
        showSuccess('Attendance marked successfully');
      }
      setDialogOpen(false);
      fetchAttendance();
      fetchAttendanceHistory();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  const handleBulkSubmit = async (formData) => {
    try {
      const students = formData.students || [];
      const bulkData = {
        class: selectedClass,
        sessionDate: sessionDate,
        students: students.map((s) => ({
          student: s.id,
          isPresent: s.isPresent !== false,
        })),
      };
      await attendanceAPI.bulkCreate(bulkData);
      showSuccess('Attendance marked for all students');
      setBulkDialogOpen(false);
      fetchAttendance();
      fetchAttendanceHistory();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to mark attendance');
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
      options: [], // Will be populated dynamically
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

  // Calculate unique dates for history columns
  const uniqueDates = [...new Set(attendanceHistory.map(h => {
    return new Date(h.sessionDate).toISOString().split('T')[0];
  }))].sort();

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
        emptyMessage="No attendance records found"
      />

      {/* History View */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Attendance History</Typography>
          <TextField
            type="month"
            size="small"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </Box>
        <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <CardContent>
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                    {uniqueDates.map((date) => (
                      <TableCell key={date} align="center" sx={{ minWidth: 30, px: 0, color: 'text.secondary', fontSize: '0.75rem' }}>
                        {new Date(date).getDate()}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => {
                    const studentHistory = attendanceHistory.filter(
                      h => (h.student?._id || h.student) === student._id
                    );

                    const presentDays = studentHistory.filter(h => h.isPresent).length;
                    const totalDays = studentHistory.length;
                    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

                    return (
                      <TableRow key={student._id} hover>
                        <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                          <Avatar src={student.profilePicture} sx={{ width: 32, height: 32 }}>
                            {student.firstName[0]}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {student.firstName} {student.lastName}
                          </Typography>
                        </TableCell>
                        {uniqueDates.map((date) => {
                          const record = studentHistory.find(h => {
                            return new Date(h.sessionDate).toISOString().split('T')[0] === date;
                          });

                          let status = null;
                          let color = 'text.disabled';
                          if (record) {
                            status = record.isPresent ? 'P' : 'A';
                            color = record.isPresent ? 'success.main' : 'error.main';
                          }

                          return (
                            <TableCell key={date} align="center" sx={{ px: 0 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color,
                                  fontWeight: 'bold',
                                  display: 'inline-block',
                                  width: 20,
                                  textAlign: 'center'
                                }}
                              >
                                {status || '-'}
                              </Typography>
                            </TableCell>
                          );
                        })}
                        <TableCell align="right">
                          <Chip
                            label={`${rate}%`}
                            size="small"
                            color={rate < 75 ? 'error' : 'success'}
                            variant={rate < 75 ? 'outlined' : 'filled'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={uniqueDates.length + 2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No data available. Select a class to view history.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

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
