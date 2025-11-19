# Login Troubleshooting Guide

If you're getting "Unauthorized" or "Invalid credentials" when trying to login as admin, follow these steps:

## Step 1: Verify Admin Account Exists

Run the test script to check if the admin account exists and the password is correct:

```bash
cd backend
npm run test:admin
```

This will show you:
- If the admin account exists
- The admin's details
- Whether the password matches

## Step 2: Recreate Admin Account (If Needed)

If the admin doesn't exist or password doesn't match, recreate it:

```bash
cd backend
npm run seed:admin
```

**Important**: The seed script has been fixed to prevent double password hashing.

## Step 3: Verify Login Request Format

Make sure your login request is in the correct format:

**Using Postman/API Client:**
```json
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "userId": "A00001",
  "password": "eduflex"
}
```

**Using curl:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"A00001","password":"eduflex"}'
```

## Step 4: Check Common Issues

### Issue 1: Wrong User ID Format
- ✅ Correct: `"userId": "A00001"` (with capital A)
- ❌ Wrong: `"userId": "a00001"` (lowercase)
- ❌ Wrong: `"userId": "A0001"` (missing zero)

### Issue 2: Wrong Password
- Default password is: `eduflex` (all lowercase)
- Make sure there are no extra spaces
- Check if password was changed

### Issue 3: Account is Soft-Deleted
- The login endpoint checks `isDeleted: false`
- If admin was soft-deleted, you need to restore it or create a new one

### Issue 4: JWT_SECRET Not Set
- Make sure `backend/.env` has `JWT_SECRET` defined
- Server needs to be restarted after adding JWT_SECRET

## Step 5: Check Server Logs

When you try to login, check your server console for errors:
- Look for "Login error:" messages
- Check MongoDB connection status
- Verify the server is running on the correct port

## Step 6: Test with Test Script

Run the test script to verify everything:

```bash
cd backend
npm run test:admin
```

Expected output:
```
✅ Connected to MongoDB
✅ Admin user found:
   User ID: A00001
   Name: Admin User
   Role: admin
   ...
✅ Password "eduflex" matches!
```

## Step 7: Manual Database Check (Advanced)

If you have MongoDB Compass or mongo shell access:

```javascript
// Connect to your database
use eduflex

// Find the admin user
db.users.findOne({ userId: "A00001" })

// Check if password field exists and is hashed (should start with $2a$)
// Check if isDeleted is false
// Check if role is "admin"
```

## Common Error Messages

### "Invalid credentials"
- User ID or password is incorrect
- Account might be soft-deleted
- Password might be double-hashed (fixed in latest seed script)

### "User not found"
- Admin account doesn't exist
- User ID is incorrect
- Run `npm run seed:admin` to create it

### "Unauthorized" (401)
- Usually means invalid credentials
- Check userId and password spelling
- Verify account exists with test script

## Quick Fix Commands

```bash
# 1. Test if admin exists and password works
cd backend
npm run test:admin

# 2. If test fails, recreate admin
npm run seed:admin

# 3. Test login again
# Use Postman or your frontend
```

## After Successful Login

Once you login successfully, you should receive:
- A JWT token
- User information including role
- `mustChangePassword: true` flag

You'll be redirected to change password page if `mustChangePassword` is true.

## Still Having Issues?

1. Make sure MongoDB is connected and running
2. Verify `.env` file has correct `MONGODB_URI` and `JWT_SECRET`
3. Restart your backend server after any `.env` changes
4. Check that you're using the correct endpoint: `POST /api/auth/login`
5. Verify request body format matches exactly

