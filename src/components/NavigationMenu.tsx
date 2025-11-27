// src/components/NavigationMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  Bot,
  FolderOpen,
  MessageSquare,
  Settings,
  Search,
  ChevronDown,
  Plus,
  LogOut,
  User,
  Globe,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { Project, Conversation } from '../types';
import { useNavigate } from 'react-router-dom';

interface NavigationMenuProps {
  projects?: Project[];
  conversations?: Conversation[];
  currentProjectId: string | null;
  currentConvId: string | null;
  currentProjectName: string;
  onSelectProject: (id: string) => void;
  onSelectConversation: (id: string) => void;
  onCreateProject: () => void;
  onCreateConversation: () => void;
  onOpenSettings: () => void;
  userName: string;
  onLogout?: () => void;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  projects = [],
  conversations = [],
  currentProjectId,
  currentConvId,
  currentProjectName,
  onSelectProject,
  onSelectConversation,
  onCreateProject,
  onCreateConversation,
  onOpenSettings,
  userName,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const logoUrl = settings.logoUrl || 'https://vrcxtkstyeutxwhllnws.supabase.co/storage/v1/object/public/logos/logo.png';

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Desktop & Tablet Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
                <span className="text-xl font-bold text-gray-900 hidden sm:block">xAI Coder</span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-8">
                <button
                  onClick={onCreateProject}
                  className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>

                <div className="relative">
                  <button
                    onClick={() => setProjectsOpen(!projectsOpen)}
                    className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium"
                  >
                    <FolderOpen className="w-5 h-5" />
                    Projects
                    <ChevronDown className={`w-4 h-4 transition-transform ${projectsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {projectsOpen && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">Your Projects</p>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {projects.length > 0 ? (
                          projects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => {
                                onSelectProject(project.id);
                                setProjectsOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                currentProjectId === project.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                              }`}
                            >
                              <span className="font-medium truncate">{project.title}</span>
                              {currentProjectId === project.id && (
                                <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-8 text-center text-gray-500 text-sm">No projects yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors font-medium">
                  <MessageSquare className="w-5 h-5" />
                  Chats
                </button>
              </nav>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <button
                    onClick={() => setSearchOpen(!searchOpen)}
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  {searchOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-4 border-b border-gray-100">
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search conversations..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {filteredConversations.length > 0 ? (
                          filteredConversations.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => {
                                onSelectConversation(conv.id);
                                setSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                            >
                              <p className="font-medium truncate">{conv.title}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(conv.updated_at).toLocaleDateString()}
                              </p>
                            </button>
                          ))
                        ) : (
                          <p className="px-4 py-8 text-center text-gray-500 text-sm">No conversations found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* User Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-100">
                      <p className="font-semibold text-gray-900">{userName}</p>
                      <p className="text-sm text-gray-500">xAI Coder Pro</p>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={onOpenSettings}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-gray-700 transition-colors"
                      >
                        <Settings className="w-5 h-5" />
                        Settings & API Keys
                      </button>
                      <button
                        onClick={() => navigate('/profile')}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-gray-700 transition-colors"
                      >
                        <User className="w-5 h-5" />
                        Profile
                      </button>
                      <hr className="my-2 border-gray-200" />
                      <button
                        onClick={onLogout}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Menu */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
        <div
          ref={mobileMenuRef}
          className={`absolute left-0 top-0 bottom-0 w-80 max-w-full bg-gradient-to-b from-indigo-600 to-purple-700 text-white shadow-2xl transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold">xAI Coder</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <button
              onClick={() => {
                onCreateProject();
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-white/10 transition-all text-lg font-medium"
            >
              <Plus className="w-6 h-6" />
              New Project
            </button>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-3 px-5">Projects</h3>
              <div className="space-y-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      onSelectProject(project.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full text-left px-5 py-3 rounded-lg transition-all flex items-center justify-between ${
                      currentProjectId === project.id ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                    }`}
                  >
                    <span>{project.title}</span>
                    {currentProjectId === project.id && <div className="w-2 h-2 bg-cyan-300 rounded-full" />}
                  </button>
                ))}
              </div>
            </div>

            {currentProjectId && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-3 px-5">
                  Chats in {currentProjectName}
                </h3>
                <div className="space-y-1">
                  {conversations
                    .filter((c) => c.project_id === currentProjectId)
                    .slice(0, 10)
                    .map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          setMobileOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 rounded-lg transition-all ${
                          currentConvId === conv.id ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
                        }`}
                      >
                        {conv.title}
                      </button>
                    ))}
                  <button
                    onClick={() => {
                      onCreateConversation();
                      setMobileOpen(false);
                    }}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 text-cyan-300 hover:bg-white/10 transition-all text-sm font-medium"
                  >
                    <Plus size={16} />
                    New Chat
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/20">
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-4 px-5 py-5 rounded-xl hover:bg-white/10 transition-all group"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition">
                <Settings size={24} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-lg">{userName}</p>
                <p className="text-sm opacity-80">Settings & API Keys</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};