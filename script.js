function getBudgets() {
    const data = localStorage.getItem('budgets');
    return data ? JSON.parse(data) : [];
}

function saveBudgets(budgets) {
    localStorage.setItem('budgets', JSON.stringify(budgets));
}

function getCurrentBudgetId() {
    return localStorage.getItem('currentBudgetId');
}

function setCurrentBudgetId(id) {
    localStorage.setItem('currentBudgetId', id);
}

let currentBudget = null;
let confirmCallback = null;

function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    confirmCallback = onConfirm;
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
    confirmCallback = null;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('modalCancel').addEventListener('click', hideConfirmModal);
    document.getElementById('modalConfirm').addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
        }
        hideConfirmModal();
    });
});

function renderBudgetList() {
    const budgets = getBudgets();
    const budgetList = document.getElementById('budgetList');
    const currentId = getCurrentBudgetId();

    if (budgets.length === 0) {
        budgetList.innerHTML = '<p class="empty-state">No budget files yet</p>';
        return;
    }

    budgetList.innerHTML = budgets.map(budget => `
        <div class="budget-item ${budget.id == currentId ? 'active' : ''}" data-id="${budget.id}">
            <div class="budget-item-title">${budget.title || 'Untitled Budget'}</div>
            <div class="budget-item-info">
                ${budget.expenses.length} expenses • ₱${calculateTotal(budget.expenses).toFixed(2)}
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.budget-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            loadBudget(id);
            closeSidebar();
        });
    });
}

function loadBudget(id) {
    const budgets = getBudgets();
    const budget = budgets.find(b => b.id == id);

    if (!budget) return;

    currentBudget = budget;
    setCurrentBudgetId(id);

    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('budgetView').classList.remove('hidden');

    document.getElementById('budgetTitle').value = budget.title || '';
    document.getElementById('salaryInput').value = budget.salary || '';
    document.getElementById('balanceDisplay').classList.add('hidden');

    renderExpenses();
    renderBudgetList();
}

function renderExpenses() {
    if (!currentBudget) return;

    const expensesList = document.getElementById('expensesList');
    const isLocked = currentBudget.locked || false;
    
    const addBtn = document.getElementById('addExpenseBtn');
    const quickAddButtons = document.getElementById('quickAddButtons');
    const doneBtn = document.getElementById('doneExpensesBtn');
    const editBtn = document.getElementById('editExpensesBtn');
    
    if (isLocked) {
        addBtn.classList.add('hidden');
        quickAddButtons.classList.add('hidden');
        doneBtn.classList.add('hidden');
        editBtn.classList.remove('hidden');
    } else {
        addBtn.classList.remove('hidden');
        quickAddButtons.classList.remove('hidden');
        doneBtn.classList.remove('hidden');
        editBtn.classList.add('hidden');
    }
    
    if (currentBudget.expenses.length === 0) {
        expensesList.innerHTML = '<p class="empty-state">No expenses added yet</p>';
        doneBtn.classList.add('hidden');
        updateTotal();
        return;
    }

    if (isLocked) {
        expensesList.innerHTML = currentBudget.expenses.map(expense => `
            <div class="expense-item-locked">
                <span class="expense-name-locked">${expense.name}</span>
                <span class="expense-amount-locked">₱${parseFloat(expense.amount || 0).toFixed(2)}</span>
            </div>
        `).join('');
    } else {
        expensesList.innerHTML = currentBudget.expenses.map(expense => `
            <div class="expense-item">
                <input type="text" value="${expense.name}" 
                    class="expense-input"
                    oninput="this.value = this.value.toUpperCase()"
                    onchange="updateExpenseName('${expense.id}', this.value)"
                    data-expense-name="${expense.id}">
                <div class="expense-amount-wrapper">
                    <span class="currency">₱</span>
                    <input type="text" value="${expense.amount || ''}" placeholder="0.00"
                        class="expense-amount-input"
                        oninput="this.value = this.value.replace(/[^0-9.]/g, '')"
                        onchange="updateExpenseAmount('${expense.id}', this.value)"
                        data-expense-amount="${expense.id}">
                </div>
                <button onclick="deleteExpense('${expense.id}')" class="btn-delete">×</button>
            </div>
        `).join('');
    }

    updateTotal();
}

function calculateTotal(expenses) {
    return expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
}

function updateTotal() {
    if (!currentBudget) return;
    const total = calculateTotal(currentBudget.expenses);
    document.getElementById('totalExpenses').textContent = `₱${total.toFixed(2)}`;
}

function createNewBudget() {
    const newBudget = {
        id: Date.now(),
        title: '',
        salary: 0,
        expenses: []
    };

    const budgets = getBudgets();
    budgets.push(newBudget);
    saveBudgets(budgets);

    loadBudget(newBudget.id);
}

function updateBudgetTitle(title) {
    if (!currentBudget) return;

    currentBudget.title = title;
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.id === currentBudget.id);
    if (index !== -1) {
        budgets[index] = currentBudget;
        saveBudgets(budgets);
        renderBudgetList();
    }
}

function updateSalary(salary) {
    if (!currentBudget) return;

    currentBudget.salary = parseFloat(salary) || 0;
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.id === currentBudget.id);
    if (index !== -1) {
        budgets[index] = currentBudget;
        saveBudgets(budgets);
    }
}

function deleteBudget() {
    if (!currentBudget) return;

    showConfirmModal(
        'Delete Budget File',
        'Are you sure you want to delete this budget file? This action cannot be undone.',
        () => {
            let budgets = getBudgets();
            budgets = budgets.filter(b => b.id !== currentBudget.id);
            saveBudgets(budgets);

            localStorage.removeItem('currentBudgetId');
            currentBudget = null;

            document.getElementById('budgetView').classList.add('hidden');
            document.getElementById('welcomeScreen').classList.remove('hidden');

            renderBudgetList();
        }
    );
}

function addExpense() {
    if (!currentBudget) return;

    const newExpense = {
        id: Date.now(),
        name: '',
        amount: ''
    };

    currentBudget.expenses.push(newExpense);
    
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.id === currentBudget.id);
    if (index !== -1) {
        budgets[index] = currentBudget;
        saveBudgets(budgets);
    }

    renderExpenses();
    renderBudgetList();

    setTimeout(() => {
        const inputs = document.querySelectorAll('[data-expense-name]');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
        }
    }, 100);
}

function addQuickExpense(name) {
    if (!currentBudget) return;

    const newExpense = {
        id: Date.now(),
        name: name,
        amount: ''
    };

    currentBudget.expenses.push(newExpense);
    
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.id === currentBudget.id);
    if (index !== -1) {
        budgets[index] = currentBudget;
        saveBudgets(budgets);
    }

    renderExpenses();
    renderBudgetList();

    setTimeout(() => {
        const inputs = document.querySelectorAll('[data-expense-amount]');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
        }
    }, 100);
}

function lockAllExpenses() {
    if (!currentBudget) return;

    const hasEmptyName = currentBudget.expenses.some(e => !e.name.trim());
    if (hasEmptyName) {
        alert('Please fill in all expense names before saving');
        return;
    }

    currentBudget.locked = true;
    
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.id === currentBudget.id);
    if (index !== -1) {
        budgets[index] = currentBudget;
        saveBudgets(budgets);
    }

    renderExpenses();
}

function unlockAllExpenses() {
    if (!currentBudget) return;

    currentBudget.locked = false;
    
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.id === currentBudget.id);
    if (index !== -1) {
        budgets[index] = currentBudget;
        saveBudgets(budgets);
    }

    renderExpenses();
}

function updateExpenseName(expenseId, name) {
    if (!currentBudget) return;

    const expense = currentBudget.expenses.find(e => e.id == expenseId);
    if (expense) {
        expense.name = name.toUpperCase();
        
        const budgets = getBudgets();
        const index = budgets.findIndex(b => b.id === currentBudget.id);
        if (index !== -1) {
            budgets[index] = currentBudget;
            saveBudgets(budgets);
        }
    }
}

function updateExpenseAmount(expenseId, amount) {
    if (!currentBudget) return;

    const expense = currentBudget.expenses.find(e => e.id == expenseId);
    if (expense) {
        expense.amount = amount === '' ? '' : parseFloat(amount) || 0;
        
        const budgets = getBudgets();
        const index = budgets.findIndex(b => b.id === currentBudget.id);
        if (index !== -1) {
            budgets[index] = currentBudget;
            saveBudgets(budgets);
        }

        updateTotal();
        renderBudgetList();
    }
}

function deleteExpense(expenseId) {
    if (!currentBudget) return;

    currentBudget.expenses = currentBudget.expenses.filter(e => e.id != expenseId);
    
    const budgets = getBudgets();
    const index = budgets.findIndex(b => b.id === currentBudget.id);
    if (index !== -1) {
        budgets[index] = currentBudget;
        saveBudgets(budgets);
    }

    renderExpenses();
    renderBudgetList();
}

function calculateBalance() {
    if (!currentBudget) return;

    const salary = parseFloat(currentBudget.salary) || 0;
    const totalExpenses = calculateTotal(currentBudget.expenses);
    const balance = salary - totalExpenses;

    document.getElementById('remainingBalance').textContent = `₱${balance.toFixed(2)}`;
    document.getElementById('balanceDisplay').classList.remove('hidden');
}

function resetAllData() {
    showConfirmModal(
        'Reset All Data',
        'Are you sure you want to delete ALL budget files? This action cannot be undone.',
        () => {
            localStorage.removeItem('budgets');
            localStorage.removeItem('currentBudgetId');
            
            currentBudget = null;
            document.getElementById('budgetView').classList.add('hidden');
            document.getElementById('welcomeScreen').classList.remove('hidden');
            
            renderBudgetList();
        }
    );
}

document.getElementById('newBudgetBtn').addEventListener('click', createNewBudget);
document.getElementById('addExpenseBtn').addEventListener('click', addExpense);
document.getElementById('doneExpensesBtn').addEventListener('click', lockAllExpenses);
document.getElementById('editExpensesBtn').addEventListener('click', unlockAllExpenses);
document.getElementById('deleteBudgetBtn').addEventListener('click', deleteBudget);
document.getElementById('resetBtn').addEventListener('click', resetAllData);
document.getElementById('calculateBalanceBtn').addEventListener('click', calculateBalance);

document.getElementById('budgetTitle').addEventListener('input', (e) => {
    updateBudgetTitle(e.target.value);
});

document.getElementById('salaryInput').addEventListener('input', (e) => {
    updateSalary(e.target.value);
});

document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
document.getElementById('closeSidebar').addEventListener('click', closeSidebar);

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
}

function init() {
    renderBudgetList();

    const currentId = getCurrentBudgetId();
    if (currentId) {
        loadBudget(currentId);
    }
}

init();