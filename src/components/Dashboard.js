import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CityView from './CityView';
import TaskInterface from './TaskInterface';
import DocumentViewer from './DocumentViewer';
import JobMonitor from './JobMonitor';
import { coordinateTask, getUserAgents, executeAgentTask } from '../services/agentService';
import { createDocument } from '../services/documentService';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('city'); // 'city' or 'documents'
  const [documentRefreshKey, setDocumentRefreshKey] = useState(0);

  useEffect(() => {
    loadAgents();
  }, [currentUser]);

  async function loadAgents() {
    try {
      const userAgents = await getUserAgents(currentUser.uid);
      setAgents(userAgents);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  }

  async function handleSendTask(taskText, files = []) {
    const userMessage = {
      role: 'user',
      content: taskText,
      files: files,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      if (selectedAgent && selectedAgent.type !== 'coordinator') {
        // Send to specific agent with file context
        const response = await executeAgentTask(selectedAgent, taskText, { files });

        const agentMessage = {
          role: 'assistant',
          content: response,
          agentType: selectedAgent.type,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, agentMessage]);
      } else {
        // Send to coordinator with files
        const result = await coordinateTask(currentUser.uid, taskText, files);

        const coordinatorMessage = {
          role: 'assistant',
          content: result.coordinatorResponse,
          agentType: 'coordinator',
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, coordinatorMessage]);

        // Reload agents in case new ones were spawned
        await loadAgents();

        // Check if coordinator created a document
        // In a full implementation, you'd parse the coordinator's response
        // to detect if it created a document and handle accordingly
        setDocumentRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error executing task:', error);

      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Please check your Claude API key configuration.`,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleAgentClick(agentData) {
    const agent = agents.find(a => a.id === agentData.id);
    if (agent) {
      setSelectedAgent(agent);
      // Load agent's conversation history if needed
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  function handleJobComplete(job) {
    // Reload documents when a job completes
    setDocumentRefreshKey(prev => prev + 1);

    // Reload agents
    loadAgents();

    // Add completion message to chat
    const completionMessage = {
      role: 'assistant',
      content: `✅ Background workflow completed!\n\n${job.workflow?.type || 'Task'} workflow finished successfully. Check the Documents tab for your final deliverable.`,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, completionMessage]);
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Agentic City</h1>
          <span className="user-email">{currentUser.email}</span>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-btn ${activeTab === 'city' ? 'active' : ''}`}
            onClick={() => setActiveTab('city')}
          >
            City View
          </button>
          <button
            className={`nav-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
        </nav>

        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <div className="left-panel">
          {activeTab === 'city' ? (
            <CityView
              userId={currentUser.uid}
              agents={agents}
              onAgentClick={handleAgentClick}
            />
          ) : (
            <DocumentViewer
              userId={currentUser.uid}
              onRefresh={documentRefreshKey}
            />
          )}
        </div>

        <div className="right-panel">
          <TaskInterface
            onSendTask={handleSendTask}
            messages={messages}
            loading={loading}
            selectedAgent={selectedAgent}
          />
        </div>
      </div>

      <JobMonitor onJobComplete={handleJobComplete} />
    </div>
  );
}
