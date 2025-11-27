// src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  FolderOpen,
  Folder as FolderClosed,
  FileText,
  FileCode,
  FileJson,
  Package,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Save,
  Check,
  MessageSquare,
  Settings,
  Plus,
  LogOut,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, getUserId } from './lib/supabase';
import { NavigationMenu } from './components/NavigationMenu';
import { SettingsPage } from './components/SettingsPage';
import { HierarchicalSidebar } from './components/HierarchicalSidebar';
import { useSettings } from './hooks/useSettings';
import { Project, Conversation } from './types';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, isLoading: settingsLoading } = useSettings();

  // Global State
  const [userName] = useState('Developer'); // Replace with real auth later
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('Untitled Project');
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [creatingFileIn, setCreatingFileIn] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Load projects and conversations
  useEffect(() => {
    const loadData = async () => {
      try {
        const userId = await getUserId();
        if (!userId) throw new Error('Not authenticated');

        // Load projects
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false });

        // Load conversations
        const { data: convData } = await supabase
          .from('conversations')
          .select('*')
          .order('updated_at', { ascending: false });

        setProjects(projectData || []);
        setConversations(convData || []);

        // Auto-select first project if none selected
        if (!currentProjectId && projectData && projectData.length > 0) {
          handleSelectProject(projectData[0].id);
        }
      } catch (err) {
        setError('Failed to load workspace');
      } finally {
        setGlobalLoading(false);
      }
    };

    loadData();
  }, []);

  // Load files when project changes
  const loadFiles = async () => {
    if (!currentProjectId) {
      setFiles([]);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .list(`${currentProjectId}/`, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

      if (error) throw error;

      // Build tree structure from flat list
      const tree: FileNode[] = [];
      const map = new Map<string, FileNode>();

      data.forEach(item => {
        const path = item.name;
        const parts = path.split('/');
        let current = tree;

        parts.forEach((part, i) => {
          const fullPath = parts.slice(0, i + 1).join('/');
          let node = map.get(fullPath);

          if (!node) {
            node = {
              id: fullPath,
              name: part || 'root',
              type: i === parts.length - 1 && !item.metadata?.mimetype?.includes('directory') ? 'file' : 'folder',
              path: fullPath,
              children: [],
            };
            map.set(fullPath, node);
            current.push(node);
          }

          if (node.type === 'folder' && i < parts.length - 1) {
            current = node.children!;
          }
        });
      });

      setFiles(tree);
    } catch (err) {
      setError('Failed to load files');
    }
  };

  useEffect(() => {
    loadFiles();
  }, [currentProjectId]);

  // Handlers
  const handleSelectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProjectId(projectId);
      setCurrentProjectName(project.title);
      setCurrentConvId(null);
    }
  };

  const handleSelectConversation = (convId: string) => {
    setCurrentConvId(convId);
    navigate(`/chat/${convId}`);
  };

  const handleCreateProject = async () => {
    const title = prompt('Project name:') || 'New Project';
    const { data, error } = await supabase
      .from('projects')
      .insert({ title })
      .select()
      .single();

    if (data) {
      setProjects(prev => [data, ...prev]);
      handleSelectProject(data.id);
    }
  };

  const handleCreateConversation = async () => {
    if (!currentProjectId) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title: 'New Chat',
        project_id: currentProjectId,
      })
      .select()
      .single();

    if (data) {
      setConversations(prev => [data, ...prev]);
      handleSelectConversation(data.id);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !currentProjectId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.storage
        .from('project-files')
        .upload(`${currentProjectId}/${selectedFile.path}`, fileContent, {
          upsert: true,
          contentType: 'text/plain',
        });

      if (error) throw error;
      setLastSaved(new Date());
    } catch (err) {
      setError('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    navigate('/login');
  };

  if (globalLoading || settingsLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-6" />
          <p className="text-xl font-medium text-gray-700">Loading xAI Coder...</p>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return <SettingsPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Navigation */}
      <NavigationMenu
        projects={projects}
        conversations={conversations}
        currentProjectId={currentProjectId}
        currentConvId={currentConvId}
        currentProjectName={currentProjectName}
        onSelectProject={handleSelectProject}
        onSelectConversation={handleSelectConversation}
        onCreateProject={handleCreateProject}
        onCreateConversation={handleCreateConversation}
        onOpenSettings={() => setShowSettings(true)}
        userName={userName}
        onLogout={handleLogout}
      />

      {/* Main Layout */}
      <div className="pt-16 flex h-screen">
        {/* Hierarchical Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <HierarchicalSidebar
            currentProjectId={currentProjectId}
            currentConvId={currentConvId}
            projects={projects}
            conversations={conversations}
            onSelectProject={handleSelectProject}
            onSelectConv={handleSelectConversation}
            onCreateNewProject={handleCreateProject}
            onCreateNewConv={handleCreateConversation}
            onDeleteConv={async (id) => {
              await supabase.from('conversations').delete().eq('id', id);
              setConversations(prev => prev.filter(c => c.id !== id));
            }}
            onUpdateTitle={async (id, title, isProject) => {
              const table = isProject ? 'projects' : 'conversations';
              await supabase.from(table).update({ title }).eq('id', id);
              if (isProject) {
                setProjects(prev => prev.map(p => p.id === id ? { ...p, title } : p));
                if (currentProjectId === id) setCurrentProjectName(title);
              } else {
                setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
              }
            }}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {location.pathname.startsWith('/chat/') ? (
            <div className="flex-1 bg-white">
              {/* Chat Interface will go here */}
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-24 h-24 mx-auto mb-6 opacity-50" />
                  <p className="text-2xl font-medium">Chat coming soon</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex">
              {/* File Tree */}
              <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
                {/* File explorer tree */}
                <div className="space-y-1">
                  {files.map(node => (
                    <div key={node.id}>
                      <button className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white rounded-lg text-left">
                        {node.type === 'folder' ? <FolderOpen className="w-5 h-5 text-indigo-600" /> : <FileText className="w-5 h-5 text-gray-600" />}
                        <span className="text-sm">{node.name}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 bg-white flex flex-col">
                {selectedFile ? (
                  <>
                    <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileCode className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-800">{selectedFile.name}</span>
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {lastSaved && !isSaving && <Check className="w-4 h-4 text-green-600" />}
                      </div>
                      <button
                        onClick={handleSaveFile}
                        disabled={isSaving}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    <textarea
                      className="flex-1 p-8 font-mono text-sm bg-gray-50 resize-none focus:outline-none leading-relaxed"
                      value={fileContent}
                      onChange={e => setFileContent(e.target.value)}
                      spellCheck={false}
                      placeholder="// Start coding..."
                    />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <FileText className="w-20 h-20 mx-auto mb-6 opacity-50" />
                      <p className="text-xl font-medium">Select a file to edit</p>
                      <p className="text-sm mt-3">or create something new</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-6 text-2xl">×</button>
        </div>
      )}
    </div>
  );
}

export default App;