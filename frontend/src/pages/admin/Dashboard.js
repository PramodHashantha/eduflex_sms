import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout';
import DashboardHome from './DashboardHome';
import UsersManagement from './UsersManagement';
import ClassesManagement from './ClassesManagement';
import EnrollmentsManagement from './EnrollmentsManagement';
import AttendanceManagement from './AttendanceManagement';
import FeesManagement from './FeesManagement';
import TutesManagement from './TutesManagement';
import AssignmentsManagement from './AssignmentsManagement';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import EventIcon from '@mui/icons-material/Event';
import PaymentIcon from '@mui/icons-material/Payment';
import BookIcon from '@mui/icons-material/Book';
import AssignmentIcon from '@mui/icons-material/Assignment';

const menuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/admin/users', label: 'Users', icon: <PeopleIcon /> },
  { path: '/admin/classes', label: 'Classes', icon: <ClassIcon /> },
  { path: '/admin/enrollments', label: 'Enrollments', icon: <AssignmentIndIcon /> },
  { path: '/admin/attendance', label: 'Attendance', icon: <EventIcon /> },
  { path: '/admin/fees', label: 'Fees', icon: <PaymentIcon /> },
  { path: '/admin/tutes', label: 'Tutes', icon: <BookIcon /> },
  { path: '/admin/assignments', label: 'Assignments', icon: <AssignmentIcon /> },
];

const AdminDashboard = () => {
  return (
    <Layout menuItems={menuItems} title="Admin Dashboard">
      <Routes>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="classes" element={<ClassesManagement />} />
        <Route path="enrollments" element={<EnrollmentsManagement />} />
        <Route path="attendance" element={<AttendanceManagement />} />
        <Route path="fees" element={<FeesManagement />} />
        <Route path="tutes" element={<TutesManagement />} />
        <Route path="assignments" element={<AssignmentsManagement />} />
        <Route path="*" element={<DashboardHome />} />
      </Routes>
    </Layout>
  );
};

export default AdminDashboard;

