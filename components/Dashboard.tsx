
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
  const [accountSearch, setAccountSearch] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState('');
  const [comparisonMetric, setComparisonMetric] = useState<string>('กำไรสุทธิ');

  // Determine the Target Year to display (Priority: 2568 > 2025 > Latest Available)
  const targetYear = useMemo(() => {
    const years = new Set<string>();
    // Collect all available years
    data.key_metrics?.forEach(m => m.year && years.add(m.year));
    data.entity_insights?.forEach(e => e.key_metrics.forEach(m => m.year && years.add(m.year)));
    
    // Priority Check
    if (years.has("2568")) return "2568";
    if (years.has("2025")) return "2025";
    
    // Fallback: Sort descending and take the latest
    const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
    return sortedYears[0] || "";
  }, [data]);

  // Update filename based on context
  useEffect(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    const prefix = viewMode === 'dashboard' ? 'Dashboard' : viewMode === 'accounts' ? 'Accounts_Insight' : 'Analysis_Report';
    // Sanitize entity name for filename
    const entityName = selectedEntity.replace(/[^a-z0-9]/gi, '_');
    setSaveFileName(`${prefix}_${entityName}_${targetYear}_${dateStr}`);
  }, [viewMode, selectedEntity, targetYear]);

  // Extract list of available entities from the data
  const availableEntities = useMemo(() => {
    const entities = ['Overview'];
    if (data.entity_insights && data.entity_insights.length > 0) {
      data.entity_insights.forEach(e => entities.push(e.name));
    }
    return entities;
  }, [data]);

  // Prepare Comparative Data filtered by Target Year
  const comparisonData = useMemo(() => {
    if (!data.entity_insights || data.entity_insights.length === 0) return [];

    return data.entity_insights.map(entity => {
      // Find the specific metric value for this entity AND target Year
      const metric = entity.key_metrics.find(m => 
        m.label.includes(comparisonMetric) && 
        (m.year === targetYear) // Strict year matching
      );
      
      return {
        name: entity.name,
        value: metric ? metric.value : 0,
        unit: metric ? metric.unit : ''
      };
    });
  }, [data.entity_insights, comparisonMetric, targetYear]);

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
      // Filter metrics STRICTLY by Target Year
      metrics = data.key_metrics.filter(m => m.year === targetYear);
    } else {
      const entityData = data.entity_insights?.find(e => e.name === selectedEntity);
      summary = entityData?.summary || "No data available for this entity.";
      future = "Future outlook available in consolidated overview.";
      anomalies = data.anomalies.filter(a => a.related_entity === selectedEntity || !a.related_entity);
      liquidityStatus = entityData?.liquidity_status;
      ratios = [];
      // Filter entity metrics STRICTLY by Target Year
      metrics = entityData?.key_metrics.filter(m => m.year === targetYear) || [];
    }

    return {
      summary,
      future,
      metrics,
      anomalies,
      liquidityStatus,
      ratios
    };
  }, [selectedEntity, targetYear, data]);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!data.account_insights) return [];
    return data.account_insights.filter(acc => 
      acc.account_name.toLowerCase().includes(accountSearch.toLowerCase()) || 
      acc.analysis.toLowerCase().includes(accountSearch.toLowerCase())
    );
  }, [data.account_insights, accountSearch]);

  const handleExportPDF = () => {
    setShowSaveDialog(false);
    
    // Use setTimeout to ensure the modal is fully closed before print dialog opens
    setTimeout(() => {
      const originalTitle = document.title;
      document.title = saveFileName; 
      window.print();
      document.title = originalTitle;
    }, 300);
  };

  const renderChart = () => {
    if (!currentData.metrics || currentData.metrics.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <BarChart3 size={32} className="mb-2 opacity-50"/>
          <span>ไม่มีข้อมูลตัวเลขสำหรับปี {targetYear}</span>
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

          {/* Year Indicator (Static) */}
           <div className="relative px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-bold text-indigo-700 flex items-center gap-2 shadow-sm">
              <CalendarRange size={16} />
              <span>ปี {targetYear}</span>
           </div>

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
             <div className="text-xl font-bold text-indigo-700">{selectedEntity} / {targetYear}</div>
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
                    <p className="text-slate-500 text-sm">{selectedEntity} (ปี {targetYear})</p>
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
                    <h3 className="text-lg font-bold text-slate-800">การเปรียบเทียบระหว่างหน่วยงาน</h3>
                    <p className="text-xs text-slate-500">ข้อมูลปี {targetYear}</p>
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
                      <span>ไม่มีข้อมูลเปรียบเทียบสำหรับปี {targetYear}</span>
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Key Metrics Chart - SINGLE YEAR VIEW */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 break-inside-avoid flex flex-col h-[450px] print:h-[500px] print:shadow-none print:border print:mb-6">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                     <BarChart3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">ตัวเลขทางการเงิน ({selectedEntity})</h3>
                    <p className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full w-fit">ปี {targetYear}</p>
                  </div>
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
          <div className="bg-white p-6 rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 flex flex-col break-inside-avoid print:shadow-none print:border print:mb-6">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <PieIcon size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">อัตราส่วนทางการเงิน</h3>
             </div>
             
             <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {currentData.ratios && currentData.ratios.length > 0 ? (
                  currentData.ratios.map((ratio, index) => (
                    <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-700 text-sm">{ratio.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          ratio.status === 'Good' ? 'bg-emerald-100 text-emerald-700' : 
                          ratio.status === 'Poor' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {ratio.status}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800 mb-1">
                        {ratio.value.toFixed(2)}
                        {ratio.benchmark && <span className="text-xs text-slate-400 font-normal ml-2">(BM: {ratio.benchmark})</span>}
                      </div>
                      <p className="text-xs text-slate-500 leading-snug">{ratio.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <p>ไม่มีข้อมูลอัตราส่วน</p>
                  </div>
                )}
             </div>
          </div>

          {/* Anomalies / Variances */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm shadow-slate-200 border border-slate-100 break-inside-avoid print:shadow-none print:border">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                  <Activity size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-slate-800">ความผิดปกติและข้อสังเกตสำคัญ (5 อันดับแรก)</h3>
                   <p className="text-xs text-slate-500">Top 5 High Impact Anomalies</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {currentData.anomalies && currentData.anomalies.length > 0 ? (
                 // Use logic to slice top 5 (Logic is already in the parent memo, but we need to re-apply filtering here based on currentData context or reuse existing Logic)
                 // Since currentData.anomalies is already filtered by Entity, we just sort and slice here for display
                 [...currentData.anomalies]
                  .sort((a, b) => (b.impact === 'High' ? 1 : 0) - (a.impact === 'High' ? 1 : 0)) // Simple sort High first
                  .slice(0, 5)
                  .map((anomaly, index) => (
                   <div key={index} className="p-4 rounded-xl border-l-4 border-rose-400 bg-rose-50/30 hover:bg-rose-50 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                       <span className="font-bold text-slate-800 flex items-center gap-2">
                         <AlertCircle size={14} className="text-rose-500" />
                         {anomaly.item}
                       </span>
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                         anomaly.impact === 'High' ? 'bg-rose-100 text-rose-600' : 
                         anomaly.impact === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                       }`}>
                         {anomaly.impact} Impact
                       </span>
                     </div>
                     <p className="text-sm text-slate-600 leading-relaxed">{anomaly.observation}</p>
                     {anomaly.related_entity && <div className="mt-2 text-xs font-semibold text-indigo-600 bg-indigo-50 w-fit px-2 py-0.5 rounded">{anomaly.related_entity}</div>}
                   </div>
                 ))
               ) : (
                 <div className="col-span-full py-8 text-center text-slate-400">
                   ไม่พบความผิดปกติที่มีนัยสำคัญ
                 </div>
               )}
             </div>
          </div>

        </div>
      )}

      {/* VIEW: ACCOUNTS */}
      {viewMode === 'accounts' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-300">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <List size={20} className="text-indigo-600"/> รายละเอียดบัญชี (Account Details)
            </h3>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="ค้นหาบัญชี..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">ชื่อบัญชี</th>
                  <th className="px-6 py-4 text-right">มูลค่า (บาท)</th>
                  <th className="px-6 py-4 text-center">การเปลี่ยนแปลง</th>
                  <th className="px-6 py-4">บทวิเคราะห์</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.length > 0 ? filteredAccounts.map((acc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{acc.account_name}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-700">{new Intl.NumberFormat('th-TH').format(acc.value)}</td>
                    <td className="px-6 py-4 text-center">
                      {acc.change_percentage ? (
                        <span className={`font-bold ${acc.change_percentage > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {acc.change_percentage > 0 ? '+' : ''}{acc.change_percentage}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs">{acc.analysis}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                        acc.status === 'Concern' ? 'bg-rose-100 text-rose-700' :
                        acc.status === 'Good' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">ไม่พบข้อมูลบัญชีที่ค้นหา</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: FULL REPORT (TEXT) */}
      {viewMode === 'report' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
          <div className="prose prose-slate max-w-none">
            <h1 className="text-2xl font-bold text-slate-900 mb-4 border-b pb-4">รายงานการวิเคราะห์ฉบับสมบูรณ์</h1>
            
            <section className="mb-8">
              <h3 className="text-lg font-bold text-indigo-800 bg-indigo-50 p-2 rounded-lg mb-4">1. บทสรุปผู้บริหาร (Executive Summary)</h3>
              <ReactMarkdown>{data.summary}</ReactMarkdown>
            </section>

            <section className="mb-8">
              <h3 className="text-lg font-bold text-indigo-800 bg-indigo-50 p-2 rounded-lg mb-4">2. แนวโน้มและกลยุทธ์ (Future Outlook & Strategy)</h3>
              <ReactMarkdown>{data.future_outlook}</ReactMarkdown>
            </section>

            <section className="mb-8">
               <h3 className="text-lg font-bold text-indigo-800 bg-indigo-50 p-2 rounded-lg mb-4">3. วิเคราะห์รายหน่วยงาน (Entity Analysis)</h3>
               {data.entity_insights?.map((entity, i) => (
                 <div key={i} className="mb-6 pl-4 border-l-4 border-indigo-100">
                    <h4 className="font-bold text-slate-800 text-md mb-2">{entity.name}</h4>
                    <p className="text-sm text-slate-600 mb-2">{entity.summary}</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                       {entity.key_metrics.filter(m => m.year === targetYear).map((m, idx) => (
                         <div key={idx} className="flex justify-between text-xs border-b border-slate-100 pb-1">
                            <span className="text-slate-500">{m.label}</span>
                            <span className="font-mono font-bold">{new Intl.NumberFormat('th-TH', { notation: "compact" }).format(m.value)}</span>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </section>

            <section className="mb-8">
              <h3 className="text-lg font-bold text-indigo-800 bg-indigo-50 p-2 rounded-lg mb-4">4. ความเสี่ยงและข้อสังเกต (Risks & Anomalies)</h3>
              <ul className="space-y-3">
                {data.anomalies.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="text-rose-500 font-bold shrink-0">•</span>
                    <span>
                      <strong className="text-slate-900">{a.item}:</strong> {a.observation} 
                      <span className="text-xs text-slate-400 ml-2">({a.impact} Impact)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="text-center text-slate-400 text-xs py-8 no-print">
        <p>FinSight AI - Financial Intelligence System</p>
      </div>
    </div>
  );
};
