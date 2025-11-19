import React, { createContext, useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';
import Swal from 'sweetalert2';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const showSuccess = (message) => {
    showSnackbar(message, 'success');
  };

  const showError = (message) => {
    showSnackbar(message, 'error');
  };

  const showWarning = (message) => {
    showSnackbar(message, 'warning');
  };

  const showInfo = (message) => {
    showSnackbar(message, 'info');
  };

  const showConfirm = async (title, text, confirmText = 'Yes', cancelText = 'No') => {
    const result = await Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#1E88E5',
      cancelButtonColor: '#757575',
    });
    return result.isConfirmed;
  };

  const showAlert = (title, text, icon = 'info') => {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonColor: '#1E88E5',
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const value = {
    showSnackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showAlert,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

