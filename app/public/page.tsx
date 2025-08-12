'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Statuses {
  [projectId: string]: {
    [month: string]: string;
  };
}

interface Comments {
  [projectId: string]: {
    [month: string]: string;
  };
}

export default function PublicPage() {
  const [statuses, setStatuses] = useState<Statuses>({});
  const [comments, setComments] = useState<Comments>({});
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ type: 'status' | 'comment', projectId: string, month: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusesRes, commentsRes] = await Promise.all([
        fetch('/api/statuses'),
        fetch('/api/comments')
      ]);

      if (statusesRes.ok) {
        const statusesData = await statusesRes.json();
        setStatuses(statusesData);
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (type: 'status' | 'comment', projectId: string, month: string) => {
    const currentValue = type === 'status' 
      ? statuses[projectId]?.[month] || ''
      : comments[projectId]?.[month] || '';
    
    setEditingCell({ type, projectId, month });
    setEditValue(currentValue);
  };

  const handleSave = async () => {
    if (!editingCell) return;

    try {
      const endpoint = editingCell.type === 'status' ? '/api/statuses' : '/api/comments';
      const body = editingCell.type === 'status' 
        ? { projectId: editingCell.projectId, month: editingCell.month, status: editValue }
        : { projectId: editingCell.projectId, month: editingCell.month, comment: editValue };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        // Update local state
        if (editingCell.type === 'status') {
          setStatuses(prev => ({
            ...prev,
            [editingCell.projectId]: {
              ...prev[editingCell.projectId],
              [editingCell.month]: editValue
            }
          }));
        } else {
          setComments(prev => ({
            ...prev,
            [editingCell.projectId]: {
              ...prev[editingCell.projectId],
              [editingCell.month]: editValue
            }
          }));
        }
        toast.success(`${editingCell.type === 'status' ? 'Status' : 'Comment'} updated successfully`);
      } else {
        toast.error('Failed to update');
      }
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Get all unique project IDs and months
  const allProjectIds = new Set([
    ...Object.keys(statuses),
    ...Object.keys(comments)
  ]);

  const allMonths = new Set<string>();
  Object.values(statuses).forEach(projectStatuses => {
    Object.keys(projectStatuses).forEach(month => allMonths.add(month));
  });
  Object.values(comments).forEach(projectComments => {
    Object.keys(projectComments).forEach(month => allMonths.add(month));
  });

  const sortedProjectIds = Array.from(allProjectIds).sort();
  const sortedMonths = Array.from(allMonths).sort();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-300">Loading public data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Public Project Statuses
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            View and edit project statuses and comments. No authentication required.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project ID
                  </th>
                  {sortedMonths.map(month => (
                    <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {sortedProjectIds.map(projectId => (
                  <tr key={projectId} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {projectId}
                    </td>
                    {sortedMonths.map(month => (
                      <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="space-y-2">
                          {/* Status */}
                          <div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">Status:</span>
                            {editingCell?.type === 'status' && editingCell.projectId === projectId && editingCell.month === month ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSave}
                                className="ml-2 px-3 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => handleCellClick('status', projectId, month)}
                                className="ml-2 px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 min-w-[60px] text-left transition-colors duration-200"
                              >
                                {statuses[projectId]?.[month] || 'Click to add'}
                              </button>
                            )}
                          </div>
                          
                          {/* Comment */}
                          <div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">Comment:</span>
                            {editingCell?.type === 'comment' && editingCell.projectId === projectId && editingCell.month === month ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSave}
                                className="ml-2 px-3 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => handleCellClick('comment', projectId, month)}
                                className="ml-2 px-3 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 min-w-[60px] text-left transition-colors duration-200"
                              >
                                {comments[projectId]?.[month] || 'Click to add'}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
