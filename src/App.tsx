import { useRef, useEffect } from 'react';
import { Settings as SettingsIcon, Loader2, AlertCircle } from 'lucide-react';
import { Message, FileAttachment } from './types';
import { useSettings } from './hooks/useSettings';
import { useMessages } from './hooks/useMessages';
import { SettingsModal } from './components/SettingsModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const { settings, setSettings, isLoading: isLoadingSettings } = useSettings();
  const { messages, addMessage, isLoading: isLoadingMessages } = useMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string, attachments?: FileAttachment[]) => {
    if (!settings.apiKey) {
      setError('Please configure your API key in settings');
      setIsSettingsOpen(true);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments,
    };

    await addMessage(userMessage);
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = `${settings.baseUrl}/v1/chat/completions`;

      // Auto-select best model if "auto" is chosen
      const modelToUse = settings.model === 'auto' ? 'grok-2-latest' : settings.model;

      // Prepare messages for API
      const apiMessages = [
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      // Add current message with attachments if any
      let currentMessageContent = content;
      if (attachments && attachments.length > 0) {
        currentMessageContent += `\n\nAttached files (${attachments.length}):\n`;
        attachments.forEach((attachment) => {
          currentMessageContent += `- ${attachment.name} (${attachment.type}, ${attachment.size} bytes)\n`;
          
          // For text files, include content
          if (attachment.type.startsWith('text/') || 
              attachment.type === 'application/json' ||
              attachment.name.endsWith('.md') ||
              attachment.name.endsWith('.txt') ||
              attachment.name.endsWith('.js') ||
              attachment.name.endsWith('.ts') ||
              attachment.name.endsWith('.jsx') ||
              attachment.name.endsWith('.tsx') ||
              attachment.name.endsWith('.css') ||
              attachment.name.endsWith('.html') ||
              attachment.name.endsWith('.xml') ||
              attachment.name.endsWith('.yaml') ||
              attachment.name.endsWith('.yml')) {
            try {
              const textContent = atob(attachment.content);
              currentMessageContent += `\nContent of ${attachment.name}:\n\`\`\`\n${textContent}\n\`\`\`\n`;
            } catch (error) {
              console.error('Error decoding text file:', error);
            }
          }
        });
      }

      const payload = {
        model: modelToUse,
        messages: [...apiMessages, { role: 'user', content: currentMessageContent }],
      };

      console.log('API Request:', { url: apiUrl, model: modelToUse });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        const errorMsg = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(
          `${response.status} Error: ${errorMsg}`
        );
      }

      const data = await response.json();
      console.log('API Response:', data);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || 'No response from AI',
        timestamp: Date.now(),
      };

      await addMessage(assistantMessage);
    } catch (err) {
      console.error('Request failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const hasApiKey = Boolean(settings.apiKey);

  if (isLoadingSettings || isLoadingMessages) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Grok Chat</h1>
              <p className="text-sm text-gray-500">Powered by xAI</p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open settings"
          >
            <SettingsIcon size={24} className="text-gray-600" />
          </button>
        </div>
      </header>

      {!hasApiKey && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3 text-yellow-800">
            <AlertCircle size={20} />
            <p className="text-sm">
              Please configure your API key in settings to start chatting.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3 text-red-800">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-700 font-medium text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">G</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Start a conversation</h2>
                <p className="text-gray-600 max-w-md">
                  Ask me anything! I'm Grok, powered by xAI's advanced language model.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Loader2 size={18} className="text-white animate-spin" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <ChatInput
        onSend={sendMessage}
        disabled={isLoading || !hasApiKey}
        currentModel={settings.model}
        onOpenModelSelector={() => setIsModelSelectorOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />

      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        currentModel={settings.model}
        onSelectModel={(model) => {
          setSettings({ ...settings, model });
        }}
      />
    </div>
  );
}

export default App;
