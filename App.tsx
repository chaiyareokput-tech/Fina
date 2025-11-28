
import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { analyzeFinancialDocument } from './services/geminiService';
import { AnalysisResult, FileData } from './types';
import { Calculator, BarChart3, Receipt, SearchCheck, AlertTriangle, Sparkles, PieChart } from 'lucide-react';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<FileData | null>(null);

  const handleFileSelect = async (fileData: FileData) => {
    setIsLoading(true);
    setError(null);
    setCurrentFile(fileData);
    setProgress(0);
    
    // Simulation Timer for Progress Bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = prev < 50 ? 5 : 2; 
        return prev + increment;
      });
    }, 400);

    try {
      const analysis = await analyzeFinancialDocument(fileData.base64, fileData.mimeType);
      
      clearInterval(interval);
      setProgress(100);
      
      setTimeout(() => {
        setResult(analysis);
        setIsLoading(false);
      }, 500);

    } catch (err: any) {
      clearInterval(interval);
      setIsLoading(false);
      console.error(err);
      const errorMessage = err.message || "เกิดข้อผิดพลาดในการวิเคราะห์เอกสาร กรุณาลองใหม่อีกครั้ง";
      setError(errorMessage);
    }
  };

  const handleReset = () => {
    setResult(null);
    setCurrentFile(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen font-sans bg-[#f8fafc] print:bg-white">
      {/* Decorative Background - Hide in print */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 print:hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-float" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar - Glassmorphism - Hide in print */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                <Calculator size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">FinSight AI</h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Financial Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
               <span className="hidden sm:flex items-center gap-2 hover:text-indigo-600 cursor-pointer transition-colors">
                 <Receipt size={16} className="text-indigo-500"/> รายงาน
               </span>
               <span className="hidden sm:flex items-center gap-2 hover:text-indigo-600 cursor-pointer transition-colors">
                 <BarChart3 size={16} className="text-indigo-500"/> วิเคราะห์
               </span>
               {result && (
                 <button 
                  onClick={handleReset}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs transition-colors"
                 >
                   วิเคราะห์ไฟล์ใหม่
                 </button>
               )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 print:py-0 print:px-0">
        
        {!result && (
          <div className="text-center mb-12 mt-8 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium shadow-sm mb-4">
              <Sparkles size={16} />
              <span>AI-Powered Financial Analyst Agent</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              ระบบวิเคราะห์งบการเงิน
            </h2>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 shadow-sm">
             <div className="bg-rose-100 p-2 rounded-full text-rose-600">
                <AlertTriangle size={20} />
             </div>
             <div>
               <h4 className="font-bold text-rose-800 text-sm">การดำเนินการขัดข้อง</h4>
               <p className="text-rose-700 text-sm mt-1">{error}</p>
             </div>
          </div>
        )}

        {!result ? (
          <div className="animate-fade-in-up">
            <div className="relative z-10">
              <FileUpload 
                onFileSelect={handleFileSelect} 
                isLoading={isLoading} 
                progress={progress}
              />
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-6xl mx-auto px-4">
              {[
                {
                  icon: <PieChart className="text-white" size={24} />,
                  bg: "bg-blue-500",
                  title: "วิเคราะห์อัตราส่วน",
                  desc: "Liquidity, Profitability & Efficiency Ratios"
                },
                {
                  icon: <SearchCheck className="text-white" size={24} />,
                  bg: "bg-emerald-500",
                  title: "รายการผิดปกติ",
                  desc: "Variance Analysis & Anomaly Detection"
                },
                {
                  icon: <Receipt className="text-white" size={24} />,
                  bg: "bg-violet-500",
                  title: "เจาะลึกรายบัญชี",
                  desc: "Account-level insights with audit assertions"
                },
                {
                  icon: <Calculator className="text-white" size={24} />,
                  bg: "bg-amber-500",
                  title: "แยกตามหน่วยงาน",
                  desc: "Entity & Department breakdown analysis"
                }
              ].map((feature, i) => (
                <div key={i} className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300">
                  <div className={`mb-4 w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${feature.bg} group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 text-lg">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Dashboard 
            data={result} 
            fileName={currentFile?.name || 'Unknown File'} 
            onReset={handleReset} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
