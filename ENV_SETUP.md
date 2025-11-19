# Environment Variables Setup Guide

This guide will help you set up the environment variables for the EduFlex application.

## Backend Environment Variables

1. Navigate to the `backend` directory
2. Copy the template file:
   ```bash
   cp env.template .env
   ```
3. Edit the `.env` file and fill in your values:

### Required Variables

- **MONGODB_URI**: Your MongoDB connection string
  - For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/eduflex?retryWrites=true&w=majority`
  - For local MongoDB: `mongodb://localhost:27017/eduflex`

- **JWT_SECRET**: A strong random string for JWT token signing
  - Generate one using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
  - Minimum 32 characters recommended

- **PORT**: Server port (default: 5000)

- **NODE_ENV**: Environment mode (`development` or `production`)

### Example Backend .env

```env
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/eduflex?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_minimum_32_characters
PORT=5000
NODE_ENV=development
```

## Frontend Environment Variables

1. Navigate to the `frontend` directory
2. Copy the template file:
   ```bash
   cp env.template .env
   ```
3. Edit the `.env` file and fill in your values:

### Required Variables

- **REACT_APP_API_URL**: Backend API endpoint
  - Development: `http://localhost:5000/api`
  - Production: `https://your-api-domain.com/api`

### Example Frontend .env

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Quick Setup Commands

### Windows (PowerShell)
```powershell
# Backend
cd backend
Copy-Item env.template .env
# Then edit .env with your values

# Frontend
cd ..\frontend
Copy-Item env.template .env
# Then edit .env with your values
```

### Linux/Mac
```bash
# Backend
cd backend
cp env.template .env
# Then edit .env with your values

# Frontend
cd ../frontend
cp env.template .env
# Then edit .env with your values
```

## Security Notes

⚠️ **Important**: 
- Never commit `.env` files to version control
- `.env` files are already in `.gitignore`
- Always use strong, unique values for `JWT_SECRET` in production
- Keep your MongoDB credentials secure
- Use environment-specific values for different deployment environments

## Verification

After setting up your environment variables:

1. **Backend**: Start the server and check for connection success
   ```bash
   cd backend
   npm run dev
   ```
   You should see: "MongoDB Connected Successfully"

2. **Frontend**: Start the development server
   ```bash
   cd frontend
   npm start
   ```
   The app should connect to the backend API

## Troubleshooting

- **MongoDB Connection Error**: Check your `MONGODB_URI` format and credentials
- **JWT Error**: Ensure `JWT_SECRET` is set and is at least 32 characters
- **API Connection Error**: Verify `REACT_APP_API_URL` matches your backend URL
- **Port Already in Use**: Change the `PORT` value in backend `.env`

