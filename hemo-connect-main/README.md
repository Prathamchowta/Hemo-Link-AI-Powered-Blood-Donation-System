# HEMO LINK - AI-Powered Blood Donation System

## Project Overview

HEMO LINK is a comprehensive blood donation management platform that connects donors, hospitals, and blood banks to save lives through intelligent emergency response and streamlined inventory management.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend & Database)

## How can I deploy this project?

You can deploy this project to various hosting platforms:

- **Vercel**: Connect your GitHub repo to Vercel for automatic deployments
- **Netlify**: Connect your GitHub repo to Netlify
- **Supabase Hosting**: Use Supabase's hosting capabilities
- **Any static hosting service**: Build the project (`npm run build`) and upload the `dist` folder

## Setting Up AI Features

HEMO LINK uses AI for the chatbot, certificate generation, and donor matching. To enable these features, you need to configure the `HEMO_AI_API_KEY`.

**See [API_KEY_SETUP.md](./API_KEY_SETUP.md) for detailed instructions on how to get and configure the API key.**

Supported AI providers:
- OpenAI (default)
- Google Gemini
- Anthropic Claude

## Additional Documentation

- [API_KEY_SETUP.md](./API_KEY_SETUP.md) - Guide for setting up AI features
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Database migration instructions
- [ADMIN_SETUP.md](./ADMIN_SETUP.md) - Admin user setup guide
