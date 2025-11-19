import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GradeIcon from '@mui/icons-material/Grade';
import { assignmentsAPI, classesAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import ConfirmDialog from '../../components/ConfirmDialog';

const AssignmentsManagement = () => {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [marksDialogOpen, setMarksDialogOpen] = useState(false);
  const [markFormOpen, setMarkFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedMark, setSelectedMark] = useState(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchAssignments();
    fetchClasses();
  }, [page, rowsPerPage]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await assignmentsAPI.getAll({ isDeleted: 'false' });
      setAssignments(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch assignments');
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

  const fetchMarks = async (assignmentId) => {
    try {
      const response = await assignmentsAPI.getMarks(assignmentId);
      setMarks(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch marks');
    }
  };

  const handleCreate = () => {
    setSelectedAssignment(null);
    setDialogOpen(true);
  };

  const handleEdit = (assignment) => {
    setSelectedAssignment({
      ...assignment,
      class: assignment.class?._id || assignment.class,
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleViewMarks = async (assignment) => {
    setSelectedAssignment(assignment);
    await fetchMarks(assignment._id);
    setMarksDialogOpen(true);
  };

  const handleAddMark = () => {
    setSelectedMark(null);
    setMarkFormOpen(true);
  };

  const handleEditMark = (mark) => {
    setSelectedMark(mark);
    setMarkFormOpen(true);
  };

  const handleDelete = (assignment) => {
    setSelectedAssignment(assignment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await assignmentsAPI.delete(selectedAssignment._id);
      showSuccess('Assignment deleted successfully');
      setDeleteDialogOpen(false);
      fetchAssignments();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedAssignment) {
        await assignmentsAPI.update(selectedAssignment._id, formData);
        showSuccess('Assignment updated successfully');
      } else {
        await assignmentsAPI.create(formData);
        showSuccess('Assignment created successfully');
      }
      setDialogOpen(false);
      fetchAssignments();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save assignment');
    }
  };

  const handleMarkSubmit = async (formData) => {
    try {
      if (selectedMark) {
        await assignmentsAPI.updateMark(selectedAssignment._id, selectedMark._id, formData);
        showSuccess('Mark updated successfully');
      } else {
        await assignmentsAPI.createMark(selectedAssignment._id, formData);
        showSuccess('Mark recorded successfully');
      }
      setMarkFormOpen(false);
      fetchMarks(selectedAssignment._id);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save mark');
    }
  };

  const columns = [
    {
      id: 'title',
      label: 'Title',
    },
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
      id: 'dueDate',
      label: 'Due Date',
      format: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      id: 'totalMarks',
      label: 'Total Marks',
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      format: (value, row) => (
        <Box>
          <Tooltip title="View/Manage Marks">
            <IconButton size="small" onClick={() => handleViewMarks(row)} color="primary">
              <GradeIcon fontSize="small" />
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
      name: 'class',
      label: 'Class',
      type: 'select',
      required: true,
      options: classes.map((c) => ({
        value: c._id,
        label: c.className,
      })),
    },
    {
      name: 'title',
      label: 'Title',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      multiline: true,
      rows: 4,
    },
    {
      name: 'dueDate',
      label: 'Due Date',
      type: 'date',
    },
    {
      name: 'totalMarks',
      label: 'Total Marks',
      type: 'number',
      required: true,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Assignments Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Create Assignment
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={assignments}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalRows={assignments.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No assignments found"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedAssignment ? 'Edit Assignment' : 'Create Assignment'}
        fields={formFields}
        initialValues={selectedAssignment || {}}
        onSubmit={handleSubmit}
      />

      <Dialog open={marksDialogOpen} onClose={() => setMarksDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Marks for {selectedAssignment?.title}
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddMark}
            sx={{ ml: 2 }}
          >
            Add Mark
          </Button>
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Marks Obtained</TableCell>
                  <TableCell>Total Marks</TableCell>
                  <TableCell>Percentage</TableCell>
                  <TableCell>Remarks</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {marks.map((mark) => (
                  <TableRow key={mark._id}>
                    <TableCell>
                      {mark.student?.firstName} {mark.student?.lastName} ({mark.student?.userId})
                    </TableCell>
                    <TableCell>{mark.marksObtained}</TableCell>
                    <TableCell>{selectedAssignment?.totalMarks || 100}</TableCell>
                    <TableCell>
                      {((mark.marksObtained / (selectedAssignment?.totalMarks || 100)) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>{mark.remarks || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEditMark(mark)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarksDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <FormDialog
        open={markFormOpen}
        onClose={() => setMarkFormOpen(false)}
        title={selectedMark ? 'Edit Mark' : 'Record Mark'}
        fields={[
          {
            name: 'student',
            label: 'Student',
            type: 'select',
            required: true,
            options: [], // Will be populated from class students
          },
          {
            name: 'marksObtained',
            label: 'Marks Obtained',
            type: 'number',
            required: true,
          },
          {
            name: 'remarks',
            label: 'Remarks',
            multiline: true,
            rows: 3,
          },
        ]}
        initialValues={selectedMark || {}}
        onSubmit={handleMarkSubmit}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment?"
        confirmLabel="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default AssignmentsManagement;
