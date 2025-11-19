import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { assignmentsAPI, enrollmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/DataTable';

const AssignmentsView = () => {
  const [assignments, setAssignments] = useState([]);
  const [marks, setMarks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [marksDialogOpen, setMarksDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const { user } = useAuth();
  const { showError } = useNotification();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [selectedClass]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const params = {
        isDeleted: 'false',
        ...(selectedClass && { class: selectedClass }),
      };
      const response = await assignmentsAPI.getAll(params);
      setAssignments(response.data);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch assignments');
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

  const handleViewMarks = async (assignment) => {
    setSelectedAssignment(assignment);
    try {
      const response = await assignmentsAPI.getMarks(assignment._id);
      // Filter to show only this student's marks
      const studentMarks = response.data.filter(m => 
        (m.student?._id || m.student) === user._id
      );
      setMarks(studentMarks);
      setMarksDialogOpen(true);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to fetch marks');
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
          <Chip
            icon={<VisibilityIcon />}
            label="View Marks"
            onClick={() => handleViewMarks(row)}
            clickable
            color="primary"
            size="small"
          />
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Assignments
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        View assignments and your marks
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
        data={assignments}
        loading={loading}
        page={0}
        rowsPerPage={10}
        totalRows={assignments.length}
        emptyMessage="No assignments found"
      />

      <Dialog open={marksDialogOpen} onClose={() => setMarksDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Marks for {selectedAssignment?.title}</DialogTitle>
        <DialogContent>
          {marks.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Marks Obtained</TableCell>
                    <TableCell>Total Marks</TableCell>
                    <TableCell>Percentage</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {marks.map((mark) => (
                    <TableRow key={mark._id}>
                      <TableCell>{mark.marksObtained}</TableCell>
                      <TableCell>{selectedAssignment?.totalMarks || 100}</TableCell>
                      <TableCell>
                        {((mark.marksObtained / (selectedAssignment?.totalMarks || 100)) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>{mark.remarks || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No marks recorded yet</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarksDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssignmentsView;
