'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, User } from 'lucide-react';
import { BillingData, ProjectionsTable as ProjectionsTableType, ProjectManager } from '@/lib/types';
import { formatMonth, isFutureMonth, isCurrentMonth, isPastMonth, formatCurrency } from '@/lib/utils';
import { getProjectionsMonthRange } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface ProjectionsTableProps {
  billingData: BillingData[];
  projections: ProjectionsTableType;
  onUpdateProjections: (projections: ProjectionsTableType) => void;
}

export default function ProjectionsTable({ 
  billingData, 
  projections, 
  onUpdateProjections 
}: ProjectionsTableProps) {
  const [editingCell, setEditingCell] = useState<{ projectId: string; month: string } | null>(null);
  const [editingAsrFee, setEditingAsrFee] = useState<string | null>(null);
  const [editingSignedFee, setEditingSignedFee] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number } | null>(null);
  const [closedProjects, setClosedProjects] = useState<Set<string>>(new Set());
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<Record<string, string>>({});
  const [signedFees, setSignedFees] = useState<Record<string, number>>({});
  const [asrFees, setAsrFees] = useState<Record<string, number>>({});
  const [monthlyProjections, setMonthlyProjections] = useState<Record<string, Record<string, number>>>({});
  const tableRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const monthRange = getProjectionsMonthRange();

  // Load project managers and assignments from localStorage
  useEffect(() => {
    const savedManagers = localStorage.getItem('projectManagers');
    if (savedManagers) {
      const managers = JSON.parse(savedManagers);
      setProjectManagers(managers);
    } else {
    }

    const savedAssignments = localStorage.getItem('projectAssignments');
    if (savedAssignments) {
      const assignments = JSON.parse(savedAssignments);
      setProjectAssignments(assignments);
    } else {
    }
  }, []);

  // Listen for changes to project managers in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedManagers = localStorage.getItem('projectManagers');
      if (savedManagers) {
        const managers = JSON.parse(savedManagers);
        setProjectManagers(managers);
      }
    };

    const handleCustomStorageChange = () => {
      const savedManagers = localStorage.getItem('projectManagers');
      if (savedManagers) {
        const managers = JSON.parse(savedManagers);
        setProjectManagers(managers);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectManagersUpdated', handleCustomStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectManagersUpdated', handleCustomStorageChange);
    };
  }, []);

  // Save project assignments to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('projectAssignments', JSON.stringify(projectAssignments));
  }, [projectAssignments]);

  // Periodic check to sync project managers (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      const savedManagers = localStorage.getItem('projectManagers');
      if (savedManagers) {
        const managers = JSON.parse(savedManagers);
        if (JSON.stringify(managers) !== JSON.stringify(projectManagers)) {
          setProjectManagers(managers);
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [projectManagers]);

  // Load closed projects and user-entered data from localStorage
  useEffect(() => {
    const savedClosedProjects = localStorage.getItem('closedProjects');
    if (savedClosedProjects) {
      setClosedProjects(new Set(JSON.parse(savedClosedProjects)));
    }

    const savedSignedFees = localStorage.getItem('signedFees');
    if (savedSignedFees) {
      setSignedFees(JSON.parse(savedSignedFees));
    }

    const savedAsrFees = localStorage.getItem('asrFees');
    if (savedAsrFees) {
      setAsrFees(JSON.parse(savedAsrFees));
    }

    const savedMonthlyProjections = localStorage.getItem('monthlyProjections');
    if (savedMonthlyProjections) {
      setMonthlyProjections(JSON.parse(savedMonthlyProjections));
    }
  }, []);

  // Load data from API
  useEffect(() => {
    const loadApiData = async () => {
      try {
        // Load signed fees from API
        const signedFeesResponse = await fetch('/api/signed-fees');
        if (signedFeesResponse.ok) {
          const apiSignedFees = await signedFeesResponse.json();
          
          // Only merge if API data is not empty
          if (Object.keys(apiSignedFees).length > 0) {
            setSignedFees(prev => {
              const merged = { ...prev, ...apiSignedFees };
              return merged;
            });
          }
        }

        // Load ASR fees from API
        const asrFeesResponse = await fetch('/api/asr-fees');
        if (asrFeesResponse.ok) {
          const apiAsrFees = await asrFeesResponse.json();
          
          // Only merge if API data is not empty
          if (Object.keys(apiAsrFees).length > 0) {
            setAsrFees(prev => {
              const merged = { ...prev, ...apiAsrFees };
              return merged;
            });
          }
        }

        // Load projections from API
        const projectionsResponse = await fetch('/api/projections');
        if (projectionsResponse.ok) {
          const apiProjections = await projectionsResponse.json();
          
          // Only merge if API data is not empty
          if (Object.keys(apiProjections).length > 0) {
            setMonthlyProjections(prev => {
              const merged = { ...prev };
              Object.keys(apiProjections).forEach(projectId => {
                if (!merged[projectId]) merged[projectId] = {};
                Object.keys(apiProjections[projectId]).forEach(month => {
                  merged[projectId][month] = apiProjections[projectId][month];
                });
              });
              return merged;
            });
          }
        }
      } catch (error) {
        console.error('Error loading data from API:', error);
      }
    };

    loadApiData();
  }, []);

  // Save closed projects to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('closedProjects', JSON.stringify(Array.from(closedProjects)));
  }, [closedProjects]);

  // Listen for changes to closed projects in localStorage (for cross-tab/re-render sync)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'closedProjects' && event.newValue) {
        const newClosedProjects = new Set<string>(JSON.parse(event.newValue));
        // Only update if different to prevent infinite loops or unnecessary re-renders
        if (JSON.stringify(Array.from(newClosedProjects)) !== JSON.stringify(Array.from(closedProjects))) {
          setClosedProjects(newClosedProjects);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [closedProjects]); // Dependency on closedProjects to ensure the comparison is always with the latest state

  // Auto-scroll to current month on load
  useEffect(() => {
    if (tableRef.current) {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const currentMonthIndex = monthRange.findIndex(month => month === currentMonth);
      if (currentMonthIndex !== -1) {
        // Scroll to current month (accounting for frozen columns)
        // 5 frozen columns: 24 + 32 + 32 + 32 + 32 = 152px total
        const scrollPosition = (currentMonthIndex + 5) * 128; // 5 frozen columns + month width (w-32 = 128px)
        tableRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [monthRange]);

  const handleCellClick = (projectId: string, month: string, currentValue: number) => {
    // All months are editable
    setEditingCell({ projectId, month });
    setEditValue(currentValue.toString());
  };

  const handleAsrFeeClick = (projectId: string, currentValue: number) => {
    setEditingAsrFee(projectId);
    setEditValue(currentValue.toString());
  };

  const handleSignedFeeClick = (projectId: string, currentValue: number) => {
    setEditingSignedFee(projectId);
    setEditValue(currentValue.toString());
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const { projectId, month } = editingCell;
    const newValue = parseFloat(editValue) || 0;

    try {
      // Save to database via API
      const response = await fetch('/api/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, month, value: newValue }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save projection: ${response.statusText}`);
      }

      // Update monthly projections in state and localStorage
      const updatedMonthlyProjections = {
        ...monthlyProjections,
        [projectId]: {
          ...monthlyProjections[projectId],
          [month]: newValue,
        },
      };
      setMonthlyProjections(updatedMonthlyProjections);
      localStorage.setItem('monthlyProjections', JSON.stringify(updatedMonthlyProjections));

      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving projection:', error);
      // Still update local state even if API call fails
      const updatedMonthlyProjections = {
        ...monthlyProjections,
        [projectId]: {
          ...monthlyProjections[projectId],
          [month]: newValue,
        },
      };
      setMonthlyProjections(updatedMonthlyProjections);
      localStorage.setItem('monthlyProjections', JSON.stringify(updatedMonthlyProjections));
      
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleAsrFeeSave = async () => {
    if (!editingAsrFee) return;

    const newValue = parseFloat(editValue) || 0;

    try {
      // Save to database via API
      const response = await fetch('/api/asr-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: editingAsrFee, value: newValue }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ASR fee: ${response.statusText}`);
      }

      // Update ASR fees in state and localStorage
      const updatedAsrFees = {
        ...asrFees,
        [editingAsrFee]: newValue,
      };
      setAsrFees(updatedAsrFees);
      localStorage.setItem('asrFees', JSON.stringify(updatedAsrFees));

      setEditingAsrFee(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving ASR fee:', error);
      // Still update local state even if API call fails
      const updatedAsrFees = {
        ...asrFees,
        [editingAsrFee]: newValue,
      };
      setAsrFees(updatedAsrFees);
      localStorage.setItem('asrFees', JSON.stringify(updatedAsrFees));
      
      setEditingAsrFee(null);
      setEditValue('');
    }
  };

  const handleSignedFeeSave = async () => {
    if (!editingSignedFee) return;

    const newValue = parseFloat(editValue) || 0;

    try {
      // Save to database via API
      const response = await fetch('/api/signed-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: editingSignedFee, value: newValue }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save signed fee: ${response.statusText}`);
      }

      // Update signed fees in state and localStorage
      const updatedSignedFees = {
        ...signedFees,
        [editingSignedFee]: newValue,
      };
      setSignedFees(updatedSignedFees);
      localStorage.setItem('signedFees', JSON.stringify(updatedSignedFees));

      setEditingSignedFee(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving signed fee:', error);
      // Still update local state even if API call fails
      const updatedSignedFees = {
        ...signedFees,
        [editingSignedFee]: newValue,
      };
      setSignedFees(updatedSignedFees);
      localStorage.setItem('signedFees', JSON.stringify(updatedSignedFees));
      
      setEditingSignedFee(null);
      setEditValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingAsrFee(null);
    setEditingSignedFee(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingCell) {
        handleCellSave();
      } else if (editingAsrFee) {
        handleAsrFeeSave();
      } else if (editingSignedFee) {
        handleSignedFeeSave();
      }
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const handleProjectClose = (projectId: string) => {
    console.log('Closing project:', projectId);
    console.log('Current closedProjects before:', Array.from(closedProjects));
    
    const newClosedProjects = new Set(closedProjects);
    newClosedProjects.add(projectId);
    setClosedProjects(newClosedProjects);
    
    console.log('New closedProjects after:', Array.from(newClosedProjects));
    setOpenDropdown(null);
    setDropdownPosition(null);
    
    toast.success(`Project "${billingData.find(p => p.projectId === projectId)?.projectName}" closed successfully`);
  };

  const handleProjectReopen = (projectId: string) => {
    console.log('Reopening project:', projectId);
    const newClosedProjects = new Set(closedProjects);
    newClosedProjects.delete(projectId);
    setClosedProjects(newClosedProjects);
    
    toast.success(`Project "${billingData.find(p => p.projectId === projectId)?.projectName}" reopened successfully`);
  };

  const toggleDropdown = (projectId: string, event?: React.MouseEvent) => {
    if (openDropdown === projectId) {
      setOpenDropdown(null);
      setDropdownPosition(null);
    } else {
      setOpenDropdown(projectId);
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const buttonWidth = rect.width;
        const tableElement = tableRef.current;
        const tableScrollLeft = tableElement?.scrollLeft || 0;
        const tableScrollTop = tableElement?.scrollTop || 0;
        
        // Validate that the button is visible in the viewport
        if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
          console.warn('Button is outside viewport, skipping dropdown positioning:', {
            projectId,
            rect,
            viewport: { width: window.innerWidth, height: window.innerHeight }
          });
          return;
        }
        
        // Position dropdown to the left of the button if there's not enough space on the right
        let x = rect.left;
        if (rect.left + 220 > window.innerWidth) { // 220px is approximate dropdown width
          x = rect.right - 220;
        }
        
        // Check if there's enough space below the button, otherwise position above
        const dropdownHeight = 200; // Approximate dropdown height
        let y = rect.bottom + 5; // Default: below button
        
        if (rect.bottom + dropdownHeight + 10 > window.innerHeight) {
          // Not enough space below, position above
          y = rect.top - dropdownHeight - 5;
        }
        
        const position = {
          x: Math.max(8, x), // Ensure minimum left margin
          y: Math.max(8, y) // Ensure minimum top margin
        };
        
        // Validate final position
        if (position.x < 0 || position.y < 0 || position.x > window.innerWidth || position.y > window.innerHeight) {
          console.warn('Calculated position is outside viewport:', {
            projectId,
            position,
            viewport: { width: window.innerWidth, height: window.innerHeight }
          });
          return;
        }
        
        console.log('Dropdown positioning:', {
          projectId,
          rect: { left: rect.left, right: rect.right, bottom: rect.bottom, top: rect.top },
          window: { width: window.innerWidth, height: window.innerHeight },
          tableScroll: { left: tableScrollLeft, top: tableScrollTop },
          calculated: position,
          buttonElement: event.currentTarget,
          tableElement: tableElement,
          dropdownHeight,
          spaceBelow: window.innerHeight - rect.bottom,
          spaceAbove: rect.top
        });
        
        setDropdownPosition(position);
      }
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && dropdownPosition) {
        const target = event.target as Element;
        // Check if the click is outside the dropdown
        const dropdownElement = dropdownRef.current;
        if (dropdownElement && !dropdownElement.contains(target)) {
          setOpenDropdown(null);
          setDropdownPosition(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown, dropdownPosition]);

  // Adjust dropdown position to avoid viewport overflow
  useEffect(() => {
    if (!openDropdown || !dropdownPosition) return;
    
    // Add a small delay to ensure the dropdown is fully rendered
    const timeoutId = setTimeout(() => {
      const adjust = () => {
        const dropdownElement = dropdownRef.current;
        if (!dropdownElement) return;
        
        const { offsetWidth: width, offsetHeight: height } = dropdownElement as HTMLElement;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 8;

        // Get the original button position from the click event
        const buttonElement = document.querySelector(`[data-project-id="${openDropdown}"] .dropdown-trigger`);
        if (!buttonElement) return;
        
        const buttonRect = buttonElement.getBoundingClientRect();
        const originalY = buttonRect.bottom + 5; // Original position below button

        let newX = dropdownPosition.x;
        let newY = originalY; // Start with original position

        // Ensure dropdown doesn't go off the right edge
        if (newX + width + margin > viewportWidth) {
          newX = Math.max(margin, viewportWidth - width - margin);
        }
        
        // Ensure dropdown doesn't go off the bottom edge
        if (newY + height + margin > viewportHeight) {
          // Position above the button instead
          newY = Math.max(margin, buttonRect.top - height - 5);
        }

        // Ensure dropdown doesn't go off the left edge
        if (newX < margin) {
          newX = margin;
        }

        // Ensure dropdown doesn't go off the top edge
        if (newY < margin) {
          newY = margin;
        }

        if (Math.abs(newX - dropdownPosition.x) > 1 || Math.abs(newY - dropdownPosition.y) > 1) {
          console.log('Adjusting dropdown position:', {
            original: dropdownPosition,
            adjusted: { x: newX, y: newY },
            dropdownSize: { width, height },
            viewport: { width: viewportWidth, height: viewportHeight }
          });
          setDropdownPosition({ x: newX, y: newY });
        }
        
        // Fallback: if dropdown is still not visible, force it to be visible
        setTimeout(() => {
          const element = dropdownRef.current;
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.bottom > window.innerHeight || rect.top < 0 || rect.right > window.innerWidth || rect.left < 0) {
              console.warn('Dropdown still not properly positioned, applying fallback positioning');
              const fallbackX = Math.max(8, Math.min(window.innerWidth - rect.width - 8, 8));
              const fallbackY = Math.max(8, Math.min(window.innerHeight - rect.height - 8, 8));
              setDropdownPosition({ x: fallbackX, y: fallbackY });
            }
          }
        }, 100);
      };

      const id = window.requestAnimationFrame(adjust);
      return () => window.cancelAnimationFrame(id);
    }, 50); // 50ms delay

    return () => clearTimeout(timeoutId);
  }, [openDropdown, dropdownPosition]);

  // Close dropdown when scrolling to prevent positioning issues
  useEffect(() => {
    const handleScroll = () => {
      if (openDropdown) {
        setOpenDropdown(null);
        setDropdownPosition(null);
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll);
      return () => tableElement.removeEventListener('scroll', handleScroll);
    }
  }, [openDropdown]);

  // Close dropdown when window is resized to prevent positioning issues
  useEffect(() => {
    const handleResize = () => {
      if (openDropdown) {
        setOpenDropdown(null);
        setDropdownPosition(null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [openDropdown]);

  const getCellValue = (projectId: string, month: string) => {
    // All months are user-editable - prioritize user-entered projections
    return monthlyProjections[projectId]?.[month] || 0;
  };

  const getAsrFee = (projectId: string) => {
    return asrFees[projectId] || projections[projectId]?.asrFee || 0;
  };

  const getTotalFee = (project: BillingData) => {
    const userSignedFee = signedFees[project.projectId];
    const finalSignedFee = userSignedFee || 0;
    
    const asrFee = getAsrFee(project.projectId);
    return finalSignedFee + asrFee;
  };

  const getTotalProjected = (projectId: string) => {
    return monthRange.reduce((sum, month) => sum + getCellValue(projectId, month), 0);
  };

  const getProjectManagerColor = (projectId: string) => {
    const managerId = projectAssignments[projectId];
    if (!managerId) return null;
    
    const manager = projectManagers.find(m => m.id === managerId);
    return manager?.color || null;
  };

  const handleAssignProjectManager = (projectId: string, managerId: string) => {
    console.log('Assigning manager:', { projectId, managerId });
    setProjectAssignments(prev => {
      const newAssignments = { ...prev, [projectId]: managerId };
      return newAssignments;
    });
    setOpenDropdown(null);
    setDropdownPosition(null);
  };

  const handleRemoveProjectManager = (projectId: string) => {
    console.log('Removing manager for project:', projectId);
    setProjectAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[projectId];
      return newAssignments;
    });
    setOpenDropdown(null);
    setDropdownPosition(null);
  };

  const getCellClassName = (month: string, isEditable: boolean) => {
    let className = 'table-cell text-right px-3 py-2 text-sm cursor-pointer hover:bg-yellow-100';
    
    if (isCurrentMonth(month)) {
      className += ' bg-blue-100 border-l-2 border-blue-500';
    } else if (isPastMonth(month)) {
      className += ' bg-gray-50';
    } else {
      className += ' bg-yellow-50';
    }
    
    return className;
  };

  const getMonthHeaderClassName = (month: string) => {
    let className = 'table-header text-center px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider';
    
    if (isCurrentMonth(month)) {
      className += ' bg-blue-100 border-l-2 border-blue-500';
    } else if (isPastMonth(month)) {
      className += ' bg-gray-100';
    } else {
      className += ' bg-yellow-100';
    }
    
    return className;
  };

  const getRowStyle = (projectId: string) => {
    const managerColor = getProjectManagerColor(projectId);
    if (managerColor) {
      return {
        backgroundColor: `${managerColor}15`,
        borderLeft: `4px solid ${managerColor}`,
        '--manager-color': managerColor
      } as React.CSSProperties;
    }
    return {};
  };

  const getCellBackgroundClass = (projectId: string) => {
    const managerColor = getProjectManagerColor(projectId);
    return managerColor ? '' : 'bg-white'; // Only use bg-white if no manager assigned
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Projections Table</h3>
        <p className="text-sm text-gray-600">
          Historical data (gray), current month (blue), future projections (yellow) - click to edit
        </p>
        {/* Temporary debug button */}
        <button
          onClick={() => {
            // Test assignment
            if (projectManagers.length > 0 && billingData.length > 0) {
              const testProjectId = billingData[0].projectId;
              const testManagerId = projectManagers[0].id;
              handleAssignProjectManager(testProjectId, testManagerId);
            }
          }}
          className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
        >
          Debug: Test Assignment
        </button>
      </div>
      
      <div className="overflow-x-auto overflow-y-auto max-h-96 projections-table-container" ref={tableRef}>
        <div className="flex">
          {/* Frozen columns table - fixed position */}
          <div className="flex-shrink-0 sticky left-0 z-50 bg-white">
            <table className="divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-30">
                <tr>
                  <th className="w-24 px-4 py-3 border-b border-gray-300 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">Project</th>
                  <th className="w-32 px-4 py-3 border-b border-gray-300 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">Signed Fee</th>
                  <th className="w-32 px-4 py-3 border-b border-gray-300 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">Total ASR Fee</th>
                  <th className="w-32 px-4 py-3 border-b border-gray-300 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">Total Fee</th>
                  <th className="w-32 px-4 py-3 border-b border-gray-300 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">Total Projected</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billingData
                  .filter(project => !closedProjects.has(project.projectId))
                  .map((project) => {
                  const totalProjected = getTotalProjected(project.projectId);
                  const totalFee = getTotalFee(project);
                  const asrFee = getAsrFee(project.projectId);
                  const isEditingAsrFee = editingAsrFee === project.projectId;
                  const managerColor = getProjectManagerColor(project.projectId);
                  const assignedManager = projectManagers.find(m => m.id === projectAssignments[project.projectId]);
                  
                  return (
                    <tr 
                      key={project.projectId} 
                      className={`hover:bg-gray-50 h-18 ${managerColor ? 'manager-assigned' : ''}`} 
                      style={getRowStyle(project.projectId)}
                    >
                      <td className={`w-24 px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-900 border-r border-gray-200 h-18 ${getCellBackgroundClass(project.projectId)}`}>
                        <div className="flex items-center justify-between h-full relative">
                          <div className="flex items-center space-x-2 flex-1">
                            {assignedManager && (
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: assignedManager.color }}
                                title={assignedManager.name}
                              />
                            )}
                            <span className="break-words leading-tight flex-1 line-clamp-2 project-name">{project.projectName}</span>
                          </div>
                          <div className="relative dropdown-container flex-shrink-0 ml-1">
                            <button
                              onClick={(e) => toggleDropdown(project.projectId, e)}
                              className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 dropdown-trigger"
                              data-project-id={project.projectId}
                            >
                              <User className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td 
                        className={`w-32 px-4 py-2 border-b border-gray-200 text-sm text-right border-r border-gray-200 cursor-pointer hover:bg-yellow-50 h-18 ${getCellBackgroundClass(project.projectId)}`}
                        onClick={() => handleSignedFeeClick(project.projectId, signedFees[project.projectId] || 0)}
                      >
                        {editingSignedFee === project.projectId ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSignedFeeSave}
                            onKeyDown={handleKeyPress}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          (() => {
                            const userSignedFee = signedFees[project.projectId];
                            const displayValue = userSignedFee || 0;
                            
                            return formatCurrency(displayValue);
                          })()
                        )}
                      </td>
                      <td 
                        className={`w-32 px-4 py-2 border-b border-gray-200 text-sm text-right border-r border-gray-200 cursor-pointer hover:bg-yellow-50 h-18 ${getCellBackgroundClass(project.projectId)}`}
                        onClick={() => handleAsrFeeClick(project.projectId, asrFee)}
                      >
                        {isEditingAsrFee ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleAsrFeeSave}
                            onKeyDown={handleKeyPress}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          formatCurrency(asrFee)
                        )}
                      </td>
                      <td className={`w-32 px-4 py-2 border-b border-gray-200 text-sm text-right font-medium text-gray-900 border-r border-gray-200 h-18 ${getCellBackgroundClass(project.projectId)}`}>
                        {formatCurrency(totalFee)}
                      </td>
                      <td className={`w-32 px-4 py-2 border-b border-gray-200 text-sm text-right font-medium text-gray-900 border-r border-gray-200 h-18 ${getCellBackgroundClass(project.projectId)}`}>
                        {formatCurrency(totalProjected)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="w-24 px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-900 border-r border-gray-200 bg-gray-50 h-18" colSpan={5}>
                    Totals
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
  
          {/* Scrollable columns table - no separate scroll container */}
          <div className="flex-shrink-0 scrollable-table">
            <table className="divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-30">
                <tr>
                  {monthRange.map((month) => (
                    <th key={month} className={`w-32 px-4 py-3 border-b border-gray-300 text-center text-xs font-medium text-gray-500 uppercase tracking-wider ${getMonthHeaderClassName(month)}`}>
                      {formatMonth(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billingData
                  .filter(project => !closedProjects.has(project.projectId))
                  .map((project) => (
                  <tr 
                    key={project.projectId} 
                    className={`hover:bg-gray-50 h-18 ${getProjectManagerColor(project.projectId) ? 'manager-assigned' : ''}`} 
                    style={getRowStyle(project.projectId)}
                  >
                    {monthRange.map((month) => {
                      const currentValue = getCellValue(project.projectId, month);
                      const isEditing = editingCell?.projectId === project.projectId && editingCell?.month === month;
  
                      return (
                        <td
                          key={month}
                          className={`w-32 px-4 py-2 border-b border-gray-200 text-sm text-right h-18 ${getCellClassName(month, true)} ${getCellBackgroundClass(project.projectId)}`}
                          onClick={() => handleCellClick(project.projectId, month, currentValue)}
                        >
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={handleKeyPress}
                              className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                              autoFocus
                            />
                          ) : (
                            formatCurrency(currentValue)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  {monthRange.map((month) => {
                    const monthTotal = billingData.reduce((sum, project) => {
                      return sum + getCellValue(project.projectId, month);
                    }, 0);
                    
                    let footerClassName = "w-32 px-4 py-2 border-b border-gray-200 text-sm text-right font-medium text-gray-900 h-18";
                    if (isCurrentMonth(month)) {
                      footerClassName += " bg-blue-100 border-l-2 border-blue-500";
                    }
                    
                    return (
                      <td key={month} className={footerClassName}>
                        {formatCurrency(monthTotal)}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Closed Projects Section */}
      {closedProjects.size > 0 && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="px-6 py-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Closed Projects ({closedProjects.size})</h4>
            <div className="space-y-2">
              {billingData
                .filter(project => closedProjects.has(project.projectId))
                .map((project) => (
                  <div key={project.projectId} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div>
                      <span className="font-medium text-gray-900">{project.projectName}</span>
                      <span className="text-sm text-gray-500 ml-2">({project.customerName})</span>
                    </div>
                    <button
                      onClick={() => handleProjectReopen(project.projectId)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
                    >
                      Reopen
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating dropdown menu */}
      {openDropdown && dropdownPosition && (
        <div 
          ref={dropdownRef}
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[9999] min-w-max"
          data-dropdown="true"
          style={{
            left: `${dropdownPosition.x}px`,
            top: `${dropdownPosition.y}px`,
            pointerEvents: 'auto'
          }}
        >
          {/* Assign Project Manager */}
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-500 mb-2">Assign Project Manager</div>
            {projectManagers.length === 0 ? (
              <div className="text-xs text-gray-400 italic">No project managers available</div>
            ) : (
              <div className="space-y-1">
                {projectManagers.map((manager) => (
                  <button
                    key={manager.id}
                    onClick={() => handleAssignProjectManager(openDropdown, manager.id)}
                    className="w-full flex items-center space-x-2 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded"
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: manager.color }}
                    />
                    <span>{manager.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remove Project Manager */}
          {projectAssignments[openDropdown] && (
            <button
              onClick={() => handleRemoveProjectManager(openDropdown)}
              className="w-full px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center"
            >
              <User className="h-4 w-4 mr-2" />
              Remove Manager
            </button>
          )}

          {/* Close Project */}
          <button
            onClick={() => handleProjectClose(openDropdown)}
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
          >
            <X className="h-4 w-4 mr-2" />
            Close Project
          </button>
        </div>
      )}
    </div>
  );
}