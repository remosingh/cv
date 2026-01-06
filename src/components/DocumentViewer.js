import React, { useState, useEffect } from 'react';
import { getUserDocuments, downloadDocument, deleteDocument } from '../services/documentService';
import './DocumentViewer.css';

export default function DocumentViewer({ userId, onRefresh }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [userId, onRefresh]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const docs = await getUserDocuments(userId);
      // Sort by most recent first
      docs.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(doc) {
    if (window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      try {
        await deleteDocument(doc.firestoreId);
        setDocuments(documents.filter(d => d.firestoreId !== doc.firestoreId));
        if (selectedDoc?.firestoreId === doc.firestoreId) {
          setSelectedDoc(null);
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document');
      }
    }
  }

  function handleDownload(doc) {
    downloadDocument(doc);
  }

  return (
    <div className="document-viewer">
      <div className="document-sidebar">
        <div className="sidebar-header">
          <h3>Documents</h3>
          <button onClick={loadDocuments} className="refresh-btn" disabled={loading}>
            {loading ? '...' : '↻'}
          </button>
        </div>

        <div className="document-list">
          {documents.length === 0 ? (
            <div className="empty-documents">
              <p>No documents yet</p>
              <small>Ask an agent to create one!</small>
            </div>
          ) : (
            documents.map(doc => (
              <div
                key={doc.firestoreId}
                className={`document-item ${selectedDoc?.firestoreId === doc.firestoreId ? 'active' : ''}`}
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="doc-icon">📄</div>
                <div className="doc-info">
                  <div className="doc-title">{doc.title}</div>
                  <div className="doc-meta">
                    <span className="doc-type">{doc.type}</span>
                    <span className="doc-date">
                      {doc.updatedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="document-content">
        {selectedDoc ? (
          <>
            <div className="content-header">
              <div>
                <h2>{selectedDoc.title}</h2>
                <div className="content-meta">
                  <span className="badge">{selectedDoc.type}</span>
                  <span>Version {selectedDoc.version}</span>
                  <span>
                    Updated: {selectedDoc.updatedAt?.toDate?.()?.toLocaleString() || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="content-actions">
                <button onClick={() => handleDownload(selectedDoc)} className="action-btn">
                  Download
                </button>
                <button
                  onClick={() => handleDelete(selectedDoc)}
                  className="action-btn delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="content-body">
              <pre>{selectedDoc.content}</pre>
            </div>
          </>
        ) : (
          <div className="no-selection">
            <p>Select a document to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
