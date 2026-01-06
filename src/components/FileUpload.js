import React, { useState, useRef } from 'react';
import { uploadFile, validateFiles, formatFileSize, getFileIcon, deleteFile } from '../services/fileService';
import './FileUpload.css';

export default function FileUpload({ userId, taskId, onFilesUploaded, existingFiles = [] }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState(existingFiles);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handleFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError('');

    // Validate files
    const validation = validateFiles(files);
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = validation.validFiles.map(file =>
        uploadFile(file, userId, taskId)
      );

      const uploadedFileMetadata = await Promise.all(uploadPromises);

      const newFiles = [...uploadedFiles, ...uploadedFileMetadata];
      setUploadedFiles(newFiles);

      // Notify parent component
      if (onFilesUploaded) {
        onFilesUploaded(newFiles);
      }

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveFile(file) {
    if (!window.confirm(`Remove ${file.fileName}?`)) return;

    try {
      await deleteFile(file.fileId, file.storagePath);

      const newFiles = uploadedFiles.filter(f => f.fileId !== file.fileId);
      setUploadedFiles(newFiles);

      if (onFilesUploaded) {
        onFilesUploaded(newFiles);
      }

    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Delete failed');
    }
  }

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="file-upload-container">
      <div className="file-upload-actions">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          multiple
          accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.csv,.json,.png,.jpg,.jpeg,.md"
          style={{ display: 'none' }}
          disabled={uploading}
        />

        <button
          onClick={handleBrowseClick}
          disabled={uploading}
          className="btn-upload"
          title="Attach files for agents to analyze"
        >
          📎 {uploading ? 'Uploading...' : 'Attach Files'}
        </button>

        {uploadedFiles.length > 0 && (
          <span className="file-count">
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} attached
          </span>
        )}
      </div>

      {error && (
        <div className="file-upload-error">
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-list">
          {uploadedFiles.map((file) => (
            <div key={file.fileId} className="uploaded-file-item">
              <span className="file-icon">{getFileIcon(file.category)}</span>
              <div className="file-info">
                <div className="file-name">{file.fileName}</div>
                <div className="file-meta">
                  {formatFileSize(file.fileSize)}
                  {file.isProcessed && <span className="processed-badge">✓ Ready</span>}
                </div>
              </div>
              <button
                onClick={() => handleRemoveFile(file)}
                className="btn-remove-file"
                title="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="file-upload-hint">
        Supported: PDF, Word, Excel, CSV, Text, Images, JSON (max 20MB)
      </div>
    </div>
  );
}
