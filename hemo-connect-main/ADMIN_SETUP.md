# Admin User Setup Guide

This guide explains how to create an admin user account for HEMO LINK.

## Method 1: Using Supabase Dashboard (Recommended)

1. **Create the user in Supabase Auth:**
   - Go to your Supabase Dashboard
   - Navigate to **Authentication** → **Users**
   - Click **Add User** → **Create New User**
   - Enter:
     - Email: `admin@hemolink.com` (or your preferred admin email)
     - Password: (set a strong password)
     - Auto Confirm User: ✅ (check this)
   - Click **Create User**
   - Copy the **User UID** (you'll need this in the next step)

2. **Assign Admin Role:**
   - Go to **SQL Editor** in Supabase Dashboard
   - Run the following SQL, replacing `<USER_ID>` with the User UID from step 1:

```sql
-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

3. **Create Admin Profile:**
   - Run this SQL in the SQL Editor, replacing `<USER_ID>` with the User UID:

```sql
-- Create admin profile
INSERT INTO public.profiles (id, full_name, phone)
VALUES ('<USER_ID>', 'System Administrator', '+911234567890')
ON CONFLICT (id) DO UPDATE
SET full_name = 'System Administrator';
```

4. **Verify Setup (Optional but Recommended):**
   - Run this verification query to confirm the admin role and profile were created successfully:

```sql
-- Verify admin setup
SELECT 
  ur.user_id,
  ur.role,
  p.full_name,
  p.phone,
  au.email,
  au.created_at as user_created_at
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = '5b1be733-7b1a-4da5-8599-562d8eda1497' -- Replace with your User UID
AND ur.role = 'admin';
```

   - **Expected Result:** You should see one row with your admin user's details.
   - **Note:** "Success. No rows returned" after the INSERT statements is **normal and correct**. INSERT/UPDATE statements without `RETURNING` clauses don't return rows in the result set, but the operations still succeed.

## Method 2: Using Management API (JavaScript/TypeScript)

You can use the Supabase Admin API to create users programmatically. This requires your Supabase project's service role key.

**Note:** The Supabase CLI does not have an `auth` subcommand for creating users. Use the Dashboard (Method 1) or Management API (this method).

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://your-project.supabase.co',
  'your-service-role-key' // ⚠️ Keep this secret!
)

// Create the user
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'admin@hemolink.com',
  password: 'YourSecurePassword123!',
  email_confirm: true, // Auto-confirm the user
})

if (error) {
  console.error('Error creating user:', error)
} else {
  const userId = data.user.id
  console.log('User created with ID:', userId)
  
  // Then run the SQL commands from Method 1 to assign admin role and create profile
}
```

See the [Supabase Admin API documentation](https://supabase.com/docs/reference/javascript/auth-admin-createuser) for more details.

## Default Admin Credentials

After setup, you can log in at `/admin` with:
- **Email:** The email you used when creating the user
- **Password:** The password you set

## Security Notes

- ⚠️ **Never commit admin credentials to version control**
- 🔒 Use a strong, unique password for admin accounts
- 👥 Limit the number of admin users
- 🔄 Regularly rotate admin passwords
- 📝 Keep a secure record of admin credentials (use a password manager)

## Troubleshooting

### "Access Denied" after login
- Verify the user has the `admin` role in the `user_roles` table
- Check that the role was inserted correctly: 
  ```sql
  SELECT * FROM public.user_roles WHERE role = 'admin';
  ```

### Cannot create user
- Ensure you have proper permissions in Supabase
- Check that the email is not already registered
- Verify your Supabase project is active

### "unknown command 'auth' for 'supabase'" error
- The Supabase CLI does not have an `auth` subcommand for creating users
- Use **Method 1 (Dashboard)** instead - it's the recommended and simplest approach
- Alternatively, use **Method 2 (Management API)** if you need programmatic user creation

### "Success. No rows returned" after INSERT statements
- ✅ **This is correct and expected behavior!**
- INSERT/UPDATE statements without `RETURNING` clauses don't return rows in the result set
- "Success" confirms the SQL executed without errors
- The data was inserted/updated successfully even though no rows are shown
- To verify, run the verification query from Step 4 in Method 1

### Admin dashboard not showing
- Verify the user role is set to `admin`
- Check browser console for errors
- Ensure the RoleBasedRouter is working correctly

## Admin Features

Once logged in as admin, you have access to:
- Full hospital dashboard functionality
- View all blood requests across all hospitals
- View all donors across all hospitals
- View all blood inventory across all hospitals
- System-wide analytics and management

