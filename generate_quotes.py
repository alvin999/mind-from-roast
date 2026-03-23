import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# 載入環境變數 (本地測試用)
load_dotenv()

# 設定 API Key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found.")
    exit(1)

genai.configure(api_key=api_key)

def generate_quotes():
    model = genai.GenerativeModel('gemini-2.0-flash')
    
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
        response = model.generate_content(prompt)
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
            
        print("Successfully generated daily_quotes.json")
        
    except Exception as e:
        print(f"Error generating quotes: {e}")
        # 如果失敗，建立一個空結構避免前端報錯
        fallback = {"zh": [], "en": [], "ja": []}
        with open("daily_quotes.json", "w", encoding="utf-8") as f:
            json.dump(fallback, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    generate_quotes()
