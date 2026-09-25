# SQUEEZE · Stocklana

![SQUEEZE](demo/assets/brand/logo.webp)

**Chọn token. Chọn một đích đến.**

SQUEEZE gom việc xem token trong ví Solana, chọn lượng cần xử lý và khám phá đích đến vào một trang. Đích đến có thể là meme token có cặp thanh khoản với token cổ phiếu, hoặc SOL. Chọn token vào túi chỉ là thao tác lựa chọn, chưa chuyển tiền.

**Trạng thái ngày 26/09/2026:** xem ví là điểm bắt đầu trên sản phẩm. Giao dịch mainnet đang tắt để hoàn thiện tương thích Jupiter và kiểm chứng thực thi. PIP hiện chọn theo quy tắc, chưa phải AI đang hoạt động. Meme có cặp với token cổ phiếu không đồng nghĩa sở hữu cổ phần công ty.

## Dành cho giám khảo

- [Mở sản phẩm](https://squeeze-aya.pages.dev) và chọn **Try with sample tokens**.
- [README tiếng Anh](README.md) trình bày trải nghiệm, kiến trúc và giới hạn.
- [Hướng dẫn chấm](docs/JUDGING_GUIDE.md) có các bước thử và tình huống lỗi.
- [Project Info](PROJECT_INFO.md) có nội dung sẵn để điền form.

Chạy demo mẫu trên máy, không cần ví hay API key:

```sh
node scripts/serve.mjs
```

Mở **http://127.0.0.1:4187** bằng Node.js 22.16 trở lên. Thử chọn token, chỉnh 50%, chọn đích đến, xem trước rồi mô phỏng từng giao dịch. Mọi số liệu và kết quả trong demo đều giả lập.

## Phạm vi công khai

Repo này có bản client chạy ở chế độ mẫu, asset, năm hàm xử lý lượng token chính xác, kiểm thử và tài liệu. Backend, thuật toán chọn/ranking phía máy chủ, cấu hình thị trường, dịch vụ thực thi giao dịch và hạ tầng không được đưa vào. JavaScript phía trình duyệt vẫn đọc được; đóng gói không phải cách giấu mã.

```sh
node --test
node scripts/check-export.mjs
```

Các kiểm thử chỉ xác nhận phạm vi bản public, không chứng minh giao dịch mainnet hoạt động. Repo có lịch sử Git mới, không chứa lịch sử repo nội bộ. [Chi tiết phạm vi](docs/PUBLIC_SCOPE.md).
