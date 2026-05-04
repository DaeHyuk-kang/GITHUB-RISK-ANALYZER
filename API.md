# 🚀 GitHub Risk Analyzer API Specification

**Base URL:** `http://localhost:3000/api`

### 🔹 Job Status 정의

- PENDING: 큐에 등록되어 대기 중
- PROCESSING: Worker에서 분석 진행 중
- COMPLETED: 분석 완료
- FAILED: 분석 실패

## 1. 분석 요청 (Analysis)

### 📥 단일 저장소 분석 요청
GitHub 저장소 분석 작업을 큐에 추가합니다.

- **URL:** `/analyze`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "repo": "nodejs/node"
  }
  ```
- **Response (202 Accepted):**
  ```json
  {
    "success": true,
    "jobId": "123",
    "status": "PENDING"
  }
  ```

### 📥 대량 저장소 분석 요청
여러 개의 저장소를 한 번에 분석 요청합니다.

- **URL:** `/analyze/bulk`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "repos": ["facebook/react", "vuejs/core"]
  }
  ```
- **Response (202 Accepted):**
  ```json
  {
    "success": true,
    "jobs": [
      { "repo": "facebook/react", "jobId": "124", "status": "PENDING" },
      { "repo": "vuejs/core", "jobId": "125", "status": "PENDING" }
    ]
  }
  ```

---

## 2. 작업 상태 및 결과 (Jobs)

### 🔍 작업 상태 조회
특정 분석 작업의 진행률 및 최종 결과를 확인합니다.

- **URL:** `/jobs/:jobId`
- **Method:** `GET`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "jobId": "123",
    "status": "COMPLETED",
    "progress": 100,
    "result": {
      "name": "node",
      "risk_score": 15,
      "risk_level": "LOW",
      "stars": 102450,
      "detail_scores": {
        "activity": 90,
        "contributor": 85,
        "issue": 95,
        "pr": 88
      }
    },
    "error": null
  }
  ```

### 🔄 작업 재시도
실패한 작업을 다시 실행합니다.

- **URL:** `/jobs/:jobId/retry`
- **Method:** `POST`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Job retried successfully",
    "jobId": "123"
  }
  ```

---

## 3. 분석 결과 조회 (Results)

### 🔍 최근 분석 리스트 조회
최근 성공한 분석 리스트 10개를 조회합니다.

- **URL:** `/analyses/recent`
- **Method:** `GET`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": 1,
        "repo": "nodejs/node",
        "risk_score": 15,
        "status": "COMPLETED",
        "created_at": "2026-04-17T00:00:00.000Z"
      }
    ]
  }
  ```

### 🔍 특정 저장소 결과 조회
특정 저장소의 가장 최신 분석 결과 및 이전 점수와의 차이를 조회합니다.

- **URL:** `/analyses/repo/:owner/:repo`
- **Method:** `GET`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": 5,
      "repo_name": "nodejs/node",
      "risk_score": 15,
      "previous_score": 20,
      "score_diff": -5,
      "result_data": { ... }
    }
  }
  ```

### ⚖️ 저장소 비교
두 개의 저장소 분석 결과를 비교합니다.

- **URL:** `/analyses/compare`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "repoA": "nodejs/node",
    "repoB": "expressjs/express"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "repoA": { "name": "nodejs/node", "score": 15, ... },
      "repoB": { "name": "expressjs/express", "score": 25, ... }
    }
  }
  ```

---

## 4. 웹훅 (Webhook)

### ⚓ GitHub 웹훅 수신
GitHub에서 발생하는 이벤트를 실시간으로 수신하여 분석을 트리거합니다.

- **URL:** `/github`
- **Method:** `POST`
- **설정:** GitHub Repository -> Settings -> Webhooks에서 `Payload URL`로 등록.

---

## 🛠 공통 에러 응답
- **400 Bad Request:** 잘못된 입력 형식 (예: `owner/repo` 형식이 아님)
- **404 Not Found:** 존재하지 않는 `jobId` 요청
- **429 Too Many Requests:** 짧은 시간 내 너무 많은 요청 (Rate Limit 적용)
- **500 Internal Server Error:** 서버 내부 오류
