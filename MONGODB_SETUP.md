# MongoDB Setup Guide

## MongoDB Authentication Error Fix

If you're seeing `MongoDB connection error: bad auth : authentication failed`, follow these steps:

## Option 1: MongoDB Atlas (Cloud - Recommended)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (Free tier M0 is sufficient)

### Step 2: Create Database User
1. Go to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Enter a username and generate a secure password
5. Set user privileges to **Read and write to any database**
6. Click **Add User**

### Step 3: Whitelist Your IP Address
1. Go to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for development) or add your specific IP
4. Click **Confirm**

### Step 4: Get Connection String
1. Go to **Database** in the left sidebar
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Copy the connection string
5. It will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Update Your .env File
1. Navigate to `backend` directory
2. Copy the template: `cp env.template .env` (Linux/Mac) or `Copy-Item env.template .env` (Windows)
3. Edit `.env` file and replace the connection string:
   ```env
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/eduflex?retryWrites=true&w=majority
   ```
   **Important**: 
   - Replace `YOUR_USERNAME` with your database username
   - Replace `YOUR_PASSWORD` with your database password (URL encode special characters)
   - Replace `cluster0.xxxxx.mongodb.net` with your actual cluster address
   - Add `/eduflex` before the `?` to specify the database name

### Step 6: URL Encode Special Characters in Password
If your password contains special characters, you need to URL encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `&` becomes `%26`
- `+` becomes `%2B`
- `=` becomes `%3D`
- `?` becomes `%3F`

**Example:**
- Password: `MyP@ss#123`
- Encoded: `MyP%40ss%23123`
- Connection string: `mongodb+srv://username:MyP%40ss%23123@cluster0.xxxxx.mongodb.net/eduflex?retryWrites=true&w=majority`

## Option 2: Local MongoDB

### Step 1: Install MongoDB
- **Windows**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
- **Mac**: `brew install mongodb-community`
- **Linux**: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

### Step 2: Start MongoDB Service
- **Windows**: MongoDB should start automatically as a service
- **Mac/Linux**: `mongod --dbpath /path/to/data`

### Step 3: Update Your .env File
```env
MONGODB_URI=mongodb://localhost:27017/eduflex
```

## Verify Your Setup

1. Make sure your `.env` file is in the `backend` directory
2. Check that the file contains:
   ```env
   MONGODB_URI=your_connection_string_here
   JWT_SECRET=your_jwt_secret_here
   PORT=5000
   NODE_ENV=development
   ```
3. Restart your server:
   ```bash
   cd backend
   npm run dev
   ```

## Common Issues

### Issue: "authentication failed"
**Solutions:**
- Double-check username and password in connection string
- Make sure password is URL encoded if it has special characters
- Verify the database user exists in MongoDB Atlas
- Check that your IP is whitelisted in MongoDB Atlas

### Issue: "connection timeout"
**Solutions:**
- Check your internet connection
- Verify your IP is whitelisted in MongoDB Atlas Network Access
- Try using `0.0.0.0/0` to allow all IPs (development only)

### Issue: "database name not found"
**Solutions:**
- MongoDB will create the database automatically on first connection
- Make sure the database name in the connection string is correct (e.g., `/eduflex`)

## Testing Connection

You can test your MongoDB connection with this simple script:

```javascript
// test-connection.js
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  });
```

Run it with:
```bash
cd backend
node test-connection.js
```

## Security Best Practices

1. **Never commit `.env` files** to version control (already in `.gitignore`)
2. **Use strong passwords** for database users
3. **Restrict IP access** in production (don't use `0.0.0.0/0`)
4. **Use environment-specific credentials** for different deployments
5. **Rotate passwords** regularly in production


