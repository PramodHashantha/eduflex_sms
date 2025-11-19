import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import EventIcon from '@mui/icons-material/Event';
import PaymentIcon from '@mui/icons-material/Payment';
import { usersAPI, classesAPI, attendanceAPI, feesAPI } from '../../services/api';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
    attendance: 0,
    fees: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studentsRes, teachersRes, classesRes, attendanceRes, feesRes] = await Promise.all([
          usersAPI.getAll({ role: 'student', isDeleted: 'false' }),
          usersAPI.getAll({ role: 'teacher', isDeleted: 'false' }),
          classesAPI.getAll({ isDeleted: 'false' }),
          attendanceAPI.getAll({ isDeleted: 'false' }),
          feesAPI.getAll({ isDeleted: 'false' }),
        ]);

        setStats({
          students: studentsRes.data.length,
          teachers: teachersRes.data.length,
          classes: classesRes.data.length,
          attendance: attendanceRes.data.length,
          fees: feesRes.data.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Students', value: stats.students, icon: <PeopleIcon />, color: '#1E88E5' },
    { title: 'Teachers', value: stats.teachers, icon: <PeopleIcon />, color: '#FFC107' },
    { title: 'Classes', value: stats.classes, icon: <ClassIcon />, color: '#4CAF50' },
    { title: 'Attendance Records', value: stats.attendance, icon: <EventIcon />, color: '#9C27B0' },
    { title: 'Fee Records', value: stats.fees, icon: <PaymentIcon />, color: '#F44336' },
  ];

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Overview of the system
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

