
import React, { useState, useMemo, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, Legend, ReferenceLine
} from 'recharts';
import { AlertCircle, CheckCircle, TrendingUp, PieChart as PieIcon, Activity, FileText, LayoutDashboard, Download, Filter, List, Search, LineChart as LineChartIcon, BarChart3, Save, X, Briefcase, RotateCcw, Building2, CalendarRange } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  data: AnalysisResult;
  fileName: string;
  onReset: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const Dashboard: React.FC<DashboardProps> = ({ data, fileName, onReset }) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'report' | 'accounts'>('dashboard');
  const [selectedEntity, setSelectedEntity] = useState<string>('Overview');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [accountSearch, setAccountSearch] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState('');
  const [comparisonMetric, setComparisonMetric] = useState<string>('กำไรสุทธิ');

  // Calculate available years from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    // Check main metrics
    data.key_metrics?.forEach(m => {
      if (m.year) years.add(m.year);
    });
    // Check entity metrics
    data.entity_insights?.forEach(e => {
      e.key_metrics.forEach(m => {
        if (m.year) years.add(m.year);
      });
    });
    return Array.from(years).sort().reverse(); // Sort descending (latest first)
  }, [data]);

  // Set default year
  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  // Update filename based on context
  useEffect(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    const prefix = viewMode === 'dashboard' ? 'Dashboard' : viewMode === 'accounts' ? 'Accounts_Insight' : 'Analysis_Report';
    // Sanitize entity name for filename
    const entityName = selectedEntity.replace(/[^a-z0-9]/gi, '_');
    setSaveFileName(`${prefix}_${entityName}_${dateStr}`);
  }, [viewMode, selectedEntity]);

  // Extract list of available entities from the data
  const availableEntities = useMemo(() => {
    const entities = ['Overview'];
    if (data.entity_insights && data.entity_insights.length > 0) {
      data.entity_insights.forEach(e => entities.push(e.name));
    }
    return entities;
  }, [data]);

  // Prepare Comparative Data filtered by Selected Year
  const comparisonData = useMemo(() => {
    if (!data.entity_insights || data.entity_insights.length === 0) return [];

    return data.entity_insights.map(entity => {
      // Find the specific metric value for this entity AND selected Year
      const metric = entity.key_metrics.find(m => 
        m.label.includes(comparisonMetric) && 
        (!selectedYear || m.year === selectedYear)
      );
      
      return {
        name: entity.name,
        value: metric ? metric.value : 0,
        unit: metric ? metric.unit : ''
      };
    });
  }, [data.entity_insights, comparisonMetric, selectedYear]);

  // Derived data based on selection (Entity & Year)
  const currentData = useMemo(() => {
    let metrics = [];
    let summary = '';
    let future = '';
    let liquidityStatus = null;
    let anomalies = [];
    let ratios = [];

    if (selectedEntity === 'Overview') {
      summary = data.summary;
      future = data.future_outlook;
      anomalies = data.anomalies;
      ratios = data.financial_ratios;
      // Filter metrics by Year
      metrics = data.key_metrics.filter(m => !selectedYear || m.year === selectedYear);
    } else {
      const entityData = data.entity_insights?.find(e => e.name === selectedEntity);
      summary = entityData?.summary || "No data available for this entity.";
      future = "Future outlook available in consolidated overview.";
      anomalies = data.anomalies.filter(a => a.related_entity === selectedEntity || !a.related_entity);
      liquidityStatus = entityData?.liquidity_status;
      ratios = [];
      // Filter entity metrics by Year
      metrics = entityData?.key_metrics.filter(m => !selectedYear || m.year === selectedYear) || [];
    }

    return {
      summary,
      future,
      metrics,
      anomalies,
      liquidityStatus,
      ratios
    };
  }, [selectedEntity, selectedYear, data]);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!data.account_insights) return [];
    return data.account_insights.filter(acc => 
      acc.account_name.toLowerCase().includes(accountSearch.toLowerCase()) || 
      acc.analysis.toLowerCase().includes(accountSearch.toLowerCase())
    );
  }, [data.account_insights, accountSearch]);

  // Logic to get Top 5 Anomalies sorted by Impact
  const topAnomalies = useMemo(() => {
    const impactWeight: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
    
    return [...currentData.anomalies]
      .sort((a, b) => {
        const weightA = impactWeight[a.impact] || 0;
        const weightB = impactWeight[b.impact] || 0;
        return weightB - weightA; // Descending order (High first)
      })
      .slice(0, 5); // Take only top 5
  }, [currentData.anomalies]);

  const handleExportPDF = () => {
    setShowSaveDialog(false);
    
    // Use setTimeout to ensure the modal is fully closed before print dialog opens
    // We print the CURRENT view (WYSIWYG)
    setTimeout(() => {
      const originalTitle = document.title;
      document.title = saveFileName; // Set title for default "Save As" filename
      window.print();
      document.title = originalTitle;
    }, 300);
  };

  const renderChart = () => {
    if (!currentData.metrics || currentData.metrics.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <BarChart3 size={32} className="mb-2 opacity-50"/>
          <span>ไม่มีข้อมูลตัวเลขสำหรับหน่วยงานนี้ (ปี {selectedYear})</span>
        </div>
      );
    }

    const chartData = currentData.metrics.map(m => ({
      name: m.label,
      value: m.value,
      label: m.label
    }));

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                return percent > 0.1 ? (
                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                ) : null;
              }}
              outerRadius={110}
              innerRadius={60}
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => new Intl.NumberFormat('th-TH').format(value)}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 12, fill: '#64748b'}} />
            <YAxis width={80} tickFormatter={(value) => new Intl.NumberFormat('en', { notation: "compact" }).format(value)} tick={{fontSize: 12, fill: '#64748b'}} />
            <Tooltip 
              formatter={(value: number) => new Intl.NumberFormat('th-TH').format(value)}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              cursor={{stroke: '#6366f1', strokeWidth: 1}}
            />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Default Bar Chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={currentData.metrics} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={140} tick={{fontSize: 12, fill: '#64748b'}} />
          <Tooltip 
            formatter={(value: number) => new Intl.NumberFormat('th-TH').format(value)}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            cursor={{fill: '#f1f5f9'}}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
            {currentData.metrics.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6 pb-20 print:space-y-6 print:pb-0 animate-fade-in">
      
      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Download className="text-indigo-600" size={24}/> บันทึกไฟล์ (Save as PDF)
              </h3>
              <button onClick={() => setShowSaveDialog(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อไฟล์ (Filename)</label>
                <div className="relative">
                   <input 
                    type="text" 
                    value={saveFileName}
                    onChange={(e) => setSaveFileName(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700 bg-slate-50 focus:bg-white"
                  />
                  <FileText className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                 <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                 <div className="text-sm text-blue-800">
                    <strong>คำแนะนำ:</strong> <br/>
                    ระบบจะบันทึกข้อมูลจากหน้าจอ <u>{viewMode === 'dashboard' ? 'ภาพรวม Dashboard' : viewMode === 'accounts' ? 'รายละเอียดบัญชี' : 'รายงานบทวิเคราะห์'}</u> ที่คุณกำลังเปิดอยู่ <br/>
                    คุณสามารถเลือกตำแหน่งจัดเก็บ (Save Location) ได้ที่หน้าต่างถัดไป
                 </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowSaveDialog(false)}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleExportPDF}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-200 text-sm font-medium flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <Save size={18} />
                Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-20 z-30 no-print transition-all hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2 rounded-lg text-slate-500 hidden sm:block">
            <FileText size={20}/>
          </div>
          <div>
             <h2 className="text-lg font-bold text-slate-800">รายงานผลการวิเคราะห์</h2>
             <p className="text-slate-500 text-xs truncate max-w-[200px]" title={fileName}>{fileName}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Entity Filter */}
          {viewMode !== 'accounts' && availableEntities.length > 1 && (
            <div className="relative group">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer hover:border-indigo-300 transition-all shadow-sm"
              >
                {availableEntities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
            </div>
          )}

          {/* Year Filter */}
          {availableYears.length > 0 && (
             <div className="relative group">
                <CalendarRange size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer hover:border-indigo-300 transition-all shadow-sm"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>ปี {year}</option>
                  ))}
                </select>
             </div>
          )}

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <div className="bg-slate-100/80 p-1 rounded-xl flex gap-1">
             {[
               { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
               { id: 'accounts', icon: List, label: 'Accounts' },
               { id: 'report', icon: FileText, label: 'Report' }
             ].map(mode => (
               <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    viewMode === mode.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <mode.icon size={16} />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
             ))}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 hover:shadow-lg transition-all"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-6">
        <div className="flex justify-between items-end">
          <div>
             <h1 className="text-4xl font-bold text-slate-900 mb-2">รายงานผลการวิเคราะห์งบการเงิน</h1>
             <p className="text-slate-600 text-lg">Financial Analysis Report - {viewMode === 'dashboard' ? 'Executive Dashboard' : viewMode === 'accounts' ? 'Account Details' : 'Full Report'}</p>
          </div>
          <div className="text-right">
             <div className="text-sm text-slate-500">หน่วยงาน / ปีงบประมาณ</div>
             <div className="text-xl font-bold text-indigo-700">{selectedEntity} / {selectedYear}</div>
          </div>
        </div>
      </div>

      {/* VIEW: DASHBOARD */}
      {viewMode === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:space-y-6">
          
          {/* Summary Card */}
          <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 hover:shadow-md transition-shadow duration-300 relative overflow-hidden group print:shadow-none print:border print:break-inside-avoid">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Briefcase size={100} className="text-indigo-600" />
             </div>
             
             <div className="flex flex-col sm:flex-row justify-between items-start mb-6 relative z-10 gap-4">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                    <FileText size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800">บทสรุปผู้บริหาร</h3>
                    <p className="text-slate-500 text-sm">{selectedEntity} (ปี {selectedYear})</p>
                 </div>
               </div>
               {currentData.liquidityStatus && (
                 <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm ${
                   currentData.liquidityStatus === 'Good' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                   currentData.liquidityStatus === 'Poor' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                   'bg-amber-50 text-amber-700 border-amber-100'
                 }`}>
                   {currentData.liquidityStatus === 'Good' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                   สภาพคล่อง: {currentData.liquidityStatus}
                 </span>
               )}
             </div>

             <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed bg-slate-50/50 p-6 rounded-xl border border-slate-100 relative z-10 print:bg-white print:p-0 print:border-none">
                <ReactMarkdown>{currentData.summary}</ReactMarkdown>
             </div>
             
             {selectedEntity === 'Overview' && (
               <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100 relative z-10 print:bg-white print:border-slate-200 print:p-0 print:mt-4">
                  <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-3">
                    <TrendingUp size={20} className="text-indigo-600" /> 
                    แนวโน้มในอนาคต (Future Outlook)
                  </h4>
                  <p className="text-sm text-indigo-900/80 leading-relaxed print:text-slate-700">{currentData.future}</p>
               </div>
             )}
          </div>
          
          {/* Comparative Analysis (NEW SECTION) - Only show on Overview */}
          {selectedEntity === 'Overview' && data.entity_insights && data.entity_insights.length > 1 && (
            <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 break-inside-avoid print:shadow-none print:border print:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                     <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">การเปรียบเทียบระหว่างหน่วยงาน ({selectedYear})</h3>
                    <p className="text-xs text-slate-500">Comparative Entity Analysis</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <Filter size={14} className="text-slate-400 ml-1" />
                  <select 
                    value={comparisonMetric}
                    onChange={(e) => setComparisonMetric(e.target.value)}
                    className="bg-transparent text-sm text-slate-700 font-medium focus:outline-none cursor-pointer pr-2"
                  >
                    <option value="กำไรสุทธิ">กำไรสุทธิ (Net Profit)</option>
                    <option value="รายได้รวม">รายได้รวม (Total Revenue)</option>
                    <option value="ค่าใช้จ่ายรวม">ค่าใช้จ่ายรวม (Total Expenses)</option>
                    <option value="กำไรขั้นต้น">กำไรขั้นต้น (Gross Profit)</option>
                    <option value="EBITDA">EBITDA</option>
                    <option value="สินทรัพย์รวม">สินทรัพย์รวม (Total Assets)</option>
                    <option value="หนี้สินรวม">หนี้สินรวม (Total Liabilities)</option>
                  </select>
                </div>
              </div>

              <div className="h-[350px]">
                {comparisonData.length > 0 && comparisonData.some(d => d.value !== 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                      <YAxis tickFormatter={(value) => new Intl.NumberFormat('en', { notation: "compact" }).format(value)} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                      <Tooltip 
                        formatter={(value: number) => new Intl.NumberFormat('th-TH').format(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{fill: '#f8fafc'}}
                      />
                      <ReferenceLine y={0} stroke="#cbd5e1" />
                      <Bar dataKey="value" name={comparisonMetric} radius={[4, 4, 4, 4]} barSize={50}>
                        {comparisonData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.value < 0 ? '#ef4444' : COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Building2 size={32} className="mb-2 opacity-50"/>
                      <span>ไม่มีข้อมูลเปรียบเทียบสำหรับปี {selectedYear}</span>
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Key Metrics Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 break-inside-avoid flex flex-col h-[450px] print:h-[500px] print:shadow-none print:border print:mb-6">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                     <BarChart3 size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">ตัวเลขทางการเงิน ({selectedEntity} ปี {selectedYear})</h3>
                </div>
                
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1 no-print">
                  <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <BarChart3 size={18} />
                  </button>
                  <button onClick={() => setChartType('pie')} className={`p-1.5 rounded-md transition-all ${chartType === 'pie' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <PieIcon size={18} />
                  </button>
                  <button onClick={() => setChartType('line')} className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <LineChartIcon size={18} />
                  </button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
              {renderChart()}
            </div>
          </div>

          {/* Financial Ratios */}
          <div className="bg-white p-6 rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 break-inside-avoid h-[450px] flex flex-col print:h-auto print:shadow-none print:border print:mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                 <Activity size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {selectedEntity === 'Overview' ? 'อัตราส่วนที่สำคัญ' : 'ข้อมูลเพิ่มเติม'}
              </h3>
            </div>
            
            {selectedEntity === 'Overview' && currentData.ratios ? (
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 print:overflow-visible print:h-auto">
                {currentData.ratios.map((ratio, idx) => (
                  <div key={idx} className="group p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all print:border-b print:border-slate-100 print:rounded-none">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="text-sm font-bold text-slate-700 block group-hover:text-indigo-700 transition-colors">{ratio.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{ratio.category}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-base font-bold block ${
                          ratio.status === 'Good' ? 'text-emerald-600' : ratio.status === 'Poor' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          {ratio.value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-sm flex flex-col items-center justify-center h-full opacity-60">
                 <FileText size={48} strokeWidth={1} className="mb-2"/>
                 <p>ดูรายละเอียดในหน้า Report</p>
              </div>
            )}
          </div>

          {/* Anomalies Cards */}
          <div className="lg:col-span-3 print:break-before-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-rose-500 rounded-full inline-block"></span>
              รายการที่มีการเปลี่ยนแปลงอย่างมีนัยสำคัญ (5 อันดับสูงสุด)
            </h3>
            {topAnomalies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2">
                {topAnomalies.map((item, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border bg-white shadow-sm hover:shadow-lg transition-all duration-300 break-inside-avoid relative overflow-hidden print:shadow-none ${
                      item.impact === 'High' ? 'border-rose-100 hover:border-rose-300' : 
                      item.impact === 'Medium' ? 'border-amber-100 hover:border-amber-300' : 
                      'border-emerald-100 hover:border-emerald-300'
                    }`}>
                    
                    {/* Background Accent - Hide in print */}
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-transform group-hover:scale-110 print:hidden ${
                       item.impact === 'High' ? 'bg-rose-500' : item.impact === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></div>

                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <h4 className="font-bold text-slate-800 text-lg pr-4">{item.item}</h4>
                    </div>
                    
                    <div className="flex gap-2 mb-3 relative z-10">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.impact === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                        item.impact === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                         {item.impact} Impact
                      </span>
                      {item.related_entity && item.related_entity !== selectedEntity && (
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                           {item.related_entity}
                         </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed relative z-10">{item.observation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
                <p className="text-slate-500 italic">ไม่พบรายการผิดปกติสำหรับหน่วยงานที่เลือก</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: ACCOUNTS ANALYSIS */}
      {viewMode === 'accounts' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[600px] animate-fade-in print:shadow-none print:border-none print:p-0">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 print:hidden">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-50 rounded-xl text-violet-600">
                  <List size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">วิเคราะห์รายบัญชี</h3>
                  <p className="text-sm text-slate-500">Account Level Analysis & Audit Assertions</p>
                </div>
             </div>
             <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อบัญชี..." 
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all shadow-sm"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
             {filteredAccounts && filteredAccounts.length > 0 ? (
               filteredAccounts.map((account, idx) => (
                 <div key={idx} className="group border border-slate-100 rounded-2xl p-6 hover:shadow-lg hover:border-violet-100 transition-all bg-white break-inside-avoid relative overflow-hidden print:shadow-none print:border-slate-200">
                    <div className="absolute top-0 right-0 w-1 h-full bg-slate-200 group-hover:bg-violet-500 transition-colors print:hidden"></div>
                    
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <h4 className="font-bold text-slate-800 text-lg group-hover:text-violet-700 transition-colors">{account.account_name}</h4>
                          <span className="text-3xl font-bold text-slate-700 block mt-2 tracking-tight">
                             {new Intl.NumberFormat('th-TH').format(account.value)}
                          </span>
                       </div>
                       <div className="flex flex-col items-end gap-2">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                           account.status === 'Good' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                           account.status === 'Concern' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                           'bg-blue-50 text-blue-700 border-blue-100'
                         }`}>
                           {account.status === 'Concern' ? 'น่ากังวล' : account.status === 'Good' ? 'ดีเยี่ยม' : 'ปกติ'}
                         </span>
                         {account.change_percentage !== undefined && (
                            <span className={`text-xs font-bold ${account.change_percentage > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {account.change_percentage > 0 ? '▲' : '▼'} {Math.abs(account.change_percentage)}%
                            </span>
                          )}
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 leading-relaxed border border-slate-100 group-hover:bg-violet-50/30 group-hover:border-violet-100 transition-colors print:bg-white print:p-0 print:border-none">
                       {account.analysis}
                    </div>
                 </div>
               ))
             ) : (
               <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                  <Search size={48} className="mb-4 opacity-50"/>
                  <p className="text-lg">{data.account_insights ? "ไม่พบบัญชีที่ค้นหา" : "ไม่มีข้อมูลการวิเคราะห์รายบัญชี"}</p>
               </div>
             )}
          </div>
        </div>
      )}

      {/* VIEW: REPORT */}
      {viewMode === 'report' && (
        <div className="max-w-5xl mx-auto space-y-10 bg-white p-10 md:p-16 rounded-3xl shadow-sm border border-slate-200 min-h-[600px] print:border-none print:shadow-none print:p-0 animate-fade-in">
          
          {/* Header Report */}
          <div className="border-b-2 border-slate-900 pb-8 text-center print:hidden">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">รายงานวิเคราะห์งบการเงิน</h1>
            <p className="text-slate-500 font-medium tracking-wide uppercase">Financial Statement Analysis Report</p>
          </div>

          {/* 1. Executive Summary */}
          <section className="break-inside-avoid">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm">1</span>
              บทสรุปผู้บริหาร ({selectedEntity})
            </h3>
            <div className="prose prose-lg prose-slate max-w-none text-slate-700 bg-slate-50 p-8 rounded-2xl border border-slate-100 print:bg-transparent print:p-0 print:border-none text-justify">
              <ReactMarkdown>{currentData.summary}</ReactMarkdown>
            </div>
          </section>

          {/* 2. Future Outlook */}
          {selectedEntity === 'Overview' && (
            <section className="break-inside-avoid">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm">2</span>
                 การวิเคราะห์แนวโน้มในอนาคต
              </h3>
              <div className="prose prose-lg prose-slate max-w-none text-slate-700 bg-indigo-50/50 p-8 rounded-2xl border border-indigo-100 print:bg-transparent print:p-0 print:border-none text-justify">
                <ReactMarkdown>{currentData.future}</ReactMarkdown>
              </div>
            </section>
          )}

          {/* 3. Financial Ratios Table */}
          {selectedEntity === 'Overview' && currentData.ratios && (
             <section className="break-inside-avoid">
               <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                 <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm">3</span>
                 อัตราส่วนทางการเงินที่สำคัญ
              </h3>
              <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">อัตราส่วน</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ประเภท</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">ค่าที่ได้</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ความหมาย</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {currentData.ratios.map((ratio, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{ratio.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{ratio.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700 text-center">{ratio.value.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                           <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                             ratio.status === 'Good' ? 'bg-emerald-100 text-emerald-800' : 
                             ratio.status === 'Poor' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                           }`}>
                             {ratio.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{ratio.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
             </section>
          )}

          {/* 4. Variance Analysis */}
          <section className="break-inside-avoid">
             <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white text-sm">{selectedEntity === 'Overview' ? '4' : '2'}</span>
              การวิเคราะห์การเปลี่ยนแปลง (Variance)
            </h3>
            <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">รายการ (Item)</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-1/6">ผลกระทบ</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">บทวิเคราะห์เชิงลึก</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {currentData.anomalies.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm font-bold text-slate-800">{item.item}</div>
                        {item.related_entity && selectedEntity === 'Overview' && (
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                            {item.related_entity}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                         <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                           item.impact === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                           item.impact === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                           'bg-emerald-50 text-emerald-700 border-emerald-100'
                         }`}>
                           {item.impact}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 align-top leading-relaxed">{item.observation}</td>
                    </tr>
                  ))}
                  {currentData.anomalies.length === 0 && (
                     <tr>
                       <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">ไม่พบรายการผิดปกติ</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer Report */}
          <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
            <div>Generated by FinSight AI</div>
            <div>ข้อมูลเพื่อประกอบการตัดสินใจเท่านั้น</div>
          </div>

        </div>
      )}
      
      {/* Footer Actions (Using onReset) */}
      <div className="text-center pt-8 pb-4 no-print">
         <button 
           onClick={onReset}
           className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all text-sm font-medium"
         >
            <RotateCcw size={16} />
            เริ่มการวิเคราะห์ไฟล์ใหม่
         </button>
      </div>

    </div>
  );
};