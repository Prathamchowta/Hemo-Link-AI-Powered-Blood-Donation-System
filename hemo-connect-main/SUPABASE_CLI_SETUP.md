# How to Find Your Supabase Project Reference

## Step-by-Step Guide

### Method 1: From Supabase Dashboard URL

1. **Open your Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Log in to your account

2. **Select your HEMO LINK project**
   - Click on your project from the list

3. **Check the URL**
   - Look at the browser address bar
   - The URL will look like: `https://supabase.com/dashboard/project/abcdefghijklmnop`
   - The part after `/project/` is your **Project Reference ID**
   - Example: If URL is `https://supabase.com/dashboard/project/abcdefghijklmnop`
   - Then your project ref is: `abcdefghijklmnop`

### Method 2: From Project Settings

1. **Go to Project Settings**
   - In your Supabase Dashboard
   - Click on **Settings** (gear icon) in the left sidebar
   - Or go to: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/general`

2. **Find General Settings**
   - Click on **General** under Settings
   - Look for **Reference ID** section
   - Copy the reference ID shown there

### Method 3: From API Settings

1. **Go to API Settings**
   - Click **Settings** → **API**
   - Look for **Project URL**
   - The URL format is: `https://YOUR_PROJECT_REF.supabase.co`
   - The part before `.supabase.co` is your project reference

## Example Command

Once you have your project reference, use it like this:

```bash
# Replace 'abcdefghijklmnop' with your actual project reference
supabase link --project-ref abcdefghijklmnop
```

## Complete Setup Example

```bash
# 1. Install Supabase CLI (if not already installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Navigate to your project directory
cd hemo-connect-main

# 4. Link your project (replace with your actual project ref)
supabase link --project-ref YOUR_PROJECT_REF_HERE

# 5. Apply migrations
supabase db push
```

## What the Project Reference Looks Like

- **Format**: Usually 20 characters, alphanumeric
- **Example**: `abcdefghijklmnopqrst` or `xyz123abc456def789`
- **Location**: Always visible in your Supabase dashboard URL

## Troubleshooting

### Error: "Project not found"
- Double-check the project reference ID
- Make sure you're logged in with the correct account
- Verify the project exists in your dashboard

### Error: "Invalid project reference"
- Ensure you copied the entire reference ID
- Don't include any spaces or extra characters
- The reference should be one continuous string

### Error: "Authentication required"
- Run `supabase login` first
- Follow the authentication flow in your browser

## Alternative: Manual Migration (If CLI Doesn't Work)

If you prefer not to use CLI, you can apply migrations manually:

1. Go to Supabase Dashboard → SQL Editor
2. Copy migration file contents
3. Paste and run in SQL Editor
4. Repeat for each migration file

See `MIGRATION_GUIDE.md` for detailed manual migration steps.

