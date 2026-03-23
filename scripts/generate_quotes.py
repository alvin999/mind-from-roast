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
    
    # 嘗試的 API 版本 (v1 通常包含大部分穩定模型, v1beta 則有最新實驗模型)
    api_versions = ['v1', 'v1beta']
    
    # 優先嘗試的關鍵模型 (優先級從高到低)
    priority_models = [
        "gemini-1.5-flash-002",
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.0-pro"
    ]
    
    last_error = ""
    
    for version in api_versions:
        print(f"\n--- Trying API Version: {version} ---")
        try:
            client = genai.Client(api_key=api_key, http_options={'api_version': version})
            
            # 取得該用戶權限下所有可用的模型清單
            available_models = []
            try:
                for m in client.models.list():
                    m_name = m.name.replace('models/', '')
                    # 只要名字包含 gemini 且不是一些特殊用途的模型就加入
                    if 'gemini' in m_name.lower():
                        available_models.append(m_name)
            except Exception as le:
                print(f"  Warning: Could not list models for {version}: {le}")
                available_models = priority_models # 降級使用預設清單
            
            # 建立測試隊列
            test_queue = []
            # 先加入優先模型 (如果存在於可用清單中)
            for pm in priority_models:
                if pm in available_models:
                    test_queue.append(pm)
                    available_models.remove(pm)
            # 再加入剩下的所有模型
            test_queue.extend(available_models)
            # 確保 1.0 Pro 一定在隊列中作為最後保險
            if "gemini-1.0-pro" not in test_queue:
                test_queue.append("gemini-1.0-pro")

            for model_id in test_queue:
                try:
                    print(f"Attempting {model_id}...")
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
                    with open("data/daily_quotes.json", "w", encoding="utf-8") as f:
                        json.dump(quotes_data, f, ensure_ascii=False, indent=4)
                        
                    print(f"Successfully generated data/daily_quotes.json using {model_id} ({version})")
                    return # 成功後退出
                    
                except Exception as e:
                    last_error = str(e)
                    if "429" in last_error:
                        print(f"  {model_id}: Quota exceeded.")
                    elif "404" in last_error:
                        print(f"  {model_id}: Not found.")
                    else:
                        print(f"  {model_id}: Error occurred.")
                    continue

        except Exception as ve:
            print(f"  API Version {version} is not accessible: {ve}")

    # 如果所有組合都失敗，確保檔案存在
    print(f"\n[CRITICAL] All available models failed.")
    if not os.path.exists("data/daily_quotes.json"):
        fallback = {
            "zh": ["暫時保持平靜，等待靈感回歸。"],
            "en": ["Stay calm for now, waiting for inspiration to return."],
            "ja": ["今は穏やかに、インスピレーションが戻るのを待ちましょう。"]
        }
        with open("data/daily_quotes.json", "w", encoding="utf-8") as f:
            json.dump(fallback, f, ensure_ascii=False, indent=4)
        print("Used fallback quotes.")

if __name__ == "__main__":
    generate_quotes()
