# How to Apply the Migration for Cross-Hospital Donation Visibility

## Problem
Registered donors' donations recorded at one hospital are not visible in other hospitals.

## Solution
Apply the migration `20251207000000_allow_hospitals_view_registered_donor_donations.sql` to update the RLS policy.

## Step-by-Step Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the Migration**
   - Open the file: `supabase/migrations/20251207000000_allow_hospitals_view_registered_donor_donations.sql`
   - Copy all the SQL code
   - Paste it into the SQL Editor

4. **Run the Migration**
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - You should see a success message

5. **Verify the Migration**
   - Run this query to check if the new policy exists:
   ```sql
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'donations' 
   AND policyname LIKE '%registered donor%';
   ```
   - You should see a policy named "Hospitals can view their donations and registered donor donations"

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd hemo-connect-main
supabase db push
```

## After Applying the Migration

1. **Refresh your browser** - Hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. **Check the browser console** - Open Developer Tools (F12) and check the Console tab for any errors
3. **Verify the data** - The donation count and last donation date should now update correctly

## Troubleshooting

### If you see RLS policy errors:
- Make sure you're logged in as a hospital user
- Check that the `user_roles` table has the correct role for your user

### If donations still don't show:
1. Check the browser console for errors
2. Verify the migration was applied successfully
3. Make sure the donation was recorded with `donor_user_id` (not just `donor_id`)

### To check if a donation exists:
Run this query in SQL Editor (replace `USER_ID` with the actual donor's user ID):
```sql
SELECT id, donation_date, hospital_id, donor_user_id, donor_id
FROM donations
WHERE donor_user_id = 'USER_ID';
```

