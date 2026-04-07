# How to Get Your Free Hugging Face API Key

## Step 1: Create Account
1. Go to [https://huggingface.co](https://huggingface.co)
2. Click **"Sign Up"** (top-right corner)
3. Use email, GitHub, or Google account
4. Verify your email address

## Step 2: Access API Tokens
1. Login to your account
2. Click your **profile picture** (top-right)
3. Select **"Access Tokens"** from dropdown menu

## Step 3: Create New Token
1. Click **"Create New Token"** button
2. **Name**: `fashion-app`
3. **Type**: Select **"Read"** (for using models)
4. Click **"Create token"**

## Step 4: Copy and Configure
1. **Copy** the token immediately (it only shows once!)
2. Create `.env.local` file in project root
3. Add: `HF_API_KEY=hf_your_token_here`

## Step 5: Test
```bash
# Restart the server
npm run dev

# Test the API
curl -X POST http://localhost:3000/api/tryon \
  -H "Content-Type: application/json" \
  -d '{"person_image":"data:image/png;base64,test","garment_image":"data:image/png;base64,test"}'
```

## Important Notes:
- ✅ **FREE**: No credit card required
- ✅ **Usage**: Free tier includes monthly credits
- ✅ **Security**: Never share your token publicly
- ✅ **Permissions**: "Read" is sufficient for inference

## Troubleshooting:
- If you see "Using fallback" → Token not working
- Check token starts with `hf_`
- Ensure no extra spaces or quotes
- Verify .env.local file is in project root
