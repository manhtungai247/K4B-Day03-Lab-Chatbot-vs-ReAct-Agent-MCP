"""
🌐 WEB UI DEMO SERVER (DAY 03: CHATBOT VS REACT AGENT MCP)
Máy chủ Web UI nhẹ nhàng phục vụ giao diện Demo trực quan cho Bài Lab 3 VinUni.
Chạy trực tiếp bằng Python built-in, không cần cài đặt thêm thư viện!
"""

import os
import sys
import json
import mimetypes
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Ensure local src imports work
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(BASE_DIR, "src")
STATIC_DIR = os.path.join(SRC_DIR, "static")
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from mcp_server import MCPAcademicServer
from tools import TOOLS_SCHEMA, MOCK_DATABASE
from prompts import CHATBOT_BASELINE_PROMPT, REACT_AGENT_SYSTEM_PROMPT
from providers import get_llm_provider, GeminiProvider, MockOfflineProvider
from app import load_test_cases, run_react_agent, save_waterfall_trace

# Global Instances
mcp_server = MCPAcademicServer()
active_provider_name = "gemini"
providers_cache = {
    "gemini": get_llm_provider(),
    "mock": MockOfflineProvider()
}

def get_current_provider(name: str = None):
    p_name = name or active_provider_name
    if p_name not in providers_cache:
        if p_name == "mock":
            providers_cache["mock"] = MockOfflineProvider()
        else:
            providers_cache["gemini"] = get_llm_provider()
    return providers_cache.get(p_name, providers_cache["mock"])


class DemoWebHandler(BaseHTTPRequestHandler):
    """Xử lý HTTP Requests cho Web UI Demo"""
    
    def log_message(self, format, *args):
        # Clean console log
        pass

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. API: Get Test Cases
        if path == "/api/test-cases":
            try:
                tests = load_test_cases()
                self.send_json(tests)
            except Exception as e:
                self.send_json({"error": str(e)}, status=500)
            return

        # 2. API: Get Waterfall Trace
        elif path == "/api/trace":
            trace_path = os.path.join(BASE_DIR, "docs", "trace_waterfall.json")
            if os.path.exists(trace_path):
                try:
                    with open(trace_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    self.send_json(data)
                except Exception as e:
                    self.send_json([], status=200)
            else:
                self.send_json([], status=200)
            return

        # 3. API: Get MCP Tools & Database
        elif path == "/api/mcp-tools":
            self.send_json({
                "tools": TOOLS_SCHEMA,
                "database": MOCK_DATABASE,
                "server_name": mcp_server.server_name,
                "server_version": mcp_server.version
            })
            return

        # 4. Static Files & Root Index
        if path == "/" or path == "/index.html":
            file_path = os.path.join(STATIC_DIR, "index.html")
        elif path.startswith("/static/"):
            relative_static = path[len("/static/"):]
            file_path = os.path.join(STATIC_DIR, relative_static)
        else:
            file_path = os.path.join(STATIC_DIR, path.lstrip("/"))

        if os.path.exists(file_path) and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            if file_path.endswith(".css"):
                mime_type = "text/css"
            elif file_path.endswith(".js"):
                mime_type = "application/javascript"
            elif file_path.endswith(".html"):
                mime_type = "text/html"

            with open(file_path, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", f"{mime_type or 'text/plain'}; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8')
        try:
            req_data = json.loads(body) if body else {}
        except Exception:
            req_data = {}

        # 1. API: Set Provider live
        if path == "/api/set-provider":
            global active_provider_name
            p = req_data.get("provider", "gemini")
            active_provider_name = p
            self.send_json({"status": "SUCCESS", "active_provider": active_provider_name})
            return

        # 2. API: Chat (ReAct Agent execution)
        elif path == "/api/chat":
            query = req_data.get("query", "").strip()
            provider_name = req_data.get("provider", active_provider_name)
            if not query:
                self.send_json({"error": "Query cannot be empty"}, status=400)
                return

            provider = get_current_provider(provider_name)
            try:
                trace_logs = run_react_agent(query, provider, mcp_server)
                save_waterfall_trace(trace_logs)
                self.send_json({"status": "SUCCESS", "trace": trace_logs})
            except Exception as e:
                self.send_json({"error": str(e)}, status=500)
            return

        # 3. API: Side-by-Side Arena Comparison
        elif path == "/api/compare":
            query = req_data.get("query", "").strip()
            provider_name = req_data.get("provider", active_provider_name)
            if not query:
                self.send_json({"error": "Query cannot be empty"}, status=400)
                return

            provider = get_current_provider(provider_name)
            try:
                # Run Chatbot Baseline (Level 2)
                chatbot_resp = provider.generate(query, system_prompt=CHATBOT_BASELINE_PROMPT)
                
                # Run ReAct Agent (Level 3 - MCP)
                agent_traces = run_react_agent(query, provider, mcp_server)
                final_item = next((t for t in reversed(agent_traces) if t.get("action_type") == "FINAL_ANSWER"), None)
                agent_resp = final_item.get("output", "") if final_item else "Hoàn thành xử lý."

                self.send_json({
                    "status": "SUCCESS",
                    "chatbot_response": chatbot_resp,
                    "agent_response": agent_resp,
                    "agent_traces": agent_traces
                })
            except Exception as e:
                self.send_json({"error": str(e)}, status=500)
            return

        # 4. API: Direct MCP Tool Sandbox execution
        elif path == "/api/mcp-execute":
            tool_name = req_data.get("tool")
            arguments = req_data.get("arguments", {})
            if not tool_name:
                self.send_json({"error": "Tool name is required"}, status=400)
                return

            try:
                mcp_res = mcp_server.call_tool(tool_name, arguments)
                self.send_json(mcp_res)
            except Exception as e:
                self.send_json({"error": str(e)}, status=500)
            return

        # 5. API: Add New Student to Dynamic DB
        elif path == "/api/students":
            student_id = req_data.get("student_id", "").strip().upper()
            if not student_id:
                self.send_json({"error": "Student ID is required"}, status=400)
                return

            MOCK_DATABASE[student_id] = {
                "full_name": req_data.get("full_name", ""),
                "class": req_data.get("class", "AI-K4"),
                "gpa": float(req_data.get("gpa", 3.5)),
                "email": req_data.get("email", f"{student_id.lower()}@vinuni.edu.vn"),
                "status": req_data.get("status", "Đang học"),
                "advisor": req_data.get("advisor", "PGS.TS Nguyễn Văn A")
            }
            self.send_json({"status": "SUCCESS", "student_id": student_id, "data": MOCK_DATABASE[student_id]})
            return

        else:
            self.send_response(404)
            self.end_headers()


def start_server(port: int = 8080):
    """Khởi động Web UI Server"""
    for try_port in [port, port + 1, port + 2, 8501, 5000]:
        try:
            server_address = ('', try_port)
            httpd = ThreadingHTTPServer(server_address, DemoWebHandler)
            url = f"http://localhost:{try_port}"
            print("==================================================================")
            print("🎨 VINUNI AI - CHATBOT VS REACT AGENT (MCP ENHANCED) WEB UI DEMO")
            print("==================================================================")
            print(f"🚀 Máy chủ Web UI đang hoạt động tại: {url}")
            print("👉 Mở trình duyệt và truy cập đường dẫn trên để trải nghiệm Demo!")
            print("💡 Tính năng: ReAct Stream, Side-by-Side Arena, MCP Sandbox, Trace Timeline")
            print("   (Nhấn Ctrl+C để dừng máy chủ)")
            print("==================================================================")
            
            try:
                webbrowser.open(url)
            except Exception:
                pass

            httpd.serve_forever()
            break
        except OSError:
            continue


if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    start_server(port)
