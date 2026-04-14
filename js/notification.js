/* ===== notification.js =====
 * 알림/리마인더 모듈
 * 브라우저 Notification API와 앱 내 토스트 알림을 담당한다.
 */

const TaskNotification = (function () {

  var CHECK_INTERVAL = 30000; // 30초마다 알림 체크
  var TOAST_DURATION = 5000;  // 토스트 표시 시간 (5초)
  var timerId = null;

  // 이미 알림을 보낸 일정 ID를 추적 (중복 알림 방지)
  var notifiedIds = {};
  // 마지막 체크 날짜 (자정 넘김 감지용)
  var lastCheckDate = new Date().getDate();

  // --- 브라우저 알림 권한 ---

  /** 브라우저 알림 권한 요청 */
  function requestPermission() {
    if (!('Notification' in window)) return;
    if (window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }

  /** 브라우저 데스크탑 알림 발송 */
  function _sendBrowserNotification(task) {
    if (!('Notification' in window)) return;
    if (window.Notification.permission !== 'granted') return;

    var reminderMin = parseInt(task.reminder, 10);
    var body = '';
    if (reminderMin === 0) {
      body = '지금 시작하는 일정입니다.';
    } else {
      body = task.startTime + ' 시작 (' + reminderMin + '분 전)';
    }
    if (task.memo) body += '\n' + task.memo;

    var notification = new window.Notification('📋 ' + task.title, {
      body: body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📋</text></svg>',
      tag: 'task-' + task.id // 같은 태그면 기존 알림 대체
    });

    // 알림 클릭 시 해당 일정 수정 모달 열기
    notification.onclick = function () {
      window.focus();
      if (typeof Modal !== 'undefined' && Modal.openEdit) {
        Modal.openEdit(task.id);
      }
      notification.close();
    };
  }

  // --- 토스트 알림 ---

  /** 앱 내 토스트 메시지 표시 (textContent로 삽입하여 XSS 방지) */
  function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast';
    if (type) toast.classList.add('toast-' + type);

    var msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    toast.appendChild(_createCloseBtn(toast));
    container.appendChild(toast);

    // 자동 제거
    setTimeout(function () {
      _removeToast(toast);
    }, TOAST_DURATION);
  }

  /** 리마인더 전용 토스트 (DOM으로 안전하게 생성하여 XSS 방지) */
  function _showReminderToast(task) {
    var reminderMin = parseInt(task.reminder, 10);
    var timeInfo = '';
    if (reminderMin === 0) {
      timeInfo = '지금 시작';
    } else {
      timeInfo = task.startTime + ' 시작 (' + reminderMin + '분 전)';
    }

    // DOM 요소를 직접 생성하여 XSS 방지
    var wrapper = document.createElement('div');
    wrapper.className = 'toast-reminder';

    var icon = document.createElement('div');
    icon.className = 'toast-reminder-icon';
    icon.textContent = '\uD83D\uDD14'; // 🔔
    wrapper.appendChild(icon);

    var body = document.createElement('div');
    body.className = 'toast-reminder-body';

    var titleEl = document.createElement('div');
    titleEl.className = 'toast-reminder-title priority-' + task.priority;
    titleEl.textContent = task.title; // textContent로 안전하게 삽입
    body.appendChild(titleEl);

    var timeEl = document.createElement('div');
    timeEl.className = 'toast-reminder-time';
    timeEl.textContent = timeInfo;
    body.appendChild(timeEl);

    wrapper.appendChild(body);

    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast toast-reminder-card';
    toast.appendChild(wrapper);

    // 클릭 시 수정 모달
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', function (e) {
      if (e.target.classList.contains('toast-close')) return;
      if (typeof Modal !== 'undefined' && Modal.openEdit) {
        Modal.openEdit(task.id);
      }
      _removeToast(toast);
    });

    toast.appendChild(_createCloseBtn(toast, true));
    container.appendChild(toast);

    // 리마인더 토스트는 더 오래 표시 (8초)
    setTimeout(function () {
      _removeToast(toast);
    }, 8000);
  }

  /** 토스트 닫기 버튼 생성 (공통 헬퍼) */
  function _createCloseBtn(toast, stopPropagation) {
    var closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.textContent = '\u2715'; // ✕
    closeBtn.addEventListener('click', function (e) {
      if (stopPropagation) e.stopPropagation();
      _removeToast(toast);
    });
    return closeBtn;
  }

  /** 토스트 제거 (페이드아웃 애니메이션 적용) */
  function _removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-out');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  // --- 알림 체크 루프 ---

  /** 리마인더 대상 일정을 체크하고 알림 발송 */
  function _checkReminders() {
    var tasks = Store.getUpcomingReminders();

    tasks.forEach(function (task) {
      // 이미 알림을 보낸 일정은 건너뛴다
      if (notifiedIds[task.id]) return;
      notifiedIds[task.id] = true;

      // 브라우저 알림 + 토스트 동시 발송
      _sendBrowserNotification(task);
      _showReminderToast(task);
    });

    // 날짜가 바뀌면 알림 기록 초기화 (자정 정확 시각에 의존하지 않음)
    var now = new Date();
    var today = now.getDate();
    if (today !== lastCheckDate) {
      notifiedIds = {};
      lastCheckDate = today;
    }
  }

  /** 알림 체크 타이머 시작 */
  function _startTimer() {
    if (timerId) return;
    // 즉시 한 번 체크 후 주기적으로 반복
    _checkReminders();
    timerId = setInterval(_checkReminders, CHECK_INTERVAL);
  }

  /** 알림 체크 타이머 중지 */
  function _stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  // --- 페이지 가시성 처리 ---
  // 탭이 비활성일 때 타이머 낭비를 줄이고, 다시 활성화 시 즉시 체크

  function _handleVisibilityChange() {
    if (document.hidden) {
      _stopTimer();
    } else {
      _startTimer();
    }
  }

  // --- 초기화 ---

  function init() {
    // 브라우저 알림 권한 요청
    requestPermission();

    // 알림 체크 시작
    _startTimer();

    // 페이지 가시성 변화 감지
    document.addEventListener('visibilitychange', _handleVisibilityChange);
  }

  return {
    init: init,
    showToast: showToast,
    requestPermission: requestPermission
  };
})();
