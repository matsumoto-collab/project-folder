// アプリの状態を管理
const appState = {
    projects: [],
    currentId: 1
};

// 利益率設定
const profitRates = {
    '組立': 0.6,
    '解体': 0.4,
    'その他': 0.3,
    '積込': 0.3
};

const laborCostPerHour = 3500;
const vehicleCost = 2500;

// DOM要素
const projectForm = document.getElementById('project-form');
const calculationResult = document.getElementById('calculation-result');
const projectsTable = document.getElementById('projects-table').querySelector('tbody');
const searchInput = document.getElementById('search-input');
const dateFilter = document.getElementById('date-filter');
const exportBtn = document.getElementById('export-btn');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginStatus = document.querySelector('.login-status');
const container = document.querySelector('.container');

// ユーザーデータ
const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'user', password: 'user123', role: 'user' }
];

let currentUser = null;
let profitChart = null;

// 初期化
function init() {
    checkAuth();
    loadData();
    setupEventListeners();
    updateProjectsTable();
    updateDateFilter();
}

function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        loginStatus.textContent = `${currentUser.username} (${currentUser.role})`;
        loginModal.style.display = 'none';
        container.style.display = 'block';
    } else {
        loginModal.style.display = 'flex';
        container.style.display = 'none';
    }
}

function loadData() {
    const savedData = localStorage.getItem('scaffoldingProfitData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        appState.projects = parsedData.projects || [];
        appState.currentId = parsedData.currentId || 1;
    }
}

function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    projectForm.addEventListener('submit', handleProjectSubmit);
    searchInput.addEventListener('input', filterProjects);
    dateFilter.addEventListener('change', filterProjects);
    exportBtn.addEventListener('click', exportToExcel);
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        checkAuth();
    } else {
        alert('ユーザー名またはパスワードが間違っています');
    }
}

function handleProjectSubmit(e) {
    e.preventDefault();
    
    const project = {
        id: appState.currentId++,
        foreman: document.getElementById('foreman').value,
        date: document.getElementById('date').value,
        manager: document.getElementById('manager').value,
        client: document.getElementById('client').value,
        siteName: document.getElementById('site-name').value,
        workType: document.getElementById('work-type').value,
        contractAmount: parseFloat(document.getElementById('contract-amount').value) || 0,
        purchaseCost: parseFloat(document.getElementById('purchase-cost').value) || 0,
        workers: parseInt(document.getElementById('workers').value),
        hours: parseFloat(document.getElementById('hours').value),
        vehicles: parseInt(document.getElementById('vehicles').value) || 0,
        overtime: parseFloat(document.getElementById('overtime').value) || 0
    };
    
    calculateProfit(project);
    appState.projects.push(project);
    displayCalculationResult(project);
    updateProjectsTable();
    updateDateFilter();
    renderProfitChart();
    projectForm.reset();
    
    saveData();
}

function calculateProfit(project) {
    const profitRate = profitRates[project.workType] || 1;
    project.budget = (project.contractAmount - project.purchaseCost) * profitRate;
    project.laborCost = project.workers * project.hours * laborCostPerHour;
    project.vehicleCost = project.vehicles * vehicleCost;
    project.totalCost = project.laborCost + project.vehicleCost + project.overtime;
    project.grossProfit = project.budget - project.totalCost;
    project.profitPercentage = project.budget > 0 ? (project.grossProfit / project.budget) * 100 : 0;
}

function displayCalculationResult(project) {
    calculationResult.innerHTML = `
        <h3>計算結果</h3>
        <p><strong>予算:</strong> ${project.budget.toLocaleString()} 円</p>
        <p><strong>人件費:</strong> ${project.laborCost.toLocaleString()} 円</p>
        <p><strong>車両費用:</strong> ${project.vehicleCost.toLocaleString()} 円</p>
        <p><strong>合計費用:</strong> ${project.totalCost.toLocaleString()} 円</p>
        <p><strong>粗利:</strong> ${project.grossProfit.toLocaleString()} 円</p>
        <p><strong>利益率:</strong> ${project.profitPercentage.toFixed(2)}%</p>
    `;
}

function updateProjectsTable(filteredProjects = null) {
    const projectsToDisplay = filteredProjects || appState.projects;
    projectsTable.innerHTML = '';
    
    if (projectsToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="17" style="text-align: center;">表示する案件がありません</td>';
        projectsTable.appendChild(row);
        return;
    }
    
    projectsToDisplay.forEach(project => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${project.foreman}</td>
            <td>${formatDate(project.date)}</td>
            <td>${project.manager}</td>
            <td>${project.client}</td>
            <td>${project.siteName}</td>
            <td>${project.workType}</td>
            <td>${project.contractAmount.toLocaleString()}</td>
            <td>${project.purchaseCost.toLocaleString()}</td>
            <td>${project.budget.toLocaleString()}</td>
            <td>${project.workers}</td>
            <td>${project.hours}</td>
            <td>${project.laborCost.toLocaleString()}</td>
            <td>${project.vehicles}</td>
            <td>${project.overtime.toLocaleString()}</td>
            <td>${project.totalCost.toLocaleString()}</td>
            <td>${project.grossProfit.toLocaleString()}</td>
            <td>${project.profitPercentage.toFixed(2)}%</td>
        `;
        projectsTable.appendChild(row);
    });
}

function updateDateFilter() {
    while (dateFilter.options.length > 1) {
        dateFilter.remove(1);
    }
    
    const uniqueDates = [...new Set(appState.projects.map(p => p.date))].sort();
    uniqueDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDate(date);
        dateFilter.appendChild(option);
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
}

function filterProjects() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedDate = dateFilter.value;
    
    let filtered = appState.projects;
    
    if (selectedDate) {
        filtered = filtered.filter(project => project.date === selectedDate);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(project => 
            project.siteName.toLowerCase().includes(searchTerm) || 
            project.client.toLowerCase().includes(searchTerm)
        );
    }
    
    updateProjectsTable(filtered);
}

function exportToExcel() {
    const headers = [
        '職長', '日付', '担当', '元請け', '現場名', '作業内容', 
        '請け金額', '仕入れ', '予算', '人数', '時間', 
        '金額', '車両', '早出/残業/積込', '合計', '粗利', '%'
    ];
    
    const data = appState.projects.map(project => [
        project.foreman,
        formatDate(project.date),
        project.manager,
        project.client,
        project.siteName,
        project.workType,
        project.contractAmount,
        project.purchaseCost,
        project.budget,
        project.workers,
        project.hours,
        project.laborCost,
        project.vehicles,
        project.overtime,
        project.totalCost,
        project.grossProfit,
        project.profitPercentage
    ]);
    
    let csvContent = headers.join(',') + '\n';
    data.forEach(row => {
        csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '仮設足場工事_利益計算データ.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderProfitChart() {
    const ctx = document.getElementById('profitChart').getContext('2d');
    
    if (profitChart) {
        profitChart.destroy();
    }
    
    const monthlyData = {};
    appState.projects.forEach(project => {
        const date = new Date(project.date);
        const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                grossProfit: 0,
                totalCost: 0,
                count: 0
            };
        }
        
        monthlyData[monthYear].grossProfit += project.grossProfit;
        monthlyData[monthYear].totalCost += project.totalCost;
        monthlyData[monthYear].count++;
    });
    
    const labels = Object.keys(monthlyData).sort();
    const profitData = labels.map(label => monthlyData[label].grossProfit);
    const costData = labels.map(label => monthlyData[label].totalCost);
    
    profitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '粗利',
                    data: profitData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: '費用',
                    data: costData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '金額 (円)'
                    }
                }
            }
        }
    });
}

function saveData() {
    localStorage.setItem('scaffoldingProfitData', JSON.stringify(appState));
}

// ページイベント
window.addEventListener('load', init);
window.addEventListener('beforeunload', saveData);