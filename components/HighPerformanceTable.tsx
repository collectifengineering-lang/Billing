'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { formatCurrency, formatMonth, isCurrentMonth, isPastMonth, getProjectionsMonthRange } from '../lib/utils';
import { BillingData } from '../lib/types';
import { User, X, ChevronUp, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import CSVImportExport from './CSVImportExport';
import useSWR, { mutate } from 'swr';

interface HighPerformanceTableProps {
  billingData: BillingData[];
  projections: any;
  onUpdateProjections: (projections: any) => void;
  closedProjects?: Set<string>;
  onClosedProjectsChange?: (closedProjects: Set<string>) => void;
  useDB?: boolean;
}

interface ProjectManager {
  id: string;
  name: string;
  color: string;
}

interface ProjectAssignment {
  [projectId: string]: string;
}

type SortField = 'projectName' | 'signedFee' | 'asrFee' | 'totalFee' | 'projected' | string; // string for month sorting
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

/**
 * High Performance Table Component with Sorting Functionality
 * 
 * Features:
 * - Virtualized rendering for large datasets
 * - Clickable headers for sorting by:
 *   - Project Name (alphabetical)
 *   - Signed Fee (numerical)
 *   - Total ASR Fee (numerical)
 *   - Total Fee (numerical)
 *   - Projected Total (numerical)
 *   - Individual month projections (numerical)
 * - Visual sort indicators (chevron up/down)
 * - Hover effects for better UX
 * - Maintains existing editing and data management features
 * - Always uses database via SWR (no localStorage fallback)
 */
export default function HighPerformanceTable({ 
  billingData, 
  projections, 
  onUpdateProjections,
  closedProjects: externalClosedProjects,
  onClosedProjectsChange,
  useDB = true
}: HighPerformanceTableProps) {
  // Handle undefined or null billingData
  const safeBillingData = billingData || [];
  
  // State management
  const [editingCell, setEditingCell] = useState<{ projectId: string; month: string } | null>(null);
  const [editingAsrFee, setEditingAsrFee] = useState<string | null>(null);
  const [editingSignedFee, setEditingSignedFee] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number } | null>(null);
  const [openMenuCell, setOpenMenuCell] = useState<{ projectId: string; month: string } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingCommentCell, setEditingCommentCell] = useState<{ projectId: string; month: string } | null>(null);
  const [commentValue, setCommentValue] = useState('');
  const [commentPosition, setCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [closedProjects, setClosedProjects] = useState<Set<string>>(externalClosedProjects || new Set());
  const [projectManagers, setProjectManagers] = useState<ProjectManager[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment>({});
  const [isScrolledHorizontal, setIsScrolledHorizontal] = useState(false);
  
  // Sorting state
  const [sortState, setSortState] = useState<SortState>({ field: 'projectName', direction: 'asc' });
  
  // Filter state
  const [filterText, setFilterText] = useState('');
  
  // SWR data fetching with enhanced configuration for real-time sync
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  
  const swrConfig = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 0, // Disable auto-refresh, rely on focus/reconnect
  };
  
  const { data: signedFeesData, mutate: mutateSignedFees } = useSWR('/api/signed-fees', fetcher, swrConfig);
  const { data: asrFeesData, mutate: mutateAsrFees } = useSWR('/api/asr-fees', fetcher, swrConfig);
  const { data: monthlyProjectionsData, mutate: mutateMonthlyProjections } = useSWR('/api/projections', fetcher, swrConfig);
  const { data: monthlyStatusesData, mutate: mutateMonthlyStatuses } = useSWR('/api/statuses', fetcher, swrConfig);
  const { data: monthlyCommentsData, mutate: mutateMonthlyComments } = useSWR('/api/comments', fetcher, swrConfig);
  const { data: closedProjectsData, mutate: mutateClosedProjects } = useSWR('/api/closed-projects', fetcher, swrConfig);
  const { data: projectAssignmentsData, mutate: mutateProjectAssignments } = useSWR('/api/project-assignments', fetcher, swrConfig);
  const { data: projectManagersData, mutate: mutateProjectManagers } = useSWR('/api/project-managers', fetcher, swrConfig);

  // User-entered data persistence (only for immediate UI updates, always sync with SWR)
  const [signedFees, setSignedFees] = useState<Record<string, number>>({});
  const [asrFees, setAsrFees] = useState<Record<string, number>>({});
  const [monthlyProjections, setMonthlyProjections] = useState<Record<string, Record<string, number>>>({});
  const [monthlyStatuses, setMonthlyStatuses] = useState<Record<string, Record<string, string>>>({});
  const [monthlyComments, setMonthlyComments] = useState<Record<string, Record<string, string>>>({});

  // Refs for scroll synchronization
  const stickyListRef = useRef<HTMLDivElement>(null);
  const scrollableListRef = useRef<HTMLDivElement>(null);
  const scrollableHeaderRef = useRef<HTMLDivElement>(null);
  const scrollableFooterRef = useRef<HTMLDivElement>(null);
  const scrollableOuterRef = useRef<HTMLDivElement>(null);
  const bodyWrapperRef = useRef<HTMLDivElement>(null);
  const stickyBodyRef = useRef<HTMLDivElement>(null);
  const commentModalRef = useRef<HTMLDivElement>(null);

  // Dynamic height states
  const [bodyHeight, setBodyHeight] = useState(0);
  const [stickyBodyHeight, setStickyBodyHeight] = useState(0);
  const [hasVerticalScrollbar, setHasVerticalScrollbar] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [scrollbarHeight, setScrollbarHeight] = useState(0);

  // Performance optimizations
  const monthRange = useMemo(() => {
    return getProjectionsMonthRange();
  }, []);

  const currentMonth = useMemo(() => {
    return new Date().toISOString().slice(0, 7);
  }, []);

  // Sync SWR data with local state (always use database data as source of truth)
  useEffect(() => {
    if (signedFeesData && Object.keys(signedFeesData).length > 0) {
      setSignedFees(signedFeesData);
    }
  }, [signedFeesData]);

  useEffect(() => {
    if (asrFeesData && Object.keys(asrFeesData).length > 0) {
      setAsrFees(asrFeesData);
    }
  }, [asrFeesData]);

  useEffect(() => {
    if (monthlyProjectionsData && Object.keys(monthlyProjectionsData).length > 0) {
      setMonthlyProjections(monthlyProjectionsData);
    }
  }, [monthlyProjectionsData]);

  useEffect(() => {
    if (monthlyStatusesData && Object.keys(monthlyStatusesData).length > 0) {
      setMonthlyStatuses(monthlyStatusesData);
    }
  }, [monthlyStatusesData]);

  useEffect(() => {
    if (monthlyCommentsData && Object.keys(monthlyCommentsData).length > 0) {
      setMonthlyComments(monthlyCommentsData);
    }
  }, [monthlyCommentsData]);

  useEffect(() => {
    if (closedProjectsData && Array.isArray(closedProjectsData)) {
      const newClosedProjects = new Set(closedProjectsData);
      setClosedProjects(newClosedProjects);
      onClosedProjectsChange?.(newClosedProjects);
    }
  }, [closedProjectsData, onClosedProjectsChange]);

  useEffect(() => {
    if (projectAssignmentsData && typeof projectAssignmentsData === 'object') {
      setProjectAssignments(projectAssignmentsData);
    }
  }, [projectAssignmentsData]);

  useEffect(() => {
    if (projectManagersData && Array.isArray(projectManagersData)) {
      setProjectManagers(projectManagersData);
    }
  }, [projectManagersData]);

  // Debug component lifecycle
  useEffect(() => {
    return () => {
    };
  }, []);

  // Debug project managers state changes
  useEffect(() => {
    console.log('HighPerformanceTable: projectManagers state changed:', projectManagers);
  }, [projectManagers]);

  // Periodic check to ensure data is loaded (fallback mechanism)
  useEffect(() => {
    const checkDataInterval = setInterval(() => {
      const savedProjectManagers = localStorage.getItem('projectManagers');
      if (savedProjectManagers && Array.isArray(JSON.parse(savedProjectManagers)) && projectManagers.length === 0) {
        console.log('HighPerformanceTable: Periodic check found project managers but state is empty, reloading');
        setProjectManagers(JSON.parse(savedProjectManagers));
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkDataInterval);
  }, [projectManagers.length]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && dropdownPosition) {
        const target = event.target as HTMLElement;
        // Check if the click is outside the dropdown
        const dropdownElement = document.querySelector('[data-dropdown="true"]');
        if (dropdownElement && !dropdownElement.contains(target)) {
          setOpenDropdown(null);
          setDropdownPosition(null);
        }
      }
      
      if (openMenuCell && menuPosition) {
        const target = event.target as HTMLElement;
        // Check if the click is outside the status menu
        const menuElement = document.querySelector('[data-dropdown="true"]');
        if (menuElement && !menuElement.contains(target)) {
          setOpenMenuCell(null);
          setMenuPosition(null);
        }
      }

      if (editingCommentCell && commentModalRef.current) {
        const target = event.target as HTMLElement;
        // Check if the click is outside the comment editing modal
        if (!commentModalRef.current.contains(target)) {
          setEditingCommentCell(null);
          setCommentValue('');
          setCommentPosition(null);
        }
      }
    };

    if (openDropdown || openMenuCell || editingCommentCell) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, dropdownPosition, openMenuCell, menuPosition, editingCommentCell]);

  // Cross-tab synchronization removed - now using SWR for real-time sync

  // Vertical scroll synchronization
  useEffect(() => {
    const handleStickyScroll = () => {
      if (stickyListRef.current && scrollableListRef.current) {
        scrollableListRef.current.scrollTop = stickyListRef.current.scrollTop;
      }
    };

    const handleScrollableScroll = () => {
      if (stickyListRef.current && scrollableListRef.current) {
        stickyListRef.current.scrollTop = scrollableListRef.current.scrollTop;
      }
    };

    stickyListRef.current?.addEventListener('scroll', handleStickyScroll);
    scrollableListRef.current?.addEventListener('scroll', handleScrollableScroll);

    return () => {
      stickyListRef.current?.removeEventListener('scroll', handleStickyScroll);
      scrollableListRef.current?.removeEventListener('scroll', handleScrollableScroll);
    };
  }, []);

  // Hide vertical scrollbar on sticky section
  useEffect(() => {
    if (stickyListRef.current) {
      stickyListRef.current.classList.add('hide-scrollbar');
    }
    if (scrollableListRef.current) {
      scrollableListRef.current.style.overflowX = 'hidden';
    }
  }, []);

  // Autoscroll to current month
  useEffect(() => {
    if (scrollableOuterRef.current) {
      const currentIndex = monthRange.indexOf(currentMonth);
      if (currentIndex !== -1) {
        scrollableOuterRef.current.scrollLeft = currentIndex * 128;
      }
    }
  }, [monthRange, currentMonth]);

  // Handle horizontal scroll state on outer container
  useEffect(() => {
    const handleScroll = () => {
      if (scrollableOuterRef.current) {
        setIsScrolledHorizontal(scrollableOuterRef.current.scrollLeft > 0);
      }
    };
    scrollableOuterRef.current?.addEventListener('scroll', handleScroll);
    return () => {
      scrollableOuterRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Dynamic body height calculation
  useEffect(() => {
    if (bodyWrapperRef.current) {
      setBodyHeight(bodyWrapperRef.current.clientHeight);
    }
    const resizeObserver = new ResizeObserver(() => {
      if (bodyWrapperRef.current) {
        setBodyHeight(bodyWrapperRef.current.clientHeight);
      }
    });
    if (bodyWrapperRef.current) {
      resizeObserver.observe(bodyWrapperRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Dynamic sticky body height calculation
  useEffect(() => {
    if (stickyBodyRef.current) {
      setStickyBodyHeight(stickyBodyRef.current.clientHeight);
    }
    const resizeObserver = new ResizeObserver(() => {
      if (stickyBodyRef.current) {
        setStickyBodyHeight(stickyBodyRef.current.clientHeight);
      }
    });
    if (stickyBodyRef.current) {
      resizeObserver.observe(stickyBodyRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate scrollbar width once
  useEffect(() => {
    const calculateScrollbarWidth = () => {
      const div = document.createElement('div');
      div.style.overflowY = 'scroll';
      div.style.width = '50px';
      div.style.height = '50px';
      div.style.visibility = 'hidden';
      document.body.appendChild(div);
      const width = div.offsetWidth - div.clientWidth;
      document.body.removeChild(div);
      return width;
    };
    setScrollbarWidth(calculateScrollbarWidth());
  }, []);

  // Calculate scrollbar height once
  useEffect(() => {
    const calculateScrollbarHeight = () => {
      const div = document.createElement('div');
      div.style.overflowX = 'scroll';
      div.style.height = '50px';
      div.style.width = '50px';
      div.style.visibility = 'hidden';
      document.body.appendChild(div);
      const height = div.offsetHeight - div.clientHeight;
      document.body.removeChild(div);
      return height;
    };
    setScrollbarHeight(calculateScrollbarHeight());
  }, []);

  // Data getters using SWR data (database only, no localStorage fallback)
  const getCellValue = useCallback((projectId: string, month: string) => {
    return monthlyProjectionsData?.[projectId]?.[month] || 0;
  }, [monthlyProjectionsData]);

  const getAsrFee = useCallback((projectId: string) => {
    return asrFeesData?.[projectId] || 0;
  }, [asrFeesData]);

  const getTotalFee = useCallback((project: BillingData) => {
    // Only use API data, never Zoho signedFee
    const apiSignedFee = signedFeesData?.[project.projectId] || 0;
    const asrFee = getAsrFee(project.projectId);
    return apiSignedFee + asrFee;
  }, [signedFeesData, getAsrFee]);

  const getTotalProjected = useCallback((projectId: string) => {
    return monthRange.reduce((sum, month) => sum + getCellValue(projectId, month), 0);
  }, [monthRange, getCellValue]);

  const getProjectManagerColor = useCallback((projectId: string) => {
    const managerId = projectAssignmentsData?.[projectId];
    if (!managerId) return undefined;
    if (projectManagersData && !Array.isArray(projectManagersData)) {
      return projectManagersData[managerId]?.color;
    }
    const manager = (projectManagersData as ProjectManager[] | undefined)?.find((m: ProjectManager) => m.id === managerId);
    return manager?.color;
  }, [projectAssignmentsData, projectManagersData]);

  const getCellStatus = useCallback((projectId: string, month: string) => {
    return monthlyStatusesData?.[projectId]?.[month] || '';
  }, [monthlyStatusesData]);

  const getCellComment = useCallback((projectId: string, month: string) => {
    return monthlyCommentsData?.[projectId]?.[month] || '';
  }, [monthlyCommentsData]);

  const getCellClass = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-50';
      case 'Estimate': return 'bg-yellow-50';
      case 'Billed': return 'bg-green-50';
      case 'Other': return 'bg-purple-50';
      default: return '';
    }
  };

  // Event handlers
  const handleCellClick = useCallback((projectId: string, month: string, currentValue: number) => {
    setEditingCell({ projectId, month });
    setEditValue(currentValue.toString());
  }, []);

  const handleCellSave = useCallback(async () => {
    if (!editingCell) return;
    const { projectId, month } = editingCell;
    const newValue = parseFloat(editValue) || 0;
    
    try {
      await fetch('/api/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, month, value: newValue }),
      });
      
      // Update local state and refresh SWR data
      mutateMonthlyProjections();
      
      // Dispatch custom event to notify chart of projection changes
      window.dispatchEvent(new CustomEvent('projectionsUpdated'));
      
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving projection:', error);
      toast.error('Failed to save projection');
    }
  }, [editingCell, editValue, mutateMonthlyProjections]);

  const handleAsrFeeSave = useCallback(async () => {
    if (!editingAsrFee) return;
    const newValue = parseFloat(editValue) || 0;
    
    try {
      await fetch('/api/asr-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: editingAsrFee, value: newValue }),
      });
      
      // Update local state immediately
      setAsrFees(prev => ({
        ...prev,
        [editingAsrFee]: newValue
      }));
      
      // Also refresh SWR data
      mutateAsrFees();
      
      setEditingAsrFee(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving ASR fee:', error);
      toast.error('Failed to save ASR fee');
    }
  }, [editingAsrFee, editValue, mutateAsrFees]);

  const handleSignedFeeSave = useCallback(async () => {
    if (!editingSignedFee) return;
    const newValue = parseFloat(editValue) || 0;
    
    try {
      await fetch('/api/signed-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: editingSignedFee, value: newValue }),
      });
      
      // Update local state immediately
      setSignedFees(prev => ({
        ...prev,
        [editingSignedFee]: newValue
      }));
      
      // Also refresh SWR data
      mutateSignedFees();
      
      setEditingSignedFee(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving signed fee:', error);
      toast.error('Failed to save signed fee');
    }
  }, [editingSignedFee, editValue, mutateSignedFees]);

  const handleProjectClose = useCallback(async (projectId: string) => {
    try {
      await fetch('/api/closed-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      const updatedClosedProjects = new Set(closedProjects);
      updatedClosedProjects.add(projectId);
      setClosedProjects(updatedClosedProjects);
      onClosedProjectsChange?.(updatedClosedProjects);
      mutateClosedProjects();
      setOpenDropdown(null);
      toast.success('Project closed');
    } catch (error) {
      console.error('Error closing project:', error);
      toast.error('Failed to close project');
    }
  }, [closedProjects, onClosedProjectsChange, mutateClosedProjects]);

  const handleProjectReopen = useCallback(async (projectId: string) => {
    try {
      await fetch('/api/closed-projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      const updatedClosedProjects = new Set(closedProjects);
      updatedClosedProjects.delete(projectId);
      setClosedProjects(updatedClosedProjects);
      onClosedProjectsChange?.(updatedClosedProjects);
      mutateClosedProjects();
      toast.success('Project reopened');
    } catch (error) {
      console.error('Error reopening project:', error);
      toast.error('Failed to reopen project');
    }
  }, [closedProjects, onClosedProjectsChange, mutateClosedProjects]);

  const handleStatusSelect = async (status: string) => {
    if (!openMenuCell) return;
    const { projectId, month } = openMenuCell;
    
    try {
      if (status === 'Clear') {
        await fetch('/api/statuses', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, month }),
        });
      } else {
        await fetch('/api/statuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, month, status }),
        });
      }
      
      mutateMonthlyStatuses();
      
      // Dispatch custom event to notify chart of status changes
      window.dispatchEvent(new CustomEvent('projectionsUpdated'));
      
      setOpenMenuCell(null);
      setMenuPosition(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleMenuSelect = async (action: string) => {
    if (!openMenuCell) return;
    const { projectId, month } = openMenuCell;
    
    if (action === 'AddComment' || action === 'EditComment') {
      setEditingCommentCell(openMenuCell);
      setCommentValue(getCellComment(projectId, month));
      setCommentPosition(menuPosition);
      setOpenMenuCell(null);
      setMenuPosition(null);
      return;
    }
    
    if (action === 'RemoveComment') {
      try {
        await fetch('/api/comments', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, month }),
        });
        mutateMonthlyComments();
        setOpenMenuCell(null);
        setMenuPosition(null);
      } catch (error) {
        console.error('Error removing comment:', error);
        toast.error('Failed to remove comment');
      }
      return;
    }
    
    // Handle status actions
    await handleStatusSelect(action);
  };

  // Sorting functions
  const sortProjects = useCallback((projects: BillingData[]) => {
    return [...projects].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.field) {
        case 'projectName':
          aValue = a.projectName.toLowerCase();
          bValue = b.projectName.toLowerCase();
          break;
        case 'signedFee':
          aValue = signedFees[a.projectId] || a.signedFee || 0;
          bValue = signedFees[b.projectId] || b.signedFee || 0;
          break;
        case 'asrFee':
          aValue = getAsrFee(a.projectId);
          bValue = getAsrFee(b.projectId);
          break;
        case 'totalFee':
          aValue = getTotalFee(a);
          bValue = getTotalFee(b);
          break;
        case 'projected':
          aValue = getTotalProjected(a.projectId);
          bValue = getTotalProjected(b.projectId);
          break;
        default:
          // Handle month-specific sorting
          if (monthRange.includes(sortState.field)) {
            aValue = getCellValue(a.projectId, sortState.field);
            bValue = getCellValue(b.projectId, sortState.field);
          } else {
            return 0;
          }
          break;
      }

      if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortState, signedFees, getAsrFee, getTotalFee, getTotalProjected, monthRange, getCellValue]);

  const handleSort = useCallback((field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) return null;
    return sortState.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getMonthSortIcon = (month: string) => {
    if (sortState.field !== month) return null;
    return sortState.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // Use SWR data for closed projects (database only)
  const closedProjectsSet = useMemo(() => {
    if (closedProjectsData && Array.isArray(closedProjectsData)) {
      return new Set(closedProjectsData);
    }
    return new Set<string>();
  }, [closedProjectsData]);

  const activeProjects = sortProjects(safeBillingData.filter(project => !closedProjectsSet.has(project.projectId)));

  // Filter projects by project name
  const filteredProjects = useMemo(() => {
    if (!filterText.trim()) {
      return activeProjects;
    }
    return activeProjects.filter(project => 
      project.projectName.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [activeProjects, filterText]);

  // Debug logging
  console.log('HighPerformanceTable: safeBillingData length:', safeBillingData.length);
  console.log('HighPerformanceTable: activeProjects length:', activeProjects.length);
  console.log('HighPerformanceTable: filteredProjects length:', filteredProjects.length);
  console.log('HighPerformanceTable: closedProjects size:', closedProjects.size);
  if (safeBillingData.length > 0) {
    console.log('HighPerformanceTable: First billing data item:', safeBillingData[0]);
  }

  // Check for vertical scrollbar and set padding
  useEffect(() => {
    const checkScrollbar = () => {
      if (bodyWrapperRef.current) {
        const hasScrollbar = bodyWrapperRef.current.scrollHeight > bodyWrapperRef.current.clientHeight;
        setHasVerticalScrollbar(hasScrollbar);
        const effectiveWidth = scrollbarWidth || 15; // Fallback for overlay scrollbars
        const padding = hasScrollbar ? `${effectiveWidth}px` : '0';
        
        if (scrollableHeaderRef.current && scrollableHeaderRef.current.firstChild) {
          (scrollableHeaderRef.current.firstChild as HTMLElement).style.paddingRight = padding;
        }
        if (scrollableFooterRef.current && scrollableFooterRef.current.firstChild) {
          (scrollableFooterRef.current.firstChild as HTMLElement).style.paddingRight = padding;
        }
      }
    };
    checkScrollbar();
    const observer = new ResizeObserver(checkScrollbar);
    if (bodyWrapperRef.current) {
      observer.observe(bodyWrapperRef.current);
    }
    const interval = setInterval(checkScrollbar, 500); // Poll for dynamic changes
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [activeProjects.length, scrollbarWidth]);

  const handleImportData = async (importedData: Record<string, Record<string, number>>) => {
    try {
      // Import data via API calls
      const importPromises: Promise<Response>[] = [];
      
      Object.keys(importedData).forEach(projectId => {
        Object.keys(importedData[projectId]).forEach(month => {
          const value = importedData[projectId][month];
          if (value !== 0) { // Only import non-zero values
            importPromises.push(
              fetch('/api/projections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, month, value }),
              })
            );
          }
        });
      });
      
      if (importPromises.length > 0) {
        await Promise.all(importPromises);
        mutateMonthlyProjections();
        toast.success('Data imported successfully');
      }
      
      // Trigger parent update if callback exists
      if (onUpdateProjections) {
        onUpdateProjections(importedData);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Projections Table</h3>
            <p className="text-sm text-gray-600">
              Virtualized table with {filteredProjects.length} active projects - click any cell to edit
            </p>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Filter projects by name..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {filterText && (
            <div className="mt-2 text-sm text-gray-600">
              Showing {filteredProjects.length} of {activeProjects.length} projects
            </div>
          )}
        </div>
        
        {/* CSV Import/Export Component */}
        <CSVImportExport
          billingData={safeBillingData}
          monthlyProjections={monthlyProjections}
          asrFees={asrFees}
          signedFees={signedFees}
          monthRange={monthRange}
          onImportData={handleImportData}
        />
      </div>

      {/* Main table container with proper scroll handling */}
      <div className="relative table-container">
        {/* Sticky columns container */}
        <div className="absolute left-0 top-0 z-30 bg-white flex flex-col" style={{ width: '776px', height: '600px' }}>
          {/* Sticky header */}
          <div className="flex bg-gray-50 border-b border-gray-200 sticky-header">
            <div className="flex-shrink-0 w-[264px] bg-gray-50 border-r border-gray-200">
              <div 
                className="h-18 px-4 py-3 flex items-center justify-start cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => handleSort('projectName')}
              >
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider leading-none whitespace-nowrap group-hover:text-gray-700">
                  Project
                </span>
                <div className="ml-1 text-gray-400 group-hover:text-gray-600">
                  {getSortIcon('projectName')}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
              <div 
                className="h-18 px-4 py-3 flex items-center justify-end cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => handleSort('signedFee')}
              >
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider leading-none whitespace-nowrap group-hover:text-gray-700">
                  Signed Fee
                </span>
                <div className="ml-1 text-gray-400 group-hover:text-gray-600">
                  {getSortIcon('signedFee')}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
              <div 
                className="h-18 px-4 py-3 flex items-center justify-end cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => handleSort('asrFee')}
              >
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider leading-none whitespace-nowrap group-hover:text-gray-700">
                  Total ASR Fee
                </span>
                <div className="ml-1 text-gray-400 group-hover:text-gray-600">
                  {getSortIcon('asrFee')}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
              <div 
                className="h-18 px-4 py-3 flex items-center justify-end cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => handleSort('totalFee')}
              >
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider leading-none whitespace-nowrap group-hover:text-gray-700">
                  Total Fee
                </span>
                <div className="ml-1 text-gray-400 group-hover:text-gray-600">
                  {getSortIcon('totalFee')}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
              <div 
                className="h-18 px-4 py-3 flex items-center justify-end cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => handleSort('projected')}
              >
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider leading-none whitespace-nowrap group-hover:text-gray-700">
                  Projected
                </span>
                <div className="ml-1 text-gray-400 group-hover:text-gray-600">
                  {getSortIcon('projected')}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky rows for first 5 columns */}
          <div ref={stickyBodyRef} className="flex-1 hide-scrollbar" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
            <List
              height={stickyBodyHeight}
              itemCount={filteredProjects.length}
              itemSize={72}
              width={776}
              outerRef={stickyListRef}
              overscanCount={5}
            >
              {({ index, style }) => {
                const project = filteredProjects[index];
                if (!project) return null;

                const totalProjected = getTotalProjected(project.projectId);
                const totalFee = getTotalFee(project);
                const asrFee = getAsrFee(project.projectId);
                const isEditingAsrFee = editingAsrFee === project.projectId;
                const managerId = projectAssignmentsData?.[project.projectId] || projectAssignments[project.projectId];
                const assignedManager = projectManagersData?.[managerId] || projectManagers.find(m => m.id === managerId);

                return (
                  <div style={style} className="flex border-b border-gray-200 sticky-column">
                    <div className="flex-shrink-0 w-[264px] bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center h-18 px-4">
                        <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                          <div className="flex items-center">
                            {assignedManager && (
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: assignedManager.color }}
                              />
                            )}
                            <span className="text-xs font-medium text-gray-900 truncate" title={project.projectName}>
                              {project.projectName}
                            </span>
                          </div>
                          {assignedManager && (
                            <span className="text-xs text-gray-500 italic truncate">
                              {assignedManager.name}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            setOpenDropdown(project.projectId);
                            setDropdownPosition({ x: e.clientX, y: e.clientY });
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <User className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
                      <div className="h-18 px-4 py-2 text-center">
                        {editingSignedFee === project.projectId ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSignedFeeSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleSignedFeeSave()}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          (() => {
                            // Only use user-entered data or API data, ignore Zoho signedFee
                            const userSignedFee = signedFees[project.projectId];
                            const apiSignedFee = signedFeesData?.[project.projectId];
                            
                            // Use user-entered data first, then API data, never Zoho data
                            const displayValue = userSignedFee !== undefined ? userSignedFee : 
                                              (apiSignedFee !== undefined ? apiSignedFee : 0);
                            
                            return (
                              <div 
                                className="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                                onClick={() => {
                                  setEditingSignedFee(project.projectId);
                                  setEditValue(displayValue.toString());
                                }}
                              >
                                {formatCurrency(displayValue)}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
                      <div className="h-18 px-4 py-2 text-center">
                        {isEditingAsrFee ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleAsrFeeSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleAsrFeeSave()}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => {
                              setEditingAsrFee(project.projectId);
                              setEditValue(asrFee.toString());
                            }}
                          >
                            {formatCurrency(asrFee)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
                      <div className="h-18 px-4 py-2 text-center text-sm font-medium">
                        {formatCurrency(totalFee)}
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
                      <div className="h-18 px-4 py-2 text-center text-sm font-medium">
                        {formatCurrency(totalProjected)}
                      </div>
                    </div>
                  </div>
                );
              }}
            </List>
          </div>

          {/* Sticky footer for first 5 columns */}
          <div className="flex bg-gray-50 border-t border-gray-200">
            <div className="flex-shrink-0 w-[264px] bg-gray-50 border-r border-gray-200">
              <div className="h-18 px-4 py-2 text-left text-sm font-medium text-gray-900">
                Totals
              </div>
            </div>
            <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
              <div className="h-18 px-4 py-2 text-center text-sm font-medium text-gray-900">
                {formatCurrency(safeBillingData.reduce((sum, project) => {
                  const userSignedFee = signedFees[project.projectId];
                  const apiSignedFee = signedFeesData?.[project.projectId];
                  const finalSignedFee = userSignedFee !== undefined ? userSignedFee : 
                                        (apiSignedFee !== undefined ? apiSignedFee : 0);
                  return sum + finalSignedFee;
                }, 0))}
              </div>
            </div>
            <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
              <div className="h-18 px-4 py-2 text-center text-sm font-medium text-gray-900">
                {formatCurrency(safeBillingData.reduce((sum, project) => sum + getAsrFee(project.projectId), 0))}
              </div>
            </div>
            <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
              <div className="h-18 px-4 py-2 text-center text-sm font-medium text-gray-900">
                {formatCurrency(safeBillingData.reduce((sum, project) => sum + getTotalFee(project), 0))}
              </div>
            </div>
            <div className="flex-shrink-0 w-32 bg-gray-50 border-r border-gray-200">
              <div className="h-18 px-4 py-2 text-center text-sm font-medium text-gray-900">
                {formatCurrency(safeBillingData.reduce((sum, project) => sum + getTotalProjected(project.projectId), 0))}
              </div>
            </div>
          </div>
          <div style={{ height: `${scrollbarHeight}px` }}></div>
        </div>

        {/* Scrollable content container */}
        <div ref={scrollableOuterRef} className={`overflow-x-auto overflow-y-hidden scrollable-outer ${isScrolledHorizontal ? 'scrolled-horizontal' : ''}`} style={{ height: '600px', marginLeft: '776px' }}>
          <div style={{ width: `${monthRange.length * 128}px`, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Scrollable header */}
            <div ref={scrollableHeaderRef} className="scrollable-header">
              <div className="flex bg-gray-50 border-b border-gray-200 sticky-header header-flex">
                {monthRange.map((month) => {
                  return (
                    <div
                      key={month}
                      className="flex-shrink-0 w-32 flex items-center justify-center px-4 py-3 border-r border-gray-200 h-18 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort(month)}
                      title={`Click to sort by ${formatMonth(month)} projections`}
                    >
                      <div className="flex flex-col items-center group-hover:text-gray-700">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider leading-none whitespace-nowrap group-hover:text-gray-700">
                          {formatMonth(month)}
                        </span>
                        <div className="text-gray-400 mt-0.5 group-hover:text-gray-600">
                          {getMonthSortIcon(month)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scrollable rows */}
            <div ref={bodyWrapperRef} className="flex-1 body-wrapper" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
              <List
                height={bodyHeight}
                itemCount={filteredProjects.length}
                itemSize={72}
                width={monthRange.length * 128}
                outerRef={scrollableListRef}
                overscanCount={5}
              >
                {({ index, style }) => {
                  const project = filteredProjects[index];
                  if (!project) return null;

                  return (
                    <div style={style} className="flex border-b border-gray-200">
                      {monthRange.map((month) => {
                        const currentValue = getCellValue(project.projectId, month);
                        const isEditing = editingCell?.projectId === project.projectId && editingCell?.month === month;
                        
                        return (
                          <div
                            key={month}
                            className={`flex-shrink-0 w-32 h-18 px-4 py-2 text-center text-sm border-r border-gray-200 cursor-pointer relative ${getCellClass(getCellStatus(project.projectId, month)) || 'bg-white'}`}
                            onClick={() => handleCellClick(project.projectId, month, currentValue)}
                            title={getCellComment(project.projectId, month)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleCellSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                                className="w-full px-2 py-1 border border-blue-300 rounded text-sm"
                                autoFocus
                              />
                            ) : (
                              formatCurrency(currentValue)
                            )}
                            <button
                              className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 text-xs"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent cell edit
                                setOpenMenuCell({ projectId: project.projectId, month });
                                setMenuPosition({ x: e.clientX, y: e.clientY });
                              }}
                            >
                              ⋯
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              </List>
            </div>

            {/* Scrollable footer */}
            <div ref={scrollableFooterRef} className="scrollable-footer">
              <div className="flex bg-gray-50 border-t border-gray-200 footer-flex">
                {monthRange.map((month, index) => {
                  const totals = monthRange.map(month => 
                    safeBillingData.reduce((sum, project) => sum + getCellValue(project.projectId, month), 0)
                  );
                  return (
                    <div
                      key={month}
                      className="flex-shrink-0 w-32 h-18 px-4 py-2 text-center text-sm font-medium text-gray-900 border-r border-gray-200 bg-gray-50"
                    >
                      {formatCurrency(totals[index])}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating dropdown menu */}
      {openDropdown && dropdownPosition && (
        <div 
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[9999] min-w-max"
          data-dropdown="true"
          style={{
            left: `${dropdownPosition.x}px`,
            top: `${dropdownPosition.y}px`,
            pointerEvents: 'auto'
          }}
        >
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-500 mb-2">Assign Project Manager</div>
            {(!projectManagersData || Object.keys(projectManagersData).length === 0) && projectManagers.length === 0 ? (
              <div className="text-xs text-gray-400 italic">No project managers available</div>
            ) : (
              <div className="space-y-1">
                {(projectManagersData && Object.keys(projectManagersData).length > 0
                  ? Object.entries(projectManagersData)
                      .map(([id, manager]: [string, any]) => (
                        <button
                          key={id}
                          onClick={async () => {
                            try {
                              await fetch('/api/project-assignments', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ projectId: openDropdown, managerId: id }),
                              });
                              mutateProjectAssignments();
                              setOpenDropdown(null);
                            } catch (error) {
                              console.error('Error assigning project manager:', error);
                              toast.error('Failed to assign project manager');
                            }
                          }}
                          className="w-full flex items-center space-x-2 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded"
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: manager.color }}
                          />
                          <span>{manager.name}</span>
                        </button>
                      ))
                  : projectManagers.map((manager) => (
                      <button
                        key={manager.id}
                        onClick={() => {
                          const updatedAssignments = { ...projectAssignments, [openDropdown]: manager.id };
                          setProjectAssignments(updatedAssignments);
                          localStorage.setItem('projectAssignments', JSON.stringify(updatedAssignments));
                          setOpenDropdown(null);
                        }}
                        className="w-full flex items-center space-x-2 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded"
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: manager.color }}
                        />
                        <span>{manager.name}</span>
                      </button>
                    )))}
              </div>
            )}
          </div>

          {(projectAssignmentsData?.[openDropdown] || projectAssignments[openDropdown]) && (
            <button
              onClick={async () => {
                try {
                  await fetch('/api/project-assignments', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: openDropdown }),
                  });
                  mutateProjectAssignments();
                  setOpenDropdown(null);
                } catch (error) {
                  console.error('Error removing project manager:', error);
                  toast.error('Failed to remove project manager');
                }
              }}
              className="w-full px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center"
            >
              <User className="h-4 w-4 mr-2" />
              Remove Manager
            </button>
          )}

          <button
            onClick={() => handleProjectClose(openDropdown)}
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
          >
            <X className="h-4 w-4 mr-2" />
            Close Project
          </button>
        </div>
      )}

      {/* Status menu dropdown */}
      {openMenuCell && menuPosition && (
        <div 
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[9999] min-w-[160px] py-1"
          data-dropdown="true"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            pointerEvents: 'auto'
          }}
        >
          {/* Status Section */}
          <div className="px-3 py-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</div>
            <button onClick={() => handleMenuSelect('Confirmed')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Confirmed</button>
            <button onClick={() => handleMenuSelect('Estimate')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Estimate</button>
            <button onClick={() => handleMenuSelect('Billed')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Billed</button>
            <button onClick={() => handleMenuSelect('Other')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Other</button>
            <button onClick={() => handleMenuSelect('Clear')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Clear</button>
          </div>
          
          {/* Divider */}
          <div className="border-t border-gray-200 my-1"></div>
          
          {/* Comment Section */}
          <div className="px-3 py-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Comment</div>
            <button onClick={() => handleMenuSelect(getCellComment(openMenuCell.projectId, openMenuCell.month) ? 'EditComment' : 'AddComment')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
              {getCellComment(openMenuCell.projectId, openMenuCell.month) ? 'Edit Comment' : 'Add Comment'}
            </button>
            {getCellComment(openMenuCell.projectId, openMenuCell.month) && (
              <button onClick={() => handleMenuSelect('RemoveComment')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Remove Comment</button>
            )}
          </div>
        </div>
      )}

      {/* Comment editing modal */}
      {editingCommentCell && commentPosition && (
        <div 
          ref={commentModalRef}
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[9999] min-w-[300px] max-w-md comment-modal"
          style={{
            left: `${commentPosition.x}px`,
            top: `${commentPosition.y}px`,
            pointerEvents: 'auto'
          }}
        >
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Edit Comment</h3>
            <button onClick={() => {
              setEditingCommentCell(null);
              setCommentValue('');
              setCommentPosition(null);
            }} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4">
            <textarea
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
          <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
            <button
              onClick={async () => {
                const { projectId, month } = editingCommentCell;
                const trimmed = commentValue.trim();
                
                try {
                  if (trimmed) {
                    await fetch('/api/comments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ projectId, month, comment: trimmed }),
                    });
                  } else {
                    await fetch('/api/comments', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ projectId, month }),
                    });
                  }
                  
                  mutateMonthlyComments();
                  setEditingCommentCell(null);
                  setCommentValue('');
                  setCommentPosition(null);
                } catch (error) {
                  console.error('Error saving comment:', error);
                  toast.error('Failed to save comment');
                }
              }}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
            >
              Save Comment
            </button>
            <button
              onClick={() => {
                setEditingCommentCell(null);
                setCommentValue('');
                setCommentPosition(null);
              }}
              className="ml-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .table-container {
          position: relative;
          overflow: hidden;
        }
        .sticky-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: inherit;
          overflow: hidden;
        }
        .sticky-column {
          position: sticky;
          left: 0;
          z-index: 30;
          background: white;
          overflow: hidden;
        }
        .scrolled-horizontal {
          box-shadow: inset -10px 0 8px -8px rgba(0,0,0,0.1);
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-horizontal-scrollbar {
          overflow-x: hidden !important;
        }
        .body-wrapper {
          scrollbar-gutter: stable;
        }
        .scrollable-header, .scrollable-footer {
          box-sizing: border-box;
        }
        .header-flex, .footer-flex {
          box-sizing: border-box;
        }
        .scrollable-outer {
          scrollbar-gutter: stable;
        }
      `}</style>
    </div>
  );
} 