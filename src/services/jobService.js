import { db } from './firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Job Service - Manages background workflow execution
 */

const functions = getFunctions();

/**
 * Trigger a background workflow
 * @param {string} workflowType - Type of workflow
 * @param {Object} params - Workflow parameters
 * @param {string} message - Original user message
 * @param {Array} steps - Workflow steps
 * @param {string} documentTitle - Title for final document
 * @returns {Promise<Object>} - Job info
 */
export async function triggerBackgroundWorkflow(workflowType, params, message, steps, documentTitle) {
  const triggerWorkflow = httpsCallable(functions, 'triggerWorkflow');

  try {
    const result = await triggerWorkflow({
      workflowType,
      params,
      message,
      steps,
      documentTitle
    });

    return result.data;
  } catch (error) {
    console.error('Failed to trigger workflow:', error);
    throw new Error(`Failed to start background workflow: ${error.message}`);
  }
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} - Job status
 */
export async function getJobStatus(jobId) {
  const getStatus = httpsCallable(functions, 'getJobStatus');

  try {
    const result = await getStatus({ jobId });
    return result.data;
  } catch (error) {
    console.error('Failed to get job status:', error);
    throw error;
  }
}

/**
 * Subscribe to job updates in real-time
 * @param {string} userId - User ID
 * @param {Function} callback - Called when jobs update
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToUserJobs(userId, callback) {
  const q = query(
    collection(db, 'jobs'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.(),
      startedAt: doc.data().startedAt?.toDate?.(),
      completedAt: doc.data().completedAt?.toDate?.()
    }));

    // Sort by creation date, newest first
    jobs.sort((a, b) => {
      const timeA = a.createdAt?.getTime() || 0;
      const timeB = b.createdAt?.getTime() || 0;
      return timeB - timeA;
    });

    callback(jobs);
  });
}

/**
 * Subscribe to a specific job's updates
 * @param {string} jobId - Job ID
 * @param {Function} callback - Called when job updates
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToJob(jobId, callback) {
  const jobRef = doc(db, 'jobs', jobId);

  return onSnapshot(jobRef, (doc) => {
    if (doc.exists()) {
      callback({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.(),
        startedAt: doc.data().startedAt?.toDate?.(),
        completedAt: doc.data().completedAt?.toDate?.()
      });
    }
  });
}

/**
 * Get active jobs count
 * @param {Array} jobs - Jobs array
 * @returns {number} - Count of active jobs
 */
export function getActiveJobsCount(jobs) {
  return jobs.filter(job =>
    job.status === 'pending' || job.status === 'running'
  ).length;
}

/**
 * Format job duration
 * @param {Object} job - Job object
 * @returns {string} - Formatted duration
 */
export function formatJobDuration(job) {
  if (!job.completedAt || !job.createdAt) {
    return 'In progress...';
  }

  const duration = job.completedAt.getTime() - job.createdAt.getTime();
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Get job status icon
 * @param {string} status - Job status
 * @returns {string} - Emoji icon
 */
export function getJobStatusIcon(status) {
  const icons = {
    pending: '⏳',
    running: '⚙️',
    completed: '✅',
    failed: '❌'
  };
  return icons[status] || '❓';
}

/**
 * Get job status color
 * @param {string} status - Job status
 * @returns {string} - Color code
 */
export function getJobStatusColor(status) {
  const colors = {
    pending: '#FFA500',
    running: '#4169E1',
    completed: '#28a745',
    failed: '#dc3545'
  };
  return colors[status] || '#999';
}
