# GitHub Risk Analyzer

GitHub 리포지토리의 활동성, 기여자 집중도, 이슈 및 Pull Request 관리 상태를 분석하여 해당 프로젝트의 '위험도'를 점수로 산출해주는 도구입니다.

## 🚀 주요 기능

- **활동성 분석**: 최근 커밋 날짜를 기준으로 프로젝트가 얼마나 활발하게 유지보수되고 있는지 확인합니다.
- **기여자 분석**: 특정 기여자에게 프로젝트 기여가 과도하게 집중되어 있는지(Bus Factor) 분석합니다.
- **이슈 관리 분석**: 전체 이슈 중 해결되지 않은 이슈의 비율을 계산합니다.
- **Pull Request 분석**: 생성된 PR 중 실제로 머지(Merge)된 비율을 분석하여 코드 통합의 효율성을 측정합니다.
- **종합 위험도 산출**: 위 지표들을 종합하여 'Low Risk'부터 'Very High Risk'까지의 등급을 제공합니다.

## 🛠 기술 스택

- **Backend**: Node.js, Express
- **API**: GitHub REST API (Axios)
- **Frontend**: HTML, JavaScript (Vanilla JS)

## 📦 설치 및 실행 방법

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd github-risk-analyzer
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정 (선택 사항)**
   GitHub API의 Rate Limit을 피하기 위해 개인 액세스 토큰(Personal Access Token) 사용을 권장합니다.
   ```bash
   export GITHUB_TOKEN=your_github_token_here
   ```

4. **서버 실행**
   ```bash
   npm start
   ```
   서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 🖥 사용 방법

### 웹 인터페이스
브라우저에서 `http://localhost:3000`에 접속한 후, 분석하고자 하는 GitHub 리포지토리의 경로(예: `facebook/react`)를 입력합니다.

### API 엔드포인트
직접 API를 호출하여 분석 결과를 JSON 형태로 받아볼 수 있습니다.

- **URL**: `/analyze`
- **Method**: `GET`
- **Query Parameter**: `repo=owner/repo_name`
- **Example**: `http://localhost:3000/analyze?repo=nodejs/node`

## 📊 위험도 산정 기준

- **Activity (30%)**: 최근 커밋이 7일 이내면 만점, 기간이 길어질수록 감점.
- **Contributor (20%)**: 상위 기여자의 기여 비중이 낮을수록(분산될수록) 높은 점수.
- **Issue (30%)**: 오픈 이슈 비율이 낮을수록 높은 점수.
- **PR (20%)**: PR 머지 비율이 높을수록 높은 점수.

---
이 프로젝트는 교육 및 참고용으로 제작되었습니다.
# GITHUB-RISK-ANALYZER
