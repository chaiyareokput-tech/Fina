
import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { AnalysisResult } from "../types";
import { read, utils } from "xlsx";

// Declare process to avoid TypeScript errors in browser environment where @types/node might not be fully loaded
declare const process: any;

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
          unit: { type: Type.STRING, description: "Currency unit (e.g., THB)" },
          year: { type: Type.STRING, description: "Fiscal Year (e.g., '2568', '2025')." }
        },
        required: ["label", "value", "year"]
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
                 unit: { type: Type.STRING },
                 year: { type: Type.STRING, description: "Fiscal Year (e.g., '2568', '2025')." }
               },
               required: ["label", "value", "year"]
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
      // Convert to CSV but keep it clean - remove completely empty rows
      const csv = utils.sheet_to_csv(worksheet, { blankrows: false });
      // Further optimize by truncating very long empty strings if necessary or limiting rows
      combinedText += `--- Sheet Name: ${sheetName} ---\n${csv}\n\n`;
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
      Act as a Highly Skilled Senior Accountant and Financial Analyst (นักบัญชีและนักวิเคราะห์การเงินระดับสูง).
      Your task is to provide a professional, detailed, and accurate analysis of this financial document in Thai (ภาษาไทย).

      **Core Focus: Financial Ratio Analysis**
      You must calculate and interpret key financial ratios with precision. Explain what these ratios indicate about the company's health regarding Liquidity, Profitability, Efficiency, and Leverage. Provide deep insights into *why* the ratios are at these levels based on the data provided.

      **IMPORTANT: Entity & Branch Extraction Rules**
      You must carefully identify and separate data for distinct operational units.
      **PRIMARY KEYWORDS to look for in identifying Entities:**
      1. **"H" Codes**: (e.g., H.1, H.2, H.1.2) - often used for departments or cost centers.
      2. **"กฟส."**: (e.g., กฟส.เชียงใหม่, กฟส.ม.) - Provincial Electricity Authority (PEA) branches.
      3. **"การไฟฟ้า"**: (e.g., การไฟฟ้าเขต 1, การไฟฟ้าส่วนภูมิภาค) - Electricity Areas/Authorities.

      When populating 'entity_insights', create a separate entry for EACH unique unit found that matches these patterns. 
      Do NOT aggregate them into "Overall" unless explicitly stated. Ensure the 'name' field clearly identifies the branch or code (e.g., "กฟส.แม่ริม").
      
      For 'entity_insights.key_metrics' AND 'key_metrics', you MUST:
      1. Extract data primarily for **Fiscal Year 2568 (or 2025)**. Only extract other years if 2568 is not found.
      2. Explicitly fill the 'year' field for every metric (e.g., "2568", "2025").
      3. Try to extract and standardize these 7 specific metrics for comparison:
         - "รายได้รวม" (Total Revenue)
         - "ค่าใช้จ่ายรวม" (Total Expenses)
         - "กำไรสุทธิ" (Net Profit)
         - "กำไรขั้นต้น" (Gross Profit)
         - "EBITDA"
         - "สินทรัพย์รวม" (Total Assets)
         - "หนี้สินรวม" (Total Liabilities)

      **Specific Analysis Instructions:**

      1. **Executive Summary (Accountant's Perspective):**
         - Summarize the financial position based on the audit evidence found.
         - Highlight key variances, overall financial stability, and the quality of the financial statements.
         - Identify the single most critical narrative driving these financial results.

      2. **Future Outlook & Strategy:**
         - Based on current trends and ratio analysis, predict the financial trajectory for the next 6-12 months.
         - Identify specific internal/external risks (market, operational, financial).
         - Provide 3 concrete, high-level STRATEGIC RECOMMENDATIONS to improve financial health.

      3. **Variance & Anomalies:**
         - Look beyond just large % changes. Identify "Red Flags" or unusual patterns that might indicate operational issues, inefficiency, or accounting anomalies.
         - Explain the *potential cause* and *business impact* of these anomalies.

      4. **Entity/Department Analysis (Benchmarking):**
         - Use the extracted entities (H, กฟส, การไฟฟ้า) to compare performance.
         - Which branch/unit is the most profitable? Which has the highest cost?

      5. **Ratios (Critical Priority):**
         - Calculate Liquidity, Profitability (Net Margin), Efficiency (Asset Turnover), Leverage (D/E).
         - **Mandatory:** Rate them honestly as Good/Average/Poor based on general industry standards.
         - Provide a clear, accountant-level explanation of what the ratio means for this specific entity.

      Extract all data into the defined JSON schema.
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
        temperature: 0.3, // Slightly increased for more insightful/creative reasoning while keeping format strict
        thinkingConfig: { thinkingBudget: 0 }
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
