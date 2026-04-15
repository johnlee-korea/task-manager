/* ===== app.js =====
 * 앱 초기화 및 전역 이벤트 바인딩
 * 각 모듈의 init을 호출하고 공통 이벤트를 연결한다.
 */

(function () {

  /** 앱 시작 */
  function init() {
    // 각 모듈 초기화
    Calendar.init();
    Modal.init();
    TaskNotification.init();

    // 이벤트 바인딩
    _bindHeaderEvents();
    _bindSidebarEvents();
    _bindCalendarNav();
  }

  /** 헤더 이벤트: 뷰 전환 탭, 새 일정 버튼 */
  function _bindHeaderEvents() {
    // 새 일정 버튼
    document.getElementById('btnAddTask').addEventListener('click', function () {
      Modal.openCreate(Calendar.getTodayStr());
    });

    // 뷰 전환 탭
    var tabs = document.querySelectorAll('.view-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');

        var view = tab.getAttribute('data-view');
        document.getElementById('monthlyView').classList.toggle('hidden', view !== 'monthly');
        document.getElementById('weeklyView').classList.toggle('hidden', view !== 'weekly');
        document.getElementById('dailyView').classList.toggle('hidden', view !== 'daily');

        Calendar.setView(view);
      });
    });
  }

  /** 사이드바 이벤트: 우선순위 필터, 미니 캘린더 네비게이션 */
  function _bindSidebarEvents() {
    // 우선순위 필터 체크박스 변경 시 캘린더 다시 렌더링
    var filters = document.querySelectorAll('.filter-item input[type="checkbox"]');
    filters.forEach(function (cb) {
      cb.addEventListener('change', function () {
        Calendar.render();
      });
    });

    // 미니 캘린더 이전/다음
    document.getElementById('miniPrev').addEventListener('click', function () {
      Calendar.prev();
    });
    document.getElementById('miniNext').addEventListener('click', function () {
      Calendar.next();
    });
  }

  /** 메인 캘린더 네비게이션: 이전/다음/오늘 */
  function _bindCalendarNav() {
    document.getElementById('calendarPrev').addEventListener('click', function () {
      Calendar.prev();
    });
    document.getElementById('calendarNext').addEventListener('click', function () {
      Calendar.next();
    });
    document.getElementById('btnToday').addEventListener('click', function () {
      Calendar.goToday();
    });
  }

  // DOM 로드 후 로그인 → 앱 초기화
  document.addEventListener('DOMContentLoaded', function () {
    Login.init();
    init();
  });
})();
