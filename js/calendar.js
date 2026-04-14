/* ===== calendar.js =====
 * 캘린더 렌더링 모듈
 * 월간/주간/일간 뷰 생성과 날짜 계산을 담당한다.
 */

const Calendar = (function () {

  // --- 상태 ---
  var currentYear = 0;
  var currentMonth = 0; // 0~11 (JS Date 기준)
  var currentView = 'monthly'; // 'monthly' | 'weekly' | 'daily'
  var selectedDate = null; // "YYYY-MM-DD" 선택된 날짜
  var DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
  var HOURS_START = 6;  // 타임라인 시작 시간 (06:00)
  var HOURS_END = 23;   // 타임라인 종료 시간 (23:00)

  // --- 날짜 유틸 ---

  /** 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환 */
  function getTodayStr() {
    var d = new Date();
    return _formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  /** 숫자를 "YYYY-MM-DD" 문자열로 변환 */
  function _formatDate(year, month, day) {
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  /** 해당 월의 첫째 날 요일 (0=일, 6=토) */
  function _getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  /** 해당 월의 마지막 날짜 */
  function _getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  /** 월간 격자 첫 번째 셀의 날짜 문자열 반환 */
  function _getGridStartDate(year, month, firstDay, prevDays) {
    if (firstDay === 0) return _formatDate(year, month + 1, 1);
    var prevMonth = month === 0 ? 12 : month;
    var prevYear = month === 0 ? year - 1 : year;
    return _formatDate(prevYear, prevMonth, prevDays - firstDay + 1);
  }

  /** 월간 격자 마지막 셀의 날짜 문자열 반환 */
  function _getGridEndDate(year, month, firstDay, daysInMonth, totalCells) {
    var remaining = totalCells - firstDay - daysInMonth;
    if (remaining <= 0) return _formatDate(year, month + 1, daysInMonth);
    var nextMonth = month === 11 ? 1 : month + 2;
    var nextYear = month === 11 ? year + 1 : year;
    return _formatDate(nextYear, nextMonth, remaining);
  }

  // --- 현재 활성 우선순위 필터 조회 ---

  function _getActivePriorities() {
    var checks = document.querySelectorAll('.filter-item input[type="checkbox"]');
    var active = [];
    checks.forEach(function (cb) {
      if (cb.checked) active.push(cb.getAttribute('data-priority'));
    });
    return active;
  }

  // --- 월간 뷰 렌더링 ---

  function renderMonthly() {
    var grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    var firstDay = _getFirstDayOfMonth(currentYear, currentMonth);
    var daysInMonth = _getDaysInMonth(currentYear, currentMonth);
    var prevDays = _getDaysInMonth(currentYear, currentMonth - 1);
    var todayStr = getTodayStr();
    var priorities = _getActivePriorities();

    // 표시할 총 셀 수 (6주 고정)
    var totalCells = 42;

    // 격자에 보이는 전체 기간의 일정을 가져온다 (이전/다음 달 포함)
    var gridStartDate = _getGridStartDate(currentYear, currentMonth, firstDay, prevDays);
    var gridEndDate = _getGridEndDate(currentYear, currentMonth, firstDay, daysInMonth, totalCells);
    var rangeTasks = Store.getByRange(gridStartDate, gridEndDate);
    var filtered = Store.filterByPriority(rangeTasks, priorities);

    // 날짜별로 그룹핑
    var tasksByDate = {};
    filtered.forEach(function (t) {
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    });

    for (var i = 0; i < totalCells; i++) {
      var cell = document.createElement('div');
      cell.className = 'calendar-cell';

      var dayNum, dateStr, isOtherMonth = false;

      if (i < firstDay) {
        // 이전 달 날짜
        dayNum = prevDays - firstDay + 1 + i;
        var prevMonth = currentMonth === 0 ? 12 : currentMonth;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        dateStr = _formatDate(prevYear, prevMonth, dayNum);
        isOtherMonth = true;
      } else if (i >= firstDay + daysInMonth) {
        // 다음 달 날짜
        dayNum = i - firstDay - daysInMonth + 1;
        var nextMonth = currentMonth === 11 ? 1 : currentMonth + 2;
        var nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        dateStr = _formatDate(nextYear, nextMonth, dayNum);
        isOtherMonth = true;
      } else {
        // 현재 달 날짜
        dayNum = i - firstDay + 1;
        dateStr = _formatDate(currentYear, currentMonth + 1, dayNum);
      }

      // CSS 클래스 적용
      if (isOtherMonth) cell.classList.add('other-month');
      if (dateStr === todayStr) cell.classList.add('today');
      if (i % 7 === 0) cell.classList.add('sunday');
      if (i % 7 === 6) cell.classList.add('saturday');

      // 날짜 숫자
      var dateLabel = document.createElement('div');
      dateLabel.className = 'cell-date';
      dateLabel.textContent = dayNum;
      cell.appendChild(dateLabel);

      // 해당 날짜의 일정 카드 렌더링
      var dayTasks = tasksByDate[dateStr];
      if (dayTasks) {
        var sorted = Store.sortByTime(dayTasks);
        var maxShow = 3; // 셀에 최대 3개까지 표시

        for (var j = 0; j < sorted.length && j < maxShow; j++) {
          var card = _createTaskCard(sorted[j]);
          cell.appendChild(card);
        }

        // 더보기 표시
        if (sorted.length > maxShow) {
          var more = document.createElement('div');
          more.className = 'cell-more';
          more.textContent = '+' + (sorted.length - maxShow) + '개 더보기';
          cell.appendChild(more);
        }
      }

      // 셀 클릭 → 해당 날짜에 새 일정 등록
      cell.setAttribute('data-date', dateStr);
      cell.addEventListener('click', function (e) {
        // 일정 카드 클릭은 버블링 방지됨 → 빈 영역 클릭 시 새 일정
        if (e.target.closest('.task-card')) return;
        var clickedDate = this.getAttribute('data-date');
        selectedDate = clickedDate;
        if (typeof Modal !== 'undefined' && Modal.openCreate) {
          Modal.openCreate(clickedDate);
        }
      });

      grid.appendChild(cell);
    }

    // 캘린더 제목 갱신
    document.getElementById('calendarTitle').textContent =
      currentYear + '년 ' + (currentMonth + 1) + '월';
  }

  /** 일정 카드 DOM 요소 생성 */
  function _createTaskCard(task) {
    var card = document.createElement('div');
    card.className = 'task-card priority-' + task.priority;

    // 시간 표시
    var label = '';
    if (task.startTime) label = task.startTime + ' ';
    label += task.title;
    card.textContent = label;

    // 카드 클릭 → 일정 상세/수정 모달
    card.setAttribute('data-task-id', task.id);
    card.addEventListener('click', function (e) {
      e.stopPropagation(); // 셀 클릭 이벤트 방지
      if (typeof Modal !== 'undefined' && Modal.openEdit) {
        Modal.openEdit(task.id);
      }
    });

    return card;
  }

  // --- 미니 캘린더 렌더링 ---

  function renderMiniCalendar() {
    var container = document.getElementById('miniCalendarDates');
    container.innerHTML = '';

    var firstDay = _getFirstDayOfMonth(currentYear, currentMonth);
    var daysInMonth = _getDaysInMonth(currentYear, currentMonth);
    var prevDays = _getDaysInMonth(currentYear, currentMonth - 1);
    var todayStr = getTodayStr();
    var totalCells = 42;

    document.getElementById('miniCalendarTitle').textContent =
      currentYear + '년 ' + (currentMonth + 1) + '월';

    for (var i = 0; i < totalCells; i++) {
      var span = document.createElement('span');
      span.className = 'mini-date';

      var dayNum, dateStr, isOther = false;

      if (i < firstDay) {
        dayNum = prevDays - firstDay + 1 + i;
        isOther = true;
      } else if (i >= firstDay + daysInMonth) {
        dayNum = i - firstDay - daysInMonth + 1;
        isOther = true;
      } else {
        dayNum = i - firstDay + 1;
        dateStr = _formatDate(currentYear, currentMonth + 1, dayNum);
      }

      span.textContent = dayNum;
      if (isOther) span.classList.add('other-month');
      if (dateStr === todayStr) span.classList.add('today');
      if (dateStr === selectedDate) span.classList.add('selected');

      // 미니 캘린더 날짜 클릭 → 해당 날짜로 이동
      if (!isOther) {
        span.setAttribute('data-date', dateStr);
        span.addEventListener('click', function () {
          selectedDate = this.getAttribute('data-date');
          render();
        });
      }

      container.appendChild(span);
    }
  }

  // --- 오늘의 일정 사이드바 렌더링 ---

  function renderTodaySummary() {
    var container = document.getElementById('todaySummary');
    var todayStr = getTodayStr();
    var tasks = Store.getByDate(todayStr);
    var priorities = _getActivePriorities();
    tasks = Store.filterByPriority(tasks, priorities);
    tasks = Store.sortByTime(tasks);

    if (tasks.length === 0) {
      container.innerHTML = '<p class="empty-message">등록된 일정이 없습니다.</p>';
      return;
    }

    container.innerHTML = '';
    tasks.forEach(function (task) {
      var item = document.createElement('div');
      item.className = 'today-task-item priority-' + task.priority;

      var text = '';
      if (task.startTime) text = task.startTime + ' ';
      text += task.title;
      item.textContent = text;

      // 클릭 시 수정 모달
      item.style.cursor = 'pointer';
      item.addEventListener('click', function () {
        if (typeof Modal !== 'undefined' && Modal.openEdit) {
          Modal.openEdit(task.id);
        }
      });

      container.appendChild(item);
    });
  }

  // --- 주간 뷰 유틸 ---

  /** 선택된 날짜가 속한 주의 일요일 Date 객체 반환 */
  function _getWeekStart(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var day = d.getDay(); // 0=일
    d.setDate(d.getDate() - day);
    return d;
  }

  /** Date 객체를 "YYYY-MM-DD"로 변환 */
  function _dateToStr(d) {
    return _formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  // --- 주간 뷰 렌더링 ---

  function renderWeekly() {
    var grid = document.getElementById('weeklyGrid');
    grid.innerHTML = '';

    var weekStart = _getWeekStart(selectedDate);
    var todayStr = getTodayStr();
    var priorities = _getActivePriorities();

    // 주간 날짜 배열 (일~토)
    var weekDates = [];
    for (var d = 0; d < 7; d++) {
      var date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      weekDates.push(date);
    }

    var startStr = _dateToStr(weekDates[0]);
    var endStr = _dateToStr(weekDates[6]);
    var weekTasks = Store.getByRange(startStr, endStr);
    var filtered = Store.filterByPriority(weekTasks, priorities);

    // 날짜별 그룹핑
    var tasksByDate = {};
    filtered.forEach(function (t) {
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    });

    // 헤더 행: 빈 코너 + 7일 헤더
    var corner = document.createElement('div');
    corner.className = 'weekly-header';
    grid.appendChild(corner);

    weekDates.forEach(function (date) {
      var header = document.createElement('div');
      header.className = 'weekly-header';
      var ds = _dateToStr(date);
      if (ds === todayStr) header.classList.add('today');

      header.innerHTML = DAY_NAMES[date.getDay()] +
        '<span class="day-number">' + date.getDate() + '</span>';
      grid.appendChild(header);
    });

    // 시간 행 (HOURS_START ~ HOURS_END)
    for (var h = HOURS_START; h <= HOURS_END; h++) {
      // 시간 라벨
      var label = document.createElement('div');
      label.className = 'weekly-time-label';
      label.textContent = String(h).padStart(2, '0') + ':00';
      grid.appendChild(label);

      // 7일 각 셀
      for (var col = 0; col < 7; col++) {
        var cell = document.createElement('div');
        cell.className = 'weekly-time-cell';
        var cellDateStr = _dateToStr(weekDates[col]);

        // 해당 시간대의 일정 카드 배치
        var dayTasks = tasksByDate[cellDateStr];
        if (dayTasks) {
          dayTasks.forEach(function (task) {
            if (!task.startTime) return;
            var taskHour = parseInt(task.startTime.split(':')[0], 10);
            if (taskHour === h) {
              var card = _createTaskCard(task);
              cell.appendChild(card);
            }
          });
        }

        // 셀 클릭 → 새 일정 (날짜+시간 미리 채움)
        cell.setAttribute('data-date', cellDateStr);
        cell.setAttribute('data-hour', h);
        cell.addEventListener('click', function (e) {
          if (e.target.closest('.task-card')) return;
          var clickDate = this.getAttribute('data-date');
          var clickHour = this.getAttribute('data-hour');
          selectedDate = clickDate;
          if (typeof Modal !== 'undefined' && Modal.openCreate) {
            Modal.openCreate(clickDate, String(clickHour).padStart(2, '0') + ':00');
          }
        });

        grid.appendChild(cell);
      }
    }

    // 시간 미지정 일정 → 맨 위 별도 행
    _renderWeeklyAllDay(grid, weekDates, tasksByDate);

    // 캘린더 제목 갱신
    var s = weekDates[0];
    var e = weekDates[6];
    document.getElementById('calendarTitle').textContent =
      (s.getMonth() + 1) + '/' + s.getDate() + ' ~ ' +
      (e.getMonth() + 1) + '/' + e.getDate();
  }

  /** 주간 뷰 상단에 종일/시간미지정 일정 표시 */
  function _renderWeeklyAllDay(grid, weekDates, tasksByDate) {
    // 시간 미지정 일정이 있는지 확인
    var hasAllDay = false;
    weekDates.forEach(function (date) {
      var ds = _dateToStr(date);
      var tasks = tasksByDate[ds];
      if (tasks) {
        tasks.forEach(function (t) { if (!t.startTime) hasAllDay = true; });
      }
    });
    if (!hasAllDay) return;

    // grid 맨 앞에 종일 행 삽입 (헤더 행 다음)
    // 헤더 = 빈 코너(1) + 요일 헤더(7) = 8개, 그 다음 노드가 첫 시간 행
    var refNode = grid.children[8];

    var label = document.createElement('div');
    label.className = 'weekly-time-label';
    label.textContent = '종일';
    grid.insertBefore(label, refNode);

    weekDates.forEach(function (date) {
      var cell = document.createElement('div');
      cell.className = 'weekly-time-cell';
      var ds = _dateToStr(date);
      var tasks = tasksByDate[ds];
      if (tasks) {
        tasks.forEach(function (t) {
          if (!t.startTime) {
            var card = _createTaskCard(t);
            cell.appendChild(card);
          }
        });
      }
      grid.insertBefore(cell, refNode);
    });
  }

  // --- 일간 뷰 렌더링 ---

  function renderDaily() {
    var grid = document.getElementById('dailyGrid');
    grid.innerHTML = '';

    var priorities = _getActivePriorities();
    var tasks = Store.getByDate(selectedDate);
    var filtered = Store.filterByPriority(tasks, priorities);
    var sorted = Store.sortByTime(filtered);

    // 시간대별 그룹핑
    var tasksByHour = {};
    var allDayTasks = [];
    sorted.forEach(function (t) {
      if (!t.startTime) {
        allDayTasks.push(t);
      } else {
        var h = parseInt(t.startTime.split(':')[0], 10);
        if (!tasksByHour[h]) tasksByHour[h] = [];
        tasksByHour[h].push(t);
      }
    });

    // 헤더: 선택된 날짜
    var selDate = new Date(selectedDate + 'T00:00:00');
    var header = document.createElement('div');
    header.className = 'daily-header';
    if (selectedDate === getTodayStr()) header.classList.add('today');
    header.textContent = selDate.getFullYear() + '년 ' +
      (selDate.getMonth() + 1) + '월 ' + selDate.getDate() + '일 (' +
      DAY_NAMES[selDate.getDay()] + ')';
    grid.appendChild(header);

    // 종일 일정 행
    if (allDayTasks.length > 0) {
      var allDayRow = document.createElement('div');
      allDayRow.className = 'daily-time-row';

      var allDayLabel = document.createElement('div');
      allDayLabel.className = 'daily-time-label';
      allDayLabel.textContent = '종일';
      allDayRow.appendChild(allDayLabel);

      var allDaySlot = document.createElement('div');
      allDaySlot.className = 'daily-time-slot';
      allDayTasks.forEach(function (t) {
        allDaySlot.appendChild(_createTaskCard(t));
      });
      allDayRow.appendChild(allDaySlot);
      grid.appendChild(allDayRow);
    }

    // 시간대별 행 (HOURS_START ~ HOURS_END)
    for (var h = HOURS_START; h <= HOURS_END; h++) {
      var row = document.createElement('div');
      row.className = 'daily-time-row';

      var label = document.createElement('div');
      label.className = 'daily-time-label';
      label.textContent = String(h).padStart(2, '0') + ':00';
      row.appendChild(label);

      var slot = document.createElement('div');
      slot.className = 'daily-time-slot';

      // 해당 시간대의 일정 카드
      if (tasksByHour[h]) {
        tasksByHour[h].forEach(function (t) {
          slot.appendChild(_createTaskCard(t));
        });
      }

      // 셀 클릭 → 새 일정
      slot.setAttribute('data-hour', h);
      slot.addEventListener('click', function (e) {
        if (e.target.closest('.task-card')) return;
        var clickHour = this.getAttribute('data-hour');
        if (typeof Modal !== 'undefined' && Modal.openCreate) {
          Modal.openCreate(selectedDate, String(clickHour).padStart(2, '0') + ':00');
        }
      });

      row.appendChild(slot);
      grid.appendChild(row);
    }

    // 캘린더 제목 갱신
    document.getElementById('calendarTitle').textContent =
      selDate.getFullYear() + '년 ' + (selDate.getMonth() + 1) + '월 ' +
      selDate.getDate() + '일';
  }

  // --- 네비게이션 (뷰별 분기) ---

  /** 선택 날짜를 offset만큼 이동하고 상태를 갱신하는 공통 헬퍼 */
  function _moveSelectedDate(offset) {
    var d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    selectedDate = _dateToStr(d);
    currentYear = d.getFullYear();
    currentMonth = d.getMonth();
  }

  /** 이전 */
  function prev() {
    if (currentView === 'monthly') {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
    } else if (currentView === 'weekly') {
      _moveSelectedDate(-7);
    } else if (currentView === 'daily') {
      _moveSelectedDate(-1);
    }
    render();
  }

  /** 다음 */
  function next() {
    if (currentView === 'monthly') {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    } else if (currentView === 'weekly') {
      _moveSelectedDate(7);
    } else if (currentView === 'daily') {
      _moveSelectedDate(1);
    }
    render();
  }

  /** 오늘로 이동 */
  function goToday() {
    var now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    selectedDate = getTodayStr();
    render();
  }

  /** 뷰 전환 */
  function setView(view) {
    currentView = view;
    render();
  }

  // --- 헤더 날짜 표시 ---

  function renderHeaderDate() {
    var now = new Date();
    document.getElementById('todayDate').textContent =
      now.getFullYear() + '년 ' + (now.getMonth() + 1) + '월 ' +
      now.getDate() + '일 (' + DAY_NAMES[now.getDay()] + ')';
  }

  // --- 전체 렌더링 ---

  function render() {
    // 현재 뷰에 맞는 캘린더 렌더링
    if (currentView === 'monthly') {
      renderMonthly();
    } else if (currentView === 'weekly') {
      renderWeekly();
    } else if (currentView === 'daily') {
      renderDaily();
    }
    renderMiniCalendar();
    renderTodaySummary();
  }

  /** 초기화 */
  function init() {
    var now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    selectedDate = getTodayStr();
    renderHeaderDate();
    render();
  }

  return {
    init: init,
    render: render,
    prev: prev,
    next: next,
    goToday: goToday,
    setView: setView,
    getTodayStr: getTodayStr,
    getState: function () {
      return { year: currentYear, month: currentMonth, view: currentView, selectedDate: selectedDate };
    }
  };
})();
