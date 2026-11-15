const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// 토스페이먼츠 공식 결제창형 샘플의 공개 테스트 시크릿 키입니다.
// 운영 환경에서는 반드시 TOSS_SECRET_KEY 환경변수로 라이브 키를 주입하세요.
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/payments/confirm", async (req, res) => {
  const { paymentKey, orderId, amount } = req.body;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ message: "paymentKey, orderId, amount가 모두 필요합니다." });
  }

  const encryptedSecretKey = "Basic " + Buffer.from(TOSS_SECRET_KEY + ":").toString("base64");

  try {
    const response = await axios.post(
      "https://api.tosspayments.com/v1/payments/confirm",
      { paymentKey, orderId, amount },
      {
        headers: {
          Authorization: encryptedSecretKey,
          "Content-Type": "application/json",
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    const tossError = error.response?.data;
    console.error("결제 승인 실패:", tossError || error.message);
    res.status(error.response?.status || 500).json(
      tossError || { message: "결제 승인 중 오류가 발생했습니다." }
    );
  }
});

app.listen(PORT, () => {
  console.log(`쇼핑몰 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
