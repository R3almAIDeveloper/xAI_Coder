import { Bot, User, Paperclip, Download } from 'lucide-react';
import { Message, FileAttachment } from '../types';

interface ChatMessageProps {
  message: Message;
}

function AttachmentPreview({ attachment }: { attachment: FileAttachment }) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = () => {
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
          src={`data:${attachment.type};base64,${attachment.content}`}
          alt={attachment.name}
          className="max-w-full max-h-48 rounded border border-white/20"
        />
      )}
      
      {isText && attachment.size < 1024 * 10 && ( // Show preview for small text files
        <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono overflow-auto max-h-32">
          <pre className="whitespace-pre-wrap">
            {atob(attachment.content).substring(0, 500)}
            {atob(attachment.content).length > 500 && '...'}
          </pre>
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
