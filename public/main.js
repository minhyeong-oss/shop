(() => {
  const $ = (selector) => document.querySelector(selector);

  // 토스페이먼츠 공식 결제창형 샘플의 공개 테스트 키입니다.
  const CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
  const CUSTOMER_KEY_STORAGE = "toss-shop-customer-key";
  let widgets = null;
  let paymentWindow = null;

  const getCustomerKey = () => {
    const savedCustomerKey = sessionStorage.getItem(CUSTOMER_KEY_STORAGE);
    if (savedCustomerKey) return savedCustomerKey;

    const customerKey = `customer-${crypto.randomUUID()}`;
    sessionStorage.setItem(CUSTOMER_KEY_STORAGE, customerKey);
    return customerKey;
  };

  const getWidgets = () => {
    if (widgets) return widgets;
    if (typeof window.TossPayments !== "function") {
      throw new Error("토스페이먼츠 결제 모듈을 불러오지 못했습니다.");
    }

    const tossPayments = window.TossPayments(CLIENT_KEY);
    widgets = tossPayments.widgets({
      customerKey: getCustomerKey(),
    });
    return widgets;
  };

  const showPaymentError = (error) => {
    if (error.code === "USER_CANCEL") return;
    console.error("토스페이먼츠 결제 요청 실패", {
      name: error.name,
      code: error.code,
      message: error.message,
    });
    const errorCode = error.code ? `[${error.code}] ` : "";
    const errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";
    alert(`결제 요청 중 오류가 발생했습니다: ${errorCode}${errorMessage}`);
  };

  const products = [
    { id: "p1", name: "NOCTURNE 01 오 드 퍼퓸 50ML", price: 198000, image: "https://picsum.photos/seed/p1/400" },
    { id: "p2", name: "클래식 가죽 백팩", price: 89000, image: "https://picsum.photos/seed/p2/400" },
    { id: "p3", name: "무선 블루투스 스피커", price: 45000, image: "https://picsum.photos/seed/p3/400" },
    { id: "p4", name: "핸드메이드 세라믹 머그", price: 18000, image: "https://picsum.photos/seed/p4/400" },
  ];

  const formatWon = (value) => `₩${Number(value).toLocaleString("ko-KR")}`;

  const cart = [];

  const grid = $("#product-grid");
  grid.innerHTML = products
    .map(
      (p) => `
      <div class="product-card">
        <img src="${p.image}" alt="${p.name}" />
        <h3>${p.name}</h3>
        <p class="price">${formatWon(p.price)}</p>
        <button type="button" data-add="${p.id}">장바구니에 담기</button>
      </div>`
    )
    .join("");

  grid.addEventListener("click", (event) => {
    const id = event.target.dataset.add;
    if (!id) return;
    const product = products.find((p) => p.id === id);
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    renderCart();
    openCart();
  });

  const cartDrawer = $("#cart-drawer");
  const cartScrim = $("#cart-scrim");
  const openCart = () => {
    cartDrawer.classList.add("is-open");
    cartScrim.classList.add("is-open");
  };
  const closeCart = () => {
    cartDrawer.classList.remove("is-open");
    cartScrim.classList.remove("is-open");
  };
  $("#cart-button").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", closeCart);
  cartScrim.addEventListener("click", closeCart);

  const cartList = $("#cart-list");
  const cartCount = $("#cart-count");
  const cartTotalPrice = $("#cart-total-price");
  const checkoutButton = $("#checkout-button");

  const renderCart = () => {
    cartCount.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
    cartList.innerHTML = cart
      .map(
        (item) => `
        <li data-id="${item.id}">
          <span>${item.name} × ${item.quantity}</span>
          <span>${formatWon(item.price * item.quantity)}</span>
          <button type="button" data-remove="${item.id}">삭제</button>
        </li>`
      )
      .join("");
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotalPrice.textContent = formatWon(total);
    checkoutButton.disabled = cart.length === 0;
  };

  cartList.addEventListener("click", (event) => {
    const id = event.target.dataset.remove;
    if (!id) return;
    const index = cart.findIndex((item) => item.id === id);
    if (index !== -1) cart.splice(index, 1);
    renderCart();
  });

  const generateOrderId = () =>
    `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  checkoutButton.addEventListener("click", async () => {
    const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (totalAmount <= 0) return;

    const orderName =
      cart.length === 1
        ? cart[0].name
        : `${cart[0].name} 외 ${cart.length - 1}건`;

    // 승인 단계에서 금액을 검증할 수 있도록 주문 정보를 임시 저장합니다.
    sessionStorage.setItem(
      "toss-shop-order",
      JSON.stringify({ orderId: generateOrderId(), amount: totalAmount })
    );
    const order = JSON.parse(sessionStorage.getItem("toss-shop-order"));

    try {
      const widgetClient = getWidgets();
      await widgetClient.setAmount({
        currency: "KRW",
        value: totalAmount,
      });

      if (paymentWindow) {
        await paymentWindow.destroy();
      }

      paymentWindow = await widgetClient.renderPaymentWindow({
        variantKey: {
          paymentMethod: "DEFAULT",
          agreement: "AGREEMENT",
        },
      });

      paymentWindow.on("paymentRequest", async () => {
        try {
          await widgetClient.requestPayment({
            orderId: order.orderId,
            orderName,
            successUrl: `${window.location.origin}/success.html`,
            failUrl: `${window.location.origin}/fail.html`,
            customerEmail: "customer@example.com",
            customerName: "테스트 고객",
          });
        } catch (error) {
          showPaymentError(error);
        }
      });
    } catch (error) {
      showPaymentError(error);
    }
  });

  renderCart();
})();
