import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const storage = getStorage();

/**
 * File Service - Handle file uploads and storage
 */

export const SUPPORTED_FILE_TYPES = {
  // Text files
  'text/plain': { ext: '.txt', category: 'text', maxSize: 10 * 1024 * 1024 }, // 10MB
  'text/csv': { ext: '.csv', category: 'text', maxSize: 10 * 1024 * 1024 },
  'text/markdown': { ext: '.md', category: 'text', maxSize: 5 * 1024 * 1024 },

  // Documents
  'application/pdf': { ext: '.pdf', category: 'document', maxSize: 20 * 1024 * 1024 }, // 20MB
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', category: 'document', maxSize: 20 * 1024 * 1024 },
  'application/msword': { ext: '.doc', category: 'document', maxSize: 20 * 1024 * 1024 },

  // Spreadsheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', category: 'spreadsheet', maxSize: 20 * 1024 * 1024 },
  'application/vnd.ms-excel': { ext: '.xls', category: 'spreadsheet', maxSize: 20 * 1024 * 1024 },

  // Images (for OCR/analysis)
  'image/png': { ext: '.png', category: 'image', maxSize: 5 * 1024 * 1024 },
  'image/jpeg': { ext: '.jpg', category: 'image', maxSize: 5 * 1024 * 1024 },
  'image/jpg': { ext: '.jpg', category: 'image', maxSize: 5 * 1024 * 1024 },

  // JSON/Data
  'application/json': { ext: '.json', category: 'data', maxSize: 5 * 1024 * 1024 }
};

/**
 * Upload a file to Firebase Storage
 * @param {File} file - File object from input
 * @param {string} userId - User ID
 * @param {string} taskId - Optional task/job ID to associate with
 * @returns {Promise<Object>} - File metadata
 */
export async function uploadFile(file, userId, taskId = null) {
  // Validate file type
  const fileTypeInfo = SUPPORTED_FILE_TYPES[file.type];
  if (!fileTypeInfo) {
    throw new Error(`Unsupported file type: ${file.type}. Supported types: ${Object.keys(SUPPORTED_FILE_TYPES).join(', ')}`);
  }

  // Validate file size
  if (file.size > fileTypeInfo.maxSize) {
    const maxSizeMB = fileTypeInfo.maxSize / (1024 * 1024);
    throw new Error(`File too large. Maximum size: ${maxSizeMB}MB`);
  }

  // Create unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `users/${userId}/files/${timestamp}_${sanitizedName}`;

  try {
    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Extract text content if possible
    let textContent = null;
    if (fileTypeInfo.category === 'text') {
      textContent = await extractTextContent(file);
    }

    // Save metadata to Firestore
    const metadata = {
      userId,
      taskId,
      fileName: file.name,
      originalName: file.name,
      fileType: file.type,
      fileSize: file.size,
      category: fileTypeInfo.category,
      storagePath,
      downloadURL,
      textContent, // Extracted text for text files
      uploadedAt: serverTimestamp(),
      isProcessed: fileTypeInfo.category === 'text' // Text files are immediately processed
    };

    const docRef = await addDoc(collection(db, 'files'), metadata);

    return {
      fileId: docRef.id,
      ...metadata
    };

  } catch (error) {
    console.error('File upload failed:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Extract text content from text-based files
 * @param {File} file - File object
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsText(file);
  });
}

/**
 * Get files for a task
 * @param {string} taskId - Task/Job ID
 * @returns {Promise<Array>} - Array of file metadata
 */
export async function getTaskFiles(taskId) {
  const q = query(collection(db, 'files'), where('taskId', '==', taskId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    fileId: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate?.()
  }));
}

/**
 * Get all files for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of file metadata
 */
export async function getUserFiles(userId) {
  const q = query(collection(db, 'files'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    fileId: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate?.()
  }));
}

/**
 * Delete a file
 * @param {string} fileId - File ID from Firestore
 * @param {string} storagePath - Path in Firebase Storage
 */
export async function deleteFile(fileId, storagePath) {
  try {
    // Delete from Storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    // Delete metadata from Firestore
    await deleteDoc(doc(db, 'files', fileId));

  } catch (error) {
    console.error('File deletion failed:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Format file content for agent consumption
 * @param {Object} file - File metadata
 * @returns {string} - Formatted file info for Claude
 */
export function formatFileForAgent(file) {
  let formatted = `\n=== ATTACHED FILE ===\n`;
  formatted += `File Name: ${file.fileName}\n`;
  formatted += `Type: ${file.fileType}\n`;
  formatted += `Size: ${formatFileSize(file.fileSize)}\n`;

  if (file.textContent) {
    formatted += `\nContent:\n${file.textContent}\n`;
  } else {
    formatted += `\n[Note: This is a ${file.category} file. Content extraction not available.]\n`;
    formatted += `Download URL: ${file.downloadURL}\n`;
  }

  formatted += `\n=== END FILE ===\n\n`;

  return formatted;
}

/**
 * Format multiple files for agent consumption
 * @param {Array} files - Array of file metadata
 * @returns {string} - Formatted files info
 */
export function formatFilesForAgent(files) {
  if (!files || files.length === 0) {
    return '';
  }

  let formatted = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  formatted += `📎 ATTACHED FILES (${files.length})\n`;
  formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  files.forEach((file, index) => {
    formatted += `\n[FILE ${index + 1}]\n`;
    formatted += formatFileForAgent(file);
  });

  formatted += `\nPlease use the information from these files in your analysis.\n`;

  return formatted;
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Get file icon based on type
 * @param {string} category - File category
 * @returns {string} - Emoji icon
 */
export function getFileIcon(category) {
  const icons = {
    text: '📄',
    document: '📝',
    spreadsheet: '📊',
    image: '🖼️',
    data: '📋'
  };
  return icons[category] || '📎';
}

/**
 * Validate files before upload
 * @param {FileList} files - Files to validate
 * @returns {Object} - Validation result
 */
export function validateFiles(files) {
  const errors = [];
  const validFiles = [];

  Array.from(files).forEach(file => {
    const fileTypeInfo = SUPPORTED_FILE_TYPES[file.type];

    if (!fileTypeInfo) {
      errors.push(`${file.name}: Unsupported file type (${file.type})`);
    } else if (file.size > fileTypeInfo.maxSize) {
      const maxSizeMB = fileTypeInfo.maxSize / (1024 * 1024);
      errors.push(`${file.name}: File too large (max ${maxSizeMB}MB)`);
    } else {
      validFiles.push(file);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    validFiles,
    invalidCount: errors.length
  };
}
