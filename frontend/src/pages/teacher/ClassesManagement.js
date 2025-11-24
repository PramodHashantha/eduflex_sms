import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid,
  Card,
  CardContent,
  CardActions,
  Menu,
  MenuItem,
  ListItemIcon,
  Avatar,
  AvatarGroup
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SchoolIcon from '@mui/icons-material/School';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';

import { classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const ClassesManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const [students, setStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrolledStudentsList, setEnrolledStudentsList] = useState([]);
  const [classStudents, setClassStudents] = useState({});

  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');

  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [stats, setStats] = useState({
    activeClasses: 0,
    totalStudents: 0,
    classCounts: {}
  });

  useEffect(() => {
    fetchData();
  }, [searchTerm, gradeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Classes
      const classesParams = {
        isDeleted: 'false',
        teacher: user._id,
        ...(searchTerm && { search: searchTerm }),
        ...(gradeFilter && { grade: gradeFilter }),
      };
      console.log('Fetching classes with params:', classesParams);
      const classesRes = await classesAPI.getAll(classesParams);

      // 2. Fetch Enrollments (to calculate student counts and get avatars)
      const enrollmentsRes = await enrollmentsAPI.getAll({
        status: 'active',
        isDeleted: 'false'
      });

      // Calculate Stats and Group Students
      const uniqueStudents = new Set(enrollmentsRes.data.map(e => e.student?._id || e.student));
      const counts = {};
      const studentsByClass = {};

      enrollmentsRes.data.forEach(e => {
        const cId = e.class?._id || e.class;
        counts[cId] = (counts[cId] || 0) + 1;

        if (!studentsByClass[cId]) {
          studentsByClass[cId] = [];
        }
        if (e.student && typeof e.student === 'object') {
          // Avoid duplicates if any
          if (!studentsByClass[cId].find(s => s._id === e.student._id)) {
            studentsByClass[cId].push(e.student);
          }
        }
      });

      setClasses(classesRes.data);
      setClassStudents(studentsByClass);
      setStats({
        activeClasses: classesRes.data.length,
        totalStudents: uniqueStudents.size,
        classCounts: counts
      });

    } catch (error) {
      showError('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Deprecated individual fetch functions to avoid double loading state
  const fetchClasses = () => { fetchData(); };

  const handleCreate = () => {
    setSelectedClass(null);
    setDialogOpen(true);
  };

  const handleEdit = () => {
    setManageDialogOpen(false);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    setManageDialogOpen(false);
    setDeleteDialogOpen(true);
  };

  const handleManage = (classItem) => {
    setSelectedClass(classItem);
    setManageDialogOpen(true);
  };

  const handleOpenEnroll = async () => {
    setManageDialogOpen(false); // Close manage dialog
    // Fetch all students
    try {
      const studentsRes = await usersAPI.getAll({ role: 'student', isDeleted: 'false' });
      setStudents(studentsRes.data);

      // Fetch already enrolled students
      const enrollmentsRes = await enrollmentsAPI.getAll({
        class: selectedClass._id,
        status: 'active',
        isDeleted: 'false',
      });
      setEnrolledStudents(enrollmentsRes.data.map(e => e.student?._id || e.student));
      setEnrolledStudentsList(enrollmentsRes.data);

      setEnrollDialogOpen(true);
    } catch (error) {
      showError('Failed to load students');
    }
  };

  const handleRemoveEnrollment = async (enrollmentId) => {
    try {
      await enrollmentsAPI.delete(enrollmentId);
      showSuccess('Student removed from class');
      // Refresh enrolled students list
      const enrollmentsRes = await enrollmentsAPI.getAll({
        class: selectedClass._id,
        status: 'active',
        isDeleted: 'false',
      });
      setEnrolledStudents(enrollmentsRes.data.map(e => e.student?._id || e.student));
      setEnrolledStudentsList(enrollmentsRes.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to remove student');
    }
  };

  const handleEnrollSubmit = async (formData) => {
    try {
      await enrollmentsAPI.create({
        student: formData.student,
        class: selectedClass._id,
      });
      showSuccess('Student enrolled successfully');
      // Refresh enrolled students list
      const enrollmentsRes = await enrollmentsAPI.getAll({
        class: selectedClass._id,
        status: 'active',
        isDeleted: 'false',
      });
      setEnrolledStudents(enrollmentsRes.data.map(e => e.student?._id || e.student));
      setEnrolledStudentsList(enrollmentsRes.data);
      // Reset form
      setSelectedStudentToEnroll('');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to enroll student');
    }
  };

  const confirmDelete = async () => {
    try {
      await classesAPI.delete(selectedClass._id);
      showSuccess('Class deleted successfully');
      setDeleteDialogOpen(false);
      fetchClasses();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete class');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedClass) {
        await classesAPI.update(selectedClass._id, formData);
        showSuccess('Class updated successfully');
      } else {
        await classesAPI.create({ ...formData, teacher: user._id });
        showSuccess('Class created successfully');
      }
      setDialogOpen(false);
      fetchClasses();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save class');
    }
  };

  const formFields = [
    {
      name: 'className',
      label: 'Class Name',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      multiline: true,
      rows: 3,
    },
    {
      name: 'grade',
      label: 'Grade',
      type: 'select',
      required: true,
      options: [
        { value: '6', label: 'Grade 6' },
        { value: '7', label: 'Grade 7' },
        { value: '8', label: 'Grade 8' },
        { value: '9', label: 'Grade 9' },
        { value: '10', label: 'Grade 10' },
        { value: '11', label: 'Grade 11' },
        { value: '12', label: 'Grade 12' },
        { value: '13', label: 'Grade 13' },
      ],
    },
  ];

  const getRandomColor = (index) => {
    const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1', '#d32f2f'];
    return colors[index % colors.length];
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, bgcolor: '#1a237e', color: 'white', p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">Class Management</Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.8 }}>
              Manage your classes, students, and course content all in one place
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ bgcolor: 'white', color: '#1a237e', '&:hover': { bgcolor: '#f5f5f5' } }}
          >
            Create New Class
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ bgcolor: '#e3f2fd', p: 1.5, borderRadius: 2, width: 'fit-content', mb: 2 }}>
                <SchoolIcon sx={{ color: '#1976d2' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{stats.activeClasses}</Typography>
              <Typography variant="body2" color="text.secondary">Active Classes</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'success.main', bgcolor: '#e8f5e9', px: 1, py: 0.5, borderRadius: 1 }}>
              ↑ 12%
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ bgcolor: '#e8f5e9', p: 1.5, borderRadius: 2, width: 'fit-content', mb: 2 }}>
                <GroupIcon sx={{ color: '#2e7d32' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold">{stats.totalStudents}</Typography>
              <Typography variant="body2" color="text.secondary">Total Students</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'success.main', bgcolor: '#e8f5e9', px: 1, py: 0.5, borderRadius: 1 }}>
              ↑ 8%
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 4, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="All Grades"
              size="small"
              value={gradeFilter}
              onChange={(e) => {
                console.log('Grade Filter Changed:', e.target.value);
                setGradeFilter(e.target.value);
              }}
              SelectProps={{ native: true }}
            >
              <MenuItem value="">All Grades</MenuItem>
              <MenuItem value="6">Grade 6</MenuItem>
              <MenuItem value="7">Grade 7</MenuItem>
              <MenuItem value="8">Grade 8</MenuItem>
              <MenuItem value="9">Grade 9</MenuItem>
              <MenuItem value="10">Grade 10</MenuItem>
              <MenuItem value="11">Grade 11</MenuItem>
              <MenuItem value="12">Grade 12</MenuItem>
              <MenuItem value="13">Grade 13</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={9}>
            {/* Spacer or additional filters if needed */}
          </Grid>
        </Grid>
      </Card>

      {/* Class Cards Grid */}
      <Grid container spacing={3}>
        {classes.map((cls, index) => (
          <Grid item xs={12} md={4} key={cls._id}>
            <Card sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'visible', // Allow icon to overlap
              mt: 2, // Add margin top for the overlapping effect if needed, or just handle inside
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}>
              {/* Solid Header */}
              <Box sx={{
                height: 100,
                bgcolor: getRandomColor(index),
                borderRadius: '12px 12px 0 0',
                position: 'relative'
              }}>
                {/* Overlapping Icon */}
                <Box sx={{
                  position: 'absolute',
                  bottom: -20,
                  left: 24,
                  bgcolor: 'white',
                  p: 1.5,
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56
                }}>
                  <SchoolIcon sx={{ color: getRandomColor(index), fontSize: 30 }} />
                </Box>
              </Box>

              <CardContent sx={{ pt: 4, px: 3, flexGrow: 1 }}>
                {/* Title and Badge */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                    {cls.className}
                  </Typography>
                  <Chip
                    label="Active"
                    size="small"
                    sx={{
                      bgcolor: '#e8f5e9',
                      color: '#2e7d32',
                      fontWeight: 600,
                      height: 24
                    }}
                  />
                </Box>

                {/* Grade */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                  Grade {cls.grade}
                </Typography>

                {/* Description */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    height: 40
                  }}
                >
                  {cls.description || 'No description available for this class.'}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {/* Footer: Avatars and Manage Button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AvatarGroup
                      max={4}
                      total={stats.classCounts[cls._id] || 0}
                      sx={{
                        '& .MuiAvatar-root': { width: 32, height: 32, fontSize: 14 },
                        justifyContent: 'flex-end'
                      }}
                    >
                      {(classStudents[cls._id] || []).slice(0, 5).map((student) => (
                        <Avatar
                          key={student._id}
                          alt={`${student.firstName} ${student.lastName}`}
                          src={student.profilePicture}
                        />
                      ))}
                    </AvatarGroup>
                  </Box>

                  <Button
                    variant="contained"
                    onClick={() => handleManage(cls)}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 3,
                      bgcolor: '#1976d2',
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#1565c0', boxShadow: 'none' }
                    }}
                    startIcon={<SettingsIcon />}
                  >
                    Manage
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))
        }
      </Grid >

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedClass ? 'Edit Class' : 'Create Class'}
        fields={formFields}
        initialValues={selectedClass || {}}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Class"
        message={`Are you sure you want to delete ${selectedClass?.className}?`}
        confirmLabel="Delete"
        confirmColor="error"
      />

      {/* Manage Dialog (Quick Actions) */}
      <Dialog
        open={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Quick Actions - {selectedClass?.className}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 6 },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  p: 2
                }}
                onClick={handleOpenEnroll}
              >
                <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 2, width: 'fit-content', mb: 2 }}>
                  <PersonAddIcon sx={{ color: '#1976d2', fontSize: 30 }} />
                </Box>
                <Typography variant="h6" gutterBottom>Add New Student</Typography>
                <Typography variant="body2" color="text.secondary">
                  Enroll students to your classes
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 6 },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  p: 2
                }}
                onClick={handleEdit}
              >
                <Box sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 2, width: 'fit-content', mb: 2 }}>
                  <EditIcon sx={{ color: '#ed6c02', fontSize: 30 }} />
                </Box>
                <Typography variant="h6" gutterBottom>Edit Class</Typography>
                <Typography variant="body2" color="text.secondary">
                  Update class details
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 6 },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  p: 2
                }}
                onClick={handleDelete}
              >
                <Box sx={{ bgcolor: '#ffebee', p: 2, borderRadius: 2, width: 'fit-content', mb: 2 }}>
                  <DeleteIcon sx={{ color: '#d32f2f', fontSize: 30 }} />
                </Box>
                <Typography variant="h6" gutterBottom>Delete Class</Typography>
                <Typography variant="body2" color="text.secondary">
                  Remove this class
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>


      {/* Enrollment Dialog (Reused Logic) */}
      <Dialog
        open={enrollDialogOpen}
        onClose={() => {
          setEnrollDialogOpen(false);
          setManageDialogOpen(true); // Go back to manage
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Manage Students - {selectedClass?.className}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Enroll New Student
            </Typography>
            <Box component="form" onSubmit={(e) => {
              e.preventDefault();
              if (selectedStudentToEnroll) {
                handleEnrollSubmit({ student: selectedStudentToEnroll });
              }
            }}>
              <TextField
                select
                fullWidth
                label="Select Student"
                variant="outlined"
                value={selectedStudentToEnroll}
                onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                required
                sx={{ mb: 2 }}
                SelectProps={{ native: true }}
              >
                <option value="">Select a student</option>
                {students
                  .filter(s => !enrolledStudents.includes(s._id))
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.firstName} {s.lastName} ({s.userId})
                    </option>
                  ))}
              </TextField>
              <Button type="submit" variant="contained" fullWidth disabled={!selectedStudentToEnroll}>
                Enroll Student
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h6" gutterBottom>
              Enrolled Students ({enrolledStudentsList.length})
            </Typography>
            {enrolledStudentsList.length > 0 ? (
              <List>
                {enrolledStudentsList.map((enrollment) => {
                  const student = enrollment.student;
                  return (
                    <ListItem
                      key={enrollment._id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveEnrollment(enrollment._id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`${student?.firstName} ${student?.lastName}`}
                        secondary={`${student?.userId} • Joined: ${new Date(enrollment.dateJoined).toLocaleDateString()}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No students enrolled yet
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEnrollDialogOpen(false);
            setManageDialogOpen(true);
          }}>
            Back
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default ClassesManagement;
