
import React, { ChangeEvent } from 'react';
import { Upload, FileText, Image as ImageIcon, FileSpreadsheet, FileDigit, CloudLightning } from 'lucide-react';
import { FileData } from '../types';

interface FileUploadProps {
  onFileSelect: (fileData: FileData) => void;
  isLoading: boolean;
  progress: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading, progress }) => {
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  
  // Helper to compress/resize image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          // Resize logic: Max width 1500px to speed up AI processing
          const MAX_WIDTH = 1500;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 0.8 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          // Remove prefix for consistency with existing logic
          resolve(compressedBase64.split(',')[1]);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Check File Type
    const validTypes = [
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv' // csv
    ];

    if (!validTypes.includes(file.type)) {
      alert("ไม่สามารถอัปโหลดได้: กรุณาเลือกไฟล์รูปภาพ, PDF, Excel (.xlsx, .xls) หรือ CSV เท่านั้น");
      return;
    }

    // 2. Check File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`ไม่สามารถอัปโหลดได้: ไฟล์มีขนาดใหญ่เกินกำหนด (${(file.size / (1024*1024)).toFixed(2)} MB)\n\nกรุณาใช้ไฟล์ที่มีขนาดไม่เกิน ${MAX_FILE_SIZE_MB} MB`);
      return;
    }

    try {
      let base64 = "";
      
      // Compress if it's an image
      if (file.type.startsWith('image/')) {
        base64 = await compressImage(file);
      } else {
        // Normal read for PDF/Excel
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
             const res = reader.result as string;
             resolve(res.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      onFileSelect({
        base64,
        mimeType: file.type.startsWith('image/') ? 'image/jpeg' : file.type, // Force jpeg if compressed
        name: file.name
      });

    } catch (error) {
      console.error("File processing error:", error);
      alert("เกิดข้อผิดพลาดในการประมวลผลไฟล์");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div 
        className={`relative group transition-all duration-300 ${
          isLoading 
            ? 'p-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' 
            : 'p-0'
        }`}
      >
        <div className={`relative flex flex-col items-center justify-center min-h-[320px] rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
          isLoading 
            ? 'border-transparent bg-white' 
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50/50 hover:shadow-xl hover:shadow-indigo-50'
        }`}>
          
          <input
            type="file"
            accept="image/*,application/pdf,.xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={isLoading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
          />

          {/* Decorative Grid Background */}
          <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          <div className="z-10 flex flex-col items-center text-center space-y-6 max-w-md mx-auto p-6">
            
            {isLoading ? (
              <div className="w-full space-y-6">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
                   <CloudLightning className="text-indigo-600 animate-bounce" size={36} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">กำลังวิเคราะห์ข้อมูล...</h3>
                  <p className="text-slate-500 text-sm">AI กำลังอ่านงบการเงินและประมวลผลความเสี่ยง</p>
                </div>
                
                <div className="relative pt-4">
                  <div className="flex justify-between text-xs font-bold text-indigo-600 mb-2">
                    <span>Processing</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-indigo-600 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg shadow-indigo-200" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <div className="absolute -inset-4 bg-indigo-100 rounded-full blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500"></div>
                  <div className="relative p-6 bg-gradient-to-br from-indigo-50 to-white rounded-full text-indigo-600 shadow-md shadow-indigo-100 group-hover:scale-110 transition-transform duration-300 ring-1 ring-indigo-50">
                    <Upload size={40} strokeWidth={1.5} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                    อัปโหลดไฟล์เอกสาร
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    ลากไฟล์มาวางที่นี่ หรือ <span className="text-indigo-600 font-semibold underline decoration-indigo-200 decoration-2 underline-offset-2">คลิกเพื่อเลือกไฟล์</span><br/>
                    เพื่อเริ่มการวิเคราะห์ด้วย AI
                  </p>
                  <p className="text-xs text-rose-500 font-medium pt-2 opacity-80">(ขนาดไฟล์สูงสุด {MAX_FILE_SIZE_MB} MB)</p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {[
                    { icon: FileSpreadsheet, label: 'Excel' },
                    { icon: FileDigit, label: 'CSV' },
                    { icon: FileText, label: 'PDF' },
                    { icon: ImageIcon, label: 'Image' }
                  ].map((Type, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <Type.icon size={14} className="text-slate-400 group-hover:text-indigo-500"/> {Type.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
