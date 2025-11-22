# Gemini API Setup Guide

This guide explains how to set up the Gemini API for the Part Finder feature in MyGarage.

## Prerequisites

1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/)

## Setup Instructions

1. Open the [.env](file:///d:/PROJECTS/MyGarage/project/.env) file in your project root directory
2. Replace `your_gemini_api_key_here` with your actual Gemini API key:
   ```
   VITE_GEMINI_API_KEY=AIzaSyB4o23N...
   ```

3. Save the [.env](file:///d:/PROJECTS/MyGarage/project/.env) file

4. Restart your development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

## Security Notes

- The [.env](file:///d:/PROJECTS/MyGarage/project/.env) file is already added to [.gitignore](file:///d:/PROJECTS/MyGarage/project/.gitignore) to prevent accidentally committing your API key
- Never share your API key publicly
- You can always regenerate your API key from Google AI Studio if needed

## Testing the Integration

Once you've added your API key:

1. Navigate to the Part Finder feature in your app
2. Take a photo or upload an image of a car part
3. Click "Identify Part" to use the Gemini API
4. You should see the AI analysis results

## Troubleshooting

If you encounter issues:

1. Make sure you've restarted the development server after adding the API key
2. Check that your API key is valid and hasn't expired
3. Verify there are no typos in the [.env](file:///d:/PROJECTS/MyGarage/project/.env) file
4. Ensure you have internet connectivity

### Model Not Found Error

If you see an error like:
```
models/gemini-1.5-flash-latest is not found for API version v1beta
```

This means the specific model version is not available. The application is programmed to automatically try alternative models:
1. gemini-2.5-flash (newest)
2. gemini-2.5-pro (newest)
3. gemini-1.5-pro

This fallback mechanism should resolve the issue automatically. If all models fail, check the [Google AI Studio](https://aistudio.google.com/) for currently available models.