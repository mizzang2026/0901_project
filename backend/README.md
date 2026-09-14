# Google Apps Script 게시글 CRUD 적용

`posts-addon.gs` 내용을 기존 Apps Script 프로젝트의 새 스크립트 파일에 붙여넣습니다.

기존 `Code.gs`에는 파일 상단의 안내대로 세 곳을 수정합니다.

1. `setup()`에 `Posts` 시트 생성 코드 추가
2. `doPost()`에 `createPost`, `updatePost`, `deletePost` 분기 추가
3. `doGet()`에 `listPosts`, `getPost` 분기 추가

그다음 `setup()`을 한 번 실행해 `Posts` 시트를 만들고, **배포 → 배포 관리 → 수정 → 새 버전 → 배포**를 진행합니다.

웹 앱 URL은 기존 배포를 수정하면 그대로 유지됩니다. 배포 완료 후 프런트엔드를 Google Sheets API 방식으로 전환합니다.
