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

def get_client(version='v1'):
    """建立指定 API 版本的 Client"""
    return genai.Client(
        api_key=api_key,
        http_options={'api_version': version}
    )

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
    
    # 嘗試的 API 版本
    api_versions = ['v1', 'v1beta']
    
    # 嘗試的模型清單
    models_to_try = [
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash",
        "gemini-1.0-pro"  # 最後的保險
    ]
    
    last_error = ""
    
    for version in api_versions:
        print(f"--- Switching to API version: {version} ---")
        client = get_client(version)
        
        for model_id in models_to_try:
            try:
                print(f"Attempting {model_id} ({version})...")
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
                    
                print(f"Successfully generated daily_quotes.json using {model_id} ({version})")
                return # 成功後退出
                
            except Exception as e:
                last_error = str(e)
                # 簡化錯誤訊息輸出
                short_error = last_error[:100] + "..." if len(last_error) > 100 else last_error
                print(f"  Result: Failed. ({short_error})")
                
                if "429" in last_error:
                    print(f"  Tip: {model_id} quota exceeded.")
                
                continue # 嘗試下一個模型

    # 如果所有組合都失敗，確保檔案存在避免前端報錯
    print(f"\n[CRITICAL] All models and API versions failed.")
    if not os.path.exists("daily_quotes.json"):
        fallback = {
            "zh": ["暫時保持平靜，等待靈感回歸。"],
            "en": ["Stay calm for now, waiting for inspiration to return."],
            "ja": ["今は穏やかに、インスピレーションが戻るのを待ちましょう。"]
        }
        with open("daily_quotes.json", "w", encoding="utf-8") as f:
            json.dump(fallback, f, ensure_ascii=False, indent=4)
        print("Used fallback quotes.")

if __name__ == "__main__":
    generate_quotes()
