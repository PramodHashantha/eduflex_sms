import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Avatar,
  Divider,
  Stack,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import EmailIcon from '@mui/icons-material/Email';
import HistoryIcon from '@mui/icons-material/History';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RemoveIcon from '@mui/icons-material/Remove';
import { attendanceAPI, classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const AttendanceManagement = () => {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // Local state for marking attendance before saving
  const [markedAttendance, setMarkedAttendance] = useState({});

  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);

    // Auto-select the first day of the new month
    if (newMonth) {
      const [year, month] = newMonth.split('-');
      const newDate = `${year}-${month}-01`;
      setSessionDate(newDate);
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

  const handleLoadAttendance = async () => {
    if (!selectedClass || !sessionDate) {
      showError('Please select a class and date');
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Students
      const enrollments = await enrollmentsAPI.getAll({ class: selectedClass, status: 'active', isDeleted: 'false' });
      const studentIds = enrollments.data.map(e => e.student?._id || e.student);

      let studentsData = [];
      if (studentIds.length > 0) {
        const studentsRes = await Promise.all(studentIds.map(id => usersAPI.getById(id)));
        studentsData = studentsRes.map(res => res.data);
      }
      setStudents(studentsData);

      // 2. Fetch Attendance for the specific date
      const params = {
        class: selectedClass,
        sessionDate: sessionDate,
        isDeleted: 'false',
      };
      const response = await attendanceAPI.getAll(params);
      setAttendance(response.data);

      // 3. Initialize Marked Attendance
      const newMarks = {};
      studentsData.forEach(s => {
        newMarks[s._id] = { isPresent: false, status: 'pending', _id: null };
      });

      response.data.forEach(record => {
        const studentId = record.student?._id || record.student;
        if (newMarks[studentId]) {
          newMarks[studentId] = {
            isPresent: record.isPresent,
            status: record.isPresent ? 'present' : 'absent',
            _id: record._id
          };
        }
      });
      setMarkedAttendance(newMarks);

      // 4. Fetch History for the month
      await fetchAttendanceHistory();

    } catch (error) {
      console.error('Failed to load data:', error);
      showError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };
  const fetchAttendanceHistory = async () => {
    try {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      const startDate = `${yearStr}-${monthStr}-01`;
      // Use Date.UTC to ensure we get the correct date regardless of local timezone
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

  const handleMarkStatus = (studentId, status) => {
    setMarkedAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isPresent: status === 'present',
        status: status
      }
    }));
  };

  const handleMarkAllPresent = () => {
    const newMarks = { ...markedAttendance };
    Object.keys(newMarks).forEach(key => {
      newMarks[key] = { ...newMarks[key], isPresent: true, status: 'present' };
    });
    setMarkedAttendance(newMarks);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || !sessionDate) {
      showError('Please select a class and date');
      return;
    }

    setLoading(true);
    try {
      const promises = Object.keys(markedAttendance).map(async (studentId) => {
        const mark = markedAttendance[studentId];
        if (mark.status === 'pending') return;

        const payload = {
          class: selectedClass,
          sessionDate: sessionDate,
          student: studentId,
          isPresent: mark.isPresent
        };

        if (mark._id) {
          return attendanceAPI.update(mark._id, payload);
        } else {
          return attendanceAPI.create(payload);
        }
      });

      await Promise.all(promises);
      showSuccess('Attendance saved successfully');

      // Refresh data to get new IDs and ensure consistency
      handleLoadAttendance();

    } catch (error) {
      showError('Failed to save attendance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalStudents = students.length;
  const presentCount = Object.values(markedAttendance).filter(m => m.status === 'present').length;
  const absentCount = Object.values(markedAttendance).filter(m => m.status === 'absent').length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // Calculate unique dates for history columns
  const uniqueDates = [...new Set(attendanceHistory.map(h => {
    return new Date(h.sessionDate).toISOString().split('T')[0];
  }))].sort();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Controls */}
      <Card sx={{ mb: 3, p: 2, borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Attendance Controls</Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>Select Class</Typography>
            <TextField
              select
              fullWidth
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="" disabled>Select Class</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.className}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>Select Month</Typography>
            <TextField
              type="month"
              fullWidth
              value={selectedMonth}
              onChange={handleMonthChange}
              disabled={!selectedClass}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>Select Date</Typography>
            <TextField
              type="date"
              fullWidth
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              disabled={!selectedMonth}
              inputProps={{
                min: selectedMonth ? `${selectedMonth}-01` : undefined,
                max: selectedMonth ? new Date(new Date(selectedMonth).getFullYear(), new Date(selectedMonth).getMonth() + 1, 0).toISOString().split('T')[0] : undefined
              }}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleLoadAttendance}
              disabled={!selectedClass || !sessionDate || loading}
              sx={{ height: 40, textTransform: 'none', fontWeight: 600 }}
            >
              {loading ? 'Loading...' : 'Load Attendance'}
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Grid container spacing={3}>
        {/* Main Attendance List */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
              <Typography variant="h6" fontWeight={600}>
                Today's Attendance - {classes.find(c => c._id === selectedClass)?.className || ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="text"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleMarkAllPresent}
                  disabled={students.length === 0}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Mark All Present
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveAttendance}
                  disabled={students.length === 0 || loading}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Save Attendance
                </Button>
              </Box>
            </Box>
            <CardContent sx={{ maxHeight: '600px', overflowY: 'auto', bgcolor: '#fafafa' }}>
              {students.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography color="textSecondary">
                    Select a class and date, then click "Load Attendance" to start.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {students.map((student) => {
                    const mark = markedAttendance[student._id] || { status: 'pending' };
                    return (
                      <Paper
                        key={student._id}
                        elevation={0}
                        sx={{
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: mark.status === 'present' ? '#a5d6a7' :
                            mark.status === 'absent' ? '#ef9a9a' : '#eee',
                          bgcolor: mark.status === 'present' ? '#e8f5e9' :
                            mark.status === 'absent' ? '#ffebee' : 'white',
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            borderColor: mark.status === 'present' ? '#81c784' :
                              mark.status === 'absent' ? '#e57373' : '#e0e0e0'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            src={student.profilePicture}
                            alt={student.firstName}
                            sx={{ width: 48, height: 48 }}
                          >
                            {student.firstName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {student.firstName} {student.lastName}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Roll No: {student.userId}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant={mark.status === 'present' ? 'contained' : 'outlined'}
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleMarkStatus(student._id, 'present')}
                            sx={{
                              textTransform: 'none',
                              minWidth: 100,
                              boxShadow: mark.status === 'present' ? 2 : 0
                            }}
                          >
                            Present
                          </Button>
                          <Button
                            variant={mark.status === 'absent' ? 'contained' : 'outlined'}
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleMarkStatus(student._id, 'absent')}
                            sx={{
                              textTransform: 'none',
                              minWidth: 100,
                              boxShadow: mark.status === 'absent' ? 2 : 0
                            }}
                          >
                            Absent
                          </Button>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar Widgets */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Summary Widget */}
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>Attendance Summary</Typography>
                <Stack spacing={2}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#e8f5e9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: '50%', display: 'flex' }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>Present</Typography>
                        <Typography variant="caption" color="textSecondary">Today</Typography>
                      </Box>
                    </Box>
                    <Typography variant="h4" color="success.main" fontWeight={700}>{presentCount}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffebee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: '50%', display: 'flex' }}>
                        <CancelIcon color="error" fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>Absent</Typography>
                        <Typography variant="caption" color="textSecondary">Today</Typography>
                      </Box>
                    </Box>
                    <Typography variant="h4" color="error.main" fontWeight={700}>{absentCount}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#e3f2fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, bgcolor: 'white', borderRadius: '50%', display: 'flex' }}>
                        <HistoryIcon color="primary" fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>Attendance Rate</Typography>
                        <Typography variant="caption" color="textSecondary">This Session</Typography>
                      </Box>
                    </Box>
                    <Typography variant="h4" color="primary.main" fontWeight={700}>{attendanceRate}%</Typography>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>

            {/* Quick Actions Widget */}
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>Quick Actions</Typography>
                <Stack spacing={1}>
                  <Button
                    variant="text"
                    startIcon={<DownloadIcon />}
                    sx={{ justifyContent: 'flex-start', color: 'text.primary', py: 1.5, px: 2, bgcolor: '#f5f5f5', '&:hover': { bgcolor: '#eeeeee' } }}
                  >
                    Export Attendance
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<EmailIcon />}
                    sx={{ justifyContent: 'flex-start', color: 'text.primary', py: 1.5, px: 2, bgcolor: '#f5f5f5', '&:hover': { bgcolor: '#eeeeee' } }}
                  >
                    Send Report to Parents
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<HistoryIcon />}
                    sx={{ justifyContent: 'flex-start', color: 'text.primary', py: 1.5, px: 2, bgcolor: '#f5f5f5', '&:hover': { bgcolor: '#eeeeee' } }}
                  >
                    View Monthly Report
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* History Table */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                {selectedMonth} - Attendance History
              </Typography>
              <TableContainer component={Paper} elevation={0} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #e0e0e0' }}>Student</TableCell>
                      {uniqueDates.map((date) => {
                        const d = new Date(date);
                        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayNum = d.getDate();
                        return (
                          <TableCell key={date} align="center" sx={{ minWidth: 40, px: 0.5, borderRight: '1px solid #e0e0e0' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem', lineHeight: 1 }}>
                                {dayName}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                                {dayNum}
                              </Typography>
                            </Box>
                          </TableCell>
                        );
                      })}
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
                          <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, borderRight: '1px solid #e0e0e0' }}>
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

                            return (
                              <TableCell key={date} align="center" sx={{ px: 0, borderRight: '1px solid #e0e0e0' }}>
                                {record ? (
                                  record.isPresent ? (
                                    <Tooltip title="Present">
                                      <CheckCircleIcon color="success" fontSize="small" />
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="Absent">
                                      <CancelIcon color="error" fontSize="small" />
                                    </Tooltip>
                                  )
                                ) : (
                                  <Tooltip title="No Record">
                                    <RemoveIcon color="disabled" fontSize="small" />
                                  </Tooltip>
                                )}
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
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AttendanceManagement;
