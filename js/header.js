(() => {
  const headerRoot = document.querySelector('#site-header');
  if (!headerRoot) return;

  const lessons = [
    ['0831.html', '0831 · 개발 환경'],
    ['0901.html', '0901 · 프로젝트 시작'],
    ['0907.html', '0907 · GitHub'],
    ['0908.html', '0908 · 블로그와 DB'],
    ['0914.html', '0914 · 블로그 기능 개선'],
    ['0915.html', '0915 · React와 Express'],
    ['0921.html', '0921 · 실제 데이터 연동'],
    ['0922.html', '0922 · 배포 준비'],
    ['0928.html', '0928 · 연결과 배포 순서'],
    ['0929.html', '0929 · 사용자 기능 점검']
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isLessonPage = lessons.some(([file]) => file === currentPage);
  const current = (file) => file === currentPage ? ' aria-current="page"' : '';
  const lessonLinks = lessons.map(([file, label]) =>
    `<a href="./${file}"${current(file)}>${label}</a>`
  ).join('');

  headerRoot.innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="./index.html" aria-label="Jules의 기록 홈">Jules<span>.</span></a>
        <button class="menu-button" type="button" aria-expanded="false" aria-controls="main-navigation">
          <span class="sr-only">메뉴 열기</span>
          <span aria-hidden="true"></span><span aria-hidden="true"></span>
        </button>
        <nav id="main-navigation" class="navigation" aria-label="주요 메뉴">
          <a href="./index.html"${current('index.html')}>홈</a>
          <a href="./profile.html"${current('profile.html')}>프로필</a>
          <a href="./login.html"${current('login.html')}>로그인</a>
          <div class="nav-dropdown${isLessonPage ? ' current' : ''}">
            <button class="nav-dropdown-toggle" type="button" aria-expanded="false">학습기록 <span aria-hidden="true">▾</span></button>
            <div class="nav-submenu">${lessonLinks}</div>
          </div>
        </nav>
      </div>
    </header>`;
})();
