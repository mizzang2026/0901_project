const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.navigation');
const menuLabel = menuButton?.querySelector('.sr-only');
const dropdown = document.querySelector('.nav-dropdown');
const dropdownToggle = dropdown?.querySelector('.nav-dropdown-toggle');
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx8hwlqo8uhicyeuL9Z-LzllfJZRwnrniT_0CTAmazlUwempT1dwFtCjJoWW2mP6upp/exec';

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

const authLink = navigation?.querySelector('a[href="./login.html"]');
const profileLink = navigation?.querySelector('a[href="./profile.html"]');
const sessionToken = localStorage.getItem('blogSessionToken');

if (navigation && dropdown) {
  const postsLink = document.createElement('a');
  postsLink.href = './posts.html';
  postsLink.textContent = '게시글';
  navigation.insertBefore(postsLink, dropdown);
  if (sessionToken) {
    const writeLink = document.createElement('a');
    writeLink.href = './write.html';
    writeLink.textContent = '글쓰기';
    navigation.insertBefore(writeLink, dropdown);
  }
}

if (!sessionToken && profileLink) {
  profileLink.textContent = '회원가입';
  profileLink.href = './signup.html';
  profileLink.removeAttribute('aria-current');
}

if (sessionToken && authLink) {
  authLink.textContent = '로그아웃';
  authLink.href = '#logout';
  authLink.removeAttribute('aria-current');
  authLink.setAttribute('aria-label', '로그아웃');

  authLink.addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.removeItem('blogSessionToken');
    localStorage.removeItem('blogUser');
    window.location.href = './index.html';
  });
}

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

async function postApi(action, params = {}, method = 'GET') {
  const data = new URLSearchParams({ action, ...params });
  const response = await fetch(method === 'GET' ? `${APPS_SCRIPT_URL}?${data}` : APPS_SCRIPT_URL, method === 'GET' ? {} : { method: 'POST', body: data });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || '요청 처리에 실패했습니다.');
  return result;
}
const excerpt = (text, length = 110) => text.length > length ? `${text.slice(0, length)}…` : text;
const formatDate = (value) => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));

function createPostCard(post, featured = false) {
  const article = document.createElement('article');
  article.className = `post-card${featured ? ' post-card-featured' : ''}`;
  const link = document.createElement('a');
  link.href = `./post.html?id=${encodeURIComponent(post.id)}`;
  const meta = document.createElement('div'); meta.className = 'post-meta';
  const time = document.createElement('time'); time.dateTime = post.createdAt; time.textContent = formatDate(post.createdAt);
  const badge = document.createElement('span'); badge.textContent = featured ? 'NEW' : post.category;
  meta.append(time, badge);
  const title = document.createElement('h3'); title.textContent = post.title;
  const summary = document.createElement('p'); summary.textContent = excerpt(post.content);
  const more = document.createElement('strong'); more.textContent = '게시글 읽기 →';
  link.append(meta, title, summary, more); article.append(link);
  return article;
}

const postList = document.querySelector('#post-list');
if (postList) (async () => {
  try {
  const posts = (await postApi('listPosts')).posts;
  document.querySelector('#post-count').textContent = `전체 ${posts.length}개의 글`;
  const categories = ['AI 활용', 'Q & A', '입트영', '일 상'];
  categories.forEach((category) => {
    const categoryPosts = posts.filter((post) => post.category === category);
    const section = document.createElement('section'); section.className = 'post-category-section';
    const heading = document.createElement('div'); heading.className = 'post-category-heading';
    const title = document.createElement('h2'); title.textContent = category;
    const count = document.createElement('span'); count.textContent = `${categoryPosts.length}개`;
    heading.append(title, count);
    const grid = document.createElement('div'); grid.className = 'post-grid';
    if (!categoryPosts.length) grid.innerHTML = '<div class="empty-state"><p>아직 작성된 글이 없습니다.</p></div>';
    categoryPosts.forEach((post, index) => grid.append(createPostCard(post, index === 0)));
    section.append(heading, grid); postList.append(section);
  });
  } catch (error) { postList.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`; }
})();

const postForm = document.querySelector('#post-form');
if (postForm) {
  if (!sessionToken) window.location.replace('./login.html');
  const editId = new URLSearchParams(location.search).get('id');
  if (editId) postApi('getPost', { id: editId }).then(({ post: existing }) => {
    postForm.elements.id.value = existing.id; postForm.elements.title.value = existing.title;
    postForm.elements.category.value = existing.category; postForm.elements.content.value = existing.content;
    document.querySelector('.content-heading h1').textContent = '게시글 수정';
  }).catch((error) => { postForm.querySelector('.form-status').textContent = error.message; });
  postForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = postForm.querySelector('.form-status'); status.textContent = '저장 중입니다…';
    try {
      const id = postForm.elements.id.value;
      const result = await postApi(id ? 'updatePost' : 'createPost', { token: sessionToken, id, title: postForm.elements.title.value.trim(), category: postForm.elements.category.value, content: postForm.elements.content.value.trim() }, 'POST');
      window.location.href = `./post.html?id=${encodeURIComponent(result.id)}`;
    } catch (error) { status.textContent = error.message; }
  });
}

const postDetail = document.querySelector('#post-detail');
if (postDetail) (async () => { try {
  const id = new URLSearchParams(location.search).get('id'); const post = (await postApi('getPost', { id })).post;
  if (!post) postDetail.innerHTML = '<div class="empty-state"><p>게시글을 찾을 수 없습니다.</p></div>';
  else {
    postDetail.innerHTML = '';
    const header = document.createElement('header'); header.className = 'content-heading';
    const meta = document.createElement('p'); meta.className = 'eyebrow'; meta.textContent = `작성자 ${post.author} · ${post.category} · ${formatDate(post.createdAt)}`;
    const title = document.createElement('h1'); title.textContent = post.title;
    const body = document.createElement('div'); body.className = 'article-body post-content'; body.textContent = post.content;
    header.append(meta, title); postDetail.append(header, body);
    const user = JSON.parse(localStorage.getItem('blogUser') || '{}');
    if (sessionToken && user.id === post.userId) {
      const actions = document.querySelector('#post-actions');
      actions.innerHTML = `<a href="./write.html?id=${encodeURIComponent(id)}">수정</a> <button class="text-button" id="delete-post" type="button">삭제</button>`;
      document.querySelector('#delete-post').addEventListener('click', async () => { if (confirm('이 글을 삭제할까요?')) { try { await postApi('deletePost', { token: sessionToken, id }, 'POST'); location.href = './posts.html'; } catch (error) { alert(error.message); } } });
    }
  }
} catch (error) { postDetail.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`; } })();

const profilePostList = document.querySelector('#profile-post-list');
if (profilePostList) (async () => {
  if (!sessionToken) { window.location.replace('./login.html'); return; }
  try {
    const me = await postApi('me', { token: sessionToken });
    const posts = (await postApi('listPosts')).posts.filter((post) => post.userId === me.user.id);
    document.querySelector('#profile-name').textContent = me.user.name;
    document.querySelector('#profile-email').textContent = me.user.email;
    document.querySelector('#profile-avatar').textContent = me.user.name.slice(0, 1).toUpperCase();
    document.querySelector('#profile-post-count').textContent = posts.length;
    profilePostList.innerHTML = '';
    if (!posts.length) profilePostList.innerHTML = '<div class="empty-state"><p>아직 작성한 게시글이 없습니다.</p></div>';
    posts.forEach((post, index) => profilePostList.append(createPostCard(post, index === 0)));
  } catch (error) {
    profilePostList.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
  }
})();
