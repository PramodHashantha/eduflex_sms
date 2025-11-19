import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.scss';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(userId, password);

    if (result.success) {
      if (result.mustChangePassword) {
        navigate('/change-password');
      } else {
        const user = JSON.parse(localStorage.getItem('user'));
        navigate(`/${user.role}/dashboard`);
      }
    } else {
      setError(result.message || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper elevation={3} className="login-paper">
            <Box sx={{ p: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom align="center">
                EduFlex
              </Typography>
              <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
                Class Management System
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="User ID"
                  variant="outlined"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                  autoFocus
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </form>

              <Typography variant="body2" align="center" sx={{ mt: 3 }} color="text.secondary">
                Default password: eduflex
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    </div>
  );
};

export default Login;

