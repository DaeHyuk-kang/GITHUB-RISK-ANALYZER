# GitHub Risk Analyzer

GitHub 저장소의 활동성, 기여자 집중도, 이슈 및 Pull Request 관리 상태를 분석하여 프로젝트의 위험도를 점수로 산출해주는 대시보드 서비스입니다.

🔗 **https://githubriskanalyzer.site**

---

## 주요 기능

- **저장소 분석**: owner/repo 또는 GitHub URL 입력 시 비동기로 분석 후 위험도 점수 산출
- **실시간 진행률**: Socket.io 기반 실시간 분석 진행 상태 표시
- **이전 결과 비교**: 동일 저장소의 이전 분석 결과와 점수 변화량 표시
- **다중 분석 (Bulk)**: 최대 10개 저장소 동시 분석
- **분석 히스토리**: 저장소별 시간순 점수 변화 트렌드 차트
- **두 저장소 비교**: 두 저장소의 분석 결과 나란히 비교
- **스케줄 분석**: cron 표현식 기반 정기 자동 분석 (KST 시간대)
- **이메일 알림**: 점수가 설정한 임계값 이하로 떨어지면 이메일 자동 발송
- **Webhook 연동**: GitHub Push 이벤트 발생 시 자동 분석 트리거
- **회원 인증**: 이메일 인증 기반 회원가입, JWT 로그인

---

## 위험도 산정 기준

| 지표 | 가중치 | 설명 |
|------|--------|------|
| Activity | 30% | 최근 커밋 빈도 및 마지막 활동 시점 |
| Issue | 30% | 오픈 이슈 비율 |
| PR | 20% | Pull Request 병합 비율 |
| Contributor | 20% | 기여자 집중도 (Bus Factor) |

| 점수 | 등급 |
|------|------|
| 80 이상 | Low Risk |
| 60 ~ 79 | Medium Risk |
| 40 ~ 59 | High Risk |
| 40 미만 | Very High Risk |

---

## 기술 스택

- **Backend**: Node.js, Express.js 5
- **Queue**: BullMQ 5 + Redis
- **Database**: MySQL 8.0
- **Real-time**: Socket.io + Redis Pub/Sub
- **Auth**: JWT + bcryptjs
- **Infra**: AWS EC2, Docker Compose, nginx, Let's Encrypt
