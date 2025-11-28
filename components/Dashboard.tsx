
import React, { useState, useMemo } from 'react';
import { AnalysisResult, FinancialRatio, FinancialMetric, Anomaly } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, Legend, ReferenceLine
} from 'recharts';
import { 
  AlertCircle, CheckCircle, TrendingUp, TrendingDown, PieChart as PieIcon, 
  Activity, FileText, LayoutDashboard, Filter, LineChart as LineChartIcon, 
  BarChart3, RotateCcw, Building2, CalendarRange, ArrowUp, ArrowDown 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  data: AnalysisResult;
  fileName: string;
  onReset: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const Dashboard: React.FC<DashboardProps> = ({ data, fileName, onReset }) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'report' | 'accounts'>('dashboard');
  
  // Comparative Analysis States
  const [comparisonMetric, setComparisonMetric] = useState<string>('กำไรสุทธิ');
  const [comparisonYear, setComparisonYear] = useState<string>('');
  const [comparisonChartType, setComparisonChartType] = useState<'bar' | 'pie' | 'line'>('bar');

  // Financial Ratio Sort State
  const [ratioSortOrder, setRatioSortOrder] = useState<'highest' | 'lowest'>('highest');

  // 1. Determine Years available in the data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.key_metrics?.forEach(m => m.year && years.add(m.year));
    data.entity_insights?.forEach(e => e.key_metrics?.forEach(m => m.year && years.add(m.year)));
    // Sort descending (newest first)
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Set default comparison year if not set
  useMemo(() => {
    if (!comparisonYear && availableYears.length > 0) {
        // Prefer 2568 or 2025, else latest
        if (availableYears.includes("2568")) setComparisonYear("2568");
        else if (availableYears.includes("2025")) setComparisonYear("2025");
        else setComparisonYear(availableYears[0]);
    }
  }, [availableYears, comparisonYear]);

  // 2. Prepare Comparative Data
  const comparativeData = useMemo(() => {
    const targetYear = comparisonYear;
    const result: { name: string; value: number }[] = [];

    // Helper to find metric value
    const findValue = (metrics: FinancialMetric[] | undefined) => {
        if (!metrics) return 0;
        // Strict filter by year first, then label
        const yearMetrics = metrics.filter(m => m.year === targetYear);
        const metric = yearMetrics.find(m => m.label.includes(comparisonMetric) || comparisonMetric.includes(m.label));
        return metric ? metric.value : 0;
    };

    // Add Overall (if available)
    if (data.key_metrics) {
       const val = findValue(data.key_metrics);
       if (val !== 0) result.push({ name: 'ภาพรวม (Overview)', value: val });
    }

    // Add Entities
    if (data.entity_insights) {
        data.entity_insights.forEach(entity => {
            const val = findValue(entity.key_metrics);
            if (val !== 0) result.push({ name: entity.name, value: val });
        });
    }

    return result;
  }, [data, comparisonMetric, comparisonYear]);

  // 3. Prepare Ratios (Top 5 Highest/Lowest) - FIX: Explicitly typed
  const ratios: FinancialRatio[] = useMemo(() => {
    if (!data.financial_ratios) return [];
    
    const sorted = [...data.financial_ratios].sort((a, b) => {
        return ratioSortOrder === 'highest' ? b.value - a.value : a.value - b.value;
    });

    return sorted.slice(0, 5);
  }, [data, ratioSortOrder]);

  // 4. Prepare Anomalies (Top 5 High Impact)
  const anomalies: Anomaly[] = useMemo(() => {
     if (!data.anomalies) return [];
     
     const impactScore = { 'High': 3, 'Medium': 2, 'Low': 1 };
     
     return [...data.anomalies]
        .sort((a, b) => {
            const scoreA = impactScore[a.impact as keyof typeof impactScore] || 0;
            const scoreB = impactScore[b.impact as keyof typeof impactScore] || 0;
            return scoreB - scoreA;
        })
        .slice(0, 5);
  }, [data]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold border border-indigo-100">
               {comparisonYear ? `ปีงบประมาณ ${comparisonYear}` : 'Analysis Report'}
             </span>
             <h2 className="text-xl font-bold text-slate-800">{fileName}</h2>
          </div>
          <p className="text-slate-500 text-sm">FinSight AI Analysis Generated just now</p>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={onReset}
             className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors text-sm font-medium"
           >
             <RotateCcw size={16} />
             วิเคราะห์ใหม่
           </button>

           <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('report')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={16} />
              Report
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'dashboard' && (
        <>
          {/* Executive Summary */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
             <h3 className="flex items-center gap-2 text-lg font-bold mb-4">
                <Activity className="text-indigo-200" /> 
                บทสรุปผู้บริหาร (Executive Summary)
             </h3>
             <div className="prose prose-invert max-w-none text-indigo-50 leading-relaxed text-sm opacity-90">
                <ReactMarkdown>{data.summary}</ReactMarkdown>
             </div>
             
             {data.future_outlook && (
                <div className="mt-6 pt-6 border-t border-indigo-500/30">
                    <h4 className="flex items-center gap-2 font-semibold text-indigo-100 mb-2">
                        <TrendingUp size={18} /> แนวโน้มและกลยุทธ์ในอนาคต
                    </h4>
                    <div className="prose prose-invert max-w-none text-sm text-indigo-50">
                        <ReactMarkdown>{data.future_outlook}</ReactMarkdown>
                    </div>
                </div>
             )}
          </div>

          {/* Comparative Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="text-indigo-500" size={20}/>
                        การเปรียบเทียบผลการดำเนินงาน
                    </h3>
                    <p className="text-slate-500 text-sm">เปรียบเทียบตัวเลขสำคัญระหว่างหน่วยงาน/สาขา</p>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2">
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <CalendarRange size={14} className="text-slate-400"/>
                        <select 
                            value={comparisonYear} 
                            onChange={(e) => setComparisonYear(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                        >
                            {availableYears.map(y => <option key={y} value={y}>ปี {y}</option>)}
                        </select>
                     </div>

                     <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <Filter size={14} className="text-slate-400"/>
                        <select 
                            value={comparisonMetric} 
                            onChange={(e) => setComparisonMetric(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                        >
                            <option value="รายได้รวม">รายได้รวม</option>
                            <option value="ค่าใช้จ่ายรวม">ค่าใช้จ่ายรวม</option>
                            <option value="กำไรสุทธิ">กำไรสุทธิ</option>
                            <option value="กำไรขั้นต้น">กำไรขั้นต้น</option>
                            <option value="EBITDA">EBITDA</option>
                            <option value="สินทรัพย์รวม">สินทรัพย์รวม</option>
                        </select>
                     </div>

                     <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setComparisonChartType('bar')} className={`p-1.5 rounded ${comparisonChartType === 'bar' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><BarChart3 size={16}/></button>
                        <button onClick={() => setComparisonChartType('pie')} className={`p-1.5 rounded ${comparisonChartType === 'pie' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><PieIcon size={16}/></button>
                        <button onClick={() => setComparisonChartType('line')} className={`p-1.5 rounded ${comparisonChartType === 'line' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><LineChartIcon size={16}/></button>
                     </div>
                  </div>
               </div>

               <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {comparisonChartType === 'bar' ? (
                        <BarChart data={comparativeData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(value: number) => [new Intl.NumberFormat('th-TH').format(value), comparisonMetric]}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {comparativeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? COLORS[index % COLORS.length] : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : comparisonChartType === 'pie' ? (
                        <PieChart>
                             <Pie
                                data={comparativeData.filter(d => d.value > 0)} // Pie doesn't like negatives
                                cx="50%" cy="50%"
                                innerRadius={60} outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                             >
                                {comparativeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                             </Pie>
                             <Tooltip formatter={(value: number) => new Intl.NumberFormat('th-TH').format(value)} />
                             <Legend />
                        </PieChart>
                    ) : (
                        <LineChart data={comparativeData}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                             <XAxis dataKey="name" />
                             <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                             <Tooltip formatter={(value: number) => new Intl.NumberFormat('th-TH').format(value)} />
                             <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{r: 6}} />
                        </LineChart>
                    )}
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Financial Ratios */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <PieIcon className="text-pink-500" size={20}/>
                     อัตราส่วนทางการเงิน
                  </h3>
                  
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setRatioSortOrder('highest')}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-all ${ratioSortOrder === 'highest' ? 'bg-white text-green-600 shadow' : 'text-slate-500'}`}
                      >
                        <ArrowUp size={12}/> สูงสุด 5 อันดับ
                      </button>
                      <button 
                        onClick={() => setRatioSortOrder('lowest')}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-all ${ratioSortOrder === 'lowest' ? 'bg-white text-rose-600 shadow' : 'text-slate-500'}`}
                      >
                        <ArrowDown size={12}/> ต่ำสุด 5 อันดับ
                      </button>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {ratios.map((ratio, index) => (
                    <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all group">
                       <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                             ratio.status === 'Good' ? 'bg-green-100 text-green-700' :
                             ratio.status === 'Average' ? 'bg-yellow-100 text-yellow-700' :
                             'bg-red-100 text-red-700'
                          }`}>
                            {ratio.status}
                          </span>
                       </div>
                       <p className="text-slate-500 text-xs mb-1 line-clamp-1" title={ratio.name}>{ratio.name}</p>
                       <p className={`text-2xl font-bold font-mono ${
                          ratio.status === 'Good' ? 'text-green-600' :
                          ratio.status === 'Average' ? 'text-yellow-600' : 'text-red-500'
                       }`}>
                         {ratio.value.toFixed(2)}
                       </p>
                       <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-tight">
                         {ratio.description}
                       </p>
                    </div>
                  ))}
               </div>
            </div>

            {/* Anomalies */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <AlertCircle className="text-orange-500" size={20}/>
                  รายการผิดปกติ (Top 5)
               </h3>
               <div className="space-y-3">
                  {anomalies.map((anomaly, idx) => (
                     <div key={idx} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className={`mt-1 min-w-[6px] h-6 rounded-full ${
                           anomaly.impact === 'High' ? 'bg-red-500' : 
                           anomaly.impact === 'Medium' ? 'bg-orange-400' : 'bg-yellow-400'
                        }`} />
                        <div>
                           <div className="flex justify-between items-center w-full mb-1">
                              <h4 className="font-semibold text-slate-700 text-sm">{anomaly.item}</h4>
                              {anomaly.related_entity && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                                   {anomaly.related_entity}
                                </span>
                              )}
                           </div>
                           <p className="text-xs text-slate-500 leading-relaxed">{anomaly.observation}</p>
                        </div>
                     </div>
                  ))}
                  {anomalies.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">ไม่พบรายการผิดปกติที่สำคัญ</div>
                  )}
               </div>
            </div>

          </div>
        </>
      )}

      {/* Simplified Report View */}
      {viewMode === 'report' && (
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 prose max-w-none">
            <h1>รายงานการวิเคราะห์ทางการเงิน</h1>
            <h2>บทสรุปผู้บริหาร</h2>
            <ReactMarkdown>{data.summary}</ReactMarkdown>
            
            <h2>แนวโน้มและกลยุทธ์</h2>
            <ReactMarkdown>{data.future_outlook}</ReactMarkdown>

            <h2>รายละเอียดเพิ่มเติม</h2>
            {data.entity_insights?.map((entity, i) => (
                <div key={i} className="mb-6">
                    <h3>{entity.name}</h3>
                    <p>{entity.summary}</p>
                </div>
            ))}
         </div>
      )}
    </div>
  );
};
