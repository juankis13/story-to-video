/**
 * Temp Mail - Cliente de email temporal usando la API de mail.tm
 */

const API_BASE = "https://api.mail.tm";

const state = {
  token: null,
  address: null,
  password: null,
  domain: null,
  messages: [],
  pollingInterval: null,
  knownMessageIds: new Set(),
};

// ===== DOM Elements =====
const btnGenerate = document.getElementById("btn-generate");
const btnCopy = document.getElementById("btn-copy");
const btnRefresh = document.getElementById("btn-refresh");
const btnNewEmail = document.getElementById("btn-new-email");
const btnCloseModal = document.getElementById("btn-close-modal");
const emailDisplay = document.getElementById("email-display");
const emailAddress = document.getElementById("email-address");
const copyFeedback = document.getElementById("copy-feedback");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error-message");
const inboxSection = document.getElementById("inbox-section");
const inboxList = document.getElementById("inbox-list");
const modal = document.getElementById("message-modal");
const msgFrom = document.getElementById("msg-from");
const msgSubject = document.getElementById("msg-subject");
const msgDate = document.getElementById("msg-date");
const msgBody = document.getElementById("msg-body");

// ===== API Helpers =====

async function apiFetch(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData["hydra:description"] ||
        errorData.message ||
        `Error ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

// ===== Core Functions =====

async function fetchDomains() {
  const data = await apiFetch("/domains");
  const domains = data["hydra:member"];
  if (!domains || domains.length === 0) {
    throw new Error("No hay dominios disponibles en este momento.");
  }
  state.domain = domains[0].domain;
  return state.domain;
}

function generateUsername() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let username = "";
  for (let i = 0; i < 10; i++) {
    username += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return username;
}

function generatePassword() {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function createAccount() {
  const username = generateUsername();
  const password = generatePassword();
  const address = `${username}@${state.domain}`;

  await apiFetch("/accounts", {
    method: "POST",
    body: JSON.stringify({ address, password }),
  });

  state.address = address;
  state.password = password;

  return address;
}

async function authenticate() {
  const data = await apiFetch("/token", {
    method: "POST",
    body: JSON.stringify({
      address: state.address,
      password: state.password,
    }),
  });

  state.token = data.token;
}

async function fetchMessages() {
  const data = await apiFetch("/messages");
  return data["hydra:member"] || [];
}

async function fetchMessageDetail(id) {
  return apiFetch(`/messages/${id}`);
}

// ===== UI Functions =====

function showLoading(show) {
  loadingEl.classList.toggle("hidden", !show);
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  setTimeout(() => errorEl.classList.add("hidden"), 6000);
}

function hideError() {
  errorEl.classList.add("hidden");
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderInbox(messages) {
  if (messages.length === 0) {
    inboxList.innerHTML = `
      <div class="inbox-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <p>No hay mensajes todavia. Los emails nuevos apareceran aqui.</p>
      </div>
    `;
    return;
  }

  inboxList.innerHTML = messages
    .map((msg) => {
      const isNew = !state.knownMessageIds.has(msg.id);
      return `
      <div class="email-item ${isNew ? "email-item-new" : ""}" data-id="${msg.id}">
        <span class="email-item-from">${escapeHtml(msg.from.address)}</span>
        <span class="email-item-subject">${escapeHtml(msg.subject || "(Sin asunto)")}</span>
        <span class="email-item-date">${formatDate(msg.createdAt)}</span>
      </div>
    `;
    })
    .join("");

  // Mark all as known after rendering
  messages.forEach((msg) => state.knownMessageIds.add(msg.id));

  // Add click listeners
  inboxList.querySelectorAll(".email-item").forEach((item) => {
    item.addEventListener("click", () => openMessage(item.dataset.id));
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function openMessage(id) {
  try {
    const msg = await fetchMessageDetail(id);

    msgFrom.textContent = msg.from.address;
    msgSubject.textContent = msg.subject || "(Sin asunto)";
    msgDate.textContent = formatDate(msg.createdAt);

    // Render HTML content in an iframe for safety, or plain text
    if (msg.html && msg.html.length > 0) {
      const htmlContent = msg.html.join("");
      msgBody.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.sandbox = "allow-same-origin";
      iframe.srcdoc = htmlContent;
      msgBody.appendChild(iframe);
    } else {
      msgBody.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(msg.text || "")}</pre>`;
    }

    modal.classList.remove("hidden");
  } catch (err) {
    showError("No se pudo cargar el mensaje: " + err.message);
  }
}

function closeModal() {
  modal.classList.add("hidden");
  msgBody.innerHTML = "";
}

async function copyToClipboard() {
  if (!state.address) return;

  try {
    await navigator.clipboard.writeText(state.address);
    copyFeedback.classList.remove("hidden");
    setTimeout(() => copyFeedback.classList.add("hidden"), 1500);
  } catch {
    // Fallback for older browsers or file:// protocol
    const textarea = document.createElement("textarea");
    textarea.value = state.address;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    copyFeedback.classList.remove("hidden");
    setTimeout(() => copyFeedback.classList.add("hidden"), 1500);
  }
}

// ===== Polling =====

function startPolling() {
  stopPolling();
  state.pollingInterval = setInterval(async () => {
    try {
      const messages = await fetchMessages();
      state.messages = messages;
      renderInbox(messages);
    } catch {
      // Silently ignore polling errors
    }
  }, 5000);
}

function stopPolling() {
  if (state.pollingInterval) {
    clearInterval(state.pollingInterval);
    state.pollingInterval = null;
  }
}

// ===== Main Flow =====

async function generateEmail() {
  hideError();
  stopPolling();

  // Reset state
  state.token = null;
  state.address = null;
  state.password = null;
  state.messages = [];
  state.knownMessageIds.clear();

  // Update UI
  emailDisplay.classList.add("hidden");
  inboxSection.classList.add("hidden");
  btnGenerate.disabled = true;
  showLoading(true);

  try {
    if (!state.domain) {
      await fetchDomains();
    }

    const address = await createAccount();
    await authenticate();

    // Show email address
    emailAddress.textContent = address;
    emailDisplay.classList.remove("hidden");
    inboxSection.classList.remove("hidden");
    renderInbox([]);

    // Start polling
    startPolling();
  } catch (err) {
    showError("Error al crear el email: " + err.message);
  } finally {
    btnGenerate.disabled = false;
    showLoading(false);
  }
}

// ===== Event Listeners =====

btnGenerate.addEventListener("click", generateEmail);
btnCopy.addEventListener("click", copyToClipboard);
btnRefresh.addEventListener("click", async () => {
  if (!state.token) return;
  try {
    const messages = await fetchMessages();
    state.messages = messages;
    renderInbox(messages);
  } catch (err) {
    showError("Error al actualizar: " + err.message);
  }
});
btnNewEmail.addEventListener("click", generateEmail);
btnCloseModal.addEventListener("click", closeModal);

// Close modal on backdrop click
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// Close modal with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

// ===== Init =====

(async function init() {
  try {
    await fetchDomains();
  } catch {
    // Domain fetch will be retried when user clicks generate
  }
})();
