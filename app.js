const expenseForm = document.getElementById('expense-form');
const transactionList = document.getElementById('transaction-list');
const totalIncomeDisplay = document.getElementById('total-income');
const totalExpensesDisplay = document.getElementById('total-expenses');
const balanceDisplay = document.getElementById('balance');
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const categoryChartCtx = document.getElementById('category-chart').getContext('2d');

// Get today's date in yyyy-mm-dd format for default date
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Initialize date input with today
document.getElementById('date').value = getTodayDateString();

// Read stored transactions or initialize empty
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// Chart.js chart instance
let categoryChart;

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Get category display names (for labels)
const CATEGORY_NAMES = {
    salary: "Salary",
    freelance: "Freelance",
    investment: "Investment",
    food: "Food",
    rent: "Rent",
    entertainment: "Entertainment",
    transport: "Transport",
    utilities: "Utilities",
    other_income: "Other Income",
    other_expense: "Other Expense"
};

// Determine type from category option's data-type attribute
function categoryType(category) {
    const option = Array.from(document.getElementById('category').options).find(opt => opt.value === category);
    return option ? option.dataset.type : null;
}

// Format currency in USD style
function formatCurrency(num) {
    return '$' + Number(num).toFixed(2);
}

// Sort transactions by date descending
function sortTransactions(transArray) {
    return transArray.sort((a,b) => new Date(b.date) - new Date(a.date));
}

function renderTransactions() {
    // Apply filtering by type and category
    let filtered = transactions;

    if (filterType.value !== 'all') {
        filtered = filtered.filter(t => categoryType(t.category) === filterType.value);
    }
    if (filterCategory.value !== 'all') {
        filtered = filtered.filter(t => t.category === filterCategory.value);
    }
    filtered = sortTransactions(filtered);

    // Clear existing
    transactionList.innerHTML = '';
    if(filtered.length === 0){
        const emptyMsg = document.createElement('p');
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = '#666';
        emptyMsg.style.margin = '12px 0';
        emptyMsg.textContent = 'No transactions found for selected filters.';
        transactionList.appendChild(emptyMsg);
        return;
    }
    filtered.forEach((transaction, index) => {
        const li = document.createElement('li');
        li.className = `transaction ${categoryType(transaction.category)}`;
        li.innerHTML = `
            <div>
                <div class="transaction-description">${transaction.description}</div>
                <div class="transaction-date" title="Date of transaction">${transaction.date}</div>
            </div>
            <div class="transaction-amount">${formatCurrency(transaction.amount)}</div>
            <button class="delete-btn" aria-label="Delete transaction ${transaction.description}" data-index="${index}">Delete</button>
        `;
        transactionList.appendChild(li);
    });
    // Bind delete buttons' click
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
            // The displayed list might be filtered, so find the real index of that transaction in global array
            const filteredIndex = parseInt(btn.dataset.index);
            const filteredTransactions = filtered;
            const transactionToDelete = filteredTransactions[filteredIndex];
            const globalIndex = transactions.findIndex(t =>
                t.description === transactionToDelete.description &&
                t.amount === transactionToDelete.amount &&
                t.category === transactionToDelete.category &&
                t.date === transactionToDelete.date
            );
            if(globalIndex !== -1) {
                transactions.splice(globalIndex, 1);
                saveTransactions();
                updateUI();
            }
        };
    });
}

function calculateSummary(filteredTransactions = transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach(t => {
        if(categoryType(t.category) === 'income') {
            totalIncome += Number(t.amount);
        } else {
            totalExpenses += Number(t.amount);
        }
    });

    return { totalIncome, totalExpenses };
}

function updateSummary() {
    const { totalIncome, totalExpenses } = calculateSummary();
    totalIncomeDisplay.textContent = formatCurrency(totalIncome);
    totalExpensesDisplay.textContent = formatCurrency(totalExpenses);
    balanceDisplay.textContent = formatCurrency(totalIncome - totalExpenses);
}

// Prepare data for category chart: sum amounts by category separated income and expenses
function getCategorySums() {
    const sums = {};
    // Initialize sums
    for(let cat in CATEGORY_NAMES) {
        sums[cat] = 0;
    }
    transactions.forEach(t => {
        if(sums[t.category] !== undefined) {
            sums[t.category] += Number(t.amount);
        }
    });
    return sums;
}

// Generate chart data grouped by category, colored by income (green) or expense (red)
function generateChartData() {
    const sums = getCategorySums();

    // Filter out categories with zero amounts
    const categories = [];
    const amounts = [];
    const backgroundColors = [];

    for(const cat in sums) {
        if(sums[cat] > 0) {
            categories.push(CATEGORY_NAMES[cat]);
            amounts.push(sums[cat]);
            backgroundColors.push(categoryType(cat) === 'income' ? 'rgba(45, 154, 74, 0.7)' : 'rgba(220, 53, 69, 0.7)');
        }
    }

    return {
        labels: categories,
        datasets: [{
            label: 'Amount',
            data: amounts,
            backgroundColor: backgroundColors,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)'
        }]
    };
}

function renderChart() {
    const data = generateChartData();
    if(categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(categoryChartCtx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Category',
                        font: {size: 14, weight: 'bold'}
                    },
                    ticks: {
                        maxRotation: 40,
                        minRotation: 25,
                        autoSkipPadding: 10,
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount ($)',
                        font: {size: 14, weight: 'bold'}
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${formatCurrency(ctx.parsed.y)}`
                    }
                }
            }
        }
    });
}

function updateUI() {
    renderTransactions();
    updateSummary();
    renderChart();
}

expenseForm.addEventListener('submit', e => {
    e.preventDefault();
    // retrieve inputs and validation
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!description || Number.isNaN(amount) || amount <= 0 || !category || !date) {
        alert('Please fill all fields with valid data.');
        return;
    }

    const newTransaction = { description, amount, category, date };

    transactions.push(newTransaction);
    saveTransactions();
    updateUI();

    expenseForm.reset();
    document.getElementById('date').value = getTodayDateString();
});

filterType.addEventListener('change', updateUI);
filterCategory.addEventListener('change', updateUI);

// Initial UI setup
updateUI();
