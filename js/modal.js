/* ===== modal.js =====
 * 모달 처리 모듈
 * 일정 등록/수정/삭제 모달과 확인 다이얼로그를 담당한다.
 */

const Modal = (function () {

  // DOM 참조
  var overlay, form, titleEl, dateEl, startTimeEl, endTimeEl,
      priorityEl, reminderEl, memoEl, modalTitleEl,
      btnDelete, btnCancel, btnClose,
      confirmOverlay, confirmCancelBtn, confirmDeleteBtn;

  // 현재 편집 중인 일정 ID (null이면 새 등록)
  var editingId = null;

  function _cacheDom() {
    overlay = document.getElementById('taskModal');
    form = document.getElementById('taskForm');
    titleEl = document.getElementById('taskTitle');
    dateEl = document.getElementById('taskDate');
    startTimeEl = document.getElementById('taskStartTime');
    endTimeEl = document.getElementById('taskEndTime');
    priorityEl = document.getElementById('taskPriority');
    reminderEl = document.getElementById('taskReminder');
    memoEl = document.getElementById('taskMemo');
    modalTitleEl = document.getElementById('modalTitle');
    btnDelete = document.getElementById('btnDelete');
    btnCancel = document.getElementById('btnCancel');
    btnClose = document.getElementById('modalClose');
    confirmOverlay = document.getElementById('confirmModal');
    confirmCancelBtn = document.getElementById('confirmCancel');
    confirmDeleteBtn = document.getElementById('confirmDelete');
  }

  /** 폼 초기화 */
  function _resetForm() {
    form.reset();
    editingId = null;
    btnDelete.classList.add('hidden');
    modalTitleEl.textContent = '새 일정 등록';
  }

  /** 모달 열기 */
  function _open() {
    overlay.classList.remove('hidden');
    titleEl.focus();
  }

  /** 모달 닫기 */
  function _close() {
    overlay.classList.add('hidden');
    _resetForm();
  }

  /** 새 일정 등록 모달 열기 (시간 선택 파라미터 추가) */
  function openCreate(dateStr, timeStr) {
    _resetForm();
    if (dateStr) dateEl.value = dateStr;
    if (timeStr) startTimeEl.value = timeStr;
    _open();
  }

  /** 기존 일정 수정 모달 열기 */
  function openEdit(taskId) {
    _resetForm();
    var task = Store.getById(taskId);
    if (!task) return;

    editingId = taskId;
    modalTitleEl.textContent = '일정 수정';
    btnDelete.classList.remove('hidden');

    // 폼에 기존 값 채우기
    titleEl.value = task.title;
    dateEl.value = task.date;
    startTimeEl.value = task.startTime;
    endTimeEl.value = task.endTime;
    priorityEl.value = task.priority;
    reminderEl.value = task.reminder;
    memoEl.value = task.memo;

    _open();
  }

  /** 폼 제출 (저장) 처리 */
  function _handleSubmit(e) {
    e.preventDefault();

    var data = {
      title: titleEl.value.trim(),
      date: dateEl.value,
      startTime: startTimeEl.value,
      endTime: endTimeEl.value,
      priority: priorityEl.value,
      reminder: reminderEl.value,
      memo: memoEl.value.trim()
    };

    if (!data.title || !data.date) return;

    // 종료 시간이 시작 시간보다 이른 경우 경고
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      TaskNotification.showToast('종료 시간은 시작 시간 이후여야 합니다.', 'error');
      endTimeEl.focus();
      return;
    }

    if (editingId) {
      Store.update(editingId, data);
      TaskNotification.showToast('일정이 수정되었습니다.', 'success');
    } else {
      Store.create(data);
      TaskNotification.showToast('새 일정이 등록되었습니다.', 'success');
    }

    _close();
    Calendar.render();
  }

  /** 삭제 확인 다이얼로그 표시 */
  function _handleDeleteClick() {
    confirmOverlay.classList.remove('hidden');
  }

  /** 삭제 확정 */
  function _handleConfirmDelete() {
    if (editingId) {
      Store.remove(editingId);
      TaskNotification.showToast('일정이 삭제되었습니다.', 'info');
    }
    confirmOverlay.classList.add('hidden');
    _close();
    Calendar.render();
  }

  /** 삭제 취소 */
  function _handleConfirmCancel() {
    confirmOverlay.classList.add('hidden');
  }

  /** 이벤트 바인딩 */
  function _bindEvents() {
    form.addEventListener('submit', _handleSubmit);
    btnCancel.addEventListener('click', _close);
    btnClose.addEventListener('click', _close);
    btnDelete.addEventListener('click', _handleDeleteClick);
    confirmDeleteBtn.addEventListener('click', _handleConfirmDelete);
    confirmCancelBtn.addEventListener('click', _handleConfirmCancel);

    // 오버레이 클릭으로 닫기
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _close();
    });
    confirmOverlay.addEventListener('click', function (e) {
      if (e.target === confirmOverlay) _handleConfirmCancel();
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!confirmOverlay.classList.contains('hidden')) {
        _handleConfirmCancel();
      } else if (!overlay.classList.contains('hidden')) {
        _close();
      }
    });
  }

  function init() {
    _cacheDom();
    _bindEvents();
  }

  return {
    init: init,
    openCreate: openCreate,
    openEdit: openEdit
  };
})();
