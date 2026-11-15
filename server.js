const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { products } = require("./data/products");

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = (process.env.SITE_URL || "https://shop-rho-three-16.vercel.app").replace(/\/$/, "");
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || "";

// 토스페이먼츠 공식 결제창형 샘플의 공개 테스트 시크릿 키입니다.
// 운영 환경에서는 반드시 TOSS_SECRET_KEY 환경변수로 라이브 키를 주입하세요.
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

const pageTemplate = fs.readFileSync(path.join(__dirname, "views", "index.html"), "utf-8");

const SITE_NAME = "토스 쇼핑몰";
const SITE_DESCRIPTION =
  "토스페이먼츠 결제창으로 구매할 수 있는 온라인 쇼핑몰입니다. 향수, 가방, 스피커, 머그를 판매합니다.";
const FAQ = [
  {
    question: "결제는 어떻게 하나요?",
    answer:
      '장바구니에서 "토스페이먼츠로 결제하기" 버튼을 누르면 토스페이먼츠 결제창이 열립니다. 결제가 끝나면 주문번호와 결제 금액이 표시됩니다.',
  },
];
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
];
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
const serializeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const formatWon = (value) => `₩${Number(value).toLocaleString("ko-KR")}`;
const absoluteUrl = (value) => new URL(value, SITE_URL).href;

const renderProductCard = (product) => `
      <div class="product-card">
        <a href="/products/${escapeHtml(product.id)}"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" /></a>
        <h3><a href="/products/${escapeHtml(product.id)}">${escapeHtml(product.name)}</a></h3>
        <p class="price">${formatWon(product.price)}</p>
        <button type="button" data-add="${escapeHtml(product.id)}">장바구니에 담기</button>
      </div>`;

const renderPage = ({ head, main }) =>
  pageTemplate
    .replace("<!-- SEO_HEAD -->", () => head)
    .replace("<!-- MAIN -->", () => main)
    .replace(
      "<!-- PRODUCT_DATA -->",
      () => `<script id="product-data" type="application/json">${serializeJson(products)}</script>`
    );

const buildHead = ({ title, description, pagePath, type, image, graph }) => {
  const url = `${SITE_URL}${pagePath}`;
  const imageUrl = absoluteUrl(image);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: "ko-KR" },
      { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: `${SITE_URL}/` },
      ...graph,
    ],
  };
  const verification = GOOGLE_SITE_VERIFICATION
    ? `\n  <meta name="google-site-verification" content="${escapeHtml(GOOGLE_SITE_VERIFICATION)}" />`
    : "";
  return `<title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(url)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${serializeJson(jsonLd)}</script>${verification}`;
};

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/index.html", (req, res) => res.redirect(301, "/"));

app.get("/", (req, res) => {
  const graph = [
    {
      "@type": "ItemList",
      name: "상품 목록",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.name,
        url: `${SITE_URL}/products/${product.id}`,
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  res.send(
    renderPage({
      head: buildHead({
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        pagePath: "/",
        type: "website",
        image: products[0].image,
        graph,
      }),
      main: `
    <section class="product-grid" id="product-grid">${products.map(renderProductCard).join("")}</section>
    <section class="faq">
      <h2>자주 묻는 질문</h2>
      ${FAQ.map(
        (item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`
      ).join("")}
    </section>`,
    })
  );
});

app.get("/products/:id", (req, res) => {
  const product = products.find((item) => item.id === req.params.id);

  if (!product) {
    return res.status(404).send(
      renderPage({
        head: buildHead({
          title: `상품을 찾을 수 없습니다 | ${SITE_NAME}`,
          description: SITE_DESCRIPTION,
          pagePath: "/",
          type: "website",
          image: products[0].image,
          graph: [],
        }),
        main: `
    <section class="product-grid" id="product-grid"></section>
    <section class="faq">
      <p>요청하신 상품을 찾을 수 없습니다.</p>
      <a href="/">쇼핑 계속하기</a>
    </section>`,
      })
    );
  }

  const url = `${SITE_URL}/products/${product.id}`;
  res.send(
    renderPage({
      head: buildHead({
        title: `${product.name} | ${SITE_NAME}`,
        description: product.description,
        pagePath: `/products/${product.id}`,
        type: "product",
        image: product.image,
        graph: [
          {
            "@type": "Product",
            "@id": `${url}#product`,
            name: product.name,
            description: product.description,
            image: absoluteUrl(product.image),
            sku: product.id,
            url,
            offers: { "@type": "Offer", price: product.price, priceCurrency: "KRW", url },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "홈", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: product.name, item: url },
            ],
          },
        ],
      }),
      main: `
    <nav class="breadcrumb"><a href="/">홈</a> / <span>${escapeHtml(product.name)}</span></nav>
    <section class="product-detail" id="product-grid">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
      <div>
        <h2>${escapeHtml(product.name)}</h2>
        <p class="price">${formatWon(product.price)}</p>
        <p>${escapeHtml(product.description)}</p>
        <button type="button" data-add="${escapeHtml(product.id)}">장바구니에 담기</button>
      </div>
    </section>`,
    })
  );
});

app.get("/robots.txt", (req, res) => {
  const aiRules = AI_CRAWLERS.map((bot) => `User-agent: ${bot}\nAllow: /`).join("\n\n");
  res.type("text/plain").send(
    `User-agent: *\nAllow: /\nDisallow: /api/\n\n${aiRules}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
});

app.get("/sitemap.xml", (req, res) => {
  const urls = [`${SITE_URL}/`, ...products.map((product) => `${SITE_URL}/products/${product.id}`)];
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );
});

app.get("/llms.txt", (req, res) => {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## 상품",
    ...products.map((product) => `- [${product.name}](${SITE_URL}/products/${product.id}): ${formatWon(product.price)}`),
    "",
    "## 결제",
    "- 토스페이먼츠 결제창으로 결제합니다.",
  ];
  res.type("text/plain").send(`${lines.join("\n")}\n`);
});

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

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`쇼핑몰 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
}
