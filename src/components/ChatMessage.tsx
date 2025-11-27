import { useState } from 'react';
import { Bot, User, Paperclip, Download, FileText, AlertCircle } from 'lucide-react';
import { Message, FileAttachment } from '../types';

interface ChatMessageProps {
  message: Message;
}

function AttachmentPreview({ attachment }: { attachment: FileAttachment }) {
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = () => {
    if (attachment.url) {
      // Download from URL
      const a = document.createElement('a');
      a.href = attachment.url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (attachment.content) {
      // Legacy base64 download
      try {
        const byteCharacters = atob(attachment.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: attachment.type });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading file:', error);
        alert('Failed to download file');
      }
    } else {
      alert('No file data available for download.');
    }
  };

  const loadPreviewText = async () => {
    if (previewText !== null) return; // Already loaded

    try {
      let textContent = '';
      if (attachment.url) {
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error('Failed to fetch file');
        textContent = await response.text();
      } else if (attachment.content) {
        textContent = atob(attachment.content);
      } else {
        return;
      }

      setPreviewText(textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''));
    } catch (err) {
      console.error('Error loading preview:', err);
      setPreviewError(true);
    }
  };

  const isImage = attachment.type.startsWith('image/');
  const isText = attachment.type.startsWith('text/') || 
                 attachment.type === 'application/json' ||
                 attachment.name.endsWith('.md') ||
                 attachment.name.endsWith('.txt');

  return (
    <div className="mt-2 p-3 bg-white/10 rounded-lg border border-white/20">
      <div className="flex items-center gap-2 mb-2">
        <Paperclip size={14} className="text-current opacity-70" />
        <span className="text-sm font-medium truncate">{attachment.name}</span>
        <span className="text-xs opacity-70 ml-auto">
          {formatFileSize(attachment.size)}
        </span>
        <button
          onClick={downloadFile}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Download file"
        >
          <Download size={14} />
        </button>
      </div>
      
      {isImage && (
        <img
          src={attachment.url || `data:${attachment.type};base64,${attachment.content}`}
          alt={attachment.name}
          className="max-w-full max-h-48 rounded border border-white/20"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      
      {isText && (
        <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono overflow-auto max-h-32">
          {previewText === null ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer" onClick={loadPreviewText}>
              <span>Click to preview content</span>
              <FileText size={12} />
            </div>
          ) : previewError ? (
            <div className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              Failed to load preview
            </div>
          ) : (
            <pre className="whitespace-pre-wrap">
              {previewText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
      )}

      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
          <User size={18} className="text-white" />
        </div>
      )}
    </div>
  );
}