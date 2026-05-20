# GitHub Risk Analyzer - 최종 보고서

비동기 처리와 이벤트 기반 구조를 활용한 GitHub 저장소 분석 서비스

---

## 1. 프로젝트 개요

**GitHub Risk Analyzer**는 GitHub 저장소의 활동 데이터를 수집·분석하여 프로젝트의 건강 상태와 리스크를 한눈에 파악할 수 있도록 돕는 대시보드형 서비스다.

- **배포 URL**: https://githubriskanalyzer.site
- **배포 환경**: AWS EC2 (ap-northeast-2), Docker Compose, nginx + Let's Encrypt

---

## 2. 프로젝트 배경 및 목표

GitHub는 소프트웨어 프로젝트의 핵심 데이터를 관리하는 플랫폼이지만, 프로젝트의 전체적인 상태를 파악하려면 여러 화면을 이동하며 데이터를 확인해야 하는 번거로움이 있다. 특히 다수의 저장소를 관리하는 경우 효율성이 크게 떨어진다.

본 프로젝트는 이러한 데이터를 통합 수집하고, **비동기 분산 처리 아키텍처**를 통해 서버 부하를 최소화하면서도 사용자에게 직관적인 **위험도 점수(Risk Score)**와 실시간 대시보드를 제공하는 것을 목표로 한다.

### 목표
1. **데이터 자동 수집**: GitHub REST API를 통해 주요 활동 데이터를 자동으로 수집한다.
2. **비동기 분산 처리**: BullMQ와 Redis를 활용하여 API 서버와 분석 워커(Worker)를 분리, 시스템 안정성을 확보한다.
3. **데이터 영구 보존**: 분석된 모든 이력과 결과를 MySQL 데이터베이스에 저장하여 관리한다.
4. **실시간 상태 중계**: Redis Pub/Sub과 Socket.io를 결합하여 프로세스 간 통신 문제를 해결하고 실시간 진행률을 제공한다.
5. **사용자별 데이터 격리**: JWT 기반 인증을 통해 사용자별로 분석 이력과 스케줄을 완전히 분리한다.
6. **확장 가능한 구조**: 대량 요청 환경에서도 안정적으로 동작하는 구조 설계

---

## 3. 기능 정의

### 3-1. 핵심 기능
1. **GitHub 저장소 분석 및 DB 기록**
   - 저장소명(owner/repo) 또는 GitHub URL 입력 시 분석 요청을 생성하고 MySQL에 `PENDING` 상태로 우선 기록한다.
2. **프로세스 분리형 비동기 처리**
   - 분석 로직은 백그라운드 Worker에서 독립적으로 수행되며, 완료 시 DB 상태를 `COMPLETED`로 업데이트한다.
3. **Redis Pub/Sub 기반 실시간 업데이트**
   - 워커가 분석 단계별 진행 상황을 Redis 채널에 발행(Publish)하면, 서버가 이를 수신(Subscribe)하여 클라이언트에 소켓으로 즉시 전달한다.
4. **결과 시각화 대시보드**
   - 최종 산출된 Risk Score, 위험 수준(Low/Medium/High/Very High), 4개 세부 지표를 시각적으로 제공한다.
5. **이전 분석과의 비교**
   - 동일 저장소의 이전 분석 결과와 점수 변화량(score_diff)을 함께 표시한다.

### 3-2. 확장 기능
1. **다중 저장소 분석 (Bulk Analysis)**: 배열 형태의 저장소 목록을 한 번에 분석 큐에 추가한다. (최대 10개)
2. **이벤트 기반 자동 분석 (Webhook)**: GitHub Webhook을 연동하여 코드 Push 등 이벤트 발생 시 자동으로 분석을 트리거한다.
3. **최근 분석 이력 조회**: DB에 저장된 최근 10개의 분석 결과를 메인 화면에서 바로 확인할 수 있다. (사용자별 격리)
4. **저장소 분석 히스토리 및 트렌드 차트**: 특정 저장소의 시간별 점수 변화를 차트로 시각화한다.
5. **두 저장소 비교**: 두 저장소의 분석 결과를 나란히 비교한다.

### 3-3. 사용자 및 알림 기능
1. **회원가입 / 이메일 인증 / 로그인**: 이메일 인증 기반 회원가입, JWT(7일 유효) 인증
2. **스케줄 분석**: cron 패턴 기반 정기 자동 분석 (BullMQ v5 Job Scheduler, KST 시간대)
3. **이메일 알림 구독**: 저장소별 임계값 설정, 점수가 임계값 이하로 떨어지면 이메일 자동 발송
4. **Slack 알림**: 글로벌 임계값 기준으로 Slack Webhook을 통한 알림
5. **실패 작업 재시도**: 실패한 분석 작업을 수동으로 재시도

---

## 3-4. 사용자 기능 상세

### 회원가입 플로우
1. 이메일 + 비밀번호 입력 후 **인증 이메일 발송** 버튼 클릭
2. 서버가 UUID 기반 `verification_token` 생성 후 DB 저장, 인증 링크를 이메일로 발송
3. 프론트엔드가 `GET /api/auth/check-verified` 를 3초마다 폴링
4. 사용자가 이메일 링크 클릭 → `email_verified = 1`, `verification_token = NULL` 처리
5. 폴링에서 `verified: true` 확인 → **회원가입 완료** 버튼 활성화
6. 완료 버튼 클릭 시 자동 로그인 처리

> 미인증 상태로 동일 이메일 재가입 시도 시: 비밀번호 업데이트 후 인증 이메일 재발송 (중복 계정 생성 방지)

### 로그인 및 인증
- **JWT**: 로그인 성공 시 `{ token, email, userId }` 반환, 토큰 유효기간 7일
- **토큰 저장**: `localStorage`의 `gra_token`, `gra_email`, `gra_user_id`에 저장
- **인증 헤더**: 모든 보호된 API 요청에 `Authorization: Bearer <token>` 자동 첨부
- **401 처리**: 토큰 만료 또는 유효하지 않은 경우 자동 로그아웃 후 로그인 화면 전환
- **레이트 리밋**: 인증 API(register/login)에 IP 기반 분당 5회 제한 (Redis INCR)

### 비밀번호 보안
- bcryptjs를 사용한 단방향 해시 저장 (평문 저장 없음)
- 비밀번호 최소 6자 이상 유효성 검사

### 사용자별 데이터 격리
- **분석 이력**: `analyses.user_id` 기준으로 본인 데이터만 조회
- **스케줄**: `scheduled_repos.user_id` 기준으로 사용자별 독립 관리
- **소켓**: 로그인 후 `socket.emit("join-user", userId)`로 `user:${userId}` 룸 가입, 분석 완료 이벤트를 해당 사용자에게만 전송
- **Job 소유권 검증**: `GET /api/jobs/:id` 호출 시 해당 job이 요청한 사용자의 것인지 확인, 타인의 jobId로 조회 불가

### 스케줄 분석
- cron 표현식으로 정기 자동 분석 등록 (예: `0 9 * * *` → 매일 오전 9시 KST)
- UI에서 날짜/시간 픽커로 cron 표현식 자동 생성 지원
- 서버 재시작 시 DB에 저장된 스케줄을 자동으로 복원 (`restoreSchedules`)
- 스케줄 작업은 `userId`를 포함하여 분석 결과가 올바른 사용자에 귀속

### 알림 구독
- 저장소별로 임계값(기본 60점) 설정
- 분석 완료 후 `risk_score < threshold` 이면 구독자에게 이메일 자동 발송 (병렬 처리)
- 동일 저장소를 구독한 모든 사용자에게 각자의 임계값 기준으로 개별 발송
- Slack은 환경변수 `SLACK_WEBHOOK_URL` 설정 시 글로벌 임계값 기준으로 추가 알림

---

## 4. 분석 지표 설계

| 지표 | 설명 | 가중치 |
|------|------|--------|
| **Activity Score** | 최근 커밋 빈도 및 마지막 활동 시점 평가 | 30% |
| **Issue Score** | 오픈 이슈 비율 및 관리 상태 평가 | 30% |
| **PR Score** | Pull Request 병합(Merge) 비율 및 협업 효율 평가 | 20% |
| **Contributor Score** | 기여자 수 및 특정 인원 기여 편중도 평가 | 20% |

**Risk Score = Activity × 0.3 + Issue × 0.3 + PR × 0.2 + Contributor × 0.2**

| 점수 범위 | 위험 수준 |
|-----------|-----------|
| 80 이상 | Low Risk |
| 60 ~ 79 | Medium Risk |
| 40 ~ 59 | High Risk |
| 40 미만 | Very High Risk |

---

## 5. 시스템 아키텍처

```
[Browser]
    │  HTTPS (443)
    ▼
[nginx]  ─────────────────────────────────────────
    │  HTTP (3000)                               │
    ▼                                            │
[API Server (Express)]                   [Worker (Node.js)]
    │  Socket.io (실시간)                        │
    │  REST API                                  │
    │                                            │
    ├── Redis Pub/Sub ◄── 진행상황 발행 ──────────┤
    │                                            │
    ├── BullMQ Queue ───── 작업 추가 ────────────►│
    │                                            │
    └── MySQL ◄────────────────── DB 업데이트 ───┘
```

- **Frontend**: Vanilla JS 기반 대시보드 (Socket.io 클라이언트 + Polling Fallback)
- **API Server**: Express.js 5 (분석 요청 접수, DB 관리, 소켓 중계, 작업 상태 조회)
- **Worker**: 독립된 Node.js 프로세스 (데이터 수집 및 계산, Redis 메시지 발행, BullMQ 작업 처리)
- **Message Broker**: Redis (BullMQ 작업 큐 + Pub/Sub 메시지 버스)
- **Database**: MySQL 8.0 (분석 이력 및 결과 영구 저장)
- **Reverse Proxy**: nginx (HTTPS 종단, WebSocket 프록시)
- **Infra**: AWS EC2 t3.micro, Docker Compose, AWS ECR

---

## 6. API 명세

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/register` | 회원가입 (이메일 인증 발송) |
| GET | `/api/auth/verify-email?token=` | 이메일 인증 처리 |
| GET | `/api/auth/check-verified?email=` | 인증 완료 여부 폴링 |
| POST | `/api/auth/login` | 로그인 (JWT 발급) |

### 분석
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/analyze` | 단일 저장소 분석 요청 |
| POST | `/api/analyze/bulk` | 다중 저장소 분석 요청 (최대 10개) |
| GET | `/api/jobs/:id` | 작업 진행 상태 조회 (Polling용) |
| POST | `/api/jobs/:id/retry` | 실패 작업 재시도 |
| GET | `/api/analyses/recent` | 최근 분석 결과 10개 조회 |
| GET | `/api/analyses/repo/:owner/:repo` | 특정 저장소 최신 결과 조회 |
| GET | `/api/analyses/repo/:owner/:repo/history` | 특정 저장소 분석 히스토리 |
| POST | `/api/analyses/compare` | 두 저장소 결과 비교 |

### 스케줄
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/schedules` | 내 스케줄 목록 조회 |
| POST | `/api/schedules` | 스케줄 추가 |
| DELETE | `/api/schedules/:owner/:repo` | 스케줄 삭제 |

### 알림 구독
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/alerts` | 내 알림 구독 목록 |
| POST | `/api/alerts` | 알림 구독 등록 |
| GET | `/api/alerts/:owner/:repo` | 특정 저장소 구독 정보 조회 |
| DELETE | `/api/alerts/:owner/:repo` | 알림 구독 해제 |

### 기타
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/webhooks/github` | GitHub Webhook 수신 (자동 분석 트리거) |

---

## 7. 기술 스택

| 분류 | 기술 |
|------|------|
| Runtime | Node.js |
| Framework | Express.js 5 |
| Database | MySQL 8.0 (mysql2) |
| Queue / Async | BullMQ 5 + Redis (ioredis) |
| Real-time | Socket.io + Redis Pub/Sub |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Email | Nodemailer |
| External API | GitHub REST API (Axios, 지수 백오프 재시도) |
| Logging | Winston + DailyRotateFile |
| UI | Vanilla HTML / CSS / JavaScript |
| Containerization | Docker, Docker Compose |
| Infra | AWS EC2, AWS ECR |
| Reverse Proxy | nginx + Let's Encrypt (Certbot) |
| AI 협업 도구 | Claude Code (Anthropic) |

---

## 8. 주요 설계 결정 사항

### Redis Pub/Sub을 통한 프로세스 간 통신
API 서버와 Worker는 별도 프로세스로 분리되어 있어 Socket.io를 직접 공유할 수 없다. Worker가 Redis `job-updates` 채널에 진행 상황을 발행하고, 서버가 이를 구독하여 Socket.io로 클라이언트에 전달하는 구조를 채택했다.

### BullMQ v5 Job Scheduler (스케줄 분석)
BullMQ v4의 `queue.add({ repeat })` 방식 대신 v5의 `upsertJobScheduler` API를 사용하여 스케줄을 관리한다. KST 시간대(`Asia/Seoul`)를 명시하여 cron 표현식이 한국 시간 기준으로 동작한다.

### IP 기반 레이트 리밋 + 저장소 분산 락
- **IP 레이트 리밋**: Redis INCR로 인증 API는 분당 5회, 분석 API는 별도 제한
- **저장소 분산 락**: 동일 저장소에 동시 분석 요청 시 Redis SET NX EX 30으로 락을 획득한 첫 번째 요청만 처리

### 사용자별 데이터 격리
`analyses`, `scheduled_repos` 테이블 모두 `user_id` 컬럼으로 사용자별 데이터를 완전히 분리한다. Socket.io도 `user:${userId}` 룸 기반으로 해당 사용자에게만 완료 이벤트를 전달한다.

---

## 9. DB 스키마

```sql
users (id, email, password_hash, email_verified, verification_token, created_at)
analyses (id, repo_name, user_id, status, risk_score, risk_level, result_data, created_at)
scheduled_repos (id, user_id, repo_name, cron_pattern, created_at)
alert_subscriptions (id, user_id, repo_name, threshold, created_at)
```

---

## 10. 배포 구조

```
EC2 (Amazon Linux 2023)
├── nginx (포트 80/443, Let's Encrypt SSL)
└── Docker Compose
    ├── server   (ECR 이미지, 포트 3000)
    ├── worker   (ECR 이미지, node src/worker.js)
    ├── db       (MySQL 8.0)
    └── redis    (Redis 7-alpine)
```

**배포 흐름**: 로컬 빌드 → AWS ECR 푸시 (`deploy.sh`) → EC2에서 `docker compose pull && up -d`
