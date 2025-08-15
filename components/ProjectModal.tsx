'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Calendar, DollarSign, Clock, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProjectDetails {
  id: string;
  name?: string;
  customer?: string;
  status?: 'active' | 'completed' | 'on-hold';
  startDate?: string;
  endDate?: string;
  budget?: number;
  billed?: number;
  hours?: number;
  efficiency?: number;
  revenue?: number;
  profitMargin?: number;
  multiplier?: number;
  projectId?: string; // Alternative ID field
  totalHours?: number; // Clockify data
  billableHours?: number; // Clockify data
  entryCount?: number; // Clockify data
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectDetails;
}

export default function ProjectModal({ isOpen, onClose, project }: ProjectModalProps) {
  if (!project) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {project.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">{project.customer}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Project Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge className={`${getStatusColor(project.status || 'unknown')} border`}>
                    {project.status?.charAt(0).toUpperCase() + (project.status || '').slice(1)}
                  </Badge>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(project.startDate || '').toLocaleDateString()}</span>
                    {project.endDate && (
                      <>
                        <span>-</span>
                        <span>{new Date(project.endDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Budget</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(project.budget || 0)}
                  </p>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Revenue</p>
                        <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          {formatCurrency(project.revenue || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm text-green-600 dark:text-green-400">Hours</p>
                        <p className="text-xl font-bold text-green-900 dark:text-green-100">
                          {project.hours || 0}h
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Target className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-600 dark:text-purple-400">Efficiency</p>
                        <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                          {formatPercentage(project.efficiency || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Profit Margin</p>
                        <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                          {formatPercentage(project.profitMargin || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Summary */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Financial Summary</CardTitle>
                  <CardDescription>Project financial performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Budget</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(project.budget || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Amount Billed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(project.billed || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Remaining</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency((project.budget || 0) - (project.billed || 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clockify Time Tracking Data */}
              {(project.totalHours || project.billableHours || project.entryCount) && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Time Tracking (Clockify)</CardTitle>
                    <CardDescription>Project time tracking data from Clockify</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Hours</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(project.totalHours || 0).toFixed(1)}h
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Billable Hours</p>
                        <p className="text-2xl font-bold text-green-600">
                          {(project.billableHours || 0).toFixed(1)}h
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Time Entries</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {project.entryCount || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Project Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors duration-200"
                >
                  Close
                </button>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                  View Full Details
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
