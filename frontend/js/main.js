const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.navigation');
const menuLabel = menuButton?.querySelector('.sr-only');

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('open');
  if (menuLabel) menuLabel.textContent = '메뉴 열기';
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('open', !isOpen);
  if (menuLabel) menuLabel.textContent = isOpen ? '메뉴 열기' : '메뉴 닫기';
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 800) closeMenu();
});

const year = document.querySelector('#current-year');
if (year) year.textContent = new Date().getFullYear();
