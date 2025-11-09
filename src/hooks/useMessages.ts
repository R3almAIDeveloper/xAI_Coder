import { useState, useEffect } from 'react';
import { Message } from '../types';
import { localDb, LocalDatabase } from '../lib/localDb';
import { getUserId } from '../lib/supabase';

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    if (!LocalDatabase.isSupported()) {
      console.log('IndexedDB not supported, starting with empty messages');
      setIsLoading(false);
      return;
    }

    try {
      const userId = getUserId();
      const localMessages = await localDb.loadMessages(userId);
      
      const convertedMessages: Message[] = localMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : undefined,
      }));

      setMessages(convertedMessages);
      console.log(`Loaded ${convertedMessages.length} messages from local database`);
    } catch (error) {
      console.error('Failed to load messages from local database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = async (message: Message) => {
    // Add to state immediately for UI responsiveness
    setMessages(prev => [...prev, message]);

    // Save to local database
    if (LocalDatabase.isSupported()) {
      try {
        const userId = getUserId();
        await localDb.saveMessage(userId, {
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          attachments: message.attachments,
        });
      } catch (error) {
        console.error('Failed to save message to local database:', error);
      }
    }
  };

  const addMessages = async (newMessages: Message[]) => {
    // Add to state immediately
    setMessages(prev => [...prev, ...newMessages]);

    // Save each message to local database
    if (LocalDatabase.isSupported()) {
      try {
        const userId = getUserId();
        for (const message of newMessages) {
          await localDb.saveMessage(userId, {
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
            attachments: message.attachments,
          });
        }
      } catch (error) {
        console.error('Failed to save messages to local database:', error);
      }
    }
  };

  const clearMessages = async () => {
    setMessages([]);

    if (LocalDatabase.isSupported()) {
      try {
        const userId = getUserId();
        await localDb.deleteMessages(userId);
        console.log('Messages cleared from local database');
      } catch (error) {
        console.error('Failed to clear messages from local database:', error);
      }
    }
  };

  const getMessageCount = async (): Promise<number> => {
    if (!LocalDatabase.isSupported()) {
      return messages.length;
    }

    try {
      const userId = getUserId();
      return await localDb.getMessageCount(userId);
    } catch (error) {
      console.error('Failed to get message count from local database:', error);
      return messages.length;
    }
  };

  return {
    messages,
    setMessages,
    addMessage,
    addMessages,
    clearMessages,
    getMessageCount,
    isLoading,
  };
}