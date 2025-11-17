
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Plus, Filter, Calendar, User, Users, Clock, Archive, Printer, Download } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface Checklist {
  _id: string;
  title: string;
  assignedTo: { _id: string; username: string };
  recurrence: {
    type: string;
    customInterval?: { unit: string; n: number };
  };
  status: string;
  startDate: string;
  nextRunDate?: string;
  items: Array<{ _id: string; title: string; isDone: boolean }>;
  createdAt: string;
}

const Checklists: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    recurrence: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchChecklists();
  }, [filters]);

  const fetchChecklists = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${address}/api/checklists?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChecklists(response.data);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (checklist: Checklist) => {
    if (!checklist.items.length) return 0;
    const completed = checklist.items.filter(item => item.isDone).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  const getRecurrenceLabel = (recurrence: Checklist['recurrence']) => {
    if (recurrence.type === 'custom') {
      return `Every ${recurrence.customInterval?.n} ${recurrence.customInterval?.unit}`;
    }
    return recurrence.type.charAt(0).toUpperCase() + recurrence.type.slice(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = () => {
    // Open a new window with a comprehensive print view
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Checklists Report - ${new Date().toLocaleDateString()}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          .header h1 {
            color: #2563eb;
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header .subtitle {
            color: #666;
            font-size: 14px;
          }
          .summary-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .stat-box {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          .stat-box .number {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
          }
          .stat-box .label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-top: 5px;
          }
          .checklist-section {
            page-break-inside: avoid;
            margin-bottom: 30px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .checklist-header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 15px 20px;
          }
          .checklist-header h2 {
            font-size: 20px;
            margin-bottom: 8px;
          }
          .checklist-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            font-size: 13px;
            opacity: 0.95;
          }
          .checklist-meta span {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-active { background: #10b981; color: white; }
          .status-submitted { background: #3b82f6; color: white; }
          .status-draft { background: #6b7280; color: white; }
          .status-archived { background: #ef4444; color: white; }
          .checklist-body {
            padding: 20px;
            background: white;
          }
          .progress-section {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .progress-bar-container {
            width: 100%;
            height: 24px;
            background: #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            margin: 10px 0;
          }
          .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            transition: width 0.3s ease;
          }
          .progress-text {
            font-size: 13px;
            color: #666;
            margin-top: 5px;
          }
          .items-section {
            margin-top: 15px;
          }
          .items-section h3 {
            font-size: 16px;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          .item {
            display: flex;
            align-items: flex-start;
            padding: 12px;
            margin-bottom: 8px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            page-break-inside: avoid;
          }
          .item.completed {
            background: #f0fdf4;
            border-color: #86efac;
          }
          .item-checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #9ca3af;
            border-radius: 4px;
            margin-right: 12px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          }
          .item.completed .item-checkbox {
            background: #22c55e;
            border-color: #22c55e;
            color: white;
          }
          .item-text {
            flex: 1;
            font-size: 14px;
          }
          .item.completed .item-text {
            color: #6b7280;
            text-decoration: line-through;
          }
          .item-number {
            color: #9ca3af;
            font-size: 12px;
            font-weight: bold;
            margin-right: 8px;
          }
          .no-items {
            text-align: center;
            padding: 30px;
            color: #9ca3af;
            font-style: italic;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
            .checklist-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Checklists Management Report</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary-stats">
          <div class="stat-box">
            <div class="number">${checklists.length}</div>
            <div class="label">Total Checklists</div>
          </div>
          <div class="stat-box">
            <div class="number">${checklists.filter(c => c.status === 'Active').length}</div>
            <div class="label">Active</div>
          </div>
          <div class="stat-box">
            <div class="number">${checklists.filter(c => c.status === 'Submitted').length}</div>
            <div class="label">Completed</div>
          </div>
          <div class="stat-box">
            <div class="number">${checklists.reduce((sum, c) => sum + c.items.length, 0)}</div>
            <div class="label">Total Items</div>
          </div>
        </div>

        ${checklists.map((checklist, idx) => {
          const progress = getProgressPercentage(checklist);
          const completedItems = checklist.items.filter(i => i.isDone).length;
          const totalItems = checklist.items.length;
          
          return `
            <div class="checklist-section">
              <div class="checklist-header">
                <h2>${idx + 1}. ${checklist.title}</h2>
                <div class="checklist-meta">
                  <span>👤 Assigned: ${checklist.assignedTo.username}</span>
                  <span>📅 Start: ${new Date(checklist.startDate).toLocaleDateString()}</span>
                  <span>🔄 ${getRecurrenceLabel(checklist.recurrence)}</span>
                  <span class="status-badge status-${checklist.status.toLowerCase()}">${checklist.status}</span>
                </div>
              </div>
              
              <div class="checklist-body">
                <div class="progress-section">
                  <strong>Progress Overview</strong>
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%">
                      ${progress}%
                    </div>
                  </div>
                  <div class="progress-text">
                    ✓ ${completedItems} of ${totalItems} items completed
                  </div>
                </div>

                <div class="items-section">
                  <h3>Checklist Items (${totalItems})</h3>
                  ${totalItems === 0 ? '<div class="no-items">No items in this checklist</div>' : ''}
                  ${checklist.items.map((item, itemIdx) => `
                    <div class="item ${item.isDone ? 'completed' : ''}">
                      <div class="item-checkbox">
                        ${item.isDone ? '✓' : ''}
                      </div>
                      <div class="item-text">
                        <span class="item-number">#${itemIdx + 1}</span>
                        ${item.title}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <div class="footer">
          <p><strong>Checklists Management System</strong></p>
          <p>This report contains ${checklists.length} checklist(s) with a total of ${checklists.reduce((sum, c) => sum + c.items.length, 0)} items</p>
          <p>Printed on ${new Date().toLocaleString()}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleDownloadComprehensivePDF = async () => {
    if (checklists.length === 0) return;

    try {
      // Create a comprehensive report element
      const element = document.createElement('div');
      element.style.width = '794px';
      element.style.padding = '40px';
      element.style.backgroundColor = '#ffffff';
      element.style.fontFamily = 'Arial, sans-serif';

      const totalItems = checklists.reduce((sum, c) => sum + c.items.length, 0);
      const activeCount = checklists.filter(c => c.status === 'Active').length;
      const completedCount = checklists.filter(c => c.status === 'Submitted').length;

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #2563eb;">
          <h1 style="color: #2563eb; font-size: 28px; margin: 0 0 10px 0;">📋 Checklists Management Report</h1>
          <p style="color: #666; font-size: 14px;">Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${checklists.length}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px;">Total Checklists</div>
          </div>
          <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${activeCount}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px;">Active</div>
          </div>
          <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${completedCount}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px;">Completed</div>
          </div>
          <div style="text-align: center; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${totalItems}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px;">Total Items</div>
          </div>
        </div>

        ${checklists.map((checklist, idx) => {
          const progress = getProgressPercentage(checklist);
          const completedItems = checklist.items.filter(i => i.isDone).length;
          const totalItems = checklist.items.length;

          return `
            <div style="page-break-inside: avoid; margin-bottom: 30px; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 15px 20px;">
                <h2 style="font-size: 20px; margin: 0 0 8px 0;">${idx + 1}. ${checklist.title}</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 20px; font-size: 13px;">
                  <span>👤 Assigned: ${checklist.assignedTo.username}</span>
                  <span>📅 Start: ${new Date(checklist.startDate).toLocaleDateString()}</span>
                  <span>🔄 ${getRecurrenceLabel(checklist.recurrence)}</span>
                  <span style="background: ${checklist.status === 'Active' ? '#10b981' : checklist.status === 'Submitted' ? '#3b82f6' : '#6b7280'}; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold;">${checklist.status}</span>
                </div>
              </div>
              
              <div style="padding: 20px; background: white;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                  <strong>Progress Overview</strong>
                  <div style="width: 100%; height: 24px; background: #e5e7eb; border-radius: 12px; overflow: hidden; margin: 10px 0;">
                    <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                      ${progress}%
                    </div>
                  </div>
                  <div style="font-size: 13px; color: #666;">✓ ${completedItems} of ${totalItems} items completed</div>
                </div>

                <div style="margin-top: 15px;">
                  <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Checklist Items (${totalItems})</h3>
                  ${totalItems === 0 ? '<div style="text-align: center; padding: 30px; color: #9ca3af; font-style: italic;">No items in this checklist</div>' : ''}
                  ${checklist.items.map((item, itemIdx) => `
                    <div style="display: flex; align-items: flex-start; padding: 12px; margin-bottom: 8px; background: ${item.isDone ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${item.isDone ? '#86efac' : '#e5e7eb'}; border-radius: 6px; page-break-inside: avoid;">
                      <div style="width: 20px; height: 20px; border: 2px solid ${item.isDone ? '#22c55e' : '#9ca3af'}; border-radius: 4px; margin-right: 12px; background: ${item.isDone ? '#22c55e' : 'transparent'}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; flex-shrink: 0;">
                        ${item.isDone ? '✓' : ''}
                      </div>
                      <div style="flex: 1; font-size: 14px; color: ${item.isDone ? '#6b7280' : '#333'}; text-decoration: ${item.isDone ? 'line-through' : 'none'};">
                        <span style="color: #9ca3af; font-size: 12px; font-weight: bold; margin-right: 8px;">#${itemIdx + 1}</span>
                        ${item.title}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p><strong>Checklists Management System</strong></p>
          <p>This report contains ${checklists.length} checklist(s) with a total of ${totalItems} items</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      `;

      document.body.appendChild(element);

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Calculate dimensions for multi-page support
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`checklists-comprehensive-report-${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (error) {
        console.error('Failed to generate comprehensive PDF:', error);
        alert('Failed to generate PDF. Please try again.');
      } finally {
        document.body.removeChild(element);
      }
    } catch (error) {
      console.error('Error generating comprehensive PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadAllPDFs = async () => {
    if (checklists.length === 0) return;

    try {
      const zip = new JSZip();

      for (const checklist of checklists) {
        // Create a temporary element for each checklist
        const element = document.createElement('div');
        element.style.width = '794px';
        element.style.padding = '40px';
        element.style.backgroundColor = '#ffffff';
        element.style.fontFamily = 'Arial, sans-serif';
        
        const progress = getProgressPercentage(checklist);
        const completedItems = checklist.items.filter(i => i.isDone).length;
        
        element.innerHTML = `
          <div style="margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0 0 10px 0; font-size: 28px;">${checklist.title}</h1>
            <div style="display: flex; gap: 20px; margin-top: 15px; flex-wrap: wrap;">
              <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Assigned to:</strong> ${checklist.assignedTo.username}</p>
              <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Status:</strong> ${checklist.status}</p>
              <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Recurrence:</strong> ${getRecurrenceLabel(checklist.recurrence)}</p>
              <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Start Date:</strong> ${new Date(checklist.startDate).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <div style="display: flex; justify-between; margin-bottom: 10px;">
              <span style="font-weight: bold; color: #333;">Progress</span>
              <span style="font-weight: bold; color: #333;">${progress}%</span>
            </div>
            <div style="width: 100%; background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
              <div style="width: ${progress}%; background: #2563eb; height: 100%;"></div>
            </div>
            <p style="margin-top: 10px; color: #666; font-size: 14px;">${completedItems} of ${checklist.items.length} items completed</p>
          </div>
          
          <div>
            <h2 style="color: #333; margin-bottom: 20px; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Items</h2>
            ${checklist.items.map((item, index) => `
              <div style="display: flex; align-items: center; padding: 15px; margin-bottom: 10px; background: ${item.isDone ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${item.isDone ? '#86efac' : '#e5e7eb'}; border-radius: 8px;">
                <div style="width: 24px; height: 24px; border: 2px solid ${item.isDone ? '#22c55e' : '#9ca3af'}; border-radius: 4px; margin-right: 12px; background: ${item.isDone ? '#22c55e' : 'transparent'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${item.isDone ? '<span style="color: white; font-weight: bold;">✓</span>' : ''}
                </div>
                <span style="color: ${item.isDone ? '#666' : '#333'}; text-decoration: ${item.isDone ? 'line-through' : 'none'}; font-size: 15px;">${item.title}</span>
              </div>
            `).join('')}
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        `;
        
        document.body.appendChild(element);
        
        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          const blob = pdf.output('blob');
          
          const fileName = `${checklist.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to generate PDF for ${checklist.title}:`, error);
        } finally {
          document.body.removeChild(element);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `checklists-${new Date().toISOString().split('T')[0]}.zip`);
    } catch (error) {
      console.error('Error generating PDFs:', error);
      alert('Failed to generate PDFs. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
              <CheckSquare className="text-[--color-primary]" />
              Checklists
            </h1>
            <p className="text-[--color-textSecondary] mt-1">Manage and track your checklists</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-[--color-surface] text-[--color-text] rounded-lg hover:bg-[--color-border] transition-colors flex items-center gap-2"
            >
              <Filter size={18} />
              Filters
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[--color-secondary] text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 print:hidden"
              title="Print comprehensive report with all checklists and items"
            >
              <Printer size={18} />
              Print Report
            </button>
            <button
              onClick={handleDownloadComprehensivePDF}
              disabled={checklists.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 print:hidden"
              title="Download comprehensive report as single PDF"
            >
              <Download size={18} />
              Download Report PDF
            </button>
            <button
              onClick={handleDownloadAllPDFs}
              disabled={checklists.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 print:hidden"
              title="Download separate PDFs for each checklist as ZIP"
            >
              <Download size={18} />
              Download Separate PDFs
            </button>
            <button
              onClick={() => navigate('/checklists/create')}
              className="px-4 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Create Checklist
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-[--color-surface] rounded-xl p-4 mb-6 border border-[--color-border]">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                >
                  <option value="">All</option>
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1">Recurrence</label>
                <select
                  value={filters.recurrence}
                  onChange={(e) => setFilters({ ...filters, recurrence: e.target.value })}
                  className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                >
                  <option value="">All</option>
                  <option value="one-time">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ status: '', assignedTo: '', recurrence: '', dateFrom: '', dateTo: '' })}
                  className="w-full px-3 py-2 bg-[--color-accent] text-white rounded-lg hover:bg-[--color-accent]/80"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checklists Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
          </div>
        ) : checklists.length === 0 ? (
          <div className="text-center py-12 bg-[--color-surface] rounded-xl border border-[--color-border]">
            <CheckSquare size={48} className="mx-auto text-[--color-textSecondary] mb-4" />
            <p className="text-[--color-textSecondary] text-lg">No checklists found</p>
            <button
              onClick={() => navigate('/checklists/create')}
              className="mt-4 px-6 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark]"
            >
              Create Your First Checklist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checklists.map((checklist) => (
              <div
                key={checklist._id}
                onClick={() => navigate(`/checklists/${checklist._id}`)}
                className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border] hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-[--color-text] line-clamp-2">{checklist.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(checklist.status)}`}>
                    {checklist.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[--color-textSecondary]">
                    <User size={14} />
                    {checklist.assignedTo.username}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[--color-textSecondary]">
                    <Clock size={14} />
                    {getRecurrenceLabel(checklist.recurrence)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[--color-textSecondary]">
                    <Calendar size={14} />
                    {new Date(checklist.startDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm text-[--color-textSecondary] mb-1">
                    <span>Progress</span>
                    <span>{getProgressPercentage(checklist)}%</span>
                  </div>
                  <div className="w-full bg-[--color-border] rounded-full h-2">
                    <div
                      className="bg-[--color-primary] h-2 rounded-full transition-all"
                      style={{ width: `${getProgressPercentage(checklist)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-sm text-[--color-textSecondary]">
                  {checklist.items.filter(i => i.isDone).length} of {checklist.items.length} items completed
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Checklists;
