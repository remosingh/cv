import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

/**
 * Document Types
 */
export const DOCUMENT_TYPES = {
  LETTER: 'letter',
  REPORT: 'report',
  ARTICLE: 'article',
  NOTE: 'note',
  MEMO: 'memo'
};

/**
 * Create a new document
 * @param {string} userId - The user ID
 * @param {string} title - Document title
 * @param {string} content - Document content
 * @param {string} type - Document type
 * @param {string} createdBy - Agent ID that created the document
 * @returns {Promise<Object>} - The created document
 */
export async function createDocument(userId, title, content = '', type = DOCUMENT_TYPES.NOTE, createdBy = null) {
  const documentData = {
    id: uuidv4(),
    userId,
    title,
    content,
    type,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: 1,
    tags: []
  };

  const docRef = await addDoc(collection(db, 'documents'), documentData);
  return { ...documentData, firestoreId: docRef.id };
}

/**
 * Update an existing document
 * @param {string} firestoreId - The Firestore document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateDocument(firestoreId, updates) {
  const docRef = doc(db, 'documents', firestoreId);

  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    version: (updates.version || 1) + 1
  });
}

/**
 * Get all documents for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of documents
 */
export async function getUserDocuments(userId) {
  const q = query(collection(db, 'documents'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    firestoreId: doc.id,
    ...doc.data()
  }));
}

/**
 * Delete a document
 * @param {string} firestoreId - The Firestore document ID
 * @returns {Promise<void>}
 */
export async function deleteDocument(firestoreId) {
  await deleteDoc(doc(db, 'documents', firestoreId));
}

/**
 * Export document as plain text
 * @param {Object} document - The document object
 * @returns {string} - Formatted text
 */
export function exportAsText(document) {
  return `
${document.title}
${'='.repeat(document.title.length)}

${document.content}

---
Type: ${document.type}
Created: ${document.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}
Last Updated: ${document.updatedAt?.toDate?.()?.toLocaleString() || 'Unknown'}
Version: ${document.version}
`.trim();
}

/**
 * Download document as a text file
 * @param {Object} document - The document object
 */
export function downloadDocument(document) {
  const text = exportAsText(document);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
