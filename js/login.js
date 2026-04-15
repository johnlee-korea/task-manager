/* ===== login.js =====
 * 로그인 / 비밀번호 설정 기능
 * localStorage에 비밀번호 해시를 저장하고 검증한다.
 */

var Login = (function () {

  var STORAGE_KEY = 'taskmanager_pw';
  var _onSuccess = null;

  // --- 간단한 해시 함수 (클라이언트 전용) ---
  function _simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수 변환
    }
    return hash.toString(36);
  }

  /** 비밀번호가 설정되어 있는지 확인 */
  function isPasswordSet() {
    var val = localStorage.getItem(STORAGE_KEY);
    return val !== null && val !== '';
  }

  /** 비밀번호 저장 */
  function setPassword(pw) {
    localStorage.setItem(STORAGE_KEY, _simpleHash(pw));
  }

  /** 비밀번호 검증 */
  function verify(pw) {
    return localStorage.getItem(STORAGE_KEY) === _simpleHash(pw);
  }

  /** 로그인 화면 초기화 - onSuccess 콜백을 받아 로그인 성공 시 실행 */
  function init(onSuccess) {
    _onSuccess = onSuccess || null;

    var overlay = document.getElementById('loginOverlay');
    var form = document.getElementById('loginForm');
    var title = document.getElementById('loginTitle');
    var subtitle = document.getElementById('loginSubtitle');
    var pwInput = document.getElementById('loginPassword');
    var pwConfirmGroup = document.getElementById('loginConfirmGroup');
    var pwConfirm = document.getElementById('loginPasswordConfirm');
    var errorEl = document.getElementById('loginError');
    var btnText = document.getElementById('loginBtnText');
    var resetBtn = document.getElementById('loginResetBtn');

    var isSetup = !isPasswordSet();

    // 모드에 따라 UI 전환
    if (isSetup) {
      title.textContent = '비밀번호 설정';
      subtitle.textContent = '사용할 비밀번호를 설정해 주세요.';
      pwConfirmGroup.classList.remove('hidden');
      btnText.textContent = '설정 완료';
      resetBtn.classList.add('hidden');
    } else {
      title.textContent = '로그인';
      subtitle.textContent = '비밀번호를 입력해 주세요.';
      pwConfirmGroup.classList.add('hidden');
      btnText.textContent = '로그인';
      resetBtn.classList.remove('hidden');
    }

    // 폼 제출 처리
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.textContent = '';
      pwInput.classList.remove('input-error');
      if (pwConfirm) pwConfirm.classList.remove('input-error');

      var pw = pwInput.value;

      if (isSetup) {
        // 비밀번호 설정 모드
        var pwc = pwConfirm.value;

        if (pw.length < 4) {
          errorEl.textContent = '비밀번호는 4자 이상이어야 합니다.';
          pwInput.classList.add('input-error');
          pwInput.focus();
          return;
        }

        if (pw !== pwc) {
          errorEl.textContent = '비밀번호가 일치하지 않습니다.';
          pwConfirm.classList.add('input-error');
          pwConfirm.focus();
          return;
        }

        setPassword(pw);
        _showApp(overlay);
      } else {
        // 로그인 모드
        if (verify(pw)) {
          _showApp(overlay);
        } else {
          errorEl.textContent = '비밀번호가 올바르지 않습니다.';
          pwInput.classList.add('input-error');
          pwInput.value = '';
          pwInput.focus();
        }
      }
    });

    // 비밀번호 재설정 버튼
    resetBtn.addEventListener('click', function () {
      if (confirm('비밀번호를 재설정하면 기존 비밀번호가 삭제됩니다.\n계속하시겠습니까?')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });

    // 로그인 오버레이 표시 & 포커스
    overlay.classList.remove('hidden');
    pwInput.focus();
  }

  /** 로그인 성공 시 앱 표시 */
  function _showApp(overlay) {
    // 앱 컨테이너 표시
    var appContainer = document.getElementById('appContainer');
    appContainer.classList.remove('hidden');

    // 로그인 오버레이 페이드아웃
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(function () {
      overlay.classList.add('hidden');
      overlay.style.opacity = '';
      overlay.style.transition = '';
    }, 300);

    // 로그인 성공 콜백 실행 (앱 초기화)
    if (_onSuccess) {
      _onSuccess();
      _onSuccess = null;
    }
  }

  return {
    init: init
  };

})();
