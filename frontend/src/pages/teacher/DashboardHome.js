import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import EventIcon from '@mui/icons-material/Event';
import PaymentIcon from '@mui/icons-material/Payment';
import BookIcon from '@mui/icons-material/Book';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { classesAPI, enrollmentsAPI, attendanceAPI, feesAPI, tutesAPI, assignmentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    classes: 0,
    students: 0,
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
      const [classesRes, enrollmentsRes, attendanceRes, feesRes, tutesRes, assignmentsRes] = await Promise.all([
        classesAPI.getAll({ teacher: user._id, isDeleted: 'false' }),
        enrollmentsAPI.getAll({ isDeleted: 'false' }),
        attendanceAPI.getAll({ isDeleted: 'false' }),
        feesAPI.getAll({ isDeleted: 'false' }),
        tutesAPI.getAll({ isDeleted: 'false' }),
        assignmentsAPI.getAll({ isDeleted: 'false' }),
      ]);

      // Get unique students from enrollments in teacher's classes
      const teacherClassIds = classesRes.data.map(c => c._id);
      const myEnrollments = enrollmentsRes.data.filter(e => 
        teacherClassIds.includes(e.class?._id || e.class)
      );
      const uniqueStudents = new Set(myEnrollments.map(e => e.student?._id || e.student));

      // Filter other stats by teacher's classes
      const myAttendance = attendanceRes.data.filter(a => 
        teacherClassIds.includes(a.class?._id || a.class)
      );
      const myFees = feesRes.data.filter(f => 
        teacherClassIds.includes(f.class?._id || f.class)
      );
      const myTutes = tutesRes.data.filter(t => 
        teacherClassIds.includes(t.class?._id || t.class)
      );
      const myAssignments = assignmentsRes.data.filter(a => 
        teacherClassIds.includes(a.class?._id || a.class)
      );

      setStats({
        classes: classesRes.data.length,
        students: uniqueStudents.size,
        attendance: myAttendance.length,
        fees: myFees.length,
        tutes: myTutes.length,
        assignments: myAssignments.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'My Classes', value: stats.classes, icon: <ClassIcon />, color: '#1E88E5' },
    { title: 'Students', value: stats.students, icon: <PeopleIcon />, color: '#FFC107' },
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
        Teacher Dashboard
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
