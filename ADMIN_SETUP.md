# Creating Your First Admin Account

Since EduFlex doesn't allow public registration, you need to create the first admin account manually using the seed script.

## Method 1: Using the Seed Script (Recommended)

### Step 1: Make sure your MongoDB is connected
Ensure your `backend/.env` file has the correct `MONGODB_URI` and the database is accessible.

### Step 2: Run the seed script

**Using npm script:**
```bash
cd backend
npm run seed:admin
```

**Or directly with node:**
```bash
cd backend
node scripts/seedAdmin.js
```

### Step 3: Login with the default credentials

After running the script, you'll get:
- **User ID**: `A00001`
- **Password**: `eduflex`

### Step 4: Change password on first login

1. Go to `http://localhost:3000/login` (or your frontend URL)
2. Login with User ID: `A00001` and Password: `eduflex`
3. You'll be redirected to change your password
4. Enter a new secure password

### Step 5: Create more users

Once logged in as admin, you can:
- Create more admin accounts
- Create teacher accounts
- Create student accounts
- Manage all system data

## Method 2: Using MongoDB Compass or MongoDB Shell

If you prefer to create the admin manually:

### Step 1: Connect to your MongoDB database

### Step 2: Insert admin document

```javascript
// In MongoDB shell or Compass
use eduflex

db.users.insertOne({
  userId: "A00001",
  firstName: "Admin",
  lastName: "User",
  email: "admin@eduflex.com",
  role: "admin",
  password: "$2a$10$rOzJqZqZqZqZqZqZqZqZqO", // This is "eduflex" hashed - you need to generate your own
  mustChangePassword: true,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Note**: You'll need to hash the password first. Use this Node.js command:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('eduflex', 10).then(hash => console.log(hash))"
```

## Method 3: Using Postman or API Client

Once your server is running, you can create an admin via API (but you'll need to temporarily modify the route to allow admin creation without authentication):

1. Start your server: `npm run dev`
2. Use Postman or curl to create admin:
   ```bash
   curl -X POST http://localhost:5000/api/users \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Admin",
       "lastName": "User",
       "email": "admin@eduflex.com",
       "role": "admin",
       "password": "eduflex"
     }'
   ```

**Note**: This method requires temporarily removing authentication from the users POST route, which is not recommended for production.

## Troubleshooting

### Error: "Admin user already exists"
- An admin account already exists in the database
- You can either:
  - Use the existing admin account
  - Soft-delete it and create a new one
  - Change the userId in the seed script to create another admin

### Error: "MONGODB_URI is not defined"
- Make sure you have a `.env` file in the `backend` directory
- Copy `env.template` to `.env` and fill in your MongoDB connection string

### Error: "User ID A00001 already exists"
- The userId is already taken
- Either delete the existing user or modify the seed script to use a different userId

### Can't login after creating admin
- Make sure the password in the seed script matches what you're using
- Check that `mustChangePassword` is set correctly
- Verify the user was created in the database

## Security Notes

⚠️ **Important for Production:**
1. **Change the default password** in the seed script before running in production
2. **Delete or secure the seed script** after creating the first admin
3. **Use strong passwords** for admin accounts
4. **Limit admin account creation** - only allow it through secure, authenticated means
5. **Regularly audit admin accounts** - check who has admin access

## Creating Additional Admins

After logging in as the first admin, you can create more admins through the web interface:
1. Go to Admin Dashboard → Users
2. Click "Create User"
3. Select role: "Admin"
4. Fill in the user details
5. The system will auto-generate a User ID

## Default Admin Credentials

**Initial Setup:**
- User ID: `A00001`
- Password: `eduflex` (must be changed on first login)

**After First Login:**
- You'll set your own password
- The system will remember your preferences


