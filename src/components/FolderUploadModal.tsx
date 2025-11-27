import { useState, useRef, useEffect } from 'react';
import { X, Folder, FileText, Image, CheckCircle, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { FileAttachment } from '../types';
import { FileLimitExceededModal } from './FileLimitExceededModal';

interface FolderUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (attachments: FileAttachment[]) => void;
  maxSizePerFileMB?: number; // Optional: max file size in MB
  maxFiles?: number; // Optional: max number of files
}

export function FolderUploadModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  maxSizePerFileMB = 10, 
  maxFiles = 50 
}: FolderUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedAttachments, setProcessedAttachments] = useState<FileAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLimitExceededModalOpen, setIsLimitExceededModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('Selected Folder'); // Default name
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open
      setSelectedFiles([]);
      setProcessedAttachments([]);
      setError(null);
      setIsProcessing(false);
      setIsLimitExceededModalOpen(false);
      setFolderName('Selected Folder');
      // Trigger folder selection
      fileInputRef.current?.click();
    }
  }, [isOpen]);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Extract folder name from first file path (webkitRelativePath)
    const firstFilePath = files[0].webkitRelativePath || files[0].name;
    const extractedFolderName = firstFilePath.split('/')[0] || 'Selected Folder';
    setFolderName(extractedFolderName);

    // Filter out hidden/system files and enforce limits
    const validFiles = files.filter((file) => {
      if (file.name.startsWith('.') || file.name.startsWith('~')) return false;
      if (file.size > maxSizePerFileMB * 1024 * 1024) {
        setError(`File "${file.name}" exceeds ${maxSizePerFileMB}MB limit.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > maxFiles) {
      setIsLimitExceededModalOpen(true);
      return;
    }

    if (validFiles.length === 0) {
      setError('No valid files found in the selected folder.');
      return;
    }

    setSelectedFiles(validFiles);
    setError(null);
    e.target.value = ''; // Reset input for re-selection
  };

  const processFiles = async () => {
    setIsProcessing(true);
    setError(null);
    const attachments: FileAttachment[] = [];

    for (const file of selectedFiles) {
      try {
        const content = await fileToBase64(file);
        attachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          content,
        });
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        setError(`Failed to process "${file.name}".`);
      }
    }

    setProcessedAttachments(attachments);
    setIsProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 content
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleConfirm = () => {
    if (processedAttachments.length === 0) {
      setError('No files processed. Please try again.');
      return;
    }
    onConfirm(processedAttachments);
    onClose();
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={16} className="text-blue-600" />;
    if (type.startsWith('text/') || type.includes('json')) return <FileText size={16} className="text-green-600" />;
    return <FileText size={16} className="text-gray-600" />;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Folder size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upload from Folder</h3>
                <p className="text-sm text-gray-500">Select a folder to attach files</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {selectedFiles.length === 0 ? (
              // Initial folder selection prompt
              <div className="text-center py-8">
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 mb-4">Choose a folder to upload files from</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleFolderSelect}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Select Folder
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Max {maxFiles} files, {maxSizePerFileMB}MB each
                </p>
              </div>
            ) : (
              // File preview and processing
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Files from "{folderName}" ({selectedFiles.length})</h4>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedFiles.map((file) => (
                      <li key={file.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                        {getFileIcon(file.type)}
                        <span className="font-medium flex-1 min-w-0 truncate">{file.name}</span>
                        <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button
                  onClick={processFiles}
                  disabled={isProcessing}
                  className="w-full py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin inline mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Process Files'
                  )}
                </button>

                {processedAttachments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Ready to Attach ({processedAttachments.length})</h4>
                    <div className="flex gap-3">
                      <button
                        onClick={handleConfirm}
                        className="flex-1 py-2 px-4 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                      >
                        <CheckCircle size={16} className="inline mr-2" />
                        Attach to Message
                      </button>
                      <button
                        onClick={onClose}
                        className="py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <FileLimitExceededModal
        isOpen={isLimitExceededModalOpen}
        onClose={() => setIsLimitExceededModalOpen(false)}
        exceededCount={selectedFiles.length}
        maxFiles={maxFiles}
        folderName={folderName}
      />
    </>
  );
}