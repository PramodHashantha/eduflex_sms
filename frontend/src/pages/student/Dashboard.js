import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout';
import DashboardHome from './DashboardHome';
import ClassesView from './ClassesView';
import AttendanceView from './AttendanceView';
import FeesView from './FeesView';
import TutesView from './TutesView';
import AssignmentsView from './AssignmentsView';
import Profile from './Profile';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ClassIcon from '@mui/icons-material/Class';
import EventIcon from '@mui/icons-material/Event';
import PaymentIcon from '@mui/icons-material/Payment';
import BookIcon from '@mui/icons-material/Book';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';

const menuItems = [
  { path: '/student/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/student/classes', label: 'My Classes', icon: <ClassIcon /> },
  { path: '/student/attendance', label: 'Attendance', icon: <EventIcon /> },
  { path: '/student/fees', label: 'Fees', icon: <PaymentIcon /> },
  { path: '/student/tutes', label: 'Tutes', icon: <BookIcon /> },
  { path: '/student/assignments', label: 'Assignments', icon: <AssignmentIcon /> },
  { path: '/student/profile', label: 'Profile', icon: <PersonIcon /> },
];

const StudentDashboard = () => {
  return (
    <Layout menuItems={menuItems} title="Student Dashboard">
      <Routes>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="classes" element={<ClassesView />} />
        <Route path="attendance" element={<AttendanceView />} />
        <Route path="fees" element={<FeesView />} />
        <Route path="tutes" element={<TutesView />} />
        <Route path="assignments" element={<AssignmentsView />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<DashboardHome />} />
      </Routes>
    </Layout>
  );
};

export default StudentDashboard;

