import { useState } from 'react';
import { Plus, Trash2, Edit3, ChevronDown, ChevronRight } from 'lucide-react';
import { Conversation, Project } from '../types';
import { DeleteConversationModal } from './DeleteConversationModal';

interface HierarchicalSidebarProps {
  currentProjectId: string | null;
  currentConvId: string | null;
  projects: Project[];
  conversations: Conversation[]; // All conversations, with project_id
  onSelectProject: (projectId: string) => void;
  onSelectConv: (convId: string) => void;
  onCreateNewProject: () => void;
  onCreateNewConv: (projectId?: string) => void; // Optional projectId for scoping
  onDeleteConv: (convId: string) => void;
  onUpdateTitle: (itemId: string, newTitle: string, isProject: boolean) => void; // Scoped for project/conv
}

export function HierarchicalSidebar({
  currentProjectId,
  currentConvId,
  projects,
  conversations,
  onSelectProject,
  onSelectConv,
  onCreateNewProject,
  onCreateNewConv,
  onDeleteConv,
  onUpdateTitle,
}: HierarchicalSidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);

  // Filter conversations by project
  const getConversationsByProject = (projectId: string) => {
    return conversations.filter(conv => conv.project_id === projectId);
  };

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleEditStart = (itemId: string, title: string, isProject: boolean) => {
    setEditingItemId(itemId);
    setEditTitle(title);
  };

  const handleEditSave = (itemId: string, isProject: boolean) => {
    if (editTitle.trim()) {
      onUpdateTitle(itemId, editTitle.trim(), isProject);
    }
    setEditingItemId(null);
  };

  const handleDelete = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setDeletingConvId(convId);
  };

  const confirmDelete = () => {
    if (deletingConvId) {
      onDeleteConv(deletingConvId);
      setDeletingConvId(null);
    }
  };

  const handleProjectClick = (projectId: string) => {
    onSelectProject(projectId);
  };

  const handleConvClick = (convId: string) => {
    onSelectConv(convId);
  };

  const handleCreateNewInProject = (projectId?: string) => {
    onCreateNewConv(projectId);
  };

  return (
    <>
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-900">Grok Workspace</h2>
            <button
              onClick={onCreateNewProject}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="New project"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-gray-200">
            {projects.map((project) => {
              const projectConvs = getConversationsByProject(project.id);
              const isExpanded = expandedProjects.has(project.id);
              const isSelected = currentProjectId === project.id;

              return (
                <li key={project.id}>
                  {/* Project Row */}
                  <div className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}>
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProjectExpand(project.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        aria-label={isExpanded ? 'Collapse project' : 'Expand project'}
                      >
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <div className="flex-1 min-w-0 mr-2">
                        {editingItemId === project.id ? (
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => handleEditSave(project.id, true)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') handleEditSave(project.id, true);
                              if (e.key === 'Escape') setEditingItemId(null);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                        ) : (
                          <div className="truncate text-sm font-semibold text-gray-900" onClick={() => handleProjectClick(project.id)}>
                            {project.title}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStart(project.id, project.title, true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        aria-label="Edit project title"
                      >
                        <Edit3 size={14} />
                      </button>
                      {onDeleteProject && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          aria-label="Delete project"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nested Conversations */}
                  {isExpanded && (
                    <ul className="bg-gray-50 divide-y divide-gray-200">
                      {projectConvs.length === 0 ? (
                        <li className="p-4 text-center text-sm text-gray-500">
                          No conversations in this project
                          <button
                            onClick={() => handleCreateNewInProject(project.id)}
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            Create one
                          </button>
                        </li>
                      ) : (
                        projectConvs.map((conv) => (
                          <li key={conv.id} className="relative">
                            <div 
                              onClick={() => handleConvClick(conv.id)}
                              className={`p-4 hover:bg-gray-100 transition-colors flex items-center justify-between cursor-pointer select-none ${currentConvId === conv.id ? 'bg-white border-l-4 border-blue-500' : ''}`}
                            >
                              <div className="flex-1 min-w-0 mr-2">
                                {editingItemId === conv.id ? (
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onBlur={() => handleEditSave(conv.id, false)}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') handleEditSave(conv.id, false);
                                      if (e.key === 'Escape') setEditingItemId(null);
                                    }}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                  />
                                ) : (
                                  <div className="truncate text-sm font-medium text-gray-900">
                                    {conv.title}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStart(conv.id, conv.title, false);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                  aria-label="Edit conversation title"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(e, conv.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  aria-label="Delete conversation"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Empty state for no projects */}
        {projects.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <div className="text-gray-500">
              <p className="text-sm font-medium mb-2">No projects yet</p>
              <button
                onClick={onCreateNewProject}
                className="text-blue-600 hover:text-blue-700 text-sm underline"
              >
                Create a new project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <DeleteConversationModal
        isOpen={!!deletingConvId}
        onClose={() => setDeletingConvId(null)}
        onConfirm={confirmDelete}
        conversationName={conversations.find(c => c.id === deletingConvId)?.title || 'this conversation'}
      />
    </>
  );
}