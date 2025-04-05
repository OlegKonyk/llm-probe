# Hugging Face Spaces Deployment - Manual Steps

**Follow these steps to deploy your LLM Testing Framework to Hugging Face Spaces for FREE.**

Total time: ~30 minutes (mostly waiting for build)

---

## Prerequisites

- A computer with internet connection
- Git installed on your computer
- A GitHub account (optional, but recommended)

---

## Part 1: Create Hugging Face Account (5 minutes)

### Step 1: Sign Up for Hugging Face

1. Go to **https://huggingface.co/join**
2. Fill in the registration form:
   - **Email:** Your email address
   - **Username:** Choose a username (e.g., `john-smith`)
   - **Password:** Choose a secure password
3. Click **"Sign Up"**
4. **Check your email** for verification link
5. Click the verification link to activate your account
6. You'll be redirected to Hugging Face dashboard

**✅ You now have a Hugging Face account!**

---

## Part 2: Create Your Space (3 minutes)

### Step 2: Create a New Space

1. Go to **https://huggingface.co/spaces**
2. Click the **"Create new Space"** button (top right)
3. Fill in the form:

   **Space name:** `llm-testing-framework`
   - (or choose your own name - no spaces, use hyphens)

   **License:** `Apache 2.0`

   **Select the Space SDK:** Click **"Docker"**

   **Space hardware:** Select **"CPU basic - Free"**
   - (You can upgrade to GPU later if needed)

   **Space visibility:**
   - **Public** (recommended - free forever)
   - Or **Private** (if you have a paid plan)

4. Click **"Create Space"**

**✅ Your Space is created!**

You'll see a page that looks like a Git repository with instructions.

---

## Part 3: Upload Your Code (10 minutes)

You have two options: **Git Push** (recommended) or **Web Upload** (easier for beginners).

### Option A: Git Push (Recommended)

#### Step 3A: Get Your Git URL

On your Space page, you'll see:
```
git clone https://huggingface.co/spaces/YOUR-USERNAME/llm-testing-framework
```

Copy this URL.

#### Step 4A: Add Hugging Face as Git Remote

Open your terminal and navigate to your project:

```bash
cd /Users/oleg/code/llm-principals
```

Add Hugging Face as a remote:

```bash
# Replace YOUR-USERNAME with your actual HF username
git remote add hf https://huggingface.co/spaces/YOUR-USERNAME/llm-testing-framework
```

#### Step 5A: Copy README for HF Spaces

```bash
cp README-hf.md README.md
```

#### Step 6A: Commit the deployment files

```bash
git add Dockerfile start.sh README.md
git commit -m "Deploy to Hugging Face Spaces"
```

#### Step 7A: Push to Hugging Face

```bash
git push hf main
```

You'll be prompted for credentials:
- **Username:** Your HF username
- **Password:** Your HF password (or access token)

**If push fails**, you may need to create an access token:

1. Go to **https://huggingface.co/settings/tokens**
2. Click **"New token"**
3. Name: `git-access`
4. Role: **Write**
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)
7. Use this token as your password when pushing

**✅ Code uploaded via Git!**

---

### Option B: Web Upload (Easier for Beginners)

#### Step 3B: Go to Files Tab

On your Space page:
1. Click the **"Files"** tab
2. You'll see a mostly empty repository

#### Step 4B: Upload Dockerfile

1. Click **"Add file"** → **"Upload files"**
2. Drag and drop (or click to browse):
   - `/Users/oleg/code/llm-principals/Dockerfile`
3. In the commit message box, type: `Add Dockerfile`
4. Click **"Commit changes to main"**

#### Step 5B: Upload start.sh

1. Click **"Add file"** → **"Upload files"**
2. Upload:
   - `/Users/oleg/code/llm-principals/start.sh`
3. Commit message: `Add startup script`
4. Click **"Commit changes to main"**

#### Step 6B: Upload README

1. Click **"Add file"** → **"Upload files"**
2. Upload:
   - `/Users/oleg/code/llm-principals/README-hf.md`
3. **Important:** Rename it to `README.md` when uploading
4. Commit message: `Add README`
5. Click **"Commit changes to main"**

#### Step 7B: Upload Backend Directory

1. Click **"Add file"** → **"Upload files"**
2. **Select the entire `backend` folder**:
   - Navigate to `/Users/oleg/code/llm-principals/`
   - Select the `backend` folder
   - Upload the whole folder (Hugging Face will preserve the structure)
3. Commit message: `Add backend service`
4. Click **"Commit changes to main"**

**✅ Code uploaded via web!**

---

## Part 4: Wait for Build (15 minutes)

### Step 8: Monitor Build Progress

After uploading, Hugging Face will automatically start building your Space.

1. Go to your Space page:
   ```
   https://huggingface.co/spaces/YOUR-USERNAME/llm-testing-framework
   ```

2. Click the **"Logs"** tab to watch the build

You'll see:
- Docker image building
- Node.js dependencies installing
- Ollama installing
- llama3.2 model downloading (~2GB, takes time)
- Application starting

**Build time: 10-15 minutes** (mostly downloading the model)

### What You'll See in Logs:

```
Building Docker image...
Installing npm packages...
Installing Ollama...
Pulling llama3.2:latest...
Starting Ollama service...
Starting Express backend on port 7860...
```

When you see:
```
✅ Application is running
```

**✅ Your Space is live!**

---

## Part 5: Test Your Deployment (2 minutes)

### Step 9: Get Your Space URL

Your Space will be available at:
```
https://YOUR-USERNAME-llm-testing-framework.hf.space
```

Or click the **"App"** tab on your Space page.

### Step 10: Test the Health Endpoint

Open your browser and go to:
```
https://YOUR-USERNAME-llm-testing-framework.hf.space/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-03T12:00:00.000Z"
}
```

**✅ Health check works!**

### Step 11: Test the Summarization API

Open your terminal and run:

```bash
# Replace YOUR-USERNAME with your actual username
curl -X POST https://YOUR-USERNAME-llm-testing-framework.hf.space/api/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Agent: Hello, how can I help? Customer: I forgot my password. Agent: I can help with that. Let me send you a reset link. Customer: Thank you!"
  }'
```

You should get a response like:
```json
{
  "summary": "Customer contacted support for a password reset. Agent provided assistance and sent a reset link.",
  "metadata": {
    "model": "llama3.2:latest",
    "timestamp": "2025-11-03T12:00:00.000Z",
    "processingTime": 2743
  }
}
```

**✅ API is working!**

---

## Part 6: Optional Upgrades

### Upgrade to GPU (Faster Inference)

If you want faster summarization:

1. Go to your Space **Settings** (gear icon)
2. Scroll to **"Space hardware"**
3. Select **"GPU T4 - Small"** or **"GPU T4 - Medium"**
4. Click **"Save"**

**Cost:**
- **CPU Basic:** FREE (slower, ~3-5s per summary)
- **GPU T4 Small:** FREE (but may have queue during peak times)
- **GPU A10G:** $0.60/hour (fast, no queue)

**For most use cases, CPU Basic is fine!**

---

## Troubleshooting

### Space Won't Build

**Check logs for errors:**
1. Go to **"Logs"** tab
2. Look for red error messages

**Common issues:**
- `npm install failed` → Check package.json exists in backend folder
- `Ollama installation failed` → Usually temporary, try rebuilding
- `Port 7860 not found` → Check Dockerfile has `ENV PORT=7860`

**Solution:** Click **"Factory reboot"** in Settings to rebuild from scratch

---

### Space is Slow to Respond

**First request after sleep is slow:**
- Free spaces sleep after 48 hours of inactivity
- First request wakes it up (~30 seconds)
- Subsequent requests are fast

**Solution:** Ping health endpoint daily to keep it awake

---

### Can't Access API

**Check the URL:**
- Should be: `https://YOUR-USERNAME-llm-testing-framework.hf.space`
- Not: `https://huggingface.co/spaces/...` (that's the Space page, not the API)

**Check CORS:**
- Web browsers may block cross-origin requests
- Use `curl` or Postman for testing
- Or add your domain to allowed origins

---

## What's Next?

### Share Your Space

Your Space is now public at:
```
https://huggingface.co/spaces/YOUR-USERNAME/llm-testing-framework
```

Share this link to let others:
- See your API documentation
- Try the API endpoints
- View the code

### Monitor Usage

Go to **"Analytics"** tab to see:
- Number of requests
- Response times
- Error rates
- Traffic sources

### Update Your Deployment

To update your code:

**Via Git:**
```bash
# Make changes to your code
git add .
git commit -m "Update API endpoint"
git push hf main
```

**Via Web:**
1. Go to **"Files"** tab
2. Click on file to edit
3. Make changes
4. Commit changes

Hugging Face will automatically rebuild and redeploy.

---

## Summary

**What You Did:**
1. ✅ Created Hugging Face account
2. ✅ Created a Space with Docker SDK
3. ✅ Uploaded Dockerfile, start.sh, README.md, and backend code
4. ✅ Waited for build to complete
5. ✅ Tested health and summarization endpoints

**What You Have:**
- ✅ FREE cloud-hosted LLM API (no local machine needed!)
- ✅ Public HTTPS endpoint
- ✅ Ollama + llama3.2 running in the cloud
- ✅ 16GB RAM on free tier
- ✅ Automatic HTTPS
- ✅ Web interface to monitor

**Cost: $0/month** 🎉

---

## Need Help?

**Hugging Face Documentation:**
- Spaces: https://huggingface.co/docs/hub/spaces
- Docker Spaces: https://huggingface.co/docs/hub/spaces-sdks-docker

**Check the logs:**
- Go to your Space → **"Logs"** tab
- Look for error messages

**Community:**
- Hugging Face Discord: https://hf.co/join/discord
- Hugging Face Forum: https://discuss.huggingface.co/

---

**Congratulations! Your LLM Testing Framework is now deployed! 🚀**
