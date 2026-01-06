import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';
import './TaskInterface.css';

export default function TaskInterface({
  onSendTask,
  messages,
  loading,
  selectedAgent
}) {
  const { currentUser } = useAuth();
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendTask(input, attachedFiles);
      setInput('');
      setAttachedFiles([]); // Clear attached files after sending
    }
  };

  const handleFilesChange = (files) => {
    setAttachedFiles(files);
  };

  return (
    <div className="task-interface">
      <div className="task-header">
        <h2>
          {selectedAgent
            ? `${selectedAgent.type.charAt(0).toUpperCase() + selectedAgent.type.slice(1)} Agent`
            : 'Coordination Office'
          }
        </h2>
        {selectedAgent && selectedAgent.type !== 'coordinator' && (
          <p className="agent-task">{selectedAgent.task}</p>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>Welcome to Agentic City!</h3>
            <p>Your AI agents are ready to help. Send a task to get started.</p>
            <div className="example-tasks">
              <p><strong>Try asking:</strong></p>
              <ul>
                <li>"Research the history of artificial intelligence"</li>
                <li>"Write a formal letter of recommendation"</li>
                <li>"Analyze the pros and cons of remote work"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-header">
                <span className="message-sender">
                  {msg.role === 'user' ? 'You' : msg.agentType || 'Coordinator'}
                </span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div className="message-header">
              <span className="message-sender">Coordinator</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <FileUpload
            userId={currentUser?.uid}
            onFilesUploaded={handleFilesChange}
            existingFiles={attachedFiles}
          />
          <div className="input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your task or question..."
              disabled={loading}
              className="task-input"
            />
            <button type="submit" disabled={loading || !input.trim()} className="send-button">
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
