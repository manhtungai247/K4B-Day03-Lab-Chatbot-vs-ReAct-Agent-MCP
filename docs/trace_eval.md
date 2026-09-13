# 📊 BÁO CÁO THU HOẠCH NGHIỆM THU BÀI LAB 3 (BƯỚC 3 — SUBMISSION ARTIFACT)

> **Họ và Tên Học viên:** [Trần Mạnh Tùng]  
> **Mã Sinh Viên / Mã Học viên:** [2A202602879]  
> **Chủ đề Lựa chọn:** Gợi ý 1.1: Trợ lý Học vụ & Lịch hẹn Tư vấn Sinh viên VinUni  

---

## 1. BẢNG CHẤM ĐIỂM AGENTIC FIT SCORING MATRIX (ĐÁNH GIÁ CHỦ ĐỀ)

| Tiêu chí Đánh giá | Mức độ (1 - 5) | Giải trình chi tiết lý do chọn điểm |
| :--- | :---: | :--- |
| **1. Multi-step Reasoning** | 4 / 5 | Yêu cầu suy luận nhiều bước liên tiếp: tra cứu hồ sơ sinh viên để xác định cố vấn học tập, sau đó sử dụng thông tin cố vấn để đặt lịch hẹn (như TC04). |
| **2. Tool Interaction** | 5 / 5 | Bắt buộc phải tương tác với MCP Server (`academic_query`, `schedule_appointment`) để truy xuất CSDL sinh viên và ghi nhận lịch hẹn thực tế, tránh ảo giác thông tin. |
| **3. Dynamic Decision** | 4 / 5 | Hành động kế tiếp phụ thuộc vào kết quả quan sát (Observation): nếu tìm thấy sinh viên thì tiếp tục quy trình, nếu `NOT_FOUND` thì dừng và phản hồi thích hợp (như TC05). |
| **4. Long Horizon Goal** | 4 / 5 | Hệ thống duy trì mục tiêu hỗ trợ học vụ xuyên suốt qua chuỗi hội thoại và các vòng lặp ReAct, thu thập đủ tham số trước khi hoàn tất hành động. |
| **TỔNG ĐIỂM AGENTIC FIT** | **17 / 20** | *Tổng điểm 17/20 (> 12/20): Bài toán rất phù hợp triển khai Agentic System.* |

---

## 2. TRÍCH XUẤT KẾT QUẢ WATERFALL TRACE LOG (SAU KHI CHẠY TEST SUITE TRÊN API THẬT)

> ⚠️ **YÊU CẦU NGHIỆM THU:** Mở tệp `.env` điền `GEMINI_API_KEY` (hoặc `OPENAI_API_KEY`) để kết nối LLM thật trước khi thực thi `python src/app.py --all`. Bài nộp chỉ dùng Mock Offline Provider sẽ không đạt điểm nghiệm thực tế.

Dán 1 đoạn trích xuất log tiêu biểu từ file `docs/trace_waterfall.json` sinh ra từ phản hồi LLM API thật:

```json
[
  {
    "step": 1,
    "query": "Tôi là sinh viên SV2026001, hãy đặt lịch hẹn tư vấn học vụ cho tôi vào lúc 14:00 ngày 15/09/2026 với cố vấn PGS.TS Nguyễn Văn A.",
    "action_type": "TOOL_EXECUTION",
    "tool_name": "schedule_appointment",
    "arguments": {
      "advisor_name": "PGS.TS Nguyễn Văn A",
      "datetime_str": "14:00 15/09/2026",
      "student_id": "SV2026001"
    },
    "observation": {
      "status": "SUCCESS",
      "booking_id": "BK-SV2026001-99",
      "student_id": "SV2026001",
      "datetime": "14:00 15/09/2026",
      "advisor": "PGS.TS Nguyễn Văn A",
      "message": "Đặt lịch thành công cho sinh viên SV2026001 với PGS.TS Nguyễn Văn A vào lúc 14:00 15/09/2026."
    },
    "latency_ms": 2196.3
  },
  {
    "step": 2,
    "query": "Tôi là sinh viên SV2026001, hãy đặt lịch hẹn tư vấn học vụ cho tôi vào lúc 14:00 ngày 15/09/2026 với cố vấn PGS.TS Nguyễn Văn A.",
    "action_type": "FINAL_ANSWER",
    "thought": "Tổng hợp kết quả từ MCP Server thành công.",
    "output": "Đặt lịch thành công cho sinh viên SV2026001 với PGS.TS Nguyễn Văn A vào lúc 14:00 15/09/2026.",
    "latency_ms": 10.0
  }
]
```

---

## 3. TỔNG KẾT KẾT QUẢ NGHIỆM THU & NỘP BÀI

- [x] Đã cấu hình API Key thật trong môi trường và xác nhận Agent chạy mượt mà trên LLM API thật (Google Gemini: `gemini-3.5-flash-lite`).
- **Tổng số Test Cases đã chạy thành công:** 5 / 5 test cases (TC01 - TC05).
- **Số lượt gọi Tool qua MCP Server chính xác:** 4 / 4 lượt (TC02, TC03, TC04, TC05).
- **Kết quả đẩy Repo nộp bài:** [x] Đã kiểm thử đầy đủ, sẵn sàng Commit và Push mã nguồn lên GitHub cá nhân.

---

> ✅ **HOÀN TẤT NỘP BÀI:** Sao chép đường link GitHub Repository cá nhân của bạn và dán vào ô nộp bài trên hệ thống LMS VLearn để hoàn tất Bài Lab 3!
