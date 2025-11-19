import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout';
import DashboardHome from './DashboardHome';
import StudentsManagement from './StudentsManagement';
import ClassesManagement from './ClassesManagement';
import AttendanceManagement from './AttendanceManagement';
import FeesManagement from './FeesManagement';
import TutesManagement from './TutesManagement';
import AssignmentsManagement from './AssignmentsManagement';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import EventIcon from '@mui/icons-material/Event';
import PaymentIcon from '@mui/icons-material/Payment';
import BookIcon from '@mui/icons-material/Book';
import AssignmentIcon from '@mui/icons-material/Assignment';

const menuItems = [
  { path: '/teacher/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/teacher/students', label: 'Students', icon: <PeopleIcon /> },
  { path: '/teacher/classes', label: 'Classes', icon: <ClassIcon /> },
  { path: '/teacher/attendance', label: 'Attendance', icon: <EventIcon /> },
  { path: '/teacher/fees', label: 'Fees', icon: <PaymentIcon /> },
  { path: '/teacher/tutes', label: 'Tutes', icon: <BookIcon /> },
  { path: '/teacher/assignments', label: 'Assignments', icon: <AssignmentIcon /> },
];

const TeacherDashboard = () => {
  return (
    <Layout menuItems={menuItems} title="Teacher Dashboard">
      <Routes>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="students" element={<StudentsManagement />} />
        <Route path="classes" element={<ClassesManagement />} />
        <Route path="attendance" element={<AttendanceManagement />} />
        <Route path="fees" element={<FeesManagement />} />
        <Route path="tutes" element={<TutesManagement />} />
        <Route path="assignments" element={<AssignmentsManagement />} />
        <Route path="*" element={<DashboardHome />} />
      </Routes>
    </Layout>
  );
};

export default TeacherDashboard;

