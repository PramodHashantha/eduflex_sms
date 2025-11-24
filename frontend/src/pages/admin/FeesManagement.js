import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
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
  InputAdornment,
  Checkbox,
  Grid,
  Tooltip,
  Chip,
  Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { feesAPI, classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const FeesManagement = () => {
  // Unified State
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);

  // Data State
  const [studentFees, setStudentFees] = useState([]); // For Daily Marking
  const [feesHistory, setFeesHistory] = useState([]); // For History Grid
  const [students, setStudents] = useState([]); // All students in class

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  // Update Date when Month changes to ensure it's valid
  useEffect(() => {
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(selectedDate);
      if (date.getMonth() + 1 !== parseInt(month) || date.getFullYear() !== parseInt(year)) {
        // Default to 1st of the new month
        setSelectedDate(`${selectedMonth}-01`);
      }
    }
  }, [selectedMonth]);

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll({ isDeleted: 'false' });
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handleLoad = async () => {
    if (!selectedClass || !selectedMonth || !selectedDate) {
      showError('Please select class, month, and date');
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Students
      const enrollmentsRes = await enrollmentsAPI.getAll({ class: selectedClass, status: 'active', isDeleted: 'false' });
      const studentIds = enrollmentsRes.data.map(e => e.student?._id || e.student);

      let studentsData = [];
      if (studentIds.length > 0) {
        const studentsRes = await Promise.all(studentIds.map(id => usersAPI.getById(id)));
        studentsData = studentsRes.map(res => res.data);
      }
      setStudents(studentsData);

      // 2. Fetch Daily Fees (for Marking)
      const dailyFeesRes = await feesAPI.getAll({
        class: selectedClass,
        paymentDate: selectedDate,
        isDeleted: 'false'
      });

      // Merge for Marking List
      const merged = studentsData.map(student => {
        const fee = dailyFeesRes.data.find(f => (f.student?._id || f.student) === student._id);
        return {
          studentId: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          userId: student.userId,
          profilePicture: student.profilePicture,
          isPaid: !!fee,
          amount: fee ? fee.amount : '',
          feeId: fee ? fee._id : null
        };
      });
      setStudentFees(merged);

      // 3. Fetch Monthly History (for Grid)
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const startDate = `${yearStr}-${monthStr}-01`;
      const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];

      const historyRes = await feesAPI.getAll({
        class: selectedClass,
        startDate,
        endDate,
        isDeleted: 'false'
      });
      setFeesHistory(historyRes.data);

    } catch (error) {
      showError('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeChange = (index, field, value) => {
    const updated = [...studentFees];
    updated[index][field] = value;
    setStudentFees(updated);
  };

  const handleSave = async () => {
    try {
      const feesToSave = studentFees.map(item => ({
        student: item.studentId,
        isPaid: item.isPaid,
        amount: item.amount ? parseFloat(item.amount) : 0,
        notes: ''
      }));

      const payload = {
        class: selectedClass,
        paymentDate: selectedDate,
        amount: 0,
        students: feesToSave
      };

      await feesAPI.bulkCreate(payload);
      showSuccess('Fees saved successfully');
      handleLoad(); // Refresh both views
    } catch (error) {
      showError('Failed to save fees');
      console.error(error);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const renderHistoryGrid = () => {
    if (!selectedMonth || students.length === 0) return null;

    // Identify days with payments
    const activeDays = new Set();
    feesHistory.forEach(f => {
      const fDate = new Date(f.paymentDate);
      activeDays.add(fDate.getDate());
    });

    // Filter days to show only those with payments, sorted
    const days = Array.from(activeDays).sort((a, b) => a - b);

    if (days.length === 0) {
      return <Typography sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>No payments recorded for this month.</Typography>;
    }

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, mt: 2 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Student Name</TableCell>
              {days.map(day => (
                <TableCell key={day} align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                  {day}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map(student => {
              // Get all fees for this student in the current month history
              const studentFees = feesHistory.filter(f => (f.student?._id || f.student) === student._id);

              // Calculate total
              const total = studentFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);

              return (
                <TableRow key={student._id} hover>
                  <TableCell>{student.firstName} {student.lastName}</TableCell>
                  {days.map(day => {
                    // Find fee for this specific day
                    const feeForDay = studentFees.find(f => new Date(f.paymentDate).getDate() === day);
                    return (
                      <TableCell key={day} align="center">
                        {feeForDay ? (
                          <Chip
                            label={feeForDay.amount}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {total > 0 ? total : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Fees Management</Typography>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>{cls.className}</option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                type="month"
                fullWidth
                label="Month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                fullWidth
                label="Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleLoad}
                disabled={loading}
                fullWidth
              >
                Load Data
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Daily Marking Section */}
      {studentFees.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Daily Fees - {selectedDate}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentFees.map((student, index) => (
                    <TableRow key={student.studentId} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={student.profilePicture} alt={student.firstName} />
                          <Box>
                            <Typography variant="subtitle2">{student.firstName} {student.lastName}</Typography>
                            <Typography variant="caption" color="textSecondary">{student.userId}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={student.isPaid || false}
                          onChange={(e) => handleFeeChange(index, 'isPaid', e.target.checked)}
                          color="success"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={student.amount}
                          onChange={(e) => handleFeeChange(index, 'amount', e.target.value)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Divider sx={{ my: 4 }} />

      {/* History Section */}
      {students.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Fees History for {selectedMonth}</Typography>
            {renderHistoryGrid()}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default FeesManagement;
