import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import ClassIcon from '@mui/icons-material/Class';
import EventIcon from '@mui/icons-material/Event';
import PaymentIcon from '@mui/icons-material/Payment';
import BookIcon from '@mui/icons-material/Book';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { enrollmentsAPI, attendanceAPI, feesAPI, tutesAPI, assignmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    classes: 0,
    attendance: 0,
    fees: 0,
    tutes: 0,
    assignments: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [enrollmentsRes, attendanceRes, feesRes, tutesRes, assignmentsRes] = await Promise.all([
        enrollmentsAPI.getAll({ student: user._id, status: 'active', isDeleted: 'false' }),
        attendanceAPI.getAll({ student: user._id, isDeleted: 'false' }),
        feesAPI.getAll({ student: user._id, isDeleted: 'false' }),
        tutesAPI.getAll({ student: user._id, isDeleted: 'false' }),
        assignmentsAPI.getAll({ isDeleted: 'false' }),
      ]);

      // Filter assignments for enrolled classes only
      const enrolledClassIds = enrollmentsRes.data.map(e => e.class?._id || e.class);
      const myAssignments = assignmentsRes.data.filter(a => 
        enrolledClassIds.includes(a.class?._id || a.class)
      );

      setStats({
        classes: enrollmentsRes.data.length,
        attendance: attendanceRes.data.length,
        fees: feesRes.data.length,
        tutes: tutesRes.data.length,
        assignments: myAssignments.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Enrolled Classes', value: stats.classes, icon: <ClassIcon />, color: '#1E88E5' },
    { title: 'Attendance Records', value: stats.attendance, icon: <EventIcon />, color: '#4CAF50' },
    { title: 'Fee Records', value: stats.fees, icon: <PaymentIcon />, color: '#FF9800' },
    { title: 'Assigned Tutes', value: stats.tutes, icon: <BookIcon />, color: '#9C27B0' },
    { title: 'Assignments', value: stats.assignments, icon: <AssignmentIcon />, color: '#F44336' },
  ];

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome, {user?.firstName} {user?.lastName}!
      </Typography>
      <Grid container spacing={3}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: `${card.color}20`,
                      color: card.color,
                      mr: 2,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4">{card.value}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardHome;
