import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  Typography,
} from '@mui/material';

const FormDialog = ({
  open,
  onClose,
  title,
  fields,
  initialValues = {},
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
}) => {
  const [formData, setFormData] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});

  React.useEffect(() => {
    setFormData(initialValues);
    setErrors({});
  }, [initialValues, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.validate) {
        const error = field.validate(formData[field.name], formData);
        if (error) newErrors[field.name] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const renderField = (field) => {
    const value = formData[field.name] !== undefined ? formData[field.name] : '';
    const error = errors[field.name];

    if (field.type === 'checkbox') {
      return (
        <Box key={field.name} sx={{ mb: 2 }}>
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={(e) => handleChange(field.name, e.target.checked)}
            disabled={field.disabled || loading}
            style={{ marginRight: 8 }}
          />
          <label>{field.label}</label>
          {error && (
            <Typography variant="caption" color="error" display="block">
              {error}
            </Typography>
          )}
        </Box>
      );
    }

    if (field.type === 'select') {
      return (
        <TextField
          key={field.name}
          select
          fullWidth
          label={field.label}
          value={value}
          onChange={(e) => handleChange(field.name, e.target.value)}
          error={!!error}
          helperText={error || field.helperText}
          required={field.required}
          disabled={field.disabled || loading}
          sx={{ mb: 2 }}
        >
          {field.options?.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    if (field.type === 'date') {
      return (
        <TextField
          key={field.name}
          fullWidth
          type="date"
          label={field.label}
          value={value}
          onChange={(e) => handleChange(field.name, e.target.value)}
          error={!!error}
          helperText={error || field.helperText}
          required={field.required}
          disabled={field.disabled || loading}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
      );
    }

    return (
      <TextField
        key={field.name}
        fullWidth
        type={field.type || 'text'}
        label={field.label}
        value={value}
        onChange={(e) => handleChange(field.name, e.target.value)}
        error={!!error}
        helperText={error || field.helperText}
        required={field.required}
        disabled={field.disabled || loading}
        multiline={field.multiline}
        rows={field.rows}
        sx={{ mb: 2 }}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {fields.map((field) => renderField(field))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FormDialog;

