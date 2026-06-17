const categories = [
  {
    key: "needs",
    label: "Needs",
    defaultPercent: 50,
    color: "#2563EB",
    icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  },
  {
    key: "wants",
    label: "Wants",
    defaultPercent: 30,
    color: "#F59E0B",
    icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  },
  {
    key: "investments",
    label: "Investments",
    defaultPercent: 20,
    color: "#16A34A",
    icon: '<path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/>',
  },
];

const state = {
  income: 50000,
  displayedAmounts: {
    needs: 0,
    wants: 0,
    investments: 0,
  },
  chartPercents: {
    needs: 50,
    wants: 30,
    investments: 20,
  },
  percents: Object.fromEntries(
    categories.map((category) => [category.key, category.defaultPercent])
  ),
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const incomeInput = document.querySelector("#incomeInput");
const incomeSlider = document.querySelector("#incomeSlider");
const incomeError = document.querySelector("#incomeError");
const formattedIncome = document.querySelector("#formattedIncome");
const currencyField = document.querySelector(".currency-field");
const allocationControls = document.querySelector("#allocationControls");
const balanceMessage = document.querySelector("#balanceMessage");
const resultCards = document.querySelector("#resultCards");
const recommendations = document.querySelector("#recommendations");
const chartCanvas = document.querySelector("#budgetChart");
const chartLegend = document.querySelector("#chartLegend");
const chartTotal = document.querySelector("#chartTotal");
const chartContext = chartCanvas.getContext("2d");

function formatCurrency(value) {
  return currency.format(Math.max(0, Number(value) || 0));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPercentInput(key) {
  return document.querySelector(`#${key}Percent`);
}

function getPercentSlider(key) {
  return document.querySelector(`#${key}Slider`);
}

function getAmounts() {
  return Object.fromEntries(
    categories.map((category) => [
      category.key,
      (state.income * state.percents[category.key]) / 100,
    ])
  );
}

function buildControls() {
  allocationControls.innerHTML = categories
    .map(
      (category) => `
        <div class="allocation-row" style="--category-color: ${category.color}">
          <div class="allocation-header">
            <label class="allocation-label category-name" for="${category.key}Percent">
              <span class="category-dot" aria-hidden="true"></span>
              ${category.label} %
            </label>
            <div class="percent-field">
              <input
                id="${category.key}Percent"
                type="number"
                inputmode="decimal"
                min="0"
                max="100"
                step="1"
                value="${category.defaultPercent}"
                aria-label="${category.label} percentage"
              />
              <span aria-hidden="true">%</span>
            </div>
          </div>
          <input
            id="${category.key}Slider"
            class="range"
            type="range"
            min="0"
            max="100"
            step="1"
            value="${category.defaultPercent}"
            aria-label="Adjust ${category.label} percentage"
          />
          <div class="allocation-meta" aria-hidden="true">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      `
    )
    .join("");

  categories.forEach((category) => {
    const input = getPercentInput(category.key);
    const slider = getPercentSlider(category.key);

    input.addEventListener("input", () => {
      const value = clamp(Number(input.value || 0), 0, 999);
      state.percents[category.key] = value;
      slider.value = clamp(value, 0, 100);
      update();
    });

    slider.addEventListener("input", () => {
      const value = Number(slider.value);
      state.percents[category.key] = value;
      input.value = value;
      update();
    });
  });
}

function buildResultCards() {
  resultCards.innerHTML = categories
    .map(
      (category) => `
        <article class="result-card" style="--category-color: ${category.color}">
          <span class="result-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">${category.icon}</svg>
          </span>
          <div class="result-copy">
            <div class="result-title">
              <span>${category.label}</span>
              <span id="${category.key}CardPercent">${category.defaultPercent}%</span>
            </div>
            <span id="${category.key}Amount" class="result-amount">₹0</span>
          </div>
        </article>
      `
    )
    .join("");
}

function buildLegend() {
  chartLegend.innerHTML = categories
    .map(
      (category) => `
        <div class="legend-item">
          <span class="legend-name">
            <span class="category-dot" style="--category-color: ${category.color}" aria-hidden="true"></span>
            ${category.label}
          </span>
          <strong id="${category.key}Legend">${category.defaultPercent}%</strong>
        </div>
      `
    )
    .join("");
}

function animateNumber(element, from, to, formatter, duration = 280) {
  const start = performance.now();
  const difference = to - from;

  function step(now) {
    const progress = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter(from + difference * eased);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function drawChart(source = state.chartPercents) {
  const ratio = window.devicePixelRatio || 1;
  const size = chartCanvas.getBoundingClientRect().width || 300;
  chartCanvas.width = size * ratio;
  chartCanvas.height = size * ratio;
  chartContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  chartContext.clearRect(0, 0, size, size);

  const center = size / 2;
  const radius = size * 0.4;
  const lineWidth = size * 0.15;
  const total = categories.reduce((sum, category) => sum + source[category.key], 0);
  const drawableTotal = Math.max(total, 1);
  let startAngle = -Math.PI / 2;

  chartContext.lineWidth = lineWidth;
  chartContext.lineCap = "round";
  chartContext.strokeStyle = "#E7EDF5";
  chartContext.beginPath();
  chartContext.arc(center, center, radius, 0, Math.PI * 2);
  chartContext.stroke();

  categories.forEach((category) => {
    const percent = Math.max(0, source[category.key]);
    const segment = (percent / drawableTotal) * Math.PI * 2;
    const endAngle = startAngle + segment;

    if (segment > 0.01) {
      chartContext.strokeStyle = category.color;
      chartContext.beginPath();
      chartContext.arc(center, center, radius, startAngle + 0.035, endAngle - 0.035);
      chartContext.stroke();
    }

    startAngle = endAngle;
  });
}

function animateChart() {
  const from = { ...state.chartPercents };
  const to = { ...state.percents };
  const start = performance.now();
  const duration = 260;

  function step(now) {
    const progress = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Object.fromEntries(
      categories.map((category) => [
        category.key,
        from[category.key] + (to[category.key] - from[category.key]) * eased,
      ])
    );

    drawChart(current);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      state.chartPercents = to;
    }
  }

  requestAnimationFrame(step);
}

function updateIncomeValidity() {
  const isInvalid = !state.income || state.income <= 0;
  currencyField.dataset.invalid = String(isInvalid);
  incomeError.textContent = isInvalid ? "Enter an income greater than zero." : "";
  formattedIncome.textContent = isInvalid ? "₹0" : formatCurrency(state.income);
  incomeInput.setAttribute("aria-invalid", String(isInvalid));
  return !isInvalid;
}

function updateBalance(totalPercent) {
  balanceMessage.className = "balance-message";

  if (totalPercent === 100) {
    balanceMessage.classList.add("success");
    balanceMessage.innerHTML = "<span aria-hidden='true'>✓</span><span>Budget allocation is balanced</span>";
    return;
  }

  if (totalPercent < 100) {
    balanceMessage.classList.add("warning");
    balanceMessage.textContent = `You still have ${100 - totalPercent}% unallocated.`;
    return;
  }

  balanceMessage.classList.add("danger");
  balanceMessage.textContent = "Your budget exceeds 100%. Please adjust allocations.";
}

function getWarnings() {
  const warnings = [];

  if (state.percents.needs > 60) {
    warnings.push({
      type: "warning",
      text: "Your essential expenses may be consuming too much of your income.",
    });
  }

  if (state.percents.wants > 40) {
    warnings.push({
      type: "warning",
      text: "You may be overspending on lifestyle expenses.",
    });
  }

  if (state.percents.investments < 10) {
    warnings.push({
      type: "danger",
      text: "Consider increasing savings or investments for long-term stability.",
    });
  }

  return warnings;
}

function updateRecommendations() {
  const warnings = getWarnings();

  if (!warnings.length) {
    recommendations.innerHTML = `
      <div class="recommendation success">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        <span>Your allocation looks healthy for the 50-30-20 budgeting rule.</span>
      </div>
    `;
    return;
  }

  recommendations.innerHTML = warnings
    .map(
      (warning) => `
        <div class="recommendation ${warning.type}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4m0 4h.01"/><path d="M10.3 3.9 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
          <span>${warning.text}</span>
        </div>
      `
    )
    .join("");
}

function updateAmounts(amounts) {
  categories.forEach((category) => {
    const amountElement = document.querySelector(`#${category.key}Amount`);
    const percentElement = document.querySelector(`#${category.key}CardPercent`);
    const legendElement = document.querySelector(`#${category.key}Legend`);
    const nextAmount = amounts[category.key];

    animateNumber(
      amountElement,
      state.displayedAmounts[category.key],
      nextAmount,
      formatCurrency
    );

    state.displayedAmounts[category.key] = nextAmount;
    percentElement.textContent = `${state.percents[category.key]}%`;
    legendElement.textContent = `${state.percents[category.key]}%`;
  });
}

function update() {
  updateIncomeValidity();

  const totalPercent = categories.reduce(
    (sum, category) => sum + Number(state.percents[category.key] || 0),
    0
  );
  const amounts = getAmounts();

  updateAmounts(amounts);
  updateBalance(totalPercent);
  updateRecommendations();
  chartTotal.textContent = `${totalPercent}%`;
  animateChart();
}

function setIncome(value) {
  const cleanValue = Number(value || 0);
  state.income = cleanValue;
  incomeInput.value = cleanValue > 0 ? cleanValue : "";
  incomeSlider.value = clamp(cleanValue, Number(incomeSlider.min), Number(incomeSlider.max));
  update();
}

function init() {
  buildControls();
  buildResultCards();
  buildLegend();

  incomeInput.value = state.income;
  incomeInput.addEventListener("input", () => {
    const value = Number(incomeInput.value || 0);
    state.income = value;
    incomeSlider.value = clamp(value, Number(incomeSlider.min), Number(incomeSlider.max));
    update();
  });

  incomeSlider.addEventListener("input", () => setIncome(incomeSlider.value));
  window.addEventListener("resize", drawChart);

  update();
}

init();
