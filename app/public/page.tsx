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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading public data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Public Project Statuses & Comments</h1>
            <p className="mt-2 text-gray-600">View and edit project statuses and comments. No authentication required.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project ID
                  </th>
                  {sortedMonths.map(month => (
                    <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedProjectIds.map(projectId => (
                  <tr key={projectId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {projectId}
                    </td>
                    {sortedMonths.map(month => (
                      <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="space-y-2">
                          {/* Status */}
                          <div>
                            <span className="text-xs text-gray-400">Status:</span>
                            {editingCell?.type === 'status' && editingCell.projectId === projectId && editingCell.month === month ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSave}
                                className="ml-2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => handleCellClick('status', projectId, month)}
                                className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 min-w-[60px] text-left"
                              >
                                {statuses[projectId]?.[month] || 'Click to add'}
                              </button>
                            )}
                          </div>
                          
                          {/* Comment */}
                          <div>
                            <span className="text-xs text-gray-400">Comment:</span>
                            {editingCell?.type === 'comment' && editingCell.projectId === projectId && editingCell.month === month ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSave}
                                className="ml-2 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => handleCellClick('comment', projectId, month)}
                                className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 min-w-[60px] text-left"
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
