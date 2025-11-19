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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { classesAPI, enrollmentsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const ClassesManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrolledStudentsList, setEnrolledStudentsList] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, [page, rowsPerPage, searchTerm]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const params = {
        isDeleted: 'false',
        teacher: user._id,
        ...(searchTerm && { search: searchTerm }),
      };
      const response = await classesAPI.getAll(params);
      setClasses(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedClass(null);
    setDialogOpen(true);
  };

  const handleEdit = (classItem) => {
    setSelectedClass({
      ...classItem,
      teacher: classItem.teacher?._id || classItem.teacher,
    });
    setDialogOpen(true);
  };

  const handleDelete = (classItem) => {
    setSelectedClass(classItem);
    setDeleteDialogOpen(true);
  };

  const handleEnrollStudents = async (classItem) => {
    setSelectedClass(classItem);
    // Fetch all students
    try {
      const studentsRes = await usersAPI.getAll({ role: 'student', isDeleted: 'false' });
      setStudents(studentsRes.data);
      
      // Fetch already enrolled students
      const enrollmentsRes = await enrollmentsAPI.getAll({
        class: classItem._id,
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
        // Teacher creates class with themselves as teacher
        await classesAPI.create({ ...formData, teacher: user._id });
        showSuccess('Class created successfully');
      }
      setDialogOpen(false);
      fetchClasses();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save class');
    }
  };

  const columns = [
    {
      id: 'className',
      label: 'Class Name',
    },
    {
      id: 'description',
      label: 'Description',
      format: (value) => value || '-',
    },
    {
      id: 'schedule',
      label: 'Schedule',
      format: (value) => value || '-',
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (value, row) => (
        <Box>
          <Tooltip title="Enroll Students">
            <IconButton size="small" onClick={() => handleEnrollStudents(row)} color="primary">
              <PersonAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
      name: 'schedule',
      label: 'Schedule',
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Classes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Create Class
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 200 }}
        />
      </Box>

      <DataTable
        columns={columns}
        data={classes}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={classes.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No classes found"
      />

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

      <Dialog
        open={enrollDialogOpen}
        onClose={() => {
          setEnrollDialogOpen(false);
          setSelectedClass(null);
          setEnrolledStudents([]);
          setEnrolledStudentsList([]);
          setSelectedStudentToEnroll('');
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Manage Students - {selectedClass?.className}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
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
          <Button           onClick={() => {
            setEnrollDialogOpen(false);
            setSelectedClass(null);
            setEnrolledStudents([]);
            setEnrolledStudentsList([]);
            setSelectedStudentToEnroll('');
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassesManagement;
