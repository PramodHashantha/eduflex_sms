# Deployment Guide (Vercel)

This project is configured for easy deployment on Vercel using a single "monorepo" setup.

## Prerequisites

1.  **GitHub Account**: Push this project to a GitHub repository.
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
3.  **MongoDB Atlas**: You need a cloud-hosted MongoDB database (e.g., MongoDB Atlas).

## Steps to Deploy

1.  **Push to GitHub**
    *   Commit your changes and push the entire `eduflex_sms` folder to a new GitHub repository.

2.  **Import to Vercel**
    *   Go to your Vercel Dashboard.
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your GitHub repository.
    *   **Framework Preset**: Vercel should automatically detect "Create React App" for the frontend, but since we have a custom `vercel.json`, it will use that configuration. If asked, you can leave it as default or select "Other".
    *   **Root Directory**: Leave it as `./` (the root of your repo).

3.  **Environment Variables**
    *   In the "Environment Variables" section of the deployment screen, add the following:

    | Variable Name | Value | Description |
    | :--- | :--- | :--- |
    | `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string. |
    | `JWT_SECRET` | `your_secret_key` | A strong secret key for authentication. |
    | `REACT_APP_API_URL` | `/api` | **Crucial**: Set this to `/api` so the frontend talks to the backend on the same domain. |
    | `CI` | `false` | (Optional) Set to `false` if warnings cause the build to fail. |

4.  **Deploy**
    *   Click **"Deploy"**.
    *   Vercel will build the frontend and set up the backend serverless functions.

## Troubleshooting

*   **Build Fails**: Check the build logs. If it's a lint warning in React, set `CI=false` in Environment Variables and redeploy.
*   **Backend Errors**: Check the "Functions" tab in Vercel to see server logs.
*   **Database Connection**: Ensure your MongoDB Atlas "Network Access" allows connections from anywhere (`0.0.0.0/0`) since Vercel IPs are dynamic.

## Local Development

You can still run the project locally as before:
*   **Backend**: `cd backend && npm run dev`
*   **Frontend**: `cd frontend && npm start`
