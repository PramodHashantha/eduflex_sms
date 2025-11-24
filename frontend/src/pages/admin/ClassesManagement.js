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
import RestoreIcon from '@mui/icons-material/Restore';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SchoolIcon from '@mui/icons-material/School';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';

import { classesAPI, usersAPI, enrollmentsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const ClassesManagement = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [deletedFilter, setDeletedFilter] = useState('false');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState({});

  const { showSuccess, showError } = useNotification();

  const [stats, setStats] = useState({
    activeClasses: 0,
    totalStudents: 0,
    classCounts: {}
  });

  useEffect(() => {
    fetchData();
    fetchTeachers();
  }, [searchTerm, gradeFilter, deletedFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Classes
      const classesParams = {
        isDeleted: deletedFilter,
        ...(searchTerm && { search: searchTerm }),
        ...(gradeFilter && { grade: gradeFilter }),
      };
      const classesRes = await classesAPI.getAll(classesParams);

      // 2. Fetch Enrollments (for per-class counts and avatars)
      const enrollmentsRes = await enrollmentsAPI.getAll({
        status: 'active',
        isDeleted: 'false'
      });

      // 3. Fetch All Students (for total count)
      const studentsRes = await usersAPI.getAll({ role: 'student', isDeleted: 'false' });

      // Calculate Stats and Group Students
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
        activeClasses: classesRes.data.filter(c => !c.isDeleted).length,
        totalStudents: studentsRes.data.length,
        classCounts: counts
      });

    } catch (error) {
      showError('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await usersAPI.getAll({ role: 'teacher', isDeleted: 'false' });
      setTeachers(response.data);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  // Deprecated individual fetch functions
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

  const handleRestore = () => {
    setManageDialogOpen(false);
    setRestoreDialogOpen(true);
  };

  const handleManage = (classItem) => {
    setSelectedClass(classItem);
    setManageDialogOpen(true);
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

  const confirmRestore = async () => {
    try {
      await classesAPI.restore(selectedClass._id);
      showSuccess('Class restored successfully');
      setRestoreDialogOpen(false);
      fetchClasses();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to restore class');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedClass) {
        await classesAPI.update(selectedClass._id, formData);
        showSuccess('Class updated successfully');
      } else {
        await classesAPI.create(formData);
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
    {
      name: 'description',
      label: 'Description',
      multiline: true,
      rows: 3,
    },
    {
      name: 'teacher',
      label: 'Teacher',
      type: 'select',
      required: true,
      options: teachers.map((t) => ({
        value: t._id,
        label: `${t.firstName} ${t.lastName} (${t.userId})`,
      })),
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
          {deletedFilter === 'false' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{ bgcolor: 'white', color: '#1a237e', '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              Create New Class
            </Button>
          )}
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
              onChange={(e) => setGradeFilter(e.target.value)}
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
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Status"
              size="small"
              value={deletedFilter}
              onChange={(e) => setDeletedFilter(e.target.value)}
              SelectProps={{ native: true }}
            >
              <MenuItem value="false">Active</MenuItem>
              <MenuItem value="true">Deleted</MenuItem>
            </TextField>
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
              overflow: 'visible',
              mt: 2,
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
                    label={cls.isDeleted ? "Deleted" : "Active"}
                    size="small"
                    sx={{
                      bgcolor: cls.isDeleted ? '#ffebee' : '#e8f5e9',
                      color: cls.isDeleted ? '#c62828' : '#2e7d32',
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
        ))}
      </Grid>

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

      <ConfirmDialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onConfirm={confirmRestore}
        title="Restore Class"
        message={`Are you sure you want to restore ${selectedClass?.className}?`}
        confirmLabel="Restore"
        confirmColor="success"
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
                onClick={() => showError('Enrollment feature is currently optimized for Teachers.')}
              >
                <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 2, width: 'fit-content', mb: 2 }}>
                  <PersonAddIcon sx={{ color: '#1976d2', fontSize: 30 }} />
                </Box>
                <Typography variant="h6" gutterBottom>Add New Student</Typography>
                <Typography variant="body2" color="text.secondary">
                  Enroll students to this class
                </Typography>
              </Card>
            </Grid>

            {!selectedClass?.isDeleted && (
              <>
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
              </>
            )}

            {selectedClass?.isDeleted && (
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
                  onClick={handleRestore}
                >
                  <Box sx={{ bgcolor: '#e8f5e9', p: 2, borderRadius: 2, width: 'fit-content', mb: 2 }}>
                    <RestoreIcon sx={{ color: '#2e7d32', fontSize: 30 }} />
                  </Box>
                  <Typography variant="h6" gutterBottom>Restore Class</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Restore this class
                  </Typography>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassesManagement;
