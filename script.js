 
 /* ==========================
   DOM ELEMENTS
========================== */

const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const rtlToggleBtn = document.getElementById("rtlToggleBtn");

/* ==========================
   CLOUDFLARE WORKER
========================== */

// ⚠️ Replace with your actual Cloudflare Worker URL
const WORKER_URL = "https://lorealbeautyassistant.awaheed9.workers.dev/";

/* ==========================
   APP DATA & PAGINATION
========================== */

let allProducts = [];
let selectedProducts = [];
let visibleCount = 6; // Initial products shown
const INITIAL_VISIBLE_COUNT = 6;

// Track open details state across renders (by product ID)
let openDescriptions = new Set();

// Persistent conversation memory
let messages = [
  {
    role: "system",
    content:
       `
You are an expert L'Oréal Beauty Advisor.

STRICT RULES:
- Only answer questions related to L'Oréal products, skincare, haircare, makeup, fragrance, beauty routines, ingredients, and beauty recommendations.
- Do NOT answer questions about movies, sports, politics, programming, finance, schoolwork, or unrelated topics.
- If a user asks an unrelated question, politely say that you can only help with L'Oréal beauty products and routines.
- Do not use web search results for unrelated topics.

When answering beauty-related questions:
- Use the user's selected products and previous conversation history.
- Provide personalized beauty advice.
- If web search information is used, include a Sources section with links.

`
  }
];

/* ==========================
   LOAD PRODUCTS
========================== */

async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;

    // Load persisted user choices
    loadSavedProducts();
  } catch (error) {
    console.error("Error loading products.json:", error);
  }
}

/* ==========================
   DISPLAY PRODUCTS
========================== */

function displayProducts(products) {
  const productsToDisplay = products.slice(0, visibleCount);

  const cardsHTML = productsToDisplay
    .map((product) => {
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      const isOpen = openDescriptions.has(product.id);

      return `
    <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">

      <img src="${product.image}" alt="${product.name}">

      <div class="product-info">
        <h2>${product.name}</h2>
        <p>${product.brand}</p>
        <button class="description-btn" type="button">
          ${isOpen ? "Close Details" : "View Details"}
        </button>
        <div class="description ${isOpen ? "show" : ""}">${product.description}</div>
      </div>

    </div>
  `;
    })
    .join("");

  // Determine button state based on total matching products
  const canShowMore = visibleCount < products.length;
  const isExpanded = visibleCount > INITIAL_VISIBLE_COUNT;

  let showMoreHTML = "";
  if (canShowMore) {
    showMoreHTML = `<div class="show-more-container">
        <button id="showMoreBtn" class="show-more-btn" type="button">Show More Products</button>
       </div>`;
  } else if (isExpanded && products.length > INITIAL_VISIBLE_COUNT) {
    showMoreHTML = `<div class="show-more-container">
        <button id="showMoreBtn" class="show-more-btn" type="button">Show Less</button>
       </div>`;
  }

  productsContainer.innerHTML = cardsHTML + showMoreHTML;

  addProductEvents();

  // Attach event listener to Show More / Show Less button
  const showMoreBtn = document.getElementById("showMoreBtn");
  if (showMoreBtn) {
    showMoreBtn.addEventListener("click", () => {
      if (canShowMore) {
        visibleCount += 6;
      } else {
        visibleCount = INITIAL_VISIBLE_COUNT; // Collapse back to initial count
      }
      displayProducts(filterProducts());
    });
  }
}

/* ==========================
   PRODUCT CLICK EVENTS
========================== */

function addProductEvents() {
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const id = Number(card.dataset.id);

      // Toggle description text & visibility when clicking "View Details" / "Close Details"
      if (e.target.classList.contains("description-btn")) {
        e.stopPropagation();
        const descDiv = card.querySelector(".description");

        if (openDescriptions.has(id)) {
          openDescriptions.delete(id);
          if (descDiv) descDiv.classList.remove("show");
          e.target.textContent = "View Details";
        } else {
          openDescriptions.add(id);
          if (descDiv) descDiv.classList.add("show");
          e.target.textContent = "Close Details";
        }
        return;
      }

      // Handle card selection
      const product = allProducts.find((p) => p.id === id);

      if (selectedProducts.some((p) => p.id === id)) {
        selectedProducts = selectedProducts.filter((p) => p.id !== id);
      } else {
        selectedProducts.push(product);
      }

      saveProducts();
      updateSelectedList();
      displayProducts(filterProducts());
    });
  });
}

/* ==========================
   FILTER & SEARCH PRODUCTS
========================== */

function filterProducts() {
  const category = categoryFilter.value;
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

  return allProducts.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;
  });
}

categoryFilter.addEventListener("change", () => {
  visibleCount = INITIAL_VISIBLE_COUNT;
  displayProducts(filterProducts());
});

if (searchInput) {
  searchInput.addEventListener("input", () => {
    visibleCount = INITIAL_VISIBLE_COUNT;
    displayProducts(filterProducts());
  });
}

/* ==========================
   SELECTED PRODUCTS DISPLAY
========================== */

function updateSelectedList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = "<p>No products selected</p>";
    return;
  }

  selectedProductsList.innerHTML =
    selectedProducts
      .map(
        (product) => `
    <div class="selected-item">
      <span><b>${product.brand}</b> - ${product.name}</span>
      <button type="button" onclick="removeProduct(${product.id})">&times;</button>
    </div>
  `
      )
      .join("") +
    `
    <button type="button" onclick="clearProducts()" class="clear-all-btn">
      Clear All
    </button>
  `;
}

/* Window methods for inline onclick triggers */
window.removeProduct = function (id) {
  selectedProducts = selectedProducts.filter((p) => p.id !== id);
  saveProducts();
  updateSelectedList();
  displayProducts(filterProducts());
};

window.clearProducts = function () {
  selectedProducts = [];
  saveProducts();
  updateSelectedList();
  displayProducts(filterProducts());
};

/* ==========================
   LOCAL STORAGE
========================== */

function saveProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

function loadSavedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    selectedProducts = JSON.parse(saved);
  }
  updateSelectedList();
  displayProducts(filterProducts());
}

/* ==========================
   GENERATE ROUTINE
========================== */

generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = "<p>Please select products first.</p>";
    return;
  }

  const productText = JSON.stringify(selectedProducts, null, 2);
  const promptMessage = `Create a personalized routine using these products:\n\n${productText}`;

  messages.push({
    role: "user",
    content: promptMessage
  });

  chatWindow.innerHTML += `<p><b>You:</b> Generate routine for my selected products.</p>`;

  await sendMessage();
});

/* ==========================
   CHAT API CALL
========================== */

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  messages.push({
    role: "user",
    content: text
  });

  chatWindow.innerHTML += `<p><b>You:</b> ${text}</p>`;
  userInput.value = "";

  await sendMessage();
});

async function sendMessage() {
  const loadingDiv = document.createElement("p");
  loadingDiv.id = "loadingText";
  loadingDiv.innerHTML = "<b>L'Oréal Advisor:</b> Thinking...";
  chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    messages.push({
      role: "assistant",
      content: reply
    });

    document.getElementById("loadingText")?.remove();
    chatWindow.innerHTML += `
      <p>
        <b>L'Oréal Advisor:</b><br>
        ${reply.replace(/\n/g, "<br>")}
      </p>
    `;
  } catch (error) {
    console.error("Worker Error:", error);
    document.getElementById("loadingText")?.remove();
    chatWindow.innerHTML += `<p style="color:red;"><b>Error:</b> Could not connect to the AI advisor. Check your Cloudflare Worker URL.</p>`;
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ==========================
   RTL TOGGLE
========================== */

if (rtlToggleBtn) {
  rtlToggleBtn.addEventListener("click", () => {
    const isRTL = document.body.getAttribute("dir") === "rtl";
    if (isRTL) {
      document.body.removeAttribute("dir");
      rtlToggleBtn.textContent = "Switch to RTL";
    } else {
      document.body.setAttribute("dir", "rtl");
      rtlToggleBtn.textContent = "Switch to LTR";
    }
  });
}

/* ==========================
   START APP
========================== */

loadProducts();