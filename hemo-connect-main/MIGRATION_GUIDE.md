# How to Apply Migrations to Supabase

This guide explains how to apply database migrations to your Supabase project.

## Method 1: Using Supabase Dashboard (Recommended for Beginners)

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com](https://supabase.com)
2. Log in to your account
3. Select your HEMO LINK project

### Step 2: Open SQL Editor
1. In the left sidebar, click on **SQL Editor**
2. Click **New Query** to create a new SQL query

### Step 3: Apply Migrations
Apply each migration file in order:

#### Migration 1: Fix Registration
1. Open the file: `supabase/migrations/20251204000001_fix_registration.sql`
2. Copy all the contents
3. Paste into the SQL Editor
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)
5. Wait for "Success" message

#### Migration 2: Create Donations and Certificates
1. Open the file: `supabase/migrations/20251204000002_create_donations_and_certificates.sql`
2. Copy all the contents
3. Paste into the SQL Editor
4. Click **Run**
5. Wait for "Success" message

#### Migration 3: Admin User Setup (Optional)
1. Open the file: `supabase/migrations/20251204000000_create_admin_user.sql`
2. Copy all the contents
3. Paste into the SQL Editor
4. Click **Run**

### Step 4: Verify Migrations
1. Go to **Table Editor** in the left sidebar
2. Check that these tables exist:
   - ✅ `donations` (new)
   - ✅ `donors` (should have `user_id` column)
   - ✅ `profiles`
   - ✅ `user_roles`
   - ✅ `blood_requests`
   - ✅ `blood_inventory`

3. Go to **Database** → **Functions** and verify:
   - ✅ `create_user_profile_and_role` function exists
   - ✅ `update_donor_stats` function exists
   - ✅ `update_blood_inventory_on_donation` function exists

---

## Method 2: Using Supabase CLI (Recommended for Developers)

### Prerequisites
1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
   Or using other package managers:
   ```bash
   # Homebrew (Mac)
   brew install supabase/tap/supabase
   
   # Scoop (Windows)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   cd hemo-connect-main
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in Supabase Dashboard → Settings → General)

### Apply Migrations
```bash
# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase migration up
```

### Check Migration Status
```bash
# List all migrations
supabase migration list

# Check database status
supabase db diff
```

---

## Method 3: Using Supabase Management API

For automated deployments, you can use the Supabase Management API:

```bash
# Get your access token from Supabase Dashboard → Settings → API
export SUPABASE_ACCESS_TOKEN="your-access-token"
export SUPABASE_PROJECT_REF="your-project-ref"

# Apply migrations via API
curl -X POST \
  "https://api.supabase.com/v1/projects/{project-ref}/database/migrations" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @migration-file.sql
```

---

## Troubleshooting

### Error: "relation already exists"
- The migration has already been applied
- Skip this migration or check if tables already exist

### Error: "permission denied"
- Ensure you're using the correct database credentials
- Check RLS policies if you're getting permission errors

### Error: "function already exists"
- The function was already created
- You can safely ignore or use `CREATE OR REPLACE FUNCTION`

### Rollback a Migration
If you need to rollback:

```sql
-- Example: Drop donations table (be careful!)
DROP TABLE IF EXISTS public.donations CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_donor_stats_trigger ON public.donations;
DROP TRIGGER IF EXISTS update_inventory_on_donation ON public.donations;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_donor_stats();
DROP FUNCTION IF EXISTS public.update_blood_inventory_on_donation();
```

---

## Migration Order

Apply migrations in this order:

1. ✅ `20251116105453_54bc3e4d-5b4b-418f-a121-f9a802ec9143.sql` (Base tables - should already be applied)
2. ✅ `20251116105503_0b0dd21d-8b64-48f3-ae82-238008c9b845.sql` (Should already be applied)
3. ✅ `20251116110037_86f2879c-3402-4da4-b5e6-f85f93b88d23.sql` (Should already be applied)
4. ✅ `20251203034824_efdc7026-0f3f-4ce1-a8a6-4606b11163ce.sql` (Should already be applied)
5. ⚠️ `20251204000000_create_admin_user.sql` (Admin setup - optional)
6. ⚠️ `20251204000001_fix_registration.sql` (Registration fix)
7. ⚠️ `20251204000002_create_donations_and_certificates.sql` (Donations & certificates)

---

## Verification Checklist

After applying migrations, verify:

- [ ] `donations` table exists with all columns
- [ ] `donors` table has `user_id` column
- [ ] `create_user_profile_and_role` function exists
- [ ] `update_donor_stats` function exists
- [ ] `update_blood_inventory_on_donation` function exists
- [ ] Triggers are created on `donations` table
- [ ] RLS policies are enabled on `donations` table
- [ ] Can insert a test donation (if testing)

---

## Quick Test Query

After applying migrations, test with:

```sql
-- Check donations table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'donations';

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%donation%' OR routine_name LIKE '%donor%';

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

---

## Need Help?

- Check Supabase documentation: https://supabase.com/docs/guides/database
- Supabase Discord: https://discord.supabase.com
- Check migration files for comments explaining each change

