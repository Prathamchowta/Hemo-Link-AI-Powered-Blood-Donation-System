# How to Get HEMO_AI_API_KEY

The HEMO LINK platform supports multiple AI providers for AI features (Chatbot, Certificate Generation, and AI Donor Matching). You can choose from OpenAI, Google Gemini, or Anthropic Claude.

## Supported AI Providers

1. **OpenAI** (Recommended - Default)
2. **Google Gemini**
3. **Anthropic Claude**

## Where to Get API Keys

### Option 1: OpenAI (Recommended)

1. **Sign up for OpenAI**
   - Visit [https://platform.openai.com](https://platform.openai.com)
   - Create an account or log in

2. **Get your API Key**
   - Go to **API Keys** section in the dashboard
   - Click **Create new secret key**
   - Copy the API key (starts with `sk-...`)
   - **Important:** Save it immediately - you won't be able to see it again!

3. **Set Provider**
   - In Supabase, set environment variable: `AI_PROVIDER=openai` (or leave default)
   - Set your API key as: `HEMO_AI_API_KEY`

**Pricing:** Pay-as-you-go. See [OpenAI Pricing](https://openai.com/api/pricing/)

**Models Available:**
- `gpt-4o-mini` (default, cost-effective)
- `gpt-4o` (more powerful)
- `gpt-3.5-turbo` (cheapest)

---

### Option 2: Google Gemini (Free Tier Available)

1. **Get Google AI Studio API Key**
   - Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account
   - Click **Create API Key**
   - Select or create a Google Cloud project
   - Copy your API key

2. **Set Provider**
   - In Supabase, set: `AI_PROVIDER=google`
   - Set your API key as: `HEMO_AI_API_KEY`
   - Optionally set: `GOOGLE_MODEL=gemini-1.5-flash` (default) or `gemini-1.5-pro`

**Pricing:** Generous free tier, then pay-as-you-go. See [Google AI Pricing](https://ai.google.dev/pricing)

---

### Option 3: Anthropic Claude

1. **Sign up for Anthropic**
   - Visit [https://console.anthropic.com](https://console.anthropic.com)
   - Create an account or log in

2. **Get your API Key**
   - Go to **API Keys** section
   - Click **Create Key**
   - Copy the API key (starts with `sk-ant-...`)

3. **Set Provider**
   - In Supabase, set: `AI_PROVIDER=anthropic`
   - Set your API key as: `HEMO_AI_API_KEY`
   - Optionally set: `ANTHROPIC_MODEL=claude-3-5-sonnet-20241022` (default) or `claude-3-opus-20240229`

**Pricing:** Pay-as-you-go. See [Anthropic Pricing](https://www.anthropic.com/pricing)

## How to Set Up in Supabase

Once you have your API key:

1. **Go to Supabase Dashboard**
   - Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your HEMO LINK project

2. **Navigate to Edge Functions**
   - Click on **Edge Functions** in the left sidebar
   - Or go to **Project Settings** → **Edge Functions**

3. **Set the Secrets**
   
   **Required Secret:**
   - Click **Add Secret** or **New Secret**
   - **Name:** `HEMO_AI_API_KEY`
   - **Value:** Paste your API key (from OpenAI, Google, or Anthropic)
   - Click **Save**

   **Optional - Set AI Provider (default is OpenAI):**
   - Click **Add Secret** again
   - **Name:** `AI_PROVIDER`
   - **Value:** `openai` or `google` or `anthropic`
   - Click **Save**

   **Optional - Set Model (provider-specific):**
   - For OpenAI: Add secret `OPENAI_MODEL` with value like `gpt-4o-mini` or `gpt-4o`
   - For Google: Add secret `GOOGLE_MODEL` with value like `gemini-1.5-flash` or `gemini-1.5-pro`
   - For Anthropic: Add secret `ANTHROPIC_MODEL` with value like `claude-3-5-sonnet-20241022`

4. **Redeploy Functions**
   ```bash
   supabase functions deploy chat generate-certificate suggest-donors
   ```

   Or the functions will automatically use the new settings on next invocation.

## Verify the Setup

After setting the API key:

1. **Test the Chatbot:**
   - Go to your HEMO LINK application
   - Navigate to the Hospital Dashboard
   - Click on "AI Assistant" tab
   - Try asking a question
   - If it works, the API key is configured correctly

2. **Test Certificate Generation:**
   - Record a donation
   - Check if certificate is generated automatically
   - If certificate generates, the API key is working

3. **Test AI Matching:**
   - Create a blood request
   - Click "AI Match" button
   - If you see AI-powered suggestions, it's working

## Troubleshooting

### Error: "HEMO_AI_API_KEY is not configured"
- **Solution:** Make sure you've added the secret in Supabase with the exact name `HEMO_AI_API_KEY`

### Error: "AI gateway error" or "Failed to get response"
- **Possible causes:**
  1. Invalid API key - double-check the key is correct
  2. Rate limits - you may have exceeded API usage limits
  3. Network issues - check your internet connection
  4. API service down - check your AI provider's status page

### Error: "Payment required" (402)
- **Solution:** Your API key may need credits/top-up. Check your AI provider account billing section.

### Functions work but AI features don't
- **Solution:** 
  1. Verify the secret name is exactly `HEMO_AI_API_KEY` (case-sensitive)
  2. Redeploy the functions after setting the secret
  3. Wait a few minutes for the changes to propagate

## Important Notes

- The API key is stored securely in Supabase and never exposed to the frontend
- Keep your API key confidential - don't share it or commit it to version control
- The functions will still work without the API key, but AI features will be disabled:
  - Chatbot: Will show error messages
  - Certificate Generation: Will generate basic certificates without AI
  - AI Matching: Will show heuristic-based matches instead of AI-powered suggestions

## Need Help?

If you're still having issues:
1. Check the Supabase Edge Functions logs in the dashboard
2. Check browser console for detailed error messages
3. Verify the API key format (should be a long string)
4. Contact your AI provider's support team for API key issues

