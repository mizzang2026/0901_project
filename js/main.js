const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.navigation');
const menuLabel = menuButton?.querySelector('.sr-only');
const dropdown = document.querySelector('.nav-dropdown');
const dropdownToggle = dropdown?.querySelector('.nav-dropdown-toggle');

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
  dropdown?.classList.remove('open');
  dropdownToggle?.setAttribute('aria-expanded', 'false');
  if (menuLabel) menuLabel.textContent = '메뉴 열기';
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
  if (menuLabel) menuLabel.textContent = isOpen ? '메뉴 열기' : '메뉴 닫기';
});

dropdownToggle?.addEventListener('click', () => {
  const isOpen = dropdownToggle.getAttribute('aria-expanded') === 'true';
  dropdownToggle.setAttribute('aria-expanded', String(!isOpen));
  dropdown?.classList.toggle('open', !isOpen);
});

document.addEventListener('click', (event) => {
  if (dropdown && !dropdown.contains(event.target)) {
    dropdown.classList.remove('open');
    dropdownToggle?.setAttribute('aria-expanded', 'false');
  }
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 800) closeMenu();
});

const year = document.querySelector('#current-year');
if (year) year.textContent = new Date().getFullYear();

document.querySelectorAll('[data-demo-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    if (status) status.textContent = '화면 입력을 확인했습니다. 데이터 저장 기능은 Google Sheets 연결 후 활성화됩니다.';
  });
});
