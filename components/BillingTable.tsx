'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Save, X, Plus, DollarSign } from 'lucide-react';

// Define the data structure for billing data
interface MonthlyData {
  month: string;
  billed: number;
}

interface BillingProject {
  projectId: string;
  projectName: string;
  monthlyData: MonthlyData[];
}

interface BillingTableProps {
  data: BillingProject[];
  onDataChange?: (data: BillingProject[]) => void;
}

export default function BillingTable({ data, onDataChange }: BillingTableProps) {
  const [editingData, setEditingData] = useState<BillingProject[]>(data);
  const [editingCell, setEditingCell] = useState<{ projectId: string; month: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<BillingProject>>({
    projectId: '',
    projectName: '',
    monthlyData: []
  });

  // Handle cell edit start
  const handleEditStart = (projectId: string, month: string, currentValue: number) => {
    setEditingCell({ projectId, month });
    setEditValue(currentValue.toString());
  };

  // Handle cell edit save
  const handleEditSave = () => {
    if (!editingCell) return;

    const updatedData = editingData.map(project => {
      if (project.projectId === editingCell.projectId) {
        return {
          ...project,
          monthlyData: project.monthlyData.map(monthData => 
            monthData.month === editingCell.month
              ? { ...monthData, billed: parseFloat(editValue) || 0 }
              : monthData
          )
        };
      }
      return project;
    });

    setEditingData(updatedData);
    onDataChange?.(updatedData);
    setEditingCell(null);
    setEditValue('');
  };

  // Handle cell edit cancel
  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Add new project
  const handleAddProject = () => {
    if (!newProject.projectId || !newProject.projectName) return;

    const project: BillingProject = {
      projectId: newProject.projectId,
      projectName: newProject.projectName,
      monthlyData: newProject.monthlyData || []
    };

    const updatedData = [...editingData, project];
    setEditingData(updatedData);
    onDataChange?.(updatedData);
    setNewProject({ projectId: '', projectName: '', monthlyData: [] });
    setIsDialogOpen(false);
  };

  // Get all unique months from the data
  const allMonths = Array.from(
    new Set(editingData.flatMap(project => project.monthlyData.map(data => data.month)))
  ).sort();

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const getProjectTotal = (project: BillingProject) => {
    return project.monthlyData.reduce((sum, monthData) => sum + monthData.billed, 0);
  };

  const getMonthTotal = (month: string) => {
    return editingData.reduce((sum, project) => {
      const monthData = project.monthlyData.find(data => data.month === month);
      return sum + (monthData?.billed || 0);
    }, 0);
  };

  const getGrandTotal = () => {
    return editingData.reduce((sum, project) => sum + getProjectTotal(project), 0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Billing Projections Table
            </CardTitle>
            <CardDescription>
              Edit monthly billing amounts for each project. Click on any cell to edit.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
                <DialogDescription>
                  Enter the project details to add a new project to the table.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="projectId" className="text-right">
                    Project ID
                  </label>
                  <Input
                    id="projectId"
                    value={newProject.projectId}
                    onChange={(e) => setNewProject({ ...newProject, projectId: e.target.value })}
                    className="col-span-3"
                    placeholder="e.g., PROJ-001"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="projectName" className="text-right">
                    Project Name
                  </label>
                  <Input
                    id="projectName"
                    value={newProject.projectName}
                    onChange={(e) => setNewProject({ ...newProject, projectName: e.target.value })}
                    className="col-span-3"
                    placeholder="e.g., Website Redesign"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProject}>Add Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Project</TableHead>
                {allMonths.map(month => (
                  <TableHead key={month} className="text-center min-w-[120px]">
                    {month}
                  </TableHead>
                ))}
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editingData.map((project) => (
                <TableRow key={project.projectId}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{project.projectName}</div>
                      <div className="text-sm text-muted-foreground">{project.projectId}</div>
                    </div>
                  </TableCell>
                  {allMonths.map(month => {
                    const monthData = project.monthlyData.find(data => data.month === month);
                    const value = monthData?.billed || 0;
                    const isEditing = editingCell?.projectId === project.projectId && editingCell?.month === month;

                    return (
                      <TableCell key={month} className="text-center">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 w-20 text-center"
                              type="number"
                              step="0.01"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={handleEditSave}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={handleEditCancel}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-muted rounded px-2 py-1 flex items-center justify-center gap-1"
                            onClick={() => handleEditStart(project.projectId, month, value)}
                          >
                            <span>{formatCurrency(value)}</span>
                            <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold">
                    {formatCurrency(getProjectTotal(project))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>Total</TableCell>
                {allMonths.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(getMonthTotal(month))}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  {formatCurrency(getGrandTotal())}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
