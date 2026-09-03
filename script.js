const API_URL = "http://127.0.0.1:5000";

let foods = [];
let sales = [];
let salesChart = null;


// ===============================
// PAGE NAVIGATION
// ===============================

function showSection(sectionId) {

    const sections = document.querySelectorAll(".page-section");

    sections.forEach(section => {
        section.style.display = "none";
    });

    const selectedSection = document.getElementById(sectionId);

    if (selectedSection) {
        selectedSection.style.display = "block";
    }

    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(item => {
        item.classList.remove("active");

        if (item.dataset.section === sectionId) {
            item.classList.add("active");
        }
    });

    const titles = {
        dashboard: {
            title: "Dashboard",
            subtitle: "AI-powered food demand overview"
        },

        "add-sales": {
            title: "Add Sales",
            subtitle: "Record today's food sales"
        },

        prediction: {
            title: "AI Prediction",
            subtitle: "AI-powered food demand forecasting"
        },

        history: {
            title: "Sales History",
            subtitle: "View recorded food sales"
        },

        "food-management": {
            title: "Food Management",
            subtitle: "Manage your food items"
        }
    };

    const pageTitle =
        document.getElementById("page-title");

    const pageSubtitle =
        document.getElementById("page-subtitle");

    if (titles[sectionId]) {

        if (pageTitle) {
            pageTitle.textContent =
                titles[sectionId].title;
        }

        if (pageSubtitle) {
            pageSubtitle.textContent =
                titles[sectionId].subtitle;
        }
    }

    // Generate predictions when opening prediction page
    if (sectionId === "prediction") {
        generatePredictions();
    }
}

// ===============================
// DATE
// ===============================

function setCurrentDate() {

    const today = new Date();

    const formatted = today.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    const dateElement = document.getElementById("current-date");

    if (dateElement) {
        dateElement.textContent = formatted;
    }

    const salesDate = document.getElementById("sales-date");

    if (salesDate) {
        salesDate.value = today.toISOString().split("T")[0];
    }
}


// ===============================
// TOAST
// ===============================

function showToast(message) {

    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// ===============================
// LOAD FOODS
// ===============================

async function loadFoods() {

    try {

        const response = await fetch(`${API_URL}/api/foods`);

        if (!response.ok) {
            throw new Error("Failed to load foods");
        }

        foods = await response.json();

        populateFoodDropdown();
        populateFoodFilter();
        renderFoodList();

    } catch (error) {

        console.error(error);

        showToast("Could not load foods. Is Flask running?");
    }
}


// ===============================
// FOOD DROPDOWN
// ===============================

function populateFoodDropdown() {

    const dropdown = document.getElementById("food-item");

    if (!dropdown) return;

    dropdown.innerHTML = `
        <option value="">Select food item</option>
    `;

    foods.forEach(food => {

        const option = document.createElement("option");

        option.value = food.food_name;

        option.textContent =
            `${food.emoji || "🍱"} ${food.food_name}`;

        dropdown.appendChild(option);
    });
}


// ===============================
// FOOD FILTER
// ===============================

function populateFoodFilter() {

    const filter = document.getElementById("food-filter");

    if (!filter) return;

    filter.innerHTML = `
        <option value="all">All Foods</option>
    `;

    foods.forEach(food => {

        const option = document.createElement("option");

        option.value = food.food_name;

        option.textContent = food.food_name;

        filter.appendChild(option);
    });

    filter.addEventListener("change", () => {
        renderChart(filter.value);
    });
}


// ===============================
// ADD FOOD
// ===============================

const foodForm = document.getElementById("food-form");

if (foodForm) {

    foodForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const foodName =
            document.getElementById("new-food-name").value.trim();

        const emoji =
            document.getElementById("new-food-emoji").value.trim();

        if (!foodName) {

            showToast("Enter a food name");

            return;
        }

        try {

            const response = await fetch(`${API_URL}/api/foods`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    food_name: foodName,
                    emoji: emoji || "🍱"
                })
            });

            const data = await response.json();

            if (!response.ok) {

                showToast(data.error || "Could not add food");

                return;
            }

            showToast("Food added successfully!");

            foodForm.reset();

            await loadFoods();

        } catch (error) {

            console.error(error);

            showToast("Backend connection failed");
        }
    });
}


// ===============================
// LOAD SALES
// ===============================

async function loadSales() {

    try {

        const response =
            await fetch(`${API_URL}/api/sales`);

        if (!response.ok) {
            throw new Error("Failed to load sales");
        }

        sales = await response.json();

        renderHistory();
        updateDashboard();
        renderChart();

    } catch (error) {

        console.error(error);

        showToast("Could not load sales");
    }
}


// ===============================
// ADD SALES
// ===============================

const salesForm = document.getElementById("sales-form");

if (salesForm) {

    salesForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const foodItem =
            document.getElementById("food-item").value;

        const date =
            document.getElementById("sales-date").value;

        const prepared =
            Number(document.getElementById("prepared").value);

        const sold =
            Number(document.getElementById("sold").value);

        if (!foodItem || !date || !prepared || !sold) {

            showToast("Please fill all fields");

            return;
        }

        if (sold > prepared) {

            showToast("Sold quantity cannot exceed prepared quantity");

            return;
        }

        try {

            const response = await fetch(`${API_URL}/api/sales`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    food_item: foodItem,
                    date: date,
                    prepared_quantity: prepared,
                    sold_quantity: sold

                })
            });

            const data = await response.json();

            if (!response.ok) {

                showToast(data.error || "Failed to add sale");

                return;
            }

            showToast("Sales added successfully!");

            salesForm.reset();

            setCurrentDate();

            await loadSales();

        } catch (error) {

            console.error(error);

            showToast("Backend connection failed");
        }
    });
}


// ===============================
// HISTORY TABLE
// ===============================

function renderHistory() {

    const table =
        document.getElementById("history-table");

    if (!table) return;

    table.innerHTML = "";

    sales.forEach(sale => {

        const waste =
            sale.prepared_quantity -
            sale.sold_quantity;

        const wastePercentage =
            sale.prepared_quantity > 0
                ? ((waste / sale.prepared_quantity) * 100).toFixed(1)
                : 0;

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>${sale.date}</td>

            <td>${escapeHTML(sale.food_item)}</td>

            <td>${sale.prepared_quantity}</td>

            <td>${sale.sold_quantity}</td>

            <td>${waste}</td>

            <td>${wastePercentage}%</td>

        `;

        table.appendChild(row);
    });

    const count =
        document.getElementById("record-count");

    if (count) {
        count.textContent = sales.length;
    }
}


// ===============================
// DASHBOARD
// ===============================

function updateDashboard() {

    // =========================
    // TODAY'S SALES
    // =========================

    const today =
        new Date().toISOString().split("T")[0];

    const todaySales =
        sales
            .filter(sale => sale.date === today)
            .reduce(
                (total, sale) =>
                    total + Number(sale.sold_quantity),
                0
            );


    // =========================
    // TOTAL PREPARED
    // =========================

    const totalPrepared =
        sales.reduce(
            (total, sale) =>
                total + Number(sale.prepared_quantity),
            0
        );


    // =========================
    // TOTAL SOLD
    // =========================

    const totalSold =
        sales.reduce(
            (total, sale) =>
                total + Number(sale.sold_quantity),
            0
        );


    // =========================
    // TOTAL WASTE
    // =========================

    const totalWaste =
        totalPrepared - totalSold;


    // =========================
    // WASTE PERCENTAGE
    // =========================

    const wastePercentage =
        totalPrepared > 0
            ? ((totalWaste / totalPrepared) * 100).toFixed(1)
            : 0;


    // =========================
    // UPDATE TODAY SALES CARD
    // =========================

    const todaySalesElement =
        document.getElementById("today-sales");

    if (todaySalesElement) {
        todaySalesElement.textContent =
            todaySales;
    }


    // =========================
    // UPDATE WASTE CARD
    // =========================

    // If your HTML has an element
    // with id="total-waste"
    const wasteElement =
        document.getElementById("total-waste");

    if (wasteElement) {
        wasteElement.textContent =
            totalWaste;
    }


    // =========================
    // UPDATE WASTE %
    // =========================

    const wastePercentageElement =
        document.getElementById("waste-percentage");

    if (wastePercentageElement) {
        wastePercentageElement.textContent =
            `${wastePercentage}%`;
    }


    // =========================
    // MOST SOLD FOOD
    // =========================

    const foodSales = {};

    sales.forEach(sale => {

        if (!foodSales[sale.food_item]) {
            foodSales[sale.food_item] = 0;
        }

        foodSales[sale.food_item] +=
            Number(sale.sold_quantity);
    });


    let bestFood = "-";
    let highestSales = 0;

    Object.entries(foodSales).forEach(
        ([food, quantity]) => {

            if (quantity > highestSales) {

                highestSales = quantity;
                bestFood = food;

            }
        }
    );


    // =========================
    // UPDATE BEST FOOD
    // =========================

    const bestFoodElement =
        document.getElementById("best-food");

    if (bestFoodElement) {

        bestFoodElement.textContent =
            bestFood;
    }


    console.log("Dashboard analytics:", {

        todaySales,
        totalPrepared,
        totalSold,
        totalWaste,
        wastePercentage,
        bestFood,
        highestSales

    });
}

// ===============================
// FOOD MANAGEMENT TABLE
// ===============================

function renderFoodList() {

    const table =
        document.getElementById("food-list");

    if (!table) return;

    table.innerHTML = "";

    foods.forEach(food => {

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>
                ${food.emoji || "🍱"}
            </td>

            <td>
                ${escapeHTML(food.food_name)}
            </td>

            <td>
                Active
            </td>

        `;

        table.appendChild(row);
    });

    const count =
        document.getElementById("food-count");

    if (count) {
        count.textContent = foods.length;
    }
}


// ===============================
// AI PREDICTION
// ===============================

async function generatePredictions() {

    const table =
        document.getElementById("prediction-table");

    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="6">
                AI is analyzing sales data...
            </td>
        </tr>
    `;

    const tomorrow =
        new Date();

    tomorrow.setDate(
        tomorrow.getDate() + 1
    );

    const tomorrowDate =
        tomorrow.toISOString().split("T")[0];

    let totalDemand = 0;
    let totalRecommended = 0;

    table.innerHTML = "";

    for (const food of foods) {

        try {

            const response =
                await fetch(
                    `${API_URL}/api/predict/${encodeURIComponent(food.food_name)}?date=${tomorrowDate}`
                );

            const result =
                await response.json();

            if (!result.success) {

                continue;
            }

            totalDemand +=
                Number(result.predicted_demand);

            totalRecommended +=
                Number(result.recommended_preparation);

            const recentSales =
                sales
                    .filter(
                        sale =>
                            sale.food_item === food.food_name
                    )
                    .slice(0, 5);

            const averageSales =
                recentSales.length > 0
                    ? Math.round(
                        recentSales.reduce(
                            (sum, sale) =>
                                sum +
                                Number(sale.sold_quantity),
                            0
                        ) /
                        recentSales.length
                    )
                    : 0;

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${food.emoji || "🍱"}
                    ${escapeHTML(food.food_name)}
                </td>

                <td>
                    ${averageSales}
                </td>

                <td>
                    ${result.predicted_demand}
                </td>

                <td>
                    ${result.safety_buffer}
                </td>

                <td>
                    <strong>
                        ${result.recommended_preparation}
                    </strong>
                </td>

                <td>
                    <span class="status-badge">
                        AI Recommended
                    </span>
                </td>

            `;

            table.appendChild(row);

        } catch (error) {

            console.error(
                `Prediction failed for ${food.food_name}`,
                error
            );
        }
    }

    const predictionTotal =
        document.getElementById("prediction-total");

    if (predictionTotal) {
        predictionTotal.textContent =
            totalDemand;
    }

    const tomorrowDemand =
        document.getElementById("tomorrow-demand");

    if (tomorrowDemand) {
        tomorrowDemand.textContent =
            totalDemand;
    }

    const recommendedTotal =
        document.getElementById("recommended-total");

    if (recommendedTotal) {
        recommendedTotal.textContent =
            totalRecommended;
    }

    if (table.innerHTML === "") {

        table.innerHTML = `
            <tr>
                <td colspan="6">
                    Not enough sales data for prediction.
                </td>
            </tr>
        `;
    }
}


// ===============================
// CHART
// ===============================

function renderChart(foodFilter = "all") {

    const canvas =
        document.getElementById("salesChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    let filteredSales = [...sales];

    if (foodFilter !== "all") {

        filteredSales =
            filteredSales.filter(
                sale =>
                    sale.food_item === foodFilter
            );
    }

    const grouped = {};

    filteredSales.forEach(sale => {

        if (!grouped[sale.date]) {
            grouped[sale.date] = 0;
        }

        grouped[sale.date] +=
            Number(sale.sold_quantity);
    });

    const dates =
        Object.keys(grouped).sort();

    const values =
        dates.map(date => grouped[date]);

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels: dates,

                datasets: [{

                    label: "Food Sold",

                    data: values,

                    tension: 0.4,

                    fill: true

                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: true
                    }

                },

                scales: {

                    y: {
                        beginAtZero: true
                    }

                }
            }
        });
}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ===============================
// NAVIGATION EVENTS
// ===============================

document
    .querySelectorAll(".nav-item")
    .forEach(item => {

        item.addEventListener("click", () => {

            const section =
                item.dataset.section;

            showSection(section);

            if (section === "prediction") {
                generatePredictions();
            }
        });
    });


// ===============================
// INITIAL LOAD
// ===============================

async function initializeApp() {

    setCurrentDate();

    await loadFoods();

    await loadSales();

    await generatePredictions();

    showSection("dashboard");
}

initializeApp();