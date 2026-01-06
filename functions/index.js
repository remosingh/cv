const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function: Execute Workflow in Background
 * Triggered when a new workflow is created
 */
exports.executeWorkflow = functions.firestore
  .document('jobs/{jobId}')
  .onCreate(async (snap, context) => {
    const job = snap.data();
    const jobId = context.params.jobId;

    // Only process workflow jobs
    if (job.type !== 'workflow') {
      return null;
    }

    console.log(`Starting workflow job: ${jobId}`);

    try {
      // Update job status to running
      await snap.ref.update({
        status: 'running',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        progress: {
          currentStep: 0,
          totalSteps: job.workflow.steps.length,
          message: 'Starting workflow...'
        }
      });

      const stepResults = {};

      // Execute each workflow step
      for (let i = 0; i < job.workflow.steps.length; i++) {
        const step = job.workflow.steps[i];

        console.log(`Executing step ${i + 1}: ${step.name}`);

        // Update progress
        await snap.ref.update({
          progress: {
            currentStep: i + 1,
            totalSteps: job.workflow.steps.length,
            message: `${step.name}...`
          }
        });

        // Create agent for this step
        const agentData = {
          userId: job.userId,
          type: step.agentType,
          task: step.task,
          status: 'working',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          conversationHistory: [],
          searchHistory: [],
          jobId: jobId,
          workflowStepIndex: i
        };

        const agentRef = await db.collection('agents').add(agentData);

        // Build context from previous steps and include files
        const context = {
          files: job.workflow.files || [], // Include files from workflow
          previousResults: step.dependsOn
            ? step.dependsOn.reduce((acc, depId) => {
                acc[depId] = stepResults[depId];
                return acc;
              }, {})
            : {}
        };

        // Execute agent task
        try {
          const result = await executeAgentTask(
            agentRef.id,
            agentData,
            step.task,
            context
          );

          stepResults[`step-${i}`] = result.response;

          // Update agent status
          await agentRef.update({
            status: 'completed',
            results: result.response,
            searchHistory: result.searchResults || [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Update workflow step in job
          const updatedSteps = [...job.workflow.steps];
          updatedSteps[i] = {
            ...updatedSteps[i],
            status: 'completed',
            result: result.response,
            agentId: agentRef.id,
            completedAt: new Date().toISOString()
          };

          await snap.ref.update({
            'workflow.steps': updatedSteps
          });

        } catch (error) {
          console.error(`Step ${i + 1} failed:`, error);

          // Mark step as failed
          const updatedSteps = [...job.workflow.steps];
          updatedSteps[i] = {
            ...updatedSteps[i],
            status: 'failed',
            error: error.message
          };

          await snap.ref.update({
            'workflow.steps': updatedSteps,
            status: 'failed',
            error: `Failed at step ${i + 1}: ${error.message}`,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          return null;
        }
      }

      // Create final document
      const finalStep = job.workflow.steps[job.workflow.steps.length - 1];
      const finalResult = stepResults[`step-${job.workflow.steps.length - 1}`];

      await db.collection('documents').add({
        userId: job.userId,
        title: job.workflow.documentTitle || `Workflow Result - ${new Date().toLocaleDateString()}`,
        content: finalResult,
        type: 'report',
        createdBy: finalStep.agentId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        jobId: jobId,
        version: 1,
        tags: ['workflow', job.workflow.type || 'general']
      });

      // Mark job as completed
      await snap.ref.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        results: stepResults,
        progress: {
          currentStep: job.workflow.steps.length,
          totalSteps: job.workflow.steps.length,
          message: 'Workflow completed successfully!'
        }
      });

      console.log(`Workflow job ${jobId} completed successfully`);

      return null;

    } catch (error) {
      console.error(`Workflow job ${jobId} failed:`, error);

      await snap.ref.update({
        status: 'failed',
        error: error.message,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return null;
    }
  });

/**
 * Execute an agent task with Claude API
 */
async function executeAgentTask(agentId, agentData, message, context = {}) {
  const claudeApiKey = functions.config().claude?.api_key;

  if (!claudeApiKey) {
    throw new Error('Claude API key not configured in Firebase Functions');
  }

  // Enhanced message with context
  let enhancedMessage = message;
  if (Object.keys(context).length > 0) {
    enhancedMessage = `Context from previous steps:\n${JSON.stringify(context, null, 2)}\n\nYour task:\n${message}`;
  }

  // Get system prompt based on agent type
  const systemPrompt = getSystemPrompt(agentData.type);

  // First call to Claude
  let response = await callClaude(claudeApiKey, enhancedMessage, systemPrompt, agentData.conversationHistory);

  // Check for search requests
  const searchRequests = extractSearchRequests(response);
  const searchResults = [];

  if (searchRequests.length > 0) {
    const searchApiKey = functions.config().tavily?.api_key;

    if (searchApiKey) {
      console.log(`Agent ${agentData.type} requested ${searchRequests.length} searches`);

      // Perform searches
      for (const query of searchRequests) {
        try {
          const result = await performWebSearch(searchApiKey, query);
          searchResults.push(result);
        } catch (error) {
          console.error('Search failed:', error);
          searchResults.push({ query, error: error.message, results: [] });
        }
      }

      // Send search results back to agent
      let searchResultsText = '\n\n=== WEB SEARCH RESULTS ===\n\n';
      searchResults.forEach(sr => {
        searchResultsText += formatSearchResults(sr);
        searchResultsText += '\n---\n\n';
      });

      const followUpMessage = `Here are the search results:\n${searchResultsText}\n\nComplete your task using this information.`;

      response = await callClaude(
        claudeApiKey,
        followUpMessage,
        systemPrompt,
        [
          ...agentData.conversationHistory,
          { role: 'user', content: enhancedMessage },
          { role: 'assistant', content: response }
        ]
      );
    }
  }

  return { response, searchResults };
}

/**
 * Call Claude API
 */
async function callClaude(apiKey, message, systemPrompt, history = []) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: message }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    }
  );

  return response.data.content[0].text;
}

/**
 * Perform web search using Tavily
 */
async function performWebSearch(apiKey, query) {
  const response = await axios.post(
    'https://api.tavily.com/search',
    {
      api_key: apiKey,
      query: query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true
    }
  );

  return {
    query: query,
    results: response.data.results.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score
    })),
    answer: response.data.answer
  };
}

/**
 * Extract search requests from text
 */
function extractSearchRequests(text) {
  const searchPattern = /SEARCH:\s*(.+?)(?:\n|$)/gi;
  const matches = [];
  let match;

  while ((match = searchPattern.exec(text)) !== null) {
    matches.push(match[1].trim());
  }

  return matches;
}

/**
 * Format search results for agent
 */
function formatSearchResults(searchResults) {
  if (!searchResults.results || searchResults.results.length === 0) {
    return 'No results found.';
  }

  let formatted = `Search: "${searchResults.query}"\n`;
  if (searchResults.answer) {
    formatted += `Answer: ${searchResults.answer}\n\n`;
  }

  searchResults.results.forEach((result, index) => {
    formatted += `[${index + 1}] ${result.title}\n`;
    formatted += `    ${result.snippet}\n`;
    formatted += `    ${result.url}\n\n`;
  });

  return formatted;
}

/**
 * Format files for agent (Cloud Functions version)
 */
function formatFilesForAgent(files) {
  if (!files || files.length === 0) {
    return '';
  }

  let formatted = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  formatted += `📎 ATTACHED FILES (${files.length})\n`;
  formatted += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  files.forEach((file, index) => {
    formatted += `\n[FILE ${index + 1}]\n`;
    formatted += `File Name: ${file.fileName}\n`;
    formatted += `Type: ${file.fileType}\n`;

    if (file.textContent) {
      formatted += `\nContent:\n${file.textContent}\n`;
    } else {
      formatted += `\n[Note: This is a ${file.category} file.]\n`;
      formatted += `Download URL: ${file.downloadURL}\n`;
    }

    formatted += '\n=== END FILE ===\n';
  });

  formatted += '\nPlease use the information from these files in your analysis.\n';

  return formatted;
}

/**
 * Get system prompt for agent type
 */
function getSystemPrompt(agentType) {
  const prompts = {
    coordinator: 'You are the Coordination Agent...',
    researcher: 'You are a Research Agent with web search capabilities...',
    writer: 'You are a Writer Agent...',
    editor: 'You are an Editor Agent...',
    analyst: 'You are an Analyst Agent with calculation and web search capabilities...'
  };

  return prompts[agentType] || prompts.coordinator;
}

/**
 * HTTP Function: Trigger Workflow
 * Called from frontend to start a background workflow
 */
exports.triggerWorkflow = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { workflowType, params, message, files = [] } = data;
  const userId = context.auth.uid;

  console.log(`Triggering workflow for user ${userId}: ${workflowType}`);

  // Create job document
  const jobData = {
    userId: userId,
    type: 'workflow',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    workflow: {
      type: workflowType,
      params: params,
      originalMessage: message,
      steps: data.steps,
      documentTitle: data.documentTitle,
      files: files // Store file metadata with job
    },
    progress: {
      currentStep: 0,
      totalSteps: data.steps.length,
      message: 'Queued...'
    }
  };

  const jobRef = await db.collection('jobs').add(jobData);

  return {
    jobId: jobRef.id,
    message: 'Workflow started in background',
    estimatedTime: `${data.steps.length * 2}-${data.steps.length * 4} minutes`
  };
});

/**
 * HTTP Function: Get Job Status
 */
exports.getJobStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId } = data;

  const jobDoc = await db.collection('jobs').doc(jobId).get();

  if (!jobDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Job not found');
  }

  const job = jobDoc.data();

  // Verify ownership
  if (job.userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Access denied');
  }

  return {
    jobId: jobId,
    status: job.status,
    progress: job.progress,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt
  };
});
