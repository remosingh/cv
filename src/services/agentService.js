import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { sendMessageToClaude } from './claudeAPI';
import { v4 as uuidv4 } from 'uuid';

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
 * System prompts for different agent types
 */
const AGENT_PROMPTS = {
  [AGENT_TYPES.COORDINATOR]: `You are the Coordination Agent, the central hub of an agentic AI platform. Your role is to:
- Understand user requests and break them down into subtasks
- Delegate tasks to specialized agents (researchers, writers, editors, analysts)
- Coordinate information flow between agents
- Synthesize results from multiple agents into coherent outputs
- Maintain context across multiple interactions
Always be clear, organized, and strategic in your coordination. When you need help, specify which type of agent you need and what their specific task should be.`,

  [AGENT_TYPES.RESEARCHER]: `You are a Research Agent. Your role is to:
- Gather information on specific topics
- Find facts, data, and relevant details
- Summarize findings clearly
- Cite sources when possible
- Report back to the Coordination Agent with structured research results
Be thorough, accurate, and organized in your research.`,

  [AGENT_TYPES.WRITER]: `You are a Writer Agent. Your role is to:
- Create well-written documents based on provided information
- Draft letters, reports, articles, and other text documents
- Maintain appropriate tone and style for the document type
- Structure content logically and clearly
- Report completion back to the Coordination Agent
Write clearly, professionally, and purposefully.`,

  [AGENT_TYPES.EDITOR]: `You are an Editor Agent. Your role is to:
- Review and improve existing documents
- Check for grammar, clarity, and coherence
- Suggest improvements and refinements
- Ensure consistency in tone and style
- Report edits back to the Coordination Agent
Be meticulous, constructive, and quality-focused.`,

  [AGENT_TYPES.ANALYST]: `You are an Analyst Agent. Your role is to:
- Analyze data and information
- Identify patterns, insights, and conclusions
- Provide recommendations based on analysis
- Create structured summaries of findings
- Report analysis back to the Coordination Agent
Be analytical, insightful, and data-driven.`
};

/**
 * Create a new agent in Firestore
 * @param {string} userId - The user ID
 * @param {string} type - Agent type
 * @param {string} task - The task assigned to the agent
 * @returns {Promise<Object>} - The created agent
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
    position: generateAgentPosition(type) // For visual placement in the city
  };

  const docRef = await addDoc(collection(db, 'agents'), agentData);
  return { ...agentData, firestoreId: docRef.id };
}

/**
 * Generate a position for the agent in the isometric city
 * @param {string} type - Agent type
 * @returns {Object} - {x, y} coordinates
 */
function generateAgentPosition(type) {
  // Coordinator is always at the center
  if (type === AGENT_TYPES.COORDINATOR) {
    return { x: 400, y: 300 };
  }

  // Other agents are positioned around the coordinator
  const angle = Math.random() * Math.PI * 2;
  const distance = 150 + Math.random() * 100;

  return {
    x: 400 + Math.cos(angle) * distance,
    y: 300 + Math.sin(angle) * distance
  };
}

/**
 * Execute an agent's task using Claude
 * @param {Object} agent - The agent object
 * @param {string} message - The message/task to process
 * @returns {Promise<string>} - The agent's response
 */
export async function executeAgentTask(agent, message) {
  try {
    // Update agent status to working
    if (agent.firestoreId) {
      await updateDoc(doc(db, 'agents', agent.firestoreId), {
        status: AGENT_STATUS.WORKING,
        updatedAt: serverTimestamp()
      });
    }

    // Get the appropriate system prompt
    const systemPrompt = AGENT_PROMPTS[agent.type] || AGENT_PROMPTS[AGENT_TYPES.COORDINATOR];

    // Send message to Claude
    const response = await sendMessageToClaude(message, systemPrompt, agent.conversationHistory);

    // Update conversation history
    const updatedHistory = [
      ...agent.conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    ];

    // Update agent in Firestore
    if (agent.firestoreId) {
      await updateDoc(doc(db, 'agents', agent.firestoreId), {
        status: AGENT_STATUS.COMPLETED,
        conversationHistory: updatedHistory,
        results: response,
        updatedAt: serverTimestamp()
      });
    }

    return response;
  } catch (error) {
    // Update agent status to error
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
 * Get all agents for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of agents
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
 * Get or create the coordinator agent for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The coordinator agent
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
 * Send a message to the coordinator and handle agent spawning
 * @param {string} userId - The user ID
 * @param {string} message - The user's message
 * @returns {Promise<Object>} - Response with coordinator reply and any spawned agents
 */
export async function coordinateTask(userId, message) {
  const coordinator = await getOrCreateCoordinator(userId);

  // Execute coordinator task
  const response = await executeAgentTask(coordinator, message);

  // TODO: Parse response to determine if new agents need to be spawned
  // For now, return the coordinator's response

  return {
    coordinatorResponse: response,
    spawnedAgents: [] // Will be populated based on coordinator's decision
  };
}
