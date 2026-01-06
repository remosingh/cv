import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToUserJobs,
  getActiveJobsCount,
  formatJobDuration,
  getJobStatusIcon,
  getJobStatusColor
} from '../services/jobService';
import './JobMonitor.css';

export default function JobMonitor({ onJobComplete }) {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUserJobs(currentUser.uid, (updatedJobs) => {
      setJobs(updatedJobs);

      // Notify parent of completed jobs
      updatedJobs.forEach(job => {
        if (job.status === 'completed' && onJobComplete) {
          onJobComplete(job);
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, onJobComplete]);

  const activeCount = getActiveJobsCount(jobs);
  const recentJobs = jobs.slice(0, 5);

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="job-monitor">
      <button
        className={`job-monitor-toggle ${activeCount > 0 ? 'active' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="job-icon">⚙️</span>
        <span className="job-count">{activeCount}</span>
        <span className="job-label">
          {activeCount > 0 ? 'Active Jobs' : 'Job History'}
        </span>
      </button>

      {expanded && (
        <div className="job-monitor-panel">
          <div className="job-panel-header">
            <h3>Background Jobs</h3>
            <button onClick={() => setExpanded(false)} className="close-btn">×</button>
          </div>

          <div className="job-list">
            {recentJobs.map(job => (
              <div
                key={job.id}
                className={`job-item ${job.status} ${selectedJob?.id === job.id ? 'selected' : ''}`}
                onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
              >
                <div className="job-item-header">
                  <span className="job-status-icon" style={{ color: getJobStatusColor(job.status) }}>
                    {getJobStatusIcon(job.status)}
                  </span>
                  <span className="job-title">
                    {job.workflow?.type || 'Task'} Workflow
                  </span>
                  <span className="job-time">
                    {formatJobDuration(job)}
                  </span>
                </div>

                {job.status === 'running' && job.progress && (
                  <div className="job-progress">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${(job.progress.currentStep / job.progress.totalSteps) * 100}%`
                        }}
                      />
                    </div>
                    <div className="progress-text">
                      Step {job.progress.currentStep} of {job.progress.totalSteps}: {job.progress.message}
                    </div>
                  </div>
                )}

                {selectedJob?.id === job.id && (
                  <div className="job-details">
                    <div className="job-detail-row">
                      <strong>Status:</strong> {job.status}
                    </div>
                    <div className="job-detail-row">
                      <strong>Started:</strong> {job.createdAt?.toLocaleString()}
                    </div>
                    {job.completedAt && (
                      <div className="job-detail-row">
                        <strong>Completed:</strong> {job.completedAt.toLocaleString()}
                      </div>
                    )}
                    {job.error && (
                      <div className="job-detail-row error">
                        <strong>Error:</strong> {job.error}
                      </div>
                    )}
                    {job.workflow?.steps && (
                      <div className="job-steps">
                        <strong>Steps:</strong>
                        <ul>
                          {job.workflow.steps.map((step, index) => (
                            <li key={index} className={step.status || 'pending'}>
                              <span className="step-icon">
                                {step.status === 'completed' ? '✓' :
                                 step.status === 'failed' ? '✗' :
                                 index < (job.progress?.currentStep || 0) ? '⏳' : '○'}
                              </span>
                              {step.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {jobs.length > 5 && (
            <div className="job-panel-footer">
              Showing {recentJobs.length} of {jobs.length} jobs
            </div>
          )}
        </div>
      )}
    </div>
  );
}
