# S3 Presigner Server Setup Guide

## Overview
The S3 Presigner server generates signed URLs for S3 objects so your userscript can access private S3 files from the browser. This is necessary because browsers cannot directly access S3 objects that require AWS authentication.

## Prerequisites

### 1. Install Python Dependencies
```bash
pip install boto3
```

### 2. Configure AWS Credentials
Choose one of these methods:

#### Option A: AWS CLI (Recommended)
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

#### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_SESSION_TOKEN="your-session-token"  # If using temporary credentials
```

#### Option C: Credentials File
Create `~/.aws/credentials`:
```ini
[default]
aws_access_key_id = your-access-key
aws_secret_access_key = your-secret-key
```

## Usage

### 1. Start the Server
```bash
# Default: localhost:8080
python scripts/s3_presigner.py

# Custom host/port
python scripts/s3_presigner.py --host 0.0.0.0 --port 8081

# Help
python scripts/s3_presigner.py --help
```

### 2. Test the Server

#### GET Method (URL parameter)
```bash
curl "http://localhost:8080/?url=https://fleetdata-production.s3.amazonaws.com/path/to/file.json"
```

#### POST Method (JSON body)
```bash
curl -X POST http://localhost:8080/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://fleetdata-production.s3.amazonaws.com/path/to/file.json", "expires_in": 7200}'
```

### 3. Expected Response
```json
{
  "original_url": "https://fleetdata-production.s3.amazonaws.com/path/to/file.json",
  "presigned_url": "https://fleetdata-production.s3.amazonaws.com/path/to/file.json?X-Amz-Algorithm=...",
  "expires_in": 3600,
  "status": "success",
  "processing_time_ms": 45.23
}
```

## Integration with UserScript

Your userscript is already configured to use this server! Check `src/config/constants.js`:
```javascript
S3_PRESIGNER: {
  LOCAL_SERVER_URL: 'http://localhost:8080'
}
```

The MetadataManager automatically calls this server when downloading metadata:
```javascript
// This happens automatically when you trigger metadata download
await MetadataManager.downloadMetadata('alert-id')
```

## Troubleshooting

### Server Won't Start
- **AWS credentials not found**: Follow the credentials setup above
- **Port already in use**: Try a different port with `--port 8081`
- **Python/boto3 not installed**: Run `pip install boto3`

### Server Starts But Returns Errors
- **403 Forbidden**: Check your AWS permissions for the S3 bucket
- **404 Not Found**: Verify the S3 URL format and file existence
- **CORS errors**: The server includes CORS headers, but check browser console

### Testing Connection
```javascript
// Test in browser console
fetch('http://localhost:8080/', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({url: 'https://your-bucket.s3.amazonaws.com/test-file.json'})
})
.then(r => r.json())
.then(console.log)
```

### Required AWS Permissions
Your AWS credentials need at least these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

## Development Workflow

1. **Start the presigner server**: `python scripts/s3_presigner.py`
2. **Open your application** in the browser
3. **Trigger metadata download** - the server will handle S3 URL signing automatically
4. **Check server logs** for request/response details

## Server Features

- ✅ **CORS enabled** - Works from browser
- ✅ **Detailed logging** - Request/response tracking
- ✅ **Error handling** - Graceful failure modes
- ✅ **Flexible URLs** - Supports different S3 URL formats
- ✅ **Configurable expiration** - Default 1 hour, customizable
- ✅ **Performance metrics** - Processing time tracking

Your S3 presigner is ready to use! 🚀
