# Autoflow — 오토플로우

의료기기 영업·견적 업무용 SaaS 초기 구현. React + Vite + TypeScript / Tailwind / React Router / Cloudflare Pages Functions(Workers 런타임) / D1 / 비공개 R2.

저장소: https://github.com/blueprime7787/autoflow

## 현재 배포 구조

기존 Pages 프로젝트 `autoflow`, 주소 https://autoflow-1a2.pages.dev 를 유지한다. GitHub의 main 브랜치 변경은 사용자가 설정한 Cloudflare 자동 배포를 시작한다.

`npm run build`는 Vite 화면 파일과 서버 번들 `dist/_worker.js`, API 라우팅 `dist/_routes.json`을 함께 생성한다. `/api/*`는 서버로, 화면·폰트·React 경로는 정적 에셋으로 전달한다. 로그인·D1·R2를 처리하는 서버 코드는 기존 worker 모듈을 재사용한다.

운영 Pages는 **대시보드의 바인딩 설정**을 사용한다. 루트 `wrangler.jsonc`는 Git에서 제거했고 로컬 실행 때만 생성한다. 빌드 서버에 로컬 DB 자리표시자가 적용되지 않게 한다.

| Pages Binding 이름 | 실제 자원 |
|---|---|
| DB | autoflow_db |
| FILES | autoflow-r2 |
| BOOTSTRAP_TOKEN (Secret) | 최초 관리자 등록용 임의 키; Git에 포함하지 않음 |

Cloudflare 빌드 설정: 빌드 명령 `npm run build`, 출력 폴더 `dist`, 루트 폴더는 저장소 루트. Pages Functions의 `/api/health`가 JSON으로 정상 응답해야 서버 연결 성공이다. 홈페이지가 열리는 것만으로 DB 연결을 판정하지 않는다.

## 임시 ‘테스트 시작’ 관리자 입장

로그인 화면의 **테스트 시작** 버튼은 아이디·비밀번호 없이 **서버에서 지정한 현재 회사의 활성 관리자**로 입장한다. 별도의 테스트 회사나 가상 전용 공간을 만들지 않는다. 거래처·제품·견적·직원 변경은 현재 회사의 실제 자료에 저장되고 다시 들어와도 남는다. 다른 고객사 자료 접근은 계속 차단한다.

- Pages Secret `TEMP_ADMIN_TENANT`는 대상 회사, `TEMP_ADMIN_UNTIL`은 허용 종료 시각(ISO UTC)을 지정한다. 둘 중 하나가 없거나 기한이 지나면 입장과 기존 임시 세션을 모두 거부한다.
- 이번 활성화는 24시간이다. 로컬 `.local-temporary-admin.json`에 종료 시각을 기록했다. 코드는 기한을 하드코딩하지 않는다.
- 개별 임시 세션은 최대 2시간이며 전체 허용 기한을 넘지 않는다. 테스트 종료는 임시 세션만 폐기하고 입력 자료는 삭제하지 않는다.
- 이 입장은 플랫폼 전체 관리자 권한이 아니라 지정 회사의 관리자 권한이다. 브라우저가 보낸 회사 ID·역할 값은 사용하지 않는다.
- 공개 사이트에서는 누구나 버튼으로 이 회사 관리자 권한을 얻는다. 종료 시각을 기다리지 않고 즉시 끄려면 Cloudflare에서 `TEMP_ADMIN_TENANT` Secret을 제거한다. 이미 생성한 직원·자료·역할 변경은 자동으로 되돌리지 않으므로 테스트 종료 후 확인한다.
- 원격에 관리자 계정이 없어서 소유자의 블루프라임 회사/관리자를 최초 준비했다. 정상 로그인용 임의 비밀번호는 `.local-initial-admin.json`에만 저장하고 GitHub에는 포함하지 않았다. 정상 로그인 경로도 유지한다.

로컬 테스트는 `.dev.vars`에 `TEMP_ADMIN_TENANT=demo-a`, 미래 시각의 `TEMP_ADMIN_UNTIL`을 설정하고 데모 초기화를 한 경우 실행할 수 있다. 실제 운영 회사 식별자나 비밀번호를 소스에 적지 않는다.

## 최초 관리자와 로그인

원격 DB에는 로컬 데모 계정을 복사하지 않는다. 테이블이 준비되고 직원 계정이 없으면 사이트에 **최초 관리자 등록** 화면이 표시된다.

1. 프로젝트 소유자에게 전달된 최초 등록 키를 입력한다. 현재 작업 PC에서는 Git 제외 파일 `.local-pages-bootstrap-key.txt`에 있다.
2. 회사명·이름·이메일·12~128자 비밀번호를 본인이 입력한다.
3. 등록 후 해당 이메일·비밀번호로 로그인한다. 등록은 DB 제약으로 한 번만 가능하다.

키가 없거나 틀리면 등록할 수 없다. 이미 직원이 존재하면 관리자를 추가로 초기화할 수 없다. 관리자 등록 뒤 BOOTSTRAP_TOKEN Secret은 삭제해도 일반 로그인에 영향이 없다. 등록 키나 비밀번호를 저장소·채팅에 붙여넣지 않는다.

관리자는 직원·권한 메뉴에서 직원을 생성한다. 직원 임시 비밀번호는 최초 로그인 때 변경한다. 중지·역할 변경·비밀번호 변경 시 세션이 폐기된다. 유일한 관리자 계정의 분실 복구는 별도 운영 절차가 필요하다.

## 로컬 실행

Node 24 기준. 이 폴더를 작업 위치로 사용한다.

```powershell
npm ci
npm run build
npm run db:init
npm run api
```

http://127.0.0.1:8787 에서 실행한다. 로컬 D1/R2는 `.wrangler/pages-demo`에 유지한다. 기존 Workers 테스트 자료는 `.wrangler/demo`에 보존되어 있으며 삭제하지 않는다. 두 환경의 자료는 별개다.

`api` 실행 도구는 `wrangler.pages.local.jsonc`를 Git 제외 루트 `wrangler.jsonc`로 복사한다. 사용자 설정 파일이 이미 다르면 덮어쓰지 않는다. Pages CLI는 임의 config 경로를 지원하지 않아 로컬에서만 표준 파일명을 사용한다.

로컬 화면의 ‘데모 계정 만들기’에서 12자 이상 비밀번호를 정하면 admin@demo.local / staff@demo.local / other@demo.local 계정이 생성된다. 실제 Pages 도메인에서는 로컬 데모 등록을 표시하지 않고 서버도 차단한다. 기존 `.local-demo-login.txt`는 이전 Workers 로컬 환경의 값이므로 새 Pages 로컬 DB와 혼동하지 않는다.

Vite 개발은 API 실행 후 별도 터미널에서 `npm run dev`. Worker 원래 실행 방식은 `npm run api:worker`와 `wrangler.worker.jsonc`에 보존했다.

## 기능·보안

- 고객사별 로그인·직원 관리·세션 폐기·로그인 횟수 제한.
- 거래처·제품 수정/보관, 거래처별 단가, 서버 계산 및 견적 스냅샷.
- 견적 수정 버전·이력·반려·재승인, 공급자·로고·직인을 포함한 한글 PDF.
- 모의 발송, 주문 전환·전체 납품, 수동 입금 등록·승인.
- R2 비공개 파일 및 고객사별 인증 다운로드.

API 키·인증정보·테스트 자격증명·DB·파일 저장물은 Git 제외 대상이다. R2 자원 이름은 코드에서 읽는 Binding 이름 FILES와 다를 수 있다. 최초 관리자 등록 전만 Secret으로 실행할 수 있는 `/api/bootstrap/check`는 임의의 자체 점검 파일/메타데이터만 생성·확인·회수하며 기존 자료는 접근하지 않는다.

## 테스트

```powershell
npm test
python tests/database.py
```

Pages API 전체 회귀 검증은 새 로컬 저장 경로를 사용한다.

```powershell
npx wrangler d1 migrations apply DB --config wrangler.pages.local.jsonc --local --persist-to .wrangler/fresh-pages-test
# npm run api를 한 번 실행해 로컬 wrangler.jsonc가 생성된 상태에서
npx wrangler pages dev dist --port 8791 --persist-to .wrangler/fresh-pages-test
# 다른 터미널
$env:TEST_URL='http://127.0.0.1:8791'
node tests/phase2.mjs
```

`tests/pages.mjs`는 빈 DB와 .dev.vars의 BOOTSTRAP_TOKEN이 있는 별도 Pages 서버(기본 8794)에서 초기 등록·원자성·D1·R2·API/SPA 라우팅을 검증한다. `tests/pages-ui.mjs`는 별도의 빈 로컬 DB 서버 8793 및 autoflow.localhost 주소에서 최초 등록부터 로그인·D1·R2·로그아웃을 검증한다. 재실행은 기존 데이터를 지우지 말고 새 저장 경로를 사용한다.

브라우저는 Playwright 사용. 필요하면 `npx playwright install chromium`. 테스트 산출물·랜덤 테스트 비밀번호는 `test-results/`에 보관하고 Git에서 제외한다.

## 마이그레이션·원격 점검

원격 D1 `autoflow_db`에 0001~0006을 적용했다. 이후에도 Git 빌드는 DB 변경을 자동 실행하지 않는다. 원격 DB ID·계정을 정확하게 지정한 설정으로 `wrangler d1 migrations apply DB --config <원격설정> --remote`를 별도 실행해야 한다. 현재 작업 PC의 `.local-d1.remote.jsonc`는 Git 제외 대상이다.

`node scripts/check-pages.mjs`는 기존 운영 URL에서 최초 관리자 등록 전의 D1·R2 연결을 확인한다. 로컬 등록 키가 필요하며 파일 값은 출력하지 않는다. 관리자 등록 후에는 점검 경로가 차단되므로 일반 사용자 로그인으로 동작을 확인한다.

원격 백업·복구·대규모 부하 시험은 별도다. D1 Time Travel과 SQL 내보내기, R2 파일 백업을 함께 준비한다. 검증 없이 기존 고객 자료를 삭제하거나 공유 DB 전체를 되돌리지 않는다.

## 남은 제한

네이버 IMAP/SMTP·실제 AI·OCR·문자 연결은 미구현이다. Pages Functions는 Cron 예약 실행을 제공하지 않으므로 향후 메일 자동 수집은 별도 작업 Worker로 분리해야 한다. 현재 화면은 실제 외부 발송을 하지 않는다.

PBKDF2·PDF 생성의 실제 플랜 CPU 한도, 파일 검사/고아 객체 처리, 완전한 원자적 감사로그, 운영 복구·MFA 등 상용화 보완은 별도다. 상세 기능 이력은 04·05 문서, 현재 Pages 적용 결과는 `06_Pages_연결_및_검증.md`를 확인한다.

한글 PDF 폰트는 Google Fonts의 Nanum Gothic(SIL OFL), 라이선스는 public/fonts/OFL.txt.
