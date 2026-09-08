const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.navigation');
const menuLabel = menuButton?.querySelector('.sr-only');
const dropdown = document.querySelector('.nav-dropdown');
const dropdownToggle = dropdown?.querySelector('.nav-dropdown-toggle');
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxzp-BvRVx4oqOnGDKVg_vHYoZMJsKyqdGCbPpUYbDE8-q64rQMd3J3qUfZfI05NPzz/exec';

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

async function sendAuthRequest(form, action) {
  const status = form.querySelector('.form-status');
  const submitButton = form.querySelector('[type="submit"]');
  const formData = new FormData(form);

  formData.set('action', action);
  status?.classList.remove('error');
  if (status) status.textContent = '처리 중입니다…';
  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: new URLSearchParams(formData)
    });
    const result = await response.json();

    if (!result.success) throw new Error(result.message || '요청 처리에 실패했습니다.');
    return result;
  } catch (error) {
    status?.classList.add('error');
    if (status) status.textContent = error.message || '서버에 연결하지 못했습니다.';
    return null;
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

const signupForm = document.querySelector('#signup-form');
signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = signupForm.elements.password.value;
  const confirmation = signupForm.elements['password-confirm'].value;
  const status = signupForm.querySelector('.form-status');

  if (password !== confirmation) {
    status?.classList.add('error');
    if (status) status.textContent = '비밀번호 확인이 일치하지 않습니다.';
    return;
  }

  const result = await sendAuthRequest(signupForm, 'signup');
  if (!result) return;
  if (status) status.textContent = result.message;
  signupForm.reset();
  window.setTimeout(() => { window.location.href = './login.html'; }, 900);
});

const loginForm = document.querySelector('#login-form');
loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await sendAuthRequest(loginForm, 'login');
  if (!result) return;

  localStorage.setItem('blogSessionToken', result.token);
  localStorage.setItem('blogUser', JSON.stringify(result.user));
  const status = loginForm.querySelector('.form-status');
  if (status) status.textContent = result.message;
  window.setTimeout(() => { window.location.href = './profile.html'; }, 600);
});
