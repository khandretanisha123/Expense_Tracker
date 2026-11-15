const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const form = document.getElementById("transaction-form");
const statusMessage = document.getElementById("status-message");
const submitButton = form.querySelector('button[type="submit"]');

function showStatus(message, kind = "success") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message visible ${kind}`;
}

function clearStatus() {
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const parts = String(dateString).slice(0, 10).split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function loadDashboard() {
  clearStatus();
  try {
    const data = await requestJson("/api/dashboard");
    document.getElementById("total-income").textContent = currency.format(Number(data.summary.totalIncome || 0));
    document.getElementById("total-expenses").textContent = currency.format(Number(data.summary.totalExpenses || 0));
    document.getElementById("current-balance").textContent = currency.format(Number(data.summary.balance || 0));

    renderCategories(data.categories || []);
    renderTransactions(data.transactions || []);
  } catch (error) {
    showStatus(`${error.message} Make sure MySQL is running and your .env settings are correct.`, "error");
    document.getElementById("category-list").innerHTML = '<p class="empty-state">Could not load categories.</p>';
    document.getElementById("transaction-table-body").innerHTML =
      '<tr><td colspan="5" class="empty-state">Could not load transactions.</td></tr>';
  }
}

function renderCategories(categories) {
  const container = document.getElementById("category-list");
  if (!categories.length) {
    container.innerHTML = '<p class="empty-state">No expenses recorded yet. Add an expense to see the report.</p>';
    return;
  }
  const max = Math.max(...categories.map((item) => Number(item.total) || 0), 1);
  container.innerHTML = categories.map((item) => {
    const amount = Number(item.total) || 0;
    const width = Math.max(2, (amount / max) * 100);
    return `
      <div class="category-row">
        <div class="category-label">
          <span>${safeText(item.category)}</span>
          <strong>${currency.format(amount)}</strong>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${width}%"></div></div>
      </div>`;
  }).join("");
}

function renderTransactions(transactions) {
  const body = document.getElementById("transaction-table-body");
  document.getElementById("transaction-count").textContent =
    `${transactions.length} ${transactions.length === 1 ? "record" : "records"}`;

  if (!transactions.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty-state">No transactions yet. Add your first transaction above.</td></tr>';
    return;
  }

  body.innerHTML = transactions.map((item) => {
    const isIncome = item.type === "Income";
    const typeClass = isIncome ? "type-income" : "type-expense";
    const amountClass = isIncome ? "income" : "expense";
    const sign = isIncome ? "+" : "−";
    return `
      <tr>
        <td><strong>${safeText(item.category)}</strong></td>
        <td><span class="type-pill ${typeClass}">${safeText(item.type)}</span></td>
        <td>${formatDate(item.transaction_date)}</td>
        <td class="amount ${amountClass}">${sign}${currency.format(Number(item.amount) || 0)}</td>
        <td><button class="delete-button" type="button" data-delete-id="${Number(item.id)}">Delete</button></td>
      </tr>`;
  }).join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  submitButton.disabled = true;
  submitButton.textContent = "Saving…";

  const payload = {
    type: document.getElementById("type").value,
    category: document.getElementById("category").value.trim(),
    amount: document.getElementById("amount").value,
    transaction_date: document.getElementById("transaction_date").value
  };

  try {
    await requestJson("/api/transactions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    form.reset();
    document.getElementById("type").value = "Expense";
    document.getElementById("transaction_date").value = new Date().toLocaleDateString("en-CA");
    showStatus("Transaction saved successfully.");
    await loadDashboard();
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "＋ Save transaction";
  }
});

document.getElementById("transaction-table-body").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;
  const id = button.dataset.deleteId;
  if (!window.confirm("Delete this transaction? This cannot be undone.")) return;

  button.disabled = true;
  try {
    await requestJson(`/api/transactions/${id}`, { method: "DELETE" });
    showStatus("Transaction deleted.");
    await loadDashboard();
  } catch (error) {
    showStatus(error.message, "error");
    button.disabled = false;
  }
});

document.getElementById("refresh-button").addEventListener("click", loadDashboard);

document.getElementById("transaction_date").value = new Date().toLocaleDateString("en-CA");
loadDashboard();
