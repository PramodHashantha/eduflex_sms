import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Chip,
  IconButton,
  Avatar,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloseIcon from '@mui/icons-material/Close';

import { tutesAPI, classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const TutesManagement = () => {
  // State
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);
  const [tutes, setTutes] = useState([]); // Materials
  const [assignments, setAssignments] = useState([]); // Distribution
  const [students, setStudents] = useState([]);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTute, setSelectedTute] = useState(null);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState(null);
  const [tutesToAssign, setTutesToAssign] = useState([]);

  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedMonth) {
      const date = new Date(selectedDate);
      const monthStr = date.toISOString().slice(0, 7);
      if (monthStr !== selectedMonth) {
        setSelectedDate(`${selectedMonth}-01`);
      }
    }
  }, [selectedMonth]);

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll({
        isDeleted: 'false',
        teacher: user._id
      });
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const enrollmentsRes = await enrollmentsAPI.getAll({ class: selectedClass, status: 'active', isDeleted: 'false' });
      const studentIds = enrollmentsRes.data.map(e => e.student?._id || e.student);
      if (studentIds.length > 0) {
        const studentsRes = await Promise.all(studentIds.map(id => usersAPI.getById(id)));
        setStudents(studentsRes.map(res => res.data));
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error(error);
      setStudents([]);
    }
  };

  const handleLoad = async () => {
    if (!selectedClass || !selectedMonth) {
      showError('Please select class and month');
      return;
    }
    setLoading(true);
    try {
      const response = await tutesAPI.getAssignments({ classId: selectedClass, month: selectedMonth });
      setTutes(response.data.tutes);
      setAssignments(response.data.assignments);
    } catch (error) {
      showError('Failed to load tutes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Tute CRUD
  const handleCreate = () => {
    setSelectedTute(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      const payload = {
        ...formData,
        month: selectedMonth
      };

      if (selectedTute) {
        await tutesAPI.update(selectedTute._id, payload);
        showSuccess('Tute updated successfully');
      } else {
        await tutesAPI.create(payload);
        showSuccess('Tute created successfully');
      }
      setDialogOpen(false);
      if (selectedClass) {
        handleLoad();
      }
    } catch (error) {
      showError('Failed to save tute');
    }
  };

  // Assignment Logic
  const handleOpenAssignDialog = (student) => {
    setSelectedStudentForAssign(student);
    // Pre-select assigned tutes for this student
    const studentAssignments = assignments.filter(a =>
      (a.student?._id || a.student) === student._id
    );
    const assignedTuteIds = studentAssignments.map(a => a.tute?._id || a.tute);
    setTutesToAssign(assignedTuteIds);
    setAssignDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    try {
      if (!selectedStudentForAssign || !selectedClass) return;

      await tutesAPI.syncAssignments({
        classId: selectedClass,
        studentId: selectedStudentForAssign._id,
        tuteIds: tutesToAssign,
        date: selectedDate
      });

      showSuccess('Tute assignments synced successfully');
      setAssignDialogOpen(false);
      handleLoad(); // Refresh assignments
    } catch (error) {
      console.error('Assign error:', error);
      showError('Failed to sync assignments');
    }
  };

  const handleUnassign = async (assignmentId) => {
    // This is now handled by the sync logic in the dialog
    console.log("Unassigning via chip is deprecated in favor of sync dialog", assignmentId);
  };

  // Stats
  const filteredStudents = students.filter(s =>
    s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.userId && s.userId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStudentAssignments = (studentId) => {
    return assignments.filter(a => {
      const isStudentMatch = (a.student?._id || a.student) === studentId;
      const assignDate = new Date(a.assignedAt).toISOString().slice(0, 10);
      const isDateMatch = assignDate === selectedDate;
      return isStudentMatch && isDateMatch;
    });
  };

  const assignedCount = students.filter(s => getStudentAssignments(s._id).length > 0).length;
  const pendingCount = students.length - assignedCount;

  const formFields = [
    { name: 'title', label: 'Title', required: true },
    { name: 'description', label: 'Description', multiline: true, rows: 3 },
    {
      name: 'grade',
      label: 'Grade',
      type: 'select',
      options: Array.from({ length: 13 }, (_, i) => ({ value: String(i + 1), label: `Grade ${i + 1}` })),
      required: true
    },
    { name: 'fileUrl', label: 'File URL' },
  ];

  // Calculate active days for history grid
  const activeDays = React.useMemo(() => {
    const days = new Set();
    assignments.forEach(a => {
      const date = new Date(a.assignedAt);
      const monthStr = date.toISOString().slice(0, 7);
      if (monthStr === selectedMonth) {
        days.add(date.getDate());
      }
    });
    return Array.from(days).sort((a, b) => a - b);
  }, [assignments, selectedMonth]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ bgcolor: '#7c4dff', color: 'white', p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">Tute Assignment Management</Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Assign and manage tutorial sessions for students
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{ bgcolor: 'white', color: '#651fff', fontWeight: 'bold', '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              Create New Tute
            </Button>
            <Button
              variant="outlined"
              startIcon={<SearchIcon />} // Using SearchIcon as Refresh replacement if needed, or just text
              onClick={handleLoad}
              sx={{ textTransform: 'none', borderRadius: 2, bgcolor: 'white', color: 'primary.main' }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 3 }}>
        {/* Filters */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Select Class/Grade</Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ bgcolor: 'white' }}
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>{cls.className} (Grade {cls.grade})</option>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Select Month</Typography>
            <TextField
              type="month"
              fullWidth
              size="small"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              sx={{ bgcolor: 'white' }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Select Date</Typography>
            <TextField
              type="date"
              fullWidth
              size="small"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              inputProps={{
                min: selectedMonth ? `${selectedMonth}-01` : undefined,
                max: selectedMonth ? new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).toISOString().split('T')[0] : undefined
              }}
              sx={{ bgcolor: 'white' }}
            />
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleLoad}
              disabled={loading}
              startIcon={loading ? null : <SearchIcon />}
              sx={{ bgcolor: '#651fff', '&:hover': { bgcolor: '#5e35b1' }, height: 40 }}
            >
              {loading ? 'Loading...' : 'Load Students'}
            </Button>
          </Grid>
        </Grid>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" color="primary" fontWeight="bold">{students.length}</Typography>
            <Typography variant="body2" color="text.secondary">Students</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              <Box component="span" fontWeight="bold" color="success.main">{assignedCount}</Box> Assigned
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon color="warning" fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              <Box component="span" fontWeight="bold" color="warning.main">{pendingCount}</Box> Pending
            </Typography>
          </Box>
        </Box>

        {/* Student List */}
        <Paper variant="outlined" sx={{ mb: 4 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
            <Typography variant="h6" fontWeight="bold">
              Student List - {new Date(selectedDate).toLocaleDateString()}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
                }}
              />
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Student Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Roll No</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Assigned Tutes</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student, index) => {
                  const studentAssignments = getStudentAssignments(student._id);
                  const isAssigned = studentAssignments.length > 0;

                  return (
                    <TableRow key={student._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={student.profilePicture} alt={student.firstName} />
                          <Box>
                            <Typography variant="subtitle2">{student.firstName} {student.lastName}</Typography>
                            <Typography variant="caption" color="text.secondary">{student.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{student.rollNo || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {studentAssignments.length > 0 ? (
                            studentAssignments.map(a => {
                              const tute = tutes.find(t => t._id === (a.tute?._id || a.tute));
                              return tute ? (
                                <Chip
                                  key={a._id}
                                  label={tute.title}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ bgcolor: '#e3f2fd', border: 'none', color: '#1976d2' }}
                                />
                              ) : null;
                            })
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              No tutes assigned
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={isAssigned ? "Assigned" : "Pending"}
                          size="small"
                          icon={isAssigned ? <CheckCircleIcon /> : <ScheduleIcon />}
                          sx={{
                            bgcolor: isAssigned ? '#e8f5e9' : '#fff3e0',
                            color: isAssigned ? '#2e7d32' : '#ed6c02',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleOpenAssignDialog(student)}
                          sx={{ bgcolor: '#651fff', textTransform: 'none', borderRadius: 2 }}
                        >
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No students found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Tute Assignment History */}
        < Paper variant="outlined" sx={{ mb: 4, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Tute Assignment History - {new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track daily tute assignments for the selected month
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#e8f5e9', border: '1px solid #4caf50' }} />
                <Typography variant="caption">Assigned</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }} />
                <Typography variant="caption">Not Assigned</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#651fff' }} />
                <Typography variant="caption">Current Date</Typography>
              </Box>
            </Box>
          </Box>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', minWidth: 200, position: 'sticky', left: 0, zIndex: 3 }}>
                    STUDENT NAME
                  </TableCell>
                  {activeDays.map(day => {
                    const date = new Date(selectedMonth);
                    date.setDate(day);
                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                      <TableCell
                        key={day}
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: isToday ? '#ede7f6' : '#f9fafb',
                          color: isToday ? '#651fff' : 'inherit',
                          minWidth: 40,
                          borderLeft: '1px solid #eee'
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {date.toLocaleString('default', { month: 'short' }).toUpperCase()}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', bgcolor: isToday ? '#651fff' : 'transparent', color: isToday ? 'white' : 'inherit', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {day}
                          </Typography>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student._id} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'white', zIndex: 1, borderRight: '1px solid #eee' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={student.profilePicture} alt={student.firstName} sx={{ width: 32, height: 32 }} />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontSize: '0.85rem' }}>
                            {student.firstName} {student.lastName}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    {activeDays.map(day => {
                      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                      const dailyAssignments = assignments.filter(a => {
                        const assignDate = new Date(a.assignedAt).toISOString().slice(0, 10);
                        return (a.student?._id || a.student) === student._id && assignDate === dateStr;
                      });

                      const count = dailyAssignments.length;
                      const isToday = new Date().toDateString() === new Date(dateStr).toDateString();

                      return (
                        <TableCell
                          key={day}
                          align="center"
                          sx={{
                            bgcolor: isToday ? '#ede7f6' : 'inherit',
                            borderLeft: '1px solid #eee',
                            p: 1
                          }}
                        >
                          {count > 0 ? (
                            <Tooltip
                              title={
                                <Box>
                                  {dailyAssignments.map(a => {
                                    const tute = tutes.find(t => t._id === (a.tute?._id || a.tute));
                                    return (
                                      <Typography key={a._id} variant="caption" display="block">
                                        • {tute ? tute.title : 'Unknown Tute'}
                                      </Typography>
                                    );
                                  })}
                                </Box>
                              }
                              arrow
                            >
                              <Box
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  bgcolor: '#e8f5e9',
                                  color: '#2e7d32',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  mx: 'auto'
                                }}
                              >
                                {count}
                              </Box>
                            </Tooltip>
                          ) : (
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: '#f5f5f5',
                                color: '#bdbdbd',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                mx: 'auto'
                              }}
                            >
                              -
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ p: 2, bgcolor: '#f9fafb', borderTop: '1px solid #eee', textAlign: 'right' }}>
            <Typography variant="body2" fontWeight="bold">
              Total Assignments This Month: {assignments.filter(a => new Date(a.assignedAt).toISOString().slice(0, 7) === selectedMonth).length}
            </Typography>
          </Box>
        </Paper >
      </Box >
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedTute ? 'Edit Tute' : 'Create New Tute'}
        fields={formFields}
        initialValues={selectedTute || {}}
        onSubmit={handleSubmit}
      />

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Tutes to {selectedStudentForAssign?.firstName}</DialogTitle>
        <DialogContent dividers>
          <List>
            {tutes.map((tute) => {
              const isSelected = tutesToAssign.includes(tute._id);
              return (
                <ListItem key={tute._id} button onClick={() => {
                  if (isSelected) {
                    setTutesToAssign(prev => prev.filter(id => id !== tute._id));
                  } else {
                    setTutesToAssign(prev => [...prev, tute._id]);
                  }
                }}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={tute.title} secondary={tute.description} />
                </ListItem>
              );
            })}
            {tutes.length === 0 && <Typography align="center">No tutes available for this month.</Typography>}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignSubmit} variant="contained" color="primary">Save Assignments</Button>
        </DialogActions>
      </Dialog>

    </Box >
  );
};

export default TutesManagement;
