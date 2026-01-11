import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { uploadSession } from '@/services/api';

export function UploadPage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setError(null);

      try {
        const result = await uploadSession(file);
        navigate(`/session/${result.session_id}?uploaded=true`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [navigate]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.jsonl'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Upload Session Log
      </h1>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Upload a Claude Code session log file (.jsonl) to view and analyze it.
      </p>

      {error ? (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : null}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-indigo-600" />
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              Drop the file here
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-900 dark:text-white font-medium">
              Drag & drop a .jsonl file
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              or click to select
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Session logs are in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">~/.claude/projects/</code>
      </p>
    </div>
  );
}
