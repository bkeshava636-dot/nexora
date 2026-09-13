import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics to track specific endpoint performance and error types
const errorRate = new Rate('custom_error_rate');
const serverErrorCount = new Counter('http_5xx_errors');
const clientErrorCount = new Counter('http_4xx_errors');

const tBranches = new Trend('trend_branches');
const tYears = new Trend('trend_years');
const tSemesters = new Trend('trend_semesters');
const tSubjects = new Trend('trend_subjects');
const tResources = new Trend('trend_resources');
const tQuickLinks = new Trend('trend_quick_links');

const BASE_URL = __ENV.API_BASE_URL || 'https://nexora-rp09.onrender.com';

// Realistic sample entity IDs retrieved directly from production database
const SAMPLE_BRANCH_IDS = [3, 4]; // AI, 1st Year (common)
const SAMPLE_YEAR_IDS = [3, 6];   // 2nd Year, 1st Year
const SAMPLE_SEMESTER_IDS = [2, 4, 23, 48]; // SEM 4, SEM 5, etc.
const SAMPLE_SUBJECT_IDS = [91, 281]; // Ability Enhancement Course, etc.

export const options = {
  thresholds: {
    'custom_error_rate': ['rate<0.05'], // errors must be under 5%
    'http_req_duration': ['p(95)<4500'], // 95% of requests under 4.5s
  },
};

export default function () {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Nexora-Performance-Test/1.0 (k6)',
  };

  // 1. Visit Home -> Browse Catalog Branches
  {
    const res = http.get(BASE_URL + '/api/branches', { headers, tags: { name: 'GET /api/branches' } });
    tBranches.add(res.timings.duration);
    const passed = check(res, {
      'branches status 200': (r) => r.status === 200,
      'branches returned array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch (_) {
          return false;
        }
      },
    });

    if (!passed) errorRate.add(1); else errorRate.add(0);
    if (res.status >= 500) serverErrorCount.add(1);
    if (res.status >= 400 && res.status < 500) clientErrorCount.add(1);
  }

  // Realistic think time (1 - 2 seconds)
  sleep(Math.random() * 1 + 1);

  // 2. Select a Branch -> Fetch Years for that branch
  const branchId = SAMPLE_BRANCH_IDS[Math.floor(Math.random() * SAMPLE_BRANCH_IDS.length)];
  {
    const res = http.get(BASE_URL + '/api/years?branchId=' + branchId, { headers, tags: { name: 'GET /api/years' } });
    tYears.add(res.timings.duration);
    const passed = check(res, {
      'years status 200': (r) => r.status === 200,
    });

    if (!passed) errorRate.add(1); else errorRate.add(0);
    if (res.status >= 500) serverErrorCount.add(1);
    if (res.status >= 400 && res.status < 500) clientErrorCount.add(1);
  }

  sleep(Math.random() * 1 + 1);

  // 3. Expand Year -> Fetch Semesters
  const yearId = SAMPLE_YEAR_IDS[Math.floor(Math.random() * SAMPLE_YEAR_IDS.length)];
  {
    const res = http.get(BASE_URL + '/api/semesters?yearId=' + yearId, { headers, tags: { name: 'GET /api/semesters' } });
    tSemesters.add(res.timings.duration);
    const passed = check(res, {
      'semesters status 200': (r) => r.status === 200,
    });

    if (!passed) errorRate.add(1); else errorRate.add(0);
    if (res.status >= 500) serverErrorCount.add(1);
    if (res.status >= 400 && res.status < 500) clientErrorCount.add(1);
  }

  sleep(Math.random() * 1 + 1);

  // 4. Select Semester -> Fetch Subjects
  const semesterId = SAMPLE_SEMESTER_IDS[Math.floor(Math.random() * SAMPLE_SEMESTER_IDS.length)];
  {
    const res = http.get(BASE_URL + '/api/subjects?semesterId=' + semesterId, { headers, tags: { name: 'GET /api/subjects' } });
    tSubjects.add(res.timings.duration);
    const passed = check(res, {
      'subjects status 200': (r) => r.status === 200,
    });

    if (!passed) errorRate.add(1); else errorRate.add(0);
    if (res.status >= 500) serverErrorCount.add(1);
    if (res.status >= 400 && res.status < 500) clientErrorCount.add(1);
  }

  sleep(Math.random() * 1 + 1);

  // 5. Open Subject Shelf -> Fetch Resources
  const subjectId = SAMPLE_SUBJECT_IDS[Math.floor(Math.random() * SAMPLE_SUBJECT_IDS.length)];
  {
    const res = http.get(BASE_URL + '/api/resources?subjectId=' + subjectId, { headers, tags: { name: 'GET /api/resources' } });
    tResources.add(res.timings.duration);
    const passed = check(res, {
      'resources status 200': (r) => r.status === 200,
    });

    if (!passed) errorRate.add(1); else errorRate.add(0);
    if (res.status >= 500) serverErrorCount.add(1);
    if (res.status >= 400 && res.status < 500) clientErrorCount.add(1);
  }

  // 6. Occasional action: 25% chance of checking Quick Links
  if (Math.random() < 0.25) {
    sleep(1);
    const res = http.get(BASE_URL + '/api/quick-links', { headers, tags: { name: 'GET /api/quick-links' } });
    tQuickLinks.add(res.timings.duration);
    const passed = check(res, {
      'quick links status 200': (r) => r.status === 200,
    });

    if (!passed) errorRate.add(1); else errorRate.add(0);
    if (res.status >= 500) serverErrorCount.add(1);
    if (res.status >= 400 && res.status < 500) clientErrorCount.add(1);
  }

  // Final think time before student begins another flow
  sleep(Math.random() * 2 + 1);
}