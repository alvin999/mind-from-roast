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
    
    # 嘗試的模型清單 (優先使用中使用者要求的 1.5)
    models_to_try = ["gemini-1.5-flash", "gemini-2.0-flash"]
    
    last_error = ""
    for model_id in models_to_try:
        try:
            print(f"Attempting to generate quotes using {model_id}...")
            response = client.models.generate_content(
                model=model_id,
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
                
            print(f"Successfully generated daily_quotes.json using {model_id}")
            return # 成功後退出
            
        except Exception as e:
            last_error = str(e)
            print(f"Error with {model_id}: {last_error}")
            
            # 針對 429 錯誤給予提示
            if "429" in last_error:
                print(f"Detected Quota Exceeded for {model_id}.")
            
            continue # 嘗試下一個模型

    # 如果所有模型都失敗，確保檔案存在避免前端報錯
    print(f"All models failed. Last error: {last_error}")
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
