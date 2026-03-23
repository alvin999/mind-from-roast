import os
import json
import time
from google import genai
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 設定 API Key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found.")
    exit(1)

# 初始化最新版 Client
client = genai.Client(api_key=api_key)

def generate_quotes():
    prompt = """
    Please generate 5 unique healing and encouraging quotes for a Pomodoro timer app.
    Provide them in a JSON format with keys: 'zh' (Traditional Chinese), 'en' (English), and 'ja' (Japanese).
    Each language should have an array of 5 strings.
    The tone should be gentle, warm, and Zen-like.
    
    Example format:
    {
        "zh": ["...", "..."],
        "en": ["...", "..."],
        "ja": ["...", "..."]
    }
    """
    
    try:
        # 使用最新 SDK 調用方式
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        content = response.text
        
        # 清理 Markdown 標記
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        quotes_data = json.loads(content)
        
        # 儲存到檔案
        with open("daily_quotes.json", "w", encoding="utf-8") as f:
            json.dump(quotes_data, f, ensure_ascii=False, indent=4)
            
        print("Successfully generated daily_quotes.json using google-genai")
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error generating quotes: {error_msg}")
        
        # 針對 429 錯誤給予提示
        if "429" in error_msg:
            print("Detected Quota Exceeded (429). Please check your Gemini API billing or rate limits.")
        
        # 發生錯誤時保持檔案存在，避免前端報錯 (保留舊有資料或建立空結構)
        if not os.path.exists("daily_quotes.json"):
            fallback = {
                "zh": ["暫時保持平靜，等待靈感回歸。"],
                "en": ["Stay calm for now, waiting for inspiration to return."],
                "ja": ["今は穏やかに、インスピレーションが戻るのを待ちましょう。"]
            }
            with open("daily_quotes.json", "w", encoding="utf-8") as f:
                json.dump(fallback, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    generate_quotes()
