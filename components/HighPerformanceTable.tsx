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
 */
export default function HighPerformanceTable({ 
  billingData, 
  projections, 
  onUpdateProjections,
  closedProjects: externalClosedProjects,
  onClosedProjectsChange
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
  
  // SWR data fetching
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  
  const { data: signedFeesData, mutate: mutateSignedFees } = useSWR('/api/signed-fees', fetcher);
  const { data: asrFeesData, mutate: mutateAsrFees } = useSWR('/api/asr-fees', fetcher);
  const { data: monthlyProjectionsData, mutate: mutateMonthlyProjections } = useSWR('/api/projections', fetcher);
  const { data: monthlyStatusesData, mutate: mutateMonthlyStatuses } = useSWR('/api/statuses', fetcher);
  const { data: monthlyCommentsData, mutate: mutateMonthlyComments } = useSWR('/api/comments', fetcher);
  const { data: closedProjectsData, mutate: mutateClosedProjects } = useSWR('/api/closed-projects', fetcher);
  const { data: projectAssignmentsData, mutate: mutateProjectAssignments } = useSWR('/api/project-assignments', fetcher);
  const { data: projectManagersData, mutate: mutateProjectManagers } = useSWR('/api/project-managers', fetcher);

  // User-entered data persistence (fallback to localStorage during migration)
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

  // Load data from localStorage and trigger migration if needed
  useEffect(() => {
    console.log('HighPerformanceTable: Component mounted, loading data from localStorage');
    
    const loadData = () => {
      try {
        console.log('HighPerformanceTable: Loading data from localStorage');
        
        const savedClosedProjects = localStorage.getItem('closedProjects');
        if (savedClosedProjects && Array.isArray(JSON.parse(savedClosedProjects))) {
          const newClosedProjects = new Set(JSON.parse(savedClosedProjects) as string[]);
          setClosedProjects(newClosedProjects);
          onClosedProjectsChange?.(newClosedProjects);
          console.log('HighPerformanceTable: Loaded closed projects:', savedClosedProjects);
        }

        const savedProjectManagers = localStorage.getItem('projectManagers');
        console.log('HighPerformanceTable: Raw project managers from localStorage:', savedProjectManagers);
        if (savedProjectManagers && Array.isArray(JSON.parse(savedProjectManagers))) {
          setProjectManagers(JSON.parse(savedProjectManagers));
          console.log('HighPerformanceTable: Loaded project managers:', savedProjectManagers);
        } else if (savedProjectManagers === null) {
          console.log('HighPerformanceTable: No project managers found in localStorage');
          // Don't reset to empty array if no data exists
        } else {
          console.log('HighPerformanceTable: Invalid project managers format, resetting to empty array');
          setProjectManagers([]);
        }

        const savedProjectAssignments = localStorage.getItem('projectAssignments');
        if (savedProjectAssignments && typeof JSON.parse(savedProjectAssignments) === 'object') {
          setProjectAssignments(JSON.parse(savedProjectAssignments));
          console.log('HighPerformanceTable: Loaded project assignments:', savedProjectAssignments);
        }

        const savedSignedFees = localStorage.getItem('signedFees');
        if (savedSignedFees && typeof JSON.parse(savedSignedFees) === 'object') {
          setSignedFees(JSON.parse(savedSignedFees));
        }

        const savedAsrFees = localStorage.getItem('asrFees');
        if (savedAsrFees && typeof JSON.parse(savedAsrFees) === 'object') {
          setAsrFees(JSON.parse(savedAsrFees));
        }

        const savedMonthlyProjections = localStorage.getItem('monthlyProjections');
        if (savedMonthlyProjections && typeof JSON.parse(savedMonthlyProjections) === 'object') {
          setMonthlyProjections(JSON.parse(savedMonthlyProjections));
        }

        const savedMonthlyStatuses = localStorage.getItem('monthlyStatuses');
        if (savedMonthlyStatuses && typeof JSON.parse(savedMonthlyStatuses) === 'object') {
          setMonthlyStatuses(JSON.parse(savedMonthlyStatuses));
        }

        const savedMonthlyComments = localStorage.getItem('monthlyComments');
        if (savedMonthlyComments && typeof JSON.parse(savedMonthlyComments) === 'object') {
          setMonthlyComments(JSON.parse(savedMonthlyComments));
        }
      } catch (error) {
        console.error('HighPerformanceTable: Error loading data from localStorage:', error);
        // Only clear specific corrupted data, not all data
        console.log('HighPerformanceTable: Attempting to clear only corrupted data');
      }
    };

    // Load data immediately
    loadData();

    // Trigger migration if there's localStorage data
    const triggerMigration = async () => {
      const hasLocalData = localStorage.getItem('monthlyProjections') || 
                          localStorage.getItem('signedFees') || 
                          localStorage.getItem('asrFees');
      
      if (hasLocalData) {
        try {
          console.log('HighPerformanceTable: Triggering migration from localStorage to database');
          await fetch('/api/migrate', { method: 'POST' });
          console.log('HighPerformanceTable: Migration completed');
        } catch (error) {
          console.error('HighPerformanceTable: Migration failed:', error);
        }
      }
    };

    triggerMigration();

    // Also listen for focus events to reload data when returning to the page
    const handleFocus = () => {
      console.log('HighPerformanceTable: Window focused, reloading data');
      loadData();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('HighPerformanceTable: Page became visible, reloading data');
        loadData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      console.log('HighPerformanceTable: Storage change event:', event.key, event.newValue);
      if (event.key === 'closedProjects' && event.newValue) {
        const newClosedProjects = new Set<string>(JSON.parse(event.newValue) as string[]);
        setClosedProjects(newClosedProjects);
        onClosedProjectsChange?.(newClosedProjects);
      }
      if (event.key === 'projectManagers' && event.newValue) {
        console.log('HighPerformanceTable: Processing project managers storage change:', event.newValue);
        setProjectManagers(JSON.parse(event.newValue));
      }
      if (event.key === 'projectAssignments' && event.newValue) {
        setProjectAssignments(JSON.parse(event.newValue));
      }
      if (event.key === 'signedFees' && event.newValue) {
        setSignedFees(JSON.parse(event.newValue));
      }
      if (event.key === 'asrFees' && event.newValue) {
        setAsrFees(JSON.parse(event.newValue));
      }
      if (event.key === 'monthlyProjections' && event.newValue) {
        setMonthlyProjections(JSON.parse(event.newValue));
        // Dispatch custom event to notify chart of projection changes
        window.dispatchEvent(new CustomEvent('projectionsUpdated'));
      }
      if (event.key === 'monthlyStatuses' && event.newValue) {
        setMonthlyStatuses(JSON.parse(event.newValue));
        // Dispatch custom event to notify chart of status changes
        window.dispatchEvent(new CustomEvent('projectionsUpdated'));
      }
      if (event.key === 'monthlyComments' && event.newValue) {
        setMonthlyComments(JSON.parse(event.newValue));
      }
    };

    const handleProjectManagersUpdate = () => {
      try {
        console.log('HighPerformanceTable: Handling project managers update event');
        const savedProjectManagers = localStorage.getItem('projectManagers');
        console.log('HighPerformanceTable: Retrieved project managers from localStorage:', savedProjectManagers);
        if (savedProjectManagers && Array.isArray(JSON.parse(savedProjectManagers))) {
          setProjectManagers(JSON.parse(savedProjectManagers));
          console.log('HighPerformanceTable: Updated project managers state:', savedProjectManagers);
        } else if (savedProjectManagers === null) {
          console.log('HighPerformanceTable: No project managers found during update');
          // Don't reset to empty array if no data exists
        } else {
          console.log('HighPerformanceTable: Invalid project managers format during update, resetting to empty array');
          setProjectManagers([]);
        }
      } catch (error) {
        console.error('HighPerformanceTable: Error handling project managers update:', error);
        setProjectManagers([]);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectManagersUpdated', handleProjectManagersUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectManagersUpdated', handleProjectManagersUpdate);
    };
  }, []);

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

  // Optimized data getters using SWR data with fallback to localStorage
  const getCellValue = useCallback((projectId: string, month: string) => {
    return monthlyProjectionsData?.[projectId]?.[month] || monthlyProjections[projectId]?.[month] || 0;
  }, [monthlyProjectionsData, monthlyProjections]);

  const getAsrFee = useCallback((projectId: string) => {
    return asrFeesData?.[projectId] || asrFees[projectId] || projections[projectId]?.asrFee || 0;
  }, [asrFeesData, asrFees, projections]);

  const getTotalFee = useCallback((project: BillingData) => {
    const signedFee = signedFeesData?.[project.projectId] || signedFees[project.projectId] || project.signedFee || 0;
    const asrFee = getAsrFee(project.projectId);
    return signedFee + asrFee;
  }, [signedFeesData, signedFees, getAsrFee]);

  const getTotalProjected = useCallback((projectId: string) => {
    return monthRange.reduce((sum, month) => sum + getCellValue(projectId, month), 0);
  }, [monthRange, getCellValue]);

  const getProjectManagerColor = useCallback((projectId: string) => {
    const managerId = projectAssignmentsData?.[projectId] || projectAssignments[projectId];
    const manager = projectManagersData?.[managerId] || projectManagers.find(m => m.id === managerId);
    return manager?.color;
  }, [projectAssignmentsData, projectAssignments, projectManagersData, projectManagers]);

  const getCellStatus = useCallback((projectId: string, month: string) => {
    return monthlyStatusesData?.[projectId]?.[month] || monthlyStatuses[projectId]?.[month] || '';
  }, [monthlyStatusesData, monthlyStatuses]);

  const getCellComment = useCallback((projectId: string, month: string) => {
    return monthlyCommentsData?.[projectId]?.[month] || monthlyComments[projectId]?.[month] || '';
  }, [monthlyCommentsData, monthlyComments]);

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
      
      // Update local state and refresh SWR data
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
      
      // Update local state and refresh SWR data
      mutateSignedFees();
      
      setEditingSignedFee(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving signed fee:', error);
      toast.error('Failed to save signed fee');
    }
  }, [editingSignedFee, editValue, mutateSignedFees]);

  const handleProjectClose = useCallback((projectId: string) => {
    const updatedClosedProjects = new Set(closedProjects);
    updatedClosedProjects.add(projectId);
    setClosedProjects(updatedClosedProjects);
    onClosedProjectsChange?.(updatedClosedProjects);
    localStorage.setItem('closedProjects', JSON.stringify(Array.from(updatedClosedProjects)));
    setOpenDropdown(null);
    toast.success('Project closed');
  }, [closedProjects, onClosedProjectsChange]);

  const handleProjectReopen = useCallback((projectId: string) => {
    const updatedClosedProjects = new Set(closedProjects);
    updatedClosedProjects.delete(projectId);
    setClosedProjects(updatedClosedProjects);
    onClosedProjectsChange?.(updatedClosedProjects);
    localStorage.setItem('closedProjects', JSON.stringify(Array.from(updatedClosedProjects)));
    toast.success('Project reopened');
  }, [closedProjects, onClosedProjectsChange]);

  const handleStatusSelect = (status: string) => {
    if (!openMenuCell) return;
    const { projectId, month } = openMenuCell;
    const updatedStatuses = { ...monthlyStatuses };
    if (status === 'Clear') {
      if (updatedStatuses[projectId]) {
        delete updatedStatuses[projectId][month];
        if (Object.keys(updatedStatuses[projectId]).length === 0) {
          delete updatedStatuses[projectId];
        }
      }
    } else {
      if (!updatedStatuses[projectId]) {
        updatedStatuses[projectId] = {};
      }
      updatedStatuses[projectId][month] = status;
    }
    setMonthlyStatuses(updatedStatuses);
    localStorage.setItem('monthlyStatuses', JSON.stringify(updatedStatuses));
    
    // Dispatch custom event to notify chart of status changes
    window.dispatchEvent(new CustomEvent('projectionsUpdated'));
    
    setOpenMenuCell(null);
    setMenuPosition(null);
  };

  const handleMenuSelect = (action: string) => {
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
      const updatedComments = { ...monthlyComments };
      if (updatedComments[projectId]) {
        delete updatedComments[projectId][month];
        if (Object.keys(updatedComments[projectId]).length === 0) {
          delete updatedComments[projectId];
        }
      }
      setMonthlyComments(updatedComments);
      localStorage.setItem('monthlyComments', JSON.stringify(updatedComments));
      setOpenMenuCell(null);
      setMenuPosition(null);
      return;
    }
    // Existing status logic
    const updatedStatuses = { ...monthlyStatuses };
    if (action === 'Clear') {
      if (updatedStatuses[projectId]) {
        delete updatedStatuses[projectId][month];
        if (Object.keys(updatedStatuses[projectId]).length === 0) {
          delete updatedStatuses[projectId];
        }
      }
    } else {
      if (!updatedStatuses[projectId]) {
        updatedStatuses[projectId] = {};
      }
      updatedStatuses[projectId][month] = action;
    }
    setMonthlyStatuses(updatedStatuses);
    localStorage.setItem('monthlyStatuses', JSON.stringify(updatedStatuses));
    
    // Dispatch custom event to notify chart of status changes
    window.dispatchEvent(new CustomEvent('projectionsUpdated'));
    
    setOpenMenuCell(null);
    setMenuPosition(null);
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

  // Use SWR data for closed projects with fallback to localStorage
  const closedProjectsSet = useMemo(() => {
    if (closedProjectsData && Array.isArray(closedProjectsData)) {
      return new Set(closedProjectsData);
    }
    return closedProjects;
  }, [closedProjectsData, closedProjects]);

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

  const handleImportData = (importedData: Record<string, Record<string, number>>) => {
    // Merge imported data with existing data
    const updatedMonthlyProjections = { ...monthlyProjections };
    
    Object.keys(importedData).forEach(projectId => {
      if (!updatedMonthlyProjections[projectId]) {
        updatedMonthlyProjections[projectId] = {};
      }
      
      Object.keys(importedData[projectId]).forEach(month => {
        updatedMonthlyProjections[projectId][month] = importedData[projectId][month];
      });
    });
    
    setMonthlyProjections(updatedMonthlyProjections);
    localStorage.setItem('monthlyProjections', JSON.stringify(updatedMonthlyProjections));
    
    // Trigger parent update if callback exists
    if (onUpdateProjections) {
      onUpdateProjections(updatedMonthlyProjections);
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
                          <div 
                            className="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                            onClick={() => {
                              setEditingSignedFee(project.projectId);
                              setEditValue((signedFees[project.projectId] || project.signedFee || 0).toString());
                            }}
                          >
                            {formatCurrency(signedFees[project.projectId] || project.signedFee || 0)}
                          </div>
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
                {formatCurrency(safeBillingData.reduce((sum, project) => sum + (signedFees[project.projectId] || project.signedFee || 0), 0))}
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
                {Object.values(projectManagersData || {}).map((manager: any) => (
                  <button
                    key={manager.id}
                    onClick={async () => {
                      try {
                        await fetch('/api/project-assignments', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ projectId: openDropdown, managerId: manager.id }),
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
                ))}
                {/* Fallback to localStorage data */}
                {projectManagers.map((manager) => (
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
                ))}
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
              onClick={() => {
                const { projectId, month } = editingCommentCell;
                const updatedComments = { ...monthlyComments };
                if (!updatedComments[projectId]) {
                  updatedComments[projectId] = {};
                }
                const trimmed = commentValue.trim();
                if (trimmed) {
                  updatedComments[projectId][month] = trimmed;
                } else {
                  delete updatedComments[projectId][month];
                  if (Object.keys(updatedComments[projectId]).length === 0) {
                    delete updatedComments[projectId];
                  }
                }
                setMonthlyComments(updatedComments);
                localStorage.setItem('monthlyComments', JSON.stringify(updatedComments));
                setEditingCommentCell(null);
                setCommentValue('');
                setCommentPosition(null);
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