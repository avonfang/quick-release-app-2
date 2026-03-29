const counts = 15; // 每列的打卡次数
let timeLeft = 1800; // 倒计时总秒数 (30分钟 * 60秒)
let timerInterval; // 用于存储计时器ID，以便清除

// 全局状态：当前正在处理的确认弹窗的感受和问题索引
let currentModalColumnName = null; // 例如：'control', 'safe', 'recognition'
let currentModalQuestionIndex = 0; // 0, 1, 或 2 (对应三步问题)

// 内部列名到显示名称的映射
const feelingDisplayNames = {
  'safe': '安全',
  'control': '控制',
  'recognition': '认同'
};

// 三步确认的问题和按钮文本
const subQuestions = [
  "你允许想要{feeling}的感受存在吗？",
  "你愿意让它离开吗？",
  "什么时候？"
];

const subButtons = [
  "允许存在",
  "愿意离开",
  "现在"
];

// 获取当前用户
function getCurrentUser() {
  return localStorage.getItem('currentUser');
}

// 获取带用户前缀的存储键
function getUserKey(key) {
  const user = getCurrentUser();
  return user ? `${user}_${key}` : key;
}

// 撒花动画是否已触发的标志
let confettiTriggered = localStorage.getItem(getUserKey("confettiTriggered")) === "true";

// 页面加载时执行
async function load() {
  loadTheme(); // 加载保存的主题
  displayCurrentDate(); // 显示当前日期
  updateUserInfo(); // 更新用户信息
  
  // 初始化通知系统
  if ('Notification' in window && localStorage.getItem('notificationPermission') === 'granted') {
    scheduleNotification();
  }
  
  // 异步加载打卡数据
  await Promise.all([
    createColumn("safe"),
    createColumn("control"),
    createColumn("recognition")
  ]);
  
  startTimer();
  await checkAllCheckboxesCompletedAndTriggerConfetti(); // 页面加载时检查是否需要撒花
}

// 更新用户信息显示
function updateUserInfo() {
  const currentUser = getCurrentUser();
  const userElement = document.getElementById('currentUser');
  const logoutBtn = document.querySelector('button[onclick="logout()"]');
  const loginBtn = document.querySelector('button[onclick="goToLogin()"]');
  
  if (currentUser) {
    userElement.textContent = currentUser;
    logoutBtn.style.display = 'inline-block';
    loginBtn.style.display = 'none';
  } else {
    userElement.textContent = '未登录';
    logoutBtn.style.display = 'none';
    loginBtn.style.display = 'inline-block';
  }
}

// 跳转到登录页面
function goToLogin() {
  window.location.href = 'auth.html';
}

// 跳转到统计分析页面
function goToStats() {
  window.location.href = 'stats.html';
}

// 登出函数
function logout() {
  localStorage.removeItem('currentUser');
  window.location.reload();
}

// 主题切换功能
function toggleTheme() {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  const isDarkMode = body.classList.contains('dark-mode');
  
  if (isDarkMode) {
    // 切换到浅色模式
    body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
    themeToggle.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    // 切换到深色模式
    body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
    themeToggle.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
}

// 加载保存的主题
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  
  if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    if (themeToggle) {
      themeToggle.textContent = '☀️';
      themeToggle.classList.add('dark');
    }
  } else {
    body.classList.remove('dark-mode');
    if (themeToggle) {
      themeToggle.textContent = '🌙';
      themeToggle.classList.remove('dark');
    }
  }
}

// 通知系统
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        localStorage.setItem('notificationPermission', 'granted');
        showNotification('通知已开启', '我们会提醒你按时进行释放打卡');
      }
    });
  }
}

function showNotification(title, message) {
  if ('Notification' in window && localStorage.getItem('notificationPermission') === 'granted') {
    new Notification(title, {
      body: message,
      icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZmlsbD0iIzY2N2VlYSIgZD0iTTM1LjIgMTZ2LTJoLTkuN3YyaC0yaHYtMnMtMS0xLTIgMEg1VjQxSDQyLjl2MnM2IDIgNi0yVjE1aDJzMSAxIDIgMFYxNmMwLTUuNS00LjUtMTAtMTAtMTBzLTEwIDQuNS0xMCAxMCA0LjUgMTAgMTAgMTAgMTAtNC41IDEwLTEwSDM1LjJ6bTguOCAwYy01LjUgMC0xMC00LjUtMTAtMTBTMzQuMyA2IDQwIDZzMTAgNC41IDEwIDEwLTQuNSAxMC0xMCAxMHptMC0yYzQuNCAwIDgtMy42IDgtOHMtMy42LTgtOC04LTgtMy42LTgtOCAzLjYtOCA4LTggOHptMi40IDM3LjZjLTEuMyAwLTIuNC0xLjEtMi40LTIuNGMwLTEuMyAxLjEtMi40IDIuNC0yLjRsMS45LS43LjctMS45LjctMS45LTEuOS0uNy0uNyAxLjktLjcgMS45IDEuOS43LjcgMS45LjcgMS45LTEuOS43LTcuMiAzLjEtMTAuMyA5LjUtMTAuMyAxNS44czMuMSAxMC4zIDkuNSAxMC4zIDEwLjMtNS44IDEwLjMtMTUuOHMtMy4xLTEwLjMtOS41LTEwLjN6Ii8+PC9zdmc+',
      badge: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZmlsbD0iIzY2N2VlYSIgZD0iTTM1LjIgMTZ2LTJoLTkuN3YyaC0yaHYtMnMtMS0xLTIgMEg1VjQxSDQyLjl2MnM2IDIgNi0yVjE1aDJzMSAxIDIgMFYxNmMwLTUuNS00LjUtMTAtMTAtMTBzLTEwIDQuNS0xMCAxMCA0LjUgMTAgMTAgMTAgMTAtNC41IDEwLTEwSDM1LjJ6bTguOCAwYy01LjUgMC0xMC00LjUtMTAtMTBTMzQuMyA2IDQwIDZzMTAgNC41IDEwIDEwLTQuNSAxMC0xMCAxMHptMC0yYzQuNCAwIDgtMy42IDgtOHMtMy42LTgtOC04LTgtMy42LTgtOCAzLjYtOCA4LTggOHptMi40IDM3LjZjLTEuMyAwLTIuNC0xLjEtMi40LTIuNGMwLTEuMyAxLjEtMi40IDIuNC0yLjRsMS45LS43LjctMS45LjctMS45LTEuOS0uNy0uNyAxLjktLjcgMS45IDEuOS43LjcgMS45LjcgMS45LTEuOS43LTcuMiAzLjEtMTAuMyA5LjUtMTAuMyAxNS44czMuMSAxMC4zIDkuNSAxMC4zIDEwLjMtNS44IDEwLjMtMTUuOHMtMy4xLTEwLjMtOS41LTEwLjN6Ii8+PC9zdmc+',
      vibrate: [200, 100, 200],
      tag: 'release-reminder'
    });
  }
}

function scheduleNotification() {
  // 每天固定时间提醒
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(20, 0, 0, 0); // 晚上8点
  
  if (now > reminderTime) {
    // 今天的提醒时间已过，设置为明天
    reminderTime.setDate(reminderTime.getDate() + 1);
  }
  
  const timeUntilReminder = reminderTime - now;
  
  setTimeout(() => {
    showNotification('释放打卡提醒', '该进行每日释放打卡了，坚持就是胜利！');
    // 循环设置每天的提醒
    scheduleNotification();
  }, timeUntilReminder);
}

function toggleNotification() {
  if (localStorage.getItem('notificationPermission') === 'granted') {
    localStorage.removeItem('notificationPermission');
    showNotification('通知已关闭', '你将不会收到打卡提醒');
  } else {
    requestNotificationPermission();
  }
}

// 显示当前日期
function displayCurrentDate() {
  const dateElement = document.getElementById("currentDate");
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const weekday = weekdays[now.getDay()];
  dateElement.textContent = `${year}年${month}月${day}日 ${weekday}`;
}

// 创建列中的打卡项
async function createColumn(name) {
  const container = document.getElementById(name);
  const currentUser = getCurrentUser();
  
  try {
    // 从IndexedDB加载打卡状态
    const checks = await getChecks(currentUser);
    const checkMap = new Map();
    
    checks.forEach(check => {
      checkMap.set(`${check.column}${check.index}`, check.checked);
    });
    
    for (let i = 0; i < counts; i++) {
      const checked = checkMap.get(`${name}${i}`) === true;
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <label>
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleCheckbox('${name}', ${i}, this.checked)">
          第${i + 1}次
        </label>
      `;
      container.appendChild(div);
    }
  } catch (error) {
    console.error('加载打卡数据失败:', error);
    // 回退到localStorage
    for (let i = 0; i < counts; i++) {
      let checked = localStorage.getItem(getUserKey(name + i)) === "true";
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <label>
          <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleCheckbox('${name}', ${i}, this.checked)">
          第${i + 1}次
        </label>
      `;
      container.appendChild(div);
    }
  }
}

// 切换复选框状态并保存到IndexedDB
async function toggleCheckbox(columnName, index, checked) {
  const currentUser = getCurrentUser();
  
  try {
    // 保存状态到IndexedDB
    await saveCheck(currentUser, columnName, index, checked);
  } catch (error) {
    console.error('保存打卡状态失败:', error);
    // 回退到localStorage
    localStorage.setItem(getUserKey(columnName + index), checked);
  }
  
  // 显示三步确认弹窗
  if (checked) {
    showConfirmationModal(columnName);
  }
}

// 显示三步确认弹窗
function showConfirmationModal(columnName) {
  // 重置问题索引
  currentModalQuestionIndex = 0;
  currentModalColumnName = columnName;
  updateConfirmationModal();
  document.getElementById("confirmation-modal").classList.add("active");
}

// 更新确认弹窗的内容
function updateConfirmationModal() {
  const questionElement = document.getElementById("confirmation-question");
  const buttonElement = document.querySelector("#confirmation-modal button");
  const feeling = feelingDisplayNames[currentModalColumnName];
  questionElement.textContent = subQuestions[currentModalQuestionIndex].replace("{feeling}", feeling);
  buttonElement.textContent = subButtons[currentModalQuestionIndex];
}

// 确认感受并进入下一步
function confirmFeeling() {
  currentModalQuestionIndex++;
  if (currentModalQuestionIndex < subQuestions.length) {
    updateConfirmationModal();
  } else {
    // 三步确认完成，关闭弹窗
    document.getElementById("confirmation-modal").classList.remove("active");
    // 检查是否所有复选框都已完成
    checkAllCheckboxesCompletedAndTriggerConfetti();
  }
}

// 检查是否所有复选框都已完成，如果是则触发撒花动画
async function checkAllCheckboxesCompletedAndTriggerConfetti() {
  const currentUser = getCurrentUser();
  let allCompleted = true;
  
  try {
    // 从IndexedDB获取用户的所有打卡记录
    const checks = await getChecks(currentUser);
    const checkMap = new Map();
    
    checks.forEach(check => {
      checkMap.set(`${check.column}${check.index}`, check.checked);
    });
    
    // 检查所有打卡项是否都已完成
    const columns = ["safe", "control", "recognition"];
    for (const column of columns) {
      for (let i = 0; i < counts; i++) {
        if (checkMap.get(`${column}${i}`) !== true) {
          allCompleted = false;
          break;
        }
      }
      if (!allCompleted) {
        break;
      }
    }
  } catch (error) {
    console.error('检查打卡状态失败:', error);
    // 回退到localStorage
    const columns = ["safe", "control", "recognition"];
    for (const column of columns) {
      for (let i = 0; i < counts; i++) {
        if (localStorage.getItem(getUserKey(column + i)) !== "true") {
          allCompleted = false;
          break;
        }
      }
      if (!allCompleted) {
        break;
      }
    }
  }
  
  if (allCompleted && !confettiTriggered) {
    triggerConfetti();
    confettiTriggered = true;
    localStorage.setItem(getUserKey("confettiTriggered"), "true");
  }
}

// 触发撒花动画
function triggerConfetti() {
  const overlay = document.getElementById("confetti-overlay");
  overlay.classList.add("active");
  // 生成200个撒花片
  for (let i = 0; i < 200; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti-piece";
    // 随机颜色
    const colors = ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800", "#FF5722"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.setProperty("--color", color);
    // 随机位置和角度
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    // 随机动画延迟和持续时间
    confetti.style.animationDelay = Math.random() * 5 + "s";
    confetti.style.animationDuration = (Math.random() * 3 + 2) + "s";
    overlay.appendChild(confetti);
  }
  // 5秒后移除撒花效果
  setTimeout(() => {
    overlay.classList.remove("active");
    // 移除所有撒花片
    const confettiPieces = document.querySelectorAll(".confetti-piece");
    confettiPieces.forEach(piece => piece.remove());
  }, 5000);
}

// 重置所有复选框和数据库
async function resetAll() {
  const currentUser = getCurrentUser();
  
  try {
    // 从IndexedDB删除用户的所有打卡记录
    await deleteUserChecks(currentUser);
  } catch (error) {
    console.error('重置打卡记录失败:', error);
    // 回退到localStorage
    const columns = ["safe", "control", "recognition"];
    for (const column of columns) {
      for (let i = 0; i < counts; i++) {
        localStorage.removeItem(getUserKey(column + i));
      }
    }
  }
  
  // 重置撒花触发标志
  confettiTriggered = false;
  localStorage.removeItem(getUserKey("confettiTriggered"));
  
  // 重新加载页面
  location.reload();
}

// 启动计时器
function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById("time").textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      document.getElementById("time").textContent = "00:00";
    }
  }, 1000);
}

// 页面加载完成后执行
window.onload = async () => {
  await load();
};