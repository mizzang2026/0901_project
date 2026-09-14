/* 기존 Code.gs에 아래 내용을 추가하세요. */

const POSTS_SHEET = 'Posts';

// setup() 안에 추가:
// createSheetIfMissing(spreadsheet, POSTS_SHEET,
//   ['id', 'userId', 'authorName', 'title', 'category', 'content', 'createdAt', 'updatedAt']);

// doPost(e)의 logout 분기 다음에 추가:
// if (action === 'createPost') return createPost(e.parameter);
// if (action === 'updatePost') return updatePost(e.parameter);
// if (action === 'deletePost') return deletePost(e.parameter);

// doGet(e)의 me 분기 다음에 추가:
// if (action === 'listPosts') return listPosts();
// if (action === 'getPost') return getPost(e.parameter);

function listPosts() {
  const values = getSheet(POSTS_SHEET).getDataRange().getValues();
  const posts = [];
  for (let row = 1; row < values.length; row++) posts.push(postFromRow(values[row]));
  posts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return jsonResponse({ success: true, posts: posts });
}

function getPost(params) {
  const found = findPostRow(String(params.id || '').trim());
  return found
    ? jsonResponse({ success: true, post: found.post })
    : jsonResponse({ success: false, message: '게시글을 찾을 수 없습니다.' });
}

function createPost(params) {
  const user = requireUser(params.token);
  if (!user) return unauthorized();
  const input = validatePost(params);
  if (!input.valid) return jsonResponse({ success: false, message: input.message });
  const now = new Date();
  const id = Utilities.getUuid();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet(POSTS_SHEET).appendRow([id, user.id, user.name, input.title, input.category, input.content, now, now]);
  } finally { lock.releaseLock(); }
  return jsonResponse({ success: true, message: '게시글이 저장되었습니다.', id: id });
}

function updatePost(params) {
  const user = requireUser(params.token);
  if (!user) return unauthorized();
  const found = findPostRow(String(params.id || '').trim());
  if (!found) return jsonResponse({ success: false, message: '게시글을 찾을 수 없습니다.' });
  if (found.post.userId !== user.id) return jsonResponse({ success: false, message: '수정 권한이 없습니다.' });
  const input = validatePost(params);
  if (!input.valid) return jsonResponse({ success: false, message: input.message });
  const sheet = getSheet(POSTS_SHEET);
  sheet.getRange(found.rowNumber, 4, 1, 3).setValues([[input.title, input.category, input.content]]);
  sheet.getRange(found.rowNumber, 8).setValue(new Date());
  return jsonResponse({ success: true, message: '게시글이 수정되었습니다.', id: found.post.id });
}

function deletePost(params) {
  const user = requireUser(params.token);
  if (!user) return unauthorized();
  const found = findPostRow(String(params.id || '').trim());
  if (!found) return jsonResponse({ success: false, message: '게시글을 찾을 수 없습니다.' });
  if (found.post.userId !== user.id) return jsonResponse({ success: false, message: '삭제 권한이 없습니다.' });
  getSheet(POSTS_SHEET).deleteRow(found.rowNumber);
  return jsonResponse({ success: true, message: '게시글이 삭제되었습니다.' });
}

function requireUser(token) {
  token = String(token || '').trim();
  if (!token) return null;
  const session = findSession(token);
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return findUserById(session.userId);
}

function validatePost(params) {
  const title = String(params.title || '').trim();
  const category = String(params.category || '학습기록').trim();
  const content = String(params.content || '').trim();
  if (title.length < 2 || title.length > 100) return { valid: false, message: '제목은 2~100자로 입력하세요.' };
  if (content.length < 1 || content.length > 20000) return { valid: false, message: '내용은 1~20000자로 입력하세요.' };
  return { valid: true, title: title, category: category, content: content };
}

function findPostRow(id) {
  const values = getSheet(POSTS_SHEET).getDataRange().getValues();
  for (let row = 1; row < values.length; row++) {
    if (String(values[row][0]) === id) return { rowNumber: row + 1, post: postFromRow(values[row]) };
  }
  return null;
}

function postFromRow(row) {
  return {
    id: String(row[0]), userId: String(row[1]), author: String(row[2]),
    title: String(row[3]), category: String(row[4]), content: String(row[5]),
    createdAt: new Date(row[6]).toISOString(), updatedAt: new Date(row[7]).toISOString()
  };
}
