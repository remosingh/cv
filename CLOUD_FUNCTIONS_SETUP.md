# Firebase Cloud Functions Setup

This guide explains how to set up Firebase Cloud Functions for background workflow execution in Agentic City.

## Why Cloud Functions?

Cloud Functions enable:
- **Background execution**: Workflows continue even if user closes browser
- **Reliability**: Automatic retries and error handling
- **Scalability**: Handle multiple concurrent workflows
- **Cost efficiency**: Pay only for execution time

## Prerequisites

1. Firebase project created
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Billing enabled on Firebase project (Cloud Functions requires Blaze plan)

## Setup Steps

### 1. Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

### 2. Configure Environment Variables

Cloud Functions need API keys for Claude and web search:

```bash
firebase functions:config:set \
  claude.api_key="your_claude_api_key" \
  tavily.api_key="your_tavily_api_key"
```

To view current config:
```bash
firebase functions:config:get
```

### 3. Update Firestore Security Rules

Add rules for the `jobs` collection:

```javascript
// In firestore.rules
match /jobs/{jobId} {
  // Users can read and write their own jobs
  allow read, write: if request.auth != null &&
    (resource == null || resource.data.userId == request.auth.uid);
}
```

### 4. Deploy Functions

```bash
firebase deploy --only functions
```

This deploys:
- `executeWorkflow` - Triggered automatically when job is created
- `triggerWorkflow` - HTTP callable function to start workflows
- `getJobStatus` - HTTP callable function to check job status

### 5. Test Locally (Optional)

To test functions locally with emulators:

```bash
firebase emulators:start
```

Then update your React app's `.env`:
```env
REACT_APP_USE_EMULATOR=true
```

## How It Works

### Workflow Execution Flow

1. **User submits complex task** (e.g., "Create business case for Edmonton...")

2. **Frontend calls `triggerWorkflow`**:
   ```javascript
   const jobInfo = await triggerBackgroundWorkflow(type, params, message, steps, title);
   ```

3. **Cloud Function creates job document** in `jobs` collection

4. **Firestore trigger activates `executeWorkflow`**:
   - Reads job configuration
   - Executes each workflow step sequentially
   - Updates progress in real-time
   - Handles errors and retries
   - Saves final document

5. **Frontend monitors progress**:
   - JobMonitor component subscribes to job updates
   - Shows real-time progress
   - Notifies on completion

### Data Flow

```
Frontend                 Cloud Functions              Firestore
--------                 ---------------              ---------
User Input    →    triggerWorkflow()       →    Create job doc
                                                      ↓
                   executeWorkflow()       ←    Job created trigger
                         ↓
                   Execute steps
                         ↓
                   Update progress         →    Update job doc
                         ↓                           ↓
                   Create agents           →    agents collection
                         ↓                           ↓
                   Save document           →    documents collection
                         ↓
JobMonitor     ←   Real-time updates       ←    onSnapshot listener
```

## Cost Estimation

### Cloud Functions Pricing (Blaze Plan)

**Invocations**:
- Free tier: 2 million invocations/month
- After: $0.40 per million

**Compute Time**:
- Free tier: 400,000 GB-seconds/month
- After: $0.0000025 per GB-second

**Example Business Case Workflow**:
- 5 agents × 2 minutes each = 10 minutes total
- Memory: 512MB
- Cost: ~$0.001 per workflow
- Well within free tier for typical usage

### Total Cost Per Workflow

| Component | Cost |
|-----------|------|
| Cloud Functions | $0.001 |
| Claude API | $0.25-0.50 |
| Web Search | $0.01 |
| Firestore | Free tier |
| **Total** | **< $1** |

## Monitoring & Logs

### View Logs

```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only executeWorkflow

# Follow logs in real-time
firebase functions:log --only executeWorkflow --tail
```

### Firebase Console

View logs, metrics, and errors:
1. Go to Firebase Console
2. Select your project
3. Navigate to Functions section
4. Click on function name to see details

## Troubleshooting

### "Cloud Functions not available" Error

**Cause**: Functions not deployed or incorrect configuration

**Fix**:
```bash
firebase deploy --only functions
```

### "Permission Denied" Error

**Cause**: Firestore security rules blocking access

**Fix**: Ensure rules allow authenticated users to create jobs:
```javascript
match /jobs/{jobId} {
  allow create: if request.auth != null;
  allow read, update: if request.auth.uid == resource.data.userId;
}
```

### "Claude API key not configured"

**Cause**: Environment variables not set in Cloud Functions

**Fix**:
```bash
firebase functions:config:set claude.api_key="your_key"
firebase deploy --only functions
```

### Workflow Stuck in "Running"

**Cause**: Function timeout or error

**Fix**:
1. Check logs: `firebase functions:log --only executeWorkflow`
2. Increase timeout in functions/index.js:
   ```javascript
   exports.executeWorkflow = functions
     .runWith({ timeoutSeconds: 540 }) // 9 minutes
     .firestore...
   ```

## Fallback Behavior

If Cloud Functions are not available, the system automatically falls back to frontend execution:

```javascript
try {
  return await executeBackgroundWorkflow(...);
} catch (error) {
  console.warn('Cloud Functions unavailable, using frontend fallback');
  return await executeBusinessCaseWorkflowFrontend(...);
}
```

This ensures the platform works even without Cloud Functions, though workflows won't persist if user closes browser.

## Scaling Considerations

### For Production

1. **Increase memory allocation**:
   ```javascript
   exports.executeWorkflow = functions
     .runWith({ memory: '1GB' })
     .firestore...
   ```

2. **Add retry logic**:
   ```javascript
   exports.executeWorkflow = functions
     .runWith({ failurePolicy: { retry: {} } })
     .firestore...
   ```

3. **Monitor quotas**:
   - Check Firebase console regularly
   - Set up billing alerts
   - Implement rate limiting if needed

4. **Optimize performance**:
   - Cache API responses when possible
   - Batch Firestore operations
   - Use connection pooling

## Security Best Practices

1. **Never expose API keys in frontend**
   - Keep all sensitive keys in Cloud Functions config
   - Use environment variables

2. **Validate user input**
   - Check authentication in callable functions
   - Sanitize workflow parameters

3. **Rate limiting**
   - Implement per-user quotas
   - Prevent abuse of expensive operations

4. **Audit logs**
   - Log all workflow executions
   - Monitor for unusual patterns

## Next Steps

- [ ] Deploy functions to production
- [ ] Set up monitoring and alerts
- [ ] Configure billing limits
- [ ] Test background execution
- [ ] Monitor costs and usage

For more information, see:
- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Main README](./README.md)
