# Debugging: Donation Not Showing for Registered Donor

## Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the "Console" tab
3. Refresh the Donors page
4. Look for messages starting with:
   - `Fetching donations for registered donor:`
   - `Query result for:`
   - `Error fetching donations:`

## Step 2: Verify the Donation Was Recorded Correctly

The donation must be recorded with `donor_user_id` (not just `donor_id`) for registered donors.

### Check in Supabase SQL Editor:

Run this query (replace `USER_ID` with Pallavi's user ID from the profiles table):

```sql
-- First, find Pallavi's user ID
SELECT id, full_name, phone 
FROM profiles 
WHERE full_name LIKE '%Pallavi%' OR phone LIKE '%9113209691%';

-- Then check if donations exist for that user_id
SELECT 
  id,
  donation_date,
  blood_group,
  units_donated,
  donor_id,
  donor_user_id,
  hospital_id
FROM donations
WHERE donor_user_id = 'USER_ID_FROM_ABOVE'
ORDER BY donation_date DESC;
```

### What to Look For:

1. **If `donor_user_id` is NULL**: The donation was recorded incorrectly. It should have `donor_user_id` set to the registered donor's user ID.

2. **If `donor_user_id` is set correctly**: The RLS policy should allow viewing it. Check for RLS errors in the console.

## Step 3: Verify RLS Policy is Applied

Run this query to check if the policy exists:

```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'donations' 
AND policyname LIKE '%registered donor%';
```

You should see: `Hospitals can view their donations and registered donor donations`

## Step 4: Test the Query Directly

Run this query as a hospital user (replace `DONOR_USER_ID` with Pallavi's user ID):

```sql
SELECT 
  id,
  donation_date,
  blood_group,
  units_donated,
  hospital_id
FROM donations
WHERE donor_user_id = 'DONOR_USER_ID'
ORDER BY donation_date DESC;
```

If this query works in SQL Editor but not in the app, it's likely a caching issue. Try:
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Log out and log back in

## Common Issues:

### Issue 1: Donation recorded with `donor_id` instead of `donor_user_id`
**Solution**: The donation needs to be re-recorded with the correct `donor_user_id` field.

### Issue 2: RLS Policy not applied
**Solution**: Re-run the migration SQL in Supabase SQL Editor.

### Issue 3: Browser cache
**Solution**: Hard refresh (Ctrl+Shift+R) or clear browser cache.

### Issue 4: Wrong user ID
**Solution**: Verify the `donor_user_id` in the donations table matches the `id` in the profiles table.

