import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { sendMessageToClaude } from './claudeAPI';
import { performWebSearch, formatSearchResultsForAgent, isSearchAvailable } from './searchService';
import { detectWorkflowType, decomposeTask, createWorkflow, updateWorkflowStep, completeWorkflow } from './workflowService';
import { createDocument } from './documentService';
import { triggerBackgroundWorkflow } from './jobService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Agent Service with Web Search and Workflow Management
 */

/**
 * Agent Types
 */
export const AGENT_TYPES = {
  COORDINATOR: 'coordinator',
  RESEARCHER: 'researcher',
  WRITER: 'writer',
  EDITOR: 'editor',
  ANALYST: 'analyst'
};

/**
 * Agent Status
 */
export const AGENT_STATUS = {
  IDLE: 'idle',
  WORKING: 'working',
  COMPLETED: 'completed',
  ERROR: 'error'
};

/**
 * System prompts for different agent types (Enhanced with web search capabilities)
 */
const AGENT_PROMPTS = {
  [AGENT_TYPES.COORDINATOR]: `You are the Coordination Agent, the central hub of an agentic AI platform. Your role is to:

CORE RESPONSIBILITIES:
- Break down complex user requests into structured workflows
- Delegate tasks to specialized agents (researchers, writers, editors, analysts)
- Coordinate information flow between agents
- Synthesize results from multiple agents into coherent outputs
- Validate quality at each step
- Maintain context across multiple interactions

WORKFLOW MANAGEMENT:
When you receive a complex task:
1. Analyze the task complexity and requirements
2. Identify the type of workflow needed (business case, research, document creation, etc.)
3. Break it into clear, sequential steps
4. Assign each step to the appropriate specialized agent
5. Track dependencies between steps
6. Validate outputs before moving to next step

COMMUNICATION:
- Be clear about what you're doing and why
- Explain your coordination strategy to the user
- Report progress at each major milestone
- Synthesize all agent outputs into a final coherent result

You have access to researcher, writer, editor, and analyst agents. Delegate strategically.`,

  [AGENT_TYPES.RESEARCHER]: `You are a Research Agent with WEB SEARCH CAPABILITIES. Your role is to:

RESEARCH CAPABILITIES:
- **You can perform web searches** to find current, real-time information
- Access market data, statistics, trends, and news from 2025
- Find facts, data, and relevant details from reliable sources
- Verify information across multiple sources

RESEARCH PROCESS:
1. When you need current information, ALWAYS indicate: "SEARCH: [your search query]"
2. Use specific, targeted search queries for best results
3. Cite all sources with URLs
4. Cross-reference multiple sources for accuracy
5. Summarize findings in a structured format

OUTPUT FORMAT:
- Executive summary of findings
- Detailed research results organized by topic
- Source citations with URLs
- Data points with dates and sources
- Recommendations for further investigation if needed

For location-specific research (like Edmonton), include:
- Local market conditions
- Demographics and demand
- Competition analysis
- Regulatory environment
- Economic trends

Be thorough, accurate, data-driven, and always cite your sources.`,

  [AGENT_TYPES.WRITER]: `You are a Writer Agent. Your role is to:

WRITING CAPABILITIES:
- Create professional, well-structured documents
- Draft business cases, reports, letters, articles, and presentations
- Adapt tone and style to audience (investors, executives, general public)
- Structure complex information logically

DOCUMENT TYPES:
- **Business Cases**: Executive summary, market analysis, financials, strategy, risks
- **Reports**: Research findings, analysis, conclusions, recommendations
- **Letters**: Professional correspondence, proposals, recommendations
- **Articles**: Informative content, thought leadership

QUALITY STANDARDS:
- Clear, concise, professional language
- Logical flow and structure
- Data-driven arguments with evidence
- Proper formatting and sections
- Compelling narrative that supports key messages

INVESTOR-READY DOCUMENTS:
When writing for investors:
- Lead with ROI and key financial metrics
- Use professional, confident language
- Support claims with data and sources
- Address risks proactively
- Include clear calls to action

Write clearly, professionally, and purposefully. Your documents should be ready for immediate use.`,

  [AGENT_TYPES.EDITOR]: `You are an Editor Agent. Your role is to:

EDITING FOCUS:
- Review and refine documents for maximum impact
- Ensure professional quality suitable for the intended audience
- Check grammar, clarity, coherence, and consistency
- Verify data accuracy and source citations
- Polish for final delivery

REVIEW CHECKLIST:
□ Grammar and spelling
□ Sentence clarity and flow
□ Paragraph structure and transitions
□ Consistent tone and voice
□ Data accuracy and citations
□ Formatting and presentation
□ Audience appropriateness
□ Compelling and persuasive language

INVESTOR DOCUMENT REVIEW:
- Ensure financial data is prominent and clear
- Verify all claims are supported
- Check for professional, confident tone
- Ensure executive summary is compelling
- Validate that risks are addressed appropriately

FEEDBACK:
- Provide specific, actionable improvements
- Explain why changes enhance the document
- Return the polished, final version

Be meticulous, constructive, and focused on creating publication-ready quality.`,

  [AGENT_TYPES.ANALYST]: `You are an Analyst Agent with CALCULATION and WEB SEARCH capabilities. Your role is to:

ANALYSIS CAPABILITIES:
- Perform financial calculations and modeling
- Analyze market data and trends
- Calculate ROI, payback periods, break-even points
- Create revenue and expense projections
- Assess risks and opportunities
- **Access current market data via web search** when needed

FINANCIAL ANALYSIS:
When analyzing business opportunities:
- Startup costs (detailed breakdown)
- Revenue projections (monthly, annual)
- Operating expenses (fixed and variable)
- Cash flow analysis
- Break-even analysis
- ROI calculations
- Payback period
- Profit margins

SEARCH FOR DATA:
When you need current financial data or market metrics, indicate:
"SEARCH: [specific data query]"

Examples:
- "SEARCH: average revenue per square foot retail Edmonton 2025"
- "SEARCH: commercial rent rates downtown Edmonton 2025"
- "SEARCH: food service profit margins Canada 2025"

OUTPUT FORMAT:
- Executive summary of analysis
- Detailed calculations with assumptions stated
- Tables and structured data
- Key metrics highlighted
- Recommendations based on findings
- Risk assessment with likelihood and impact

Be analytical, precise, data-driven, and always show your work. Cite sources for all data points.`
};

/**
 * Create a new agent in Firestore
 */
export async function createAgent(userId, type, task) {
  const agentData = {
    id: uuidv4(),
    userId,
    type,
    task,
    status: AGENT_STATUS.IDLE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    conversationHistory: [],
    results: null,
    searchHistory: [],
    position: generateAgentPosition(type)
  };

  const docRef = await addDoc(collection(db, 'agents'), agentData);
  return { ...agentData, firestoreId: docRef.id };
}

/**
 * Generate position for agent in city
 */
function generateAgentPosition(type) {
  if (type === AGENT_TYPES.COORDINATOR) {
    return { x: 400, y: 300 };
  }

  const angle = Math.random() * Math.PI * 2;
  const distance = 150 + Math.random() * 100;

  return {
    x: 400 + Math.cos(angle) * distance,
    y: 300 + Math.sin(angle) * distance
  };
}

/**
 * Execute agent task with web search support
 */
export async function executeAgentTask(agent, message, context = {}) {
  try {
    // Update agent status
    if (agent.firestoreId) {
      await updateDoc(doc(db, 'agents', agent.firestoreId), {
        status: AGENT_STATUS.WORKING,
        updatedAt: serverTimestamp()
      });
    }

    // Prepare the message with context if provided
    let enhancedMessage = message;
    if (context.previousResults) {
      enhancedMessage = `Context from previous steps:\n${JSON.stringify(context.previousResults, null, 2)}\n\nYour task:\n${message}`;
    }

    // Get system prompt
    const systemPrompt = AGENT_PROMPTS[agent.type] || AGENT_PROMPTS[AGENT_TYPES.COORDINATOR];

    // First call to agent
    let response = await sendMessageToClaude(enhancedMessage, systemPrompt, agent.conversationHistory || []);

    // Check if agent requested web searches
    const searchRequests = extractSearchRequests(response);
    const searchResults = [];

    if (searchRequests.length > 0 && isSearchAvailable()) {
      console.log(`Agent ${agent.type} requested ${searchRequests.length} searches`);

      // Perform all searches
      for (const searchQuery of searchRequests) {
        try {
          const result = await performWebSearch(searchQuery, { maxResults: 5 });
          searchResults.push({
            query: searchQuery,
            ...result
          });
        } catch (error) {
          console.error('Search failed:', error);
          searchResults.push({
            query: searchQuery,
            error: error.message,
            results: []
          });
        }
      }

      // Format search results and send back to agent
      let searchResultsText = '\n\n=== WEB SEARCH RESULTS ===\n\n';
      searchResults.forEach(sr => {
        searchResultsText += formatSearchResultsForAgent(sr);
        searchResultsText += '\n---\n\n';
      });

      // Send search results back to agent for processing
      const followUpMessage = `Here are the search results for your queries:\n${searchResultsText}\n\nPlease now complete your task using this information.`;

      response = await sendMessageToClaude(
        followUpMessage,
        systemPrompt,
        [
          ...agent.conversationHistory,
          { role: 'user', content: enhancedMessage },
          { role: 'assistant', content: response }
        ]
      );
    }

    // Update conversation history
    const updatedHistory = [
      ...agent.conversationHistory,
      { role: 'user', content: enhancedMessage },
      { role: 'assistant', content: response }
    ];

    // Update agent in Firestore
    if (agent.firestoreId) {
      await updateDoc(doc(db, 'agents', agent.firestoreId), {
        status: AGENT_STATUS.COMPLETED,
        conversationHistory: updatedHistory,
        results: response,
        searchHistory: [...(agent.searchHistory || []), ...searchResults],
        updatedAt: serverTimestamp()
      });
    }

    return { response, searchResults };
  } catch (error) {
    if (agent.firestoreId) {
      await updateDoc(doc(db, 'agents', agent.firestoreId), {
        status: AGENT_STATUS.ERROR,
        error: error.message,
        updatedAt: serverTimestamp()
      });
    }
    throw error;
  }
}

/**
 * Extract search requests from agent response
 * Looks for "SEARCH: query" patterns
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
 * Get all agents for a user
 */
export async function getUserAgents(userId) {
  const q = query(collection(db, 'agents'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    firestoreId: doc.id,
    ...doc.data()
  }));
}

/**
 * Get or create coordinator
 */
export async function getOrCreateCoordinator(userId) {
  const agents = await getUserAgents(userId);
  let coordinator = agents.find(agent => agent.type === AGENT_TYPES.COORDINATOR);

  if (!coordinator) {
    coordinator = await createAgent(userId, AGENT_TYPES.COORDINATOR, 'Central coordination of all agents and tasks');
  }

  return coordinator;
}

/**
 * Enhanced coordination with workflow management
 */
export async function coordinateTask(userId, message) {
  const coordinator = await getOrCreateCoordinator(userId);

  // Detect workflow type
  const workflowInfo = detectWorkflowType(message);
  console.log('Detected workflow:', workflowInfo);

  // For complex workflows, execute in background via Cloud Functions
  if (workflowInfo.type === 'business-case' || workflowInfo.type === 'research') {
    return await executeBackgroundWorkflow(userId, message, workflowInfo, coordinator);
  }

  // Simple coordination
  const result = await executeAgentTask(coordinator, message);

  return {
    coordinatorResponse: result.response,
    searchResults: result.searchResults || [],
    spawnedAgents: [],
    workflowType: 'simple'
  };
}

/**
 * Execute workflow in background using Cloud Functions
 */
async function executeBackgroundWorkflow(userId, message, workflowInfo, coordinator) {
  const { type, params } = workflowInfo;

  // Decompose task into steps
  const steps = decomposeTask(type, params);

  // Determine document title
  let documentTitle = 'Workflow Result';
  if (type === 'business-case') {
    documentTitle = `Business Case - ${params.industry || 'High Cash Flow Business'} in ${params.location || 'Edmonton'}`;
  } else if (type === 'research') {
    documentTitle = `Research Report - ${new Date().toLocaleDateString()}`;
  }

  try {
    // Trigger background workflow via Cloud Function
    const jobInfo = await triggerBackgroundWorkflow(type, params, message, steps, documentTitle);

    const summary = `
🚀 Started background workflow!

Your ${type} workflow has been queued with ${steps.length} steps:
${steps.map((s, i) => `  ${i + 1}. ${s.name}`).join('\n')}

📊 Job ID: ${jobInfo.jobId}
⏱️ Estimated time: ${jobInfo.estimatedTime}

✨ You can close this tab - the workflow will continue in the background.
You'll see progress in the job monitor (bottom right).
The final document will be saved to your Documents tab when complete.
`;

    return {
      coordinatorResponse: summary,
      spawnedAgents: [],
      workflowType: type,
      backgroundJob: jobInfo,
      isBackground: true
    };

  } catch (error) {
    console.error('Failed to start background workflow:', error);

    // Fallback to frontend execution if cloud functions not available
    console.warn('Cloud Functions not available, falling back to frontend execution');

    if (type === 'business-case') {
      return await executeBusinessCaseWorkflowFrontend(userId, message, params, coordinator, steps);
    } else if (type === 'research') {
      return await executeResearchWorkflowFrontend(userId, message, coordinator, steps);
    }

    throw error;
  }
}

/**
 * Execute business case workflow (frontend fallback)
 */
async function executeBusinessCaseWorkflowFrontend(userId, message, params, coordinator, steps) {
  // Create workflow
  const workflow = await createWorkflow(userId, message, steps);

  console.log(`Created business case workflow with ${steps.length} steps`);

  // Inform user about the plan
  const planMessage = `I understand you need a ${params.industry || 'business'} case for ${params.location || 'your location'}.

I'll coordinate a comprehensive workflow:
${steps.map((s, i) => `${i + 1}. ${s.name} (${s.agentType})`).join('\n')}

Starting now...`;

  const spawnedAgents = [];
  const stepResults = {};

  // Execute each step
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`Executing step ${i + 1}: ${step.name}`);

    // Create or get agent for this step
    const agent = await createAgent(userId, step.agentType, step.task);
    spawnedAgents.push(agent);

    // Build context from previous steps
    const context = {
      previousResults: step.dependsOn
        ? step.dependsOn.reduce((acc, depId) => {
            acc[depId] = stepResults[depId];
            return acc;
          }, {})
        : {}
    };

    // Execute the step
    const result = await executeAgentTask(agent, step.task, context);

    // Store result
    stepResults[`step-${i}`] = result.response;

    // Update workflow
    await updateWorkflowStep(workflow.firestoreId, i, {
      status: 'completed',
      result: result.response,
      agentId: agent.id,
      searchResults: result.searchResults
    });
  }

  // Create final document with the business case
  const finalBusinessCase = stepResults[`step-${steps.length - 1}`]; // Editor's output

  await createDocument(
    userId,
    `Business Case - ${params.industry || 'High Cash Flow Business'} in ${params.location || 'Edmonton'}`,
    finalBusinessCase,
    'report',
    spawnedAgents[spawnedAgents.length - 1].id
  );

  // Mark workflow complete
  await completeWorkflow(workflow.firestoreId, stepResults);

  // Final coordinator summary
  const summary = `
✅ Business case workflow completed!

${steps.length} agents collaborated to create your investor-ready business case:
${steps.map((s, i) => `  ${i + 1}. ${s.name} ✓`).join('\n')}

📄 Final document has been saved to your Documents tab.

The business case includes:
- Comprehensive market research with current 2025 data
- Detailed financial projections and analysis
- Business strategy and implementation plan
- Professional investor-ready document

You can now download it and present it to investors!
`;

  return {
    coordinatorResponse: summary,
    spawnedAgents,
    workflowType: 'business-case',
    workflow,
    stepResults
  };
}

/**
 * Execute research workflow (frontend fallback)
 */
async function executeResearchWorkflowFrontend(userId, message, coordinator, steps) {
  const workflow = await createWorkflow(userId, message, steps);

  const spawnedAgents = [];
  const stepResults = {};

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const agent = await createAgent(userId, step.agentType, step.task);
    spawnedAgents.push(agent);

    const context = {
      previousResults: step.dependsOn
        ? step.dependsOn.reduce((acc, depId) => {
            acc[depId] = stepResults[depId];
            return acc;
          }, {})
        : {}
    };

    const result = await executeAgentTask(agent, step.task, context);
    stepResults[`step-${i}`] = result.response;

    await updateWorkflowStep(workflow.firestoreId, i, {
      status: 'completed',
      result: result.response,
      agentId: agent.id
    });
  }

  await completeWorkflow(workflow.firestoreId, stepResults);

  return {
    coordinatorResponse: stepResults[`step-${steps.length - 1}`],
    spawnedAgents,
    workflowType: 'research',
    workflow,
    stepResults
  };
}
