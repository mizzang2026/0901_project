  const USERS_SHEET = 'Users';
  const SESSIONS_SHEET = 'Sessions';
  const POSTS_SHEET = 'Posts';
  const SESSION_HOURS = 24;
  const HASH_ROUNDS = 10000;



  /**
   * 최초 한 번만 Apps Script 편집기에서 직접 실행합니다.
   * Users, Sessions 시트와 제목 행을 생성합니다.
   */
  function setup() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    createSheetIfMissing(spreadsheet, USERS_SHEET, [
      'id',
      'name',
      'email',
      'passwordHash',
      'salt',
      'createdAt'
    ]);

    createSheetIfMissing(spreadsheet, SESSIONS_SHEET, [
      'token',
      'userId',
      'expiresAt',
      'createdAt'
    ]);

    createSheetIfMissing(spreadsheet, POSTS_SHEET, [
      'id', 'userId', 'authorName', 'title', 'category', 'content', 'createdAt', 'updatedAt'
    ]);
  }

  function createSheetIfMissing(spreadsheet, sheetName, headers) {
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
  }

  /**
   * GitHub Pages에서 POST 요청이 들어오면 실행됩니다.
   */
  function doPost(e) {
    try {
      const action = String(e.parameter.action || '').trim();

      if (action === 'signup') {
        return signup(e.parameter);
      }

      if (action === 'login') {
        return login(e.parameter);
      }

      if (action === 'logout') {
        return logout(e.parameter);
      }

      if (action === 'createPost') return createPost(e.parameter);
      if (action === 'updatePost') return updatePost(e.parameter);
      if (action === 'deletePost') return deletePost(e.parameter);

      return jsonResponse({
        success: false,
        message: '지원하지 않는 요청입니다.'
      });
    } catch (error) {
      console.error(error);

      return jsonResponse({
        success: false,
        message: '서버 처리 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 로그인 상태 확인용 GET 요청입니다.
   */
  function doGet(e) {
    try {
      const action = String(e.parameter.action || '').trim();

      if (action === 'me') {
        return getCurrentUser(e.parameter);
      }

      if (action === 'listPosts') return listPosts();
      if (action === 'getPost') return getPost(e.parameter);

      return jsonResponse({
        success: true,
        message: 'Apps Script 연결이 정상입니다.'
      });
    } catch (error) {
      console.error(error);

      return jsonResponse({
        success: false,
        message: '서버 처리 중 오류가 발생했습니다.'
      });
    }
  }

  function signup(params) {
    const name = String(params.name || '').trim();
    const email = normalizeEmail(params.email);
    const password = String(params.password || '');

    if (name.length < 2) {
      return jsonResponse({
        success: false,
        message: '이름을 2자 이상 입력하세요.'
      });
    }

    if (!isValidEmail(email)) {
      return jsonResponse({
        success: false,
        message: '올바른 이메일을 입력하세요.'
      });
    }

    if (!isValidPassword(password)) {
      return jsonResponse({
        success: false,
        message: '비밀번호는 영문과 숫자를 포함해 8자 이상 입력하세요.'
      });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const usersSheet = getSheet(USERS_SHEET);

      if (findUserByEmail(usersSheet, email)) {
        return jsonResponse({
          success: false,
          message: '이미 가입된 이메일입니다.'
        });
      }

      const userId = Utilities.getUuid();
      const salt = Utilities.getUuid();
      const passwordHash = hashPassword(password, salt);

      usersSheet.appendRow([
        userId,
        name,
        email,
        passwordHash,
        salt,
        new Date()
      ]);

      return jsonResponse({
        success: true,
        message: '회원가입이 완료되었습니다.'
      });
    } finally {
      lock.releaseLock();
    }
  }

  function login(params) {
    const email = normalizeEmail(params.email);
    const password = String(params.password || '');

    if (!email || !password) {
      return jsonResponse({
        success: false,
        message: '이메일과 비밀번호를 입력하세요.'
      });
    }

    const usersSheet = getSheet(USERS_SHEET);
    const user = findUserByEmail(usersSheet, email);

    if (!user) {
      return loginFailure();
    }

    const attemptedHash = hashPassword(password, user.salt);

    if (!constantTimeEqual(attemptedHash, user.passwordHash)) {
      return loginFailure();
    }

    deleteExpiredSessions();

    const sessionToken =
      Utilities.getUuid() +
      Utilities.getUuid().replace(/-/g, '');

    const expiresAt = new Date(
      Date.now() + SESSION_HOURS * 60 * 60 * 1000
    );

    getSheet(SESSIONS_SHEET).appendRow([
      sessionToken,
      user.id,
      expiresAt,
      new Date()
    ]);

    return jsonResponse({
      success: true,
      message: '로그인되었습니다.',
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  }

  function loginFailure() {
    // 이메일 존재 여부가 드러나지 않도록 같은 메시지를 사용합니다.
    return jsonResponse({
      success: false,
      message: '이메일 또는 비밀번호가 올바르지 않습니다.'
    });
  }

  function logout(params) {
    const token = String(params.token || '').trim();

    if (!token) {
      return jsonResponse({
        success: true,
        message: '로그아웃되었습니다.'
      });
    }

    const sheet = getSheet(SESSIONS_SHEET);
    const values = sheet.getDataRange().getValues();

    for (let row = values.length - 1; row >= 1; row--) {
      if (String(values[row][0]) === token) {
        sheet.deleteRow(row + 1);
      }
    }

    return jsonResponse({
      success: true,
      message: '로그아웃되었습니다.'
    });
  }

  function getCurrentUser(params) {
    const token = String(params.token || '').trim();

    if (!token) {
      return unauthorized();
    }

    const session = findSession(token);

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return unauthorized();
    }

    const user = findUserById(session.userId);

    if (!user) {
      return unauthorized();
    }

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  }

  function unauthorized() {
    return jsonResponse({
      success: false,
      message: '로그인이 필요하거나 세션이 만료되었습니다.'
    });
  }

  function getSheet(sheetName) {
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(
        sheetName + ' 시트가 없습니다. setup 함수를 먼저 실행하세요.'
      );
    }

    return sheet;
  }

  function findUserByEmail(sheet, email) {
    const values = sheet.getDataRange().getValues();

    for (let row = 1; row < values.length; row++) {
      if (normalizeEmail(values[row][2]) === email) {
        return userFromRow(values[row]);
      }
    }

    return null;
  }

  function findUserById(userId) {
    const values = getSheet(USERS_SHEET).getDataRange().getValues();

    for (let row = 1; row < values.length; row++) {
      if (String(values[row][0]) === String(userId)) {
        return userFromRow(values[row]);
      }
    }

    return null;
  }

  function userFromRow(row) {
    return {
      id: String(row[0]),
      name: String(row[1]),
      email: String(row[2]),
      passwordHash: String(row[3]),
      salt: String(row[4]),
      createdAt: row[5]
    };
  }

  function findSession(token) {
    const values = getSheet(SESSIONS_SHEET).getDataRange().getValues();

    for (let row = 1; row < values.length; row++) {
      if (constantTimeEqual(String(values[row][0]), token)) {
        return {
          token: String(values[row][0]),
          userId: String(values[row][1]),
          expiresAt: new Date(values[row][2])
        };
      }
    }

    return null;
  }

  function deleteExpiredSessions() {
    const sheet = getSheet(SESSIONS_SHEET);
    const values = sheet.getDataRange().getValues();
    const now = Date.now();

    for (let row = values.length - 1; row >= 1; row--) {
      const expiresAt = new Date(values[row][2]).getTime();

      if (!expiresAt || expiresAt <= now) {
        sheet.deleteRow(row + 1);
      }
    }
  }

  function hashPassword(password, salt) {
    let value = salt + ':' + password;

    for (let round = 0; round < HASH_ROUNDS; round++) {
      const digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        value,
        Utilities.Charset.UTF_8
      );

      value = Utilities.base64EncodeWebSafe(digest);
    }

    return value;
  }

  function constantTimeEqual(first, second) {
    first = String(first);
    second = String(second);

    let difference = first.length ^ second.length;
    const length = Math.max(first.length, second.length);

    for (let index = 0; index < length; index++) {
      const firstCode =
        index < first.length ? first.charCodeAt(index) : 0;

      const secondCode =
        index < second.length ? second.charCodeAt(index) : 0;

      difference |= firstCode ^ secondCode;
    }

    return difference === 0;
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPassword(password) {
    return (
      password.length >= 8 &&
      /[A-Za-z]/.test(password) &&
      /\d/.test(password)
    );
  }

  function jsonResponse(data) {
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

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
