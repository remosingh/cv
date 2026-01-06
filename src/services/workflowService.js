import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

/**
 * Workflow Service - Manages complex multi-step tasks
 */

export const WORKFLOW_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Create a new workflow for a complex task
 * @param {string} userId - User ID
 * @param {string} taskDescription - Original task from user
 * @param {Array} steps - Array of workflow steps
 * @returns {Promise<Object>} - Created workflow
 */
export async function createWorkflow(userId, taskDescription, steps) {
  const workflowData = {
    userId,
    taskDescription,
    steps: steps.map((step, index) => ({
      id: `step-${index}`,
      ...step,
      status: WORKFLOW_STATUS.PENDING,
      result: null,
      agentId: null
    })),
    status: WORKFLOW_STATUS.PENDING,
    currentStepIndex: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    results: {}
  };

  const docRef = await addDoc(collection(db, 'workflows'), workflowData);
  return { ...workflowData, firestoreId: docRef.id };
}

/**
 * Update a workflow step
 * @param {string} workflowId - Workflow Firestore ID
 * @param {number} stepIndex - Step index to update
 * @param {Object} updates - Updates to apply
 */
export async function updateWorkflowStep(workflowId, stepIndex, updates) {
  const workflowRef = doc(db, 'workflows', workflowId);
  const workflowDoc = await getDocs(query(collection(db, 'workflows'), where('__name__', '==', workflowId)));

  if (workflowDoc.empty) return;

  const workflow = workflowDoc.docs[0].data();
  const steps = [...workflow.steps];
  steps[stepIndex] = { ...steps[stepIndex], ...updates };

  await updateDoc(workflowRef, {
    steps,
    updatedAt: serverTimestamp()
  });
}

/**
 * Mark workflow as completed
 * @param {string} workflowId - Workflow Firestore ID
 * @param {Object} finalResults - Final workflow results
 */
export async function completeWorkflow(workflowId, finalResults) {
  const workflowRef = doc(db, 'workflows', workflowId);

  await updateDoc(workflowRef, {
    status: WORKFLOW_STATUS.COMPLETED,
    results: finalResults,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * Get workflows for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - User workflows
 */
export async function getUserWorkflows(userId) {
  const q = query(collection(db, 'workflows'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    firestoreId: doc.id,
    ...doc.data()
  }));
}

/**
 * Decompose a complex task into workflow steps
 * This is a template for common business case workflows
 * @param {string} taskType - Type of task
 * @param {Object} params - Task parameters
 * @returns {Array} - Workflow steps
 */
export function decomposeTask(taskType, params = {}) {
  const { location, industry, constraints } = params;

  // Business case workflow
  if (taskType === 'business-case') {
    return [
      {
        name: 'Market Research',
        agentType: 'researcher',
        description: `Research ${industry || 'business opportunities'} in ${location || 'the target location'}`,
        task: `Conduct comprehensive market research on ${industry || 'high cash flow businesses'} in ${location || 'the specified location'}. Focus on:
        - Current market size and growth trends
        - Key competitors and market share
        - Customer demographics and demand
        - Regulatory environment
        - Entry barriers and opportunities

        Use web search to find current 2025 data.`,
        requiresSearch: true,
        expectedOutputs: ['market_size', 'trends', 'competitors', 'demand']
      },
      {
        name: 'Financial Analysis',
        agentType: 'analyst',
        description: 'Analyze financial viability and projections',
        task: `Based on the market research, analyze the financial viability:
        - Startup costs breakdown
        - Revenue projections (monthly for first 12 months)
        - Operating expenses
        - Cash flow analysis
        - Break-even analysis
        - ROI calculations
        - Payback period calculation

        Ensure payback period is ${constraints?.paybackPeriod || '12 months'} or less.`,
        dependsOn: ['step-0'],
        expectedOutputs: ['startup_costs', 'revenue_projections', 'cash_flow', 'roi', 'payback_period']
      },
      {
        name: 'Business Strategy',
        agentType: 'analyst',
        description: 'Develop business strategy and implementation plan',
        task: `Create a comprehensive business strategy including:
        - Value proposition
        - Target customer segments
        - Marketing and sales strategy
        - Operations plan
        - Risk analysis and mitigation
        - Key milestones and timeline`,
        dependsOn: ['step-0', 'step-1'],
        expectedOutputs: ['strategy', 'risks', 'milestones']
      },
      {
        name: 'Draft Business Case',
        agentType: 'writer',
        description: 'Write comprehensive business case document',
        task: `Draft a professional, investor-ready business case document including:

        Executive Summary
        - Business opportunity overview
        - Key financial highlights
        - Investment ask and returns

        Market Analysis (from research)
        Financial Projections (from analysis)
        Business Strategy (from strategy)
        Risk Assessment
        Implementation Timeline

        Make it compelling, data-driven, and professional.`,
        dependsOn: ['step-0', 'step-1', 'step-2'],
        expectedOutputs: ['business_case_draft']
      },
      {
        name: 'Review and Polish',
        agentType: 'editor',
        description: 'Review and refine the business case',
        task: `Review the business case document for:
        - Professional language and tone
        - Clarity and coherence
        - Data accuracy and consistency
        - Grammar and formatting
        - Investor appeal

        Provide the final, polished version ready for investors.`,
        dependsOn: ['step-3'],
        expectedOutputs: ['final_business_case']
      }
    ];
  }

  // Generic research workflow
  if (taskType === 'research') {
    return [
      {
        name: 'Initial Research',
        agentType: 'researcher',
        description: 'Conduct initial research',
        task: params.task || 'Research the topic',
        requiresSearch: true,
        expectedOutputs: ['research_findings']
      },
      {
        name: 'Analysis',
        agentType: 'analyst',
        description: 'Analyze research findings',
        task: 'Analyze the research findings and provide insights',
        dependsOn: ['step-0'],
        expectedOutputs: ['analysis']
      },
      {
        name: 'Report Writing',
        agentType: 'writer',
        description: 'Write research report',
        task: 'Create a comprehensive report based on the research and analysis',
        dependsOn: ['step-0', 'step-1'],
        expectedOutputs: ['report']
      }
    ];
  }

  // Default single-step workflow
  return [
    {
      name: 'Execute Task',
      agentType: params.agentType || 'coordinator',
      description: params.description || 'Execute the task',
      task: params.task || 'Complete the requested task',
      expectedOutputs: ['result']
    }
  ];
}

/**
 * Determine workflow type from user message
 * @param {string} message - User's message
 * @returns {Object} - { type, params }
 */
export function detectWorkflowType(message) {
  const lowerMessage = message.toLowerCase();

  // Business case detection
  if (
    (lowerMessage.includes('business') && lowerMessage.includes('case')) ||
    (lowerMessage.includes('investor') && (lowerMessage.includes('report') || lowerMessage.includes('pitch'))) ||
    (lowerMessage.includes('financial') && lowerMessage.includes('analysis'))
  ) {
    // Extract parameters
    const location = extractLocation(message);
    const industry = extractIndustry(message);
    const paybackPeriod = extractPaybackPeriod(message);

    return {
      type: 'business-case',
      params: {
        location,
        industry,
        constraints: { paybackPeriod }
      }
    };
  }

  // Research workflow detection
  if (lowerMessage.includes('research') || lowerMessage.includes('investigate') || lowerMessage.includes('analyze')) {
    return {
      type: 'research',
      params: { task: message }
    };
  }

  // Default
  return {
    type: 'simple',
    params: { task: message }
  };
}

/**
 * Extract location from message
 */
function extractLocation(message) {
  // Simple regex for common Canadian cities
  const cityMatch = message.match(/\b(Edmonton|Calgary|Toronto|Vancouver|Montreal|Ottawa|Winnipeg|Quebec|Hamilton|Victoria)\b/i);
  if (cityMatch) {
    return cityMatch[1];
  }
  return null;
}

/**
 * Extract industry from message
 */
function extractIndustry(message) {
  const lowerMessage = message.toLowerCase();

  // Common industries
  const industries = [
    'restaurant', 'food service', 'retail', 'e-commerce',
    'construction', 'real estate', 'technology', 'healthcare',
    'consulting', 'manufacturing', 'hospitality', 'education'
  ];

  for (const industry of industries) {
    if (lowerMessage.includes(industry)) {
      return industry;
    }
  }

  return null;
}

/**
 * Extract payback period from message
 */
function extractPaybackPeriod(message) {
  const match = message.match(/(\d+)\s*(month|year)/i);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    return `${value} ${unit}${value > 1 ? 's' : ''}`;
  }
  return '12 months'; // Default
}
