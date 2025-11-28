import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { AnalysisResult } from "../types";
import { read, utils } from "xlsx";

// Helper to safely get API Key from either Vite env or Process env
const getApiKey = (): string => {
  // 1. Try Vite Environment (Vercel/Production)
  // We use explicit checking to prevent runtime errors if import.meta or env is undefined
  try {
    // Cast to any to bypass strict TypeScript checks on ImportMeta
    const viteEnv = (import.meta as any)?.env;
    if (viteEnv && viteEnv.VITE_API_KEY) {
      return viteEnv.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore error if import.meta is not available
  }

  // 2. Try Process Environment (Development/Previewer fallback)
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore error if process is not available
  }

  return "";
};

const apiKey = getApiKey();

if (!apiKey) {
  console.warn("Warning: API Key is missing. Please set VITE_API_KEY (Vercel) or API_KEY (Dev).");
}

// Initialize GoogleGenAI
const genAI = new GoogleGenAI({ apiKey: apiKey });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A comprehensive executive summary in Thai.",
    },
    future_outlook: {
      type: Type.STRING,
      description: "Analysis of future trends and financial outlook based on current data in Thai.",
    },
    financial_ratios: {
      type: Type.ARRAY,
      description: "Key financial ratios covering Liquidity, Profitability, Efficiency, and Leverage.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the ratio (e.g., Net Profit Margin, D/E Ratio)" },
          value: { type: Type.NUMBER, description: "The calculated ratio value" },
          benchmark: { type: Type.NUMBER, description: "Standard industry benchmark if known, else null" },
          status: { type: Type.STRING, enum: ["Good", "Average", "Poor"] },
          category: { type: Type.STRING, enum: ["Liquidity", "Profitability", "Efficiency", "Leverage"] },
          description: { type: Type.STRING, description: "Brief explanation in Thai" }
        },
        required: ["name", "value", "status", "category", "description"]
      }
    },
    key_metrics: {
      type: Type.ARRAY,
      description: "Consolidated key financial figures for charting.",
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Label in Thai (e.g., สินทรัพย์รวม)" },
          value: { type: Type.NUMBER },
          unit: { type: Type.STRING, description: "Currency unit (e.g., THB)" }
        },
        required: ["label", "value"]
      }
    },
    anomalies: {
      type: Type.ARRAY,
      description: "List of items with significant VARIANCE or abnormalities.",
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING, description: "Name of the line item" },
          observation: { type: Type.STRING, description: "Analysis of the CHANGE in Thai" },
          impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          related_entity: { type: Type.STRING, description: "If specific to a department (e.g., 'BusA'), specify here. Otherwise null." }
        },
        required: ["item", "observation", "impact"]
      }
    },
    account_insights: {
      type: Type.ARRAY,
      description: "Detailed analysis for MAJOR accounts.",
      items: {
        type: Type.OBJECT,
        properties: {
          account_name: { type: Type.STRING, description: "Name of the account in Thai" },
          value: { type: Type.NUMBER, description: "Current value" },
          change_percentage: { type: Type.NUMBER, description: "Percentage change from previous period (if available)" },
          analysis: { type: Type.STRING, description: "Specific insight in Thai" },
          status: { type: Type.STRING, enum: ["Normal", "Concern", "Good"] }
        },
        required: ["account_name", "value", "analysis", "status"]
      }
    },
    entity_insights: {
      type: Type.ARRAY,
      description: "Detailed breakdown for each specific entity/department found.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the entity/department" },
          liquidity_status: { type: Type.STRING, enum: ["Good", "Average", "Poor"] },
          summary: { type: Type.STRING, description: "Specific analysis for this entity in Thai" },
          key_metrics: {
            type: Type.ARRAY,
             description: "Key metrics specific to this entity",
             items: {
               type: Type.OBJECT,
               properties: {
                 label: { type: Type.STRING },
                 value: { type: Type.NUMBER },
                 unit: { type: Type.STRING }
               }
             }
          }
        },
        required: ["name", "liquidity_status", "summary", "key_metrics"]
      }
    }
  },
  required: ["summary", "future_outlook", "financial_ratios", "key_metrics", "anomalies"]
};

// Helper to convert base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Helper to parse Excel content
const parseExcelContent = (base64Data: string): string => {
  try {
    const buffer = base64ToArrayBuffer(base64Data);
    const workbook = read(buffer, { type: 'array' });
    
    let combinedText = "Financial Data extracted from Excel:\n\n";
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = utils.sheet_to_csv(worksheet);
      combinedText += `--- Sheet Name: ${sheetName} (Treat this as a specific Entity/Department if applicable) ---\n${csv}\n\n`;
    });
    
    return combinedText;
  } catch (error) {
    console.error("Excel Parsing Error:", error);
    throw new Error("ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบว่าไฟล์ไม่เสียหายและไม่ได้ใส่รหัสผ่าน");
  }
};

export const analyzeFinancialDocument = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const model = "gemini-2.5-flash";
    
    const promptText = `
      คุณคือผู้เชี่ยวชาญด้านบัญชีและการเงิน (CPA / Financial Analyst)
      หน้าที่ของคุณคือวิเคราะห์งบการเงินโดยเน้น **"การวิเคราะห์เปรียบเทียบ (Variance Analysis)"**, **"การวิเคราะห์แยกหน่วยงาน (Entity Analysis)"** และ **"การวิเคราะห์แนวโน้มในอนาคต (Future Outlook)"**
      
      กรุณาวิเคราะห์ประเด็นต่อไปนี้เป็นภาษาไทย:
      
      1. **ภาพรวม (Consolidated View):**
         - วิเคราะห์รายการที่มีการเปลี่ยนแปลงอย่างมีนัยสำคัญ
         - สภาพคล่องภาพรวม และความสามารถในการทำกำไร
      
      2. **แนวโน้มในอนาคต (Future Outlook):**
         - จากข้อมูลที่มีอยู่ ให้พยากรณ์แนวโน้มสถานะทางการเงิน ความเสี่ยง หรือโอกาสทางธุรกิจในงวดถัดไป
      
      3. **อัตราส่วนทางการเงินที่สำคัญ (Key Financial Ratios):**
         - คำนวณอัตราส่วนสำคัญ ไม่ใช่แค่สภาพคล่อง (Liquidity) แต่รวมถึง ความสามารถในการทำกำไร (Profitability: e.g., Net Profit Margin), ประสิทธิภาพ (Efficiency: e.g., Asset Turnover), และหนี้สิน (Leverage: e.g., D/E Ratio)
      
      4. **การวิเคราะห์แยกรายหน่วยงาน (Entity Breakdown):**
         - หากในเอกสารมีการแบ่งข้อมูลตามหน่วยงาน (เช่น "การไฟฟ้า", "BusA"), ให้ดึงข้อมูลแยกออกมา
      
      5. **รายการผิดปกติ (Anomalies):**
         - ระบุรายการที่สูงหรือต่ำผิดปกติ

      Extract numerical data accurately for the JSON response.
    `;

    const parts: Part[] = [];

    // Handle Excel separately by converting to Text
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'application/vnd.ms-excel') {
      const excelText = parseExcelContent(base64Data);
      parts.push({ text: excelText });
    } else if (mimeType === 'text/csv') {
      // Handle CSV by decoding to UTF-8 Text
      try {
        const buffer = base64ToArrayBuffer(base64Data);
        const decoder = new TextDecoder("utf-8");
        const csvText = decoder.decode(buffer);
        parts.push({ text: `Financial Data extracted from CSV file:\n\n${csvText}` });
      } catch (e) {
         throw new Error("ไม่สามารถอ่านไฟล์ CSV ได้ กรุณาตรวจสอบ Encoding ของไฟล์");
      }
    } else {
      // For PDF and Images, use inlineData
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    // Add the prompt
    parts.push({ text: promptText });

    const response = await genAI.models.generateContent({
      model: model,
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2,
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("AI ไม่สามารถประมวลผลข้อมูลจากไฟล์นี้ได้ (Empty Response)");
    }

    try {
      return JSON.parse(textResponse) as AnalysisResult;
    } catch (parseError) {
      console.error("JSON Parse Error:", textResponse);
      throw new Error("เกิดข้อผิดพลาดในการแปลงผลลัพธ์จาก AI (Invalid JSON Format)");
    }

  } catch (error: any) {
    console.error("Error analyzing financial statement:", error);
    // If it's already a specific error we threw, rethrow it
    if (error.message && (error.message.includes("Excel") || error.message.includes("AI") || error.message.includes("JSON") || error.message.includes("API Key"))) {
       throw error;
    }
    // Generic fallback for API errors
    throw new Error("เกิดปัญหาการเชื่อมต่อกับระบบ AI หรือไฟล์มีขนาดใหญ่/ซับซ้อนเกินไป");
  }
};