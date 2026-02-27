# AI Features Setup Guide

SmartHire now includes Generative AI features powered by OpenAI/XAI. Follow these steps to enable them:

## 1. Get an API Key

### Option A: OpenAI (Recommended for testing)
1. Go to https://platform.openai.com/api-keys
2. Create an account or sign in
3. Create a new API key
4. Copy the key

### Option B: XAI (Grok)
1. Go to https://x.ai/api
2. Sign up for API access
3. Get your API key

## 2. Set Environment Variable

### Windows (PowerShell):
```powershell
$env:OPENAI_API_KEY="your-api-key-here"
# OR for XAI:
$env:XAI_API_KEY="your-xai-key-here"
$env:XAI_BASE_URL="https://api.x.ai/v1"
```

### Windows (Command Prompt):
```cmd
set OPENAI_API_KEY=your-api-key-here
```

### Linux/Mac:
```bash
export OPENAI_API_KEY="your-api-key-here"
# OR for XAI:
export XAI_API_KEY="your-xai-key-here"
export XAI_BASE_URL="https://api.x.ai/v1"
```

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- `openai` - For AI API calls
- `requests` - For HTTP requests

## 4. Run the Application

```bash
python app.py
```

## 5. AI Features Available

Once set up, you'll have access to:

1. **🤖 AI Summary** - Auto-generated candidate summaries on each card
2. **✨ Why Good Fit** - Explains why a candidate is suitable
3. **📊 Skill Gap Analysis** - Detailed explanation of missing skills
4. **💡 Resume Tips** - Suggestions to improve resume for the role
5. **Auto-Generated Emails** - AI-powered shortlist and rejection emails

## Note

- If no API key is set, the system will use intelligent fallback templates
- AI features will still work but with template-based responses
- For best results, use an OpenAI or XAI API key

## Troubleshooting

- **"Error generating AI summary"**: Check your API key is set correctly
- **"Failed to generate"**: Verify your API key has credits/quota
- **Slow responses**: AI API calls may take 2-5 seconds

