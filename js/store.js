/* ===== store.js =====
 * LocalStorage 기반 일정 데이터 관리 모듈
 * 모든 CRUD 작업과 데이터 필터링을 담당한다.
 */

const Store = (function () {
  const STORAGE_KEY = 'task-manager-tasks';

  // --- 내부 유틸 ---

  /** LocalStorage에서 전체 일정 배열을 불러온다 */
  function _loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('데이터 로드 실패:', e);
      return [];
    }
  }

  /** 전체 일정 배열을 LocalStorage에 저장한다 */
  function _saveAll(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('데이터 저장 실패:', e);
    }
  }

  /** 고유 ID 생성 (타임스탬프 + 랜덤 4자리) */
  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  // --- 공개 API ---

  /** 전체 일정 목록 반환 */
  function getAll() {
    return _loadAll();
  }

  /** ID로 일정 하나 조회. 없으면 null */
  function getById(id) {
    return _loadAll().find(function (t) { return t.id === id; }) || null;
  }

  /**
   * 새 일정 등록
   * @param {Object} data - { title, date, startTime, endTime, priority, memo, reminder }
   * @returns {Object} 생성된 일정 객체
   */
  function create(data) {
    var tasks = _loadAll();
    var task = {
      id: _generateId(),
      title: data.title,
      date: data.date,                       // "YYYY-MM-DD"
      startTime: data.startTime || '',       // "HH:MM" 또는 빈 문자열
      endTime: data.endTime || '',
      priority: data.priority || 'medium',   // "high" | "medium" | "low"
      memo: data.memo || '',
      reminder: data.reminder || '',         // 분 단위 문자열 또는 빈 문자열
      createdAt: new Date().toISOString()
    };
    tasks.push(task);
    _saveAll(tasks);
    return task;
  }

  /**
   * 기존 일정 수정
   * @param {string} id - 수정할 일정 ID
   * @param {Object} data - 변경할 필드만 포함
   * @returns {Object|null} 수정된 일정 객체. ID가 없으면 null
   */
  function update(id, data) {
    var tasks = _loadAll();
    var index = -1;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) { index = i; break; }
    }
    if (index === -1) return null;

    // 허용된 필드만 덮어쓴다
    var allowed = ['title', 'date', 'startTime', 'endTime', 'priority', 'memo', 'reminder'];
    allowed.forEach(function (key) {
      if (data[key] !== undefined) {
        tasks[index][key] = data[key];
      }
    });

    _saveAll(tasks);
    return tasks[index];
  }

  /**
   * 일정 삭제
   * @param {string} id
   * @returns {boolean} 삭제 성공 여부
   */
  function remove(id) {
    var tasks = _loadAll();
    var filtered = tasks.filter(function (t) { return t.id !== id; });
    if (filtered.length === tasks.length) return false; // 해당 ID 없음
    _saveAll(filtered);
    return true;
  }

  /**
   * 특정 날짜의 일정 목록 반환
   * @param {string} dateStr - "YYYY-MM-DD"
   * @returns {Array}
   */
  function getByDate(dateStr) {
    return _loadAll().filter(function (t) { return t.date === dateStr; });
  }

  /**
   * 특정 월의 일정 목록 반환
   * @param {number} year
   * @param {number} month - 1~12
   * @returns {Array}
   */
  function getByMonth(year, month) {
    // "YYYY-MM" 접두사로 필터링
    var prefix = year + '-' + String(month).padStart(2, '0');
    return _loadAll().filter(function (t) { return t.date.startsWith(prefix); });
  }

  /**
   * 특정 기간의 일정 목록 반환 (주간 뷰용)
   * @param {string} startDate - "YYYY-MM-DD"
   * @param {string} endDate   - "YYYY-MM-DD"
   * @returns {Array}
   */
  function getByRange(startDate, endDate) {
    return _loadAll().filter(function (t) {
      return t.date >= startDate && t.date <= endDate;
    });
  }

  /**
   * 우선순위로 필터링
   * @param {Array} tasks - 필터링할 일정 배열
   * @param {Array} priorities - 표시할 우선순위 목록 ["high", "medium", "low"]
   * @returns {Array}
   */
  function filterByPriority(tasks, priorities) {
    return tasks.filter(function (t) {
      return priorities.indexOf(t.priority) !== -1;
    });
  }

  /**
   * 일정을 시간순으로 정렬
   * 시간 없는 일정은 맨 앞에, 이후 시작 시간 오름차순
   * @param {Array} tasks
   * @returns {Array} 정렬된 새 배열
   */
  function sortByTime(tasks) {
    return tasks.slice().sort(function (a, b) {
      // 시간 미지정은 빈 문자열 → 맨 앞으로
      if (!a.startTime && b.startTime) return -1;
      if (a.startTime && !b.startTime) return 1;
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      return 0;
    });
  }

  /**
   * 알림이 필요한 일정 조회
   * 현재 시각 기준으로 알림 시간이 된 일정을 반환한다.
   * @returns {Array} 알림 대상 일정 목록
   */
  function getUpcomingReminders() {
    var now = new Date();
    var todayStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');

    var todayTasks = getByDate(todayStr);
    return todayTasks.filter(function (t) {
      if (!t.startTime || t.reminder === '') return false;

      // 일정 시작 시각에서 리마인더 분 만큼 빼서 알림 시각 계산
      var parts = t.startTime.split(':');
      var taskTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
        parseInt(parts[0], 10), parseInt(parts[1], 10));
      var reminderTime = new Date(taskTime.getTime() - parseInt(t.reminder, 10) * 60000);

      // 현재 시각이 알림 시각 이후이고, 일정 시작 시각 이전이면 알림 대상
      return now >= reminderTime && now < taskTime;
    });
  }

  // 외부에 공개할 메서드
  return {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    remove: remove,
    getByDate: getByDate,
    getByMonth: getByMonth,
    getByRange: getByRange,
    filterByPriority: filterByPriority,
    sortByTime: sortByTime,
    getUpcomingReminders: getUpcomingReminders
  };
})();
