# 기존 Pages 연결 적용

2026-10-30. 사용자 요청에 따라 기존 autoflow Pages와 D1 autoflow_db, R2 autoflow-r2를 유지한다.

## 변경

- Pages Advanced Mode 진입점 worker/pages.ts 및 빌드 도구 추가. dist/_worker.js가 기존 서버 API를 실행한다.
- _routes.json은 /api/*만 Functions에서 처리하고 SPA/폰트는 정적 제공한다.
- 운영은 대시보드 DB·FILES 바인딩을 유지한다. 기존 Workers용 wrangler 파일은 wrangler.worker.jsonc로 분리하고 Git 제외 루트 config는 로컬 Pages 실행에서만 사용한다.
- 최초 등록 키로 보호되는 최초 관리자 등록 UI/API와 DB 일회성 제약 추가. 기존 로컬 데모 계정은 원격에 복사하지 않는다.
- /api/health 및 등록 전 관리자 키로만 실행할 수 있는 D1/R2 자체 점검 추가. 점검은 고유 ID로 만든 점검 자료만 회수한다.
- JSON Content-Type 없는 로그아웃 응답을 수정해 프런트엔드의 API 형식 검증과 일치시켰다.
- 실제 사이트에 로컬 데모 계정 기본값·등록 메뉴를 표시하지 않는다.

## 검증

- TypeScript·Vite·Pages 서버 번들 빌드 성공.
- Pages 로컬 런타임에서 기존 API 16개·확장 API 14개 그룹 통과. 기존 단위 3개·DB 제약 9개 통과.
- 최초 관리자 키 검사·동시 등록 1회 보장·로그인·R2 업로드/읽기·API/SPA 라우팅을 별도 검증.
- 실제 브라우저에서 Pages 형태 호스트의 최초 등록→로그인→새로고침 세션 유지→거래처 D1 저장→R2 파일→로그아웃→모바일 폭을 포함한 6개 그룹 통과.
- Blueprime 계정 인증을 확인했고 빈 원격 D1에 0001~0006 마이그레이션을 적용했다. BOOTSTRAP_TOKEN은 Pages의 암호화된 Secret으로 저장했다. 값은 Git·문서·로그에 넣지 않았다.
- GitHub push 이후 자동 Pages 재배포와 원격 D1/R2 점검 결과는 후속 확인하여 기록한다.

처음 올린 API 없는 Pages는 화면과 /api/me에 동일 HTML을 반환했다. 새 API에서는 /api/me가 미인증 시 JSON 401을 반환해야 한다. 홈페이지 표시만으로 서버 성공으로 판정하지 않는다.

## 남은 작업

최초 관리자는 사이트에서 등록 키로 회사명·이메일·본인이 정한 비밀번호를 입력해 생성한다. 키는 이 PC의 .local-pages-bootstrap-key.txt에서 확인한다. 기존 Pages 프로젝트·DB·버킷은 삭제하거나 재생성하지 않았다. 새 GitHub/별도 프로젝트 생성도 필요 없다.

Pages는 Cron 예약 실행을 직접 제공하지 않는다. 외부 메일 수집·AI·발송·OCR·문자 등 후속 기능은 이전과 동일하게 미연결이다. 운영 전 복구·자원 사용량·파일 검사 등 별도 검증이 필요하다.
