import { db, semesterQps } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "./logger";

export interface SeedQpItem {
  examYear: string;
  semester: string;
  department: string;
  title: string;
  downloadUrl: string;
  isPublished: boolean;
  displayOrder: number;
}

export const ALL_SEMESTER_QPS: SeedQpItem[] = [
  {
    "examYear": "2026",
    "semester": "7th Semester",
    "department": "ME",
    "title": "Seventh Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ME1.zip",
    "isPublished": true,
    "displayOrder": 1
  },
  {
    "examYear": "2026",
    "semester": "7th Semester",
    "department": "EEE",
    "title": "Seventh Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/EEE1.zip",
    "isPublished": true,
    "displayOrder": 2
  },
  {
    "examYear": "2026",
    "semester": "7th Semester",
    "department": "ECE",
    "title": "Seventh Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ECE1.zip",
    "isPublished": true,
    "displayOrder": 3
  },
  {
    "examYear": "2026",
    "semester": "7th Semester",
    "department": "Civil (CV)",
    "title": "Seventh Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CV1.zip",
    "isPublished": true,
    "displayOrder": 4
  },
  {
    "examYear": "2026",
    "semester": "7th Semester",
    "department": "CSE / AIML / AI / DS",
    "title": "Seventh Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CSE_AIML-AI-DS.zip",
    "isPublished": true,
    "displayOrder": 5
  },
  {
    "examYear": "2026",
    "semester": "5th Semester",
    "department": "Common Course",
    "title": "Fifth Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/COMMON-COURSES5.zip",
    "isPublished": true,
    "displayOrder": 6
  },
  {
    "examYear": "2026",
    "semester": "5th Semester",
    "department": "CSE / AIML / AI / DS",
    "title": "Fifth Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CSE-AIML-AI-DS5.zip",
    "isPublished": true,
    "displayOrder": 7
  },
  {
    "examYear": "2026",
    "semester": "5th Semester",
    "department": "Civil (CV)",
    "title": "Fifth Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CV5.zip",
    "isPublished": true,
    "displayOrder": 8
  },
  {
    "examYear": "2026",
    "semester": "5th Semester",
    "department": "ECE",
    "title": "Fifth Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ECE5.zip",
    "isPublished": true,
    "displayOrder": 9
  },
  {
    "examYear": "2026",
    "semester": "5th Semester",
    "department": "EEE",
    "title": "Fifth Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/EEE5.zip",
    "isPublished": true,
    "displayOrder": 10
  },
  {
    "examYear": "2026",
    "semester": "5th Semester",
    "department": "ME",
    "title": "Fifth Semester B.E. Degree Examinations (Dec 2025 / Jan 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ME5.zip",
    "isPublished": true,
    "displayOrder": 11
  },
  {
    "examYear": "2026",
    "semester": "3rd Semester",
    "department": "ME",
    "title": "Third Semester B.E. Degree Examinations (Jan / Feb 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-iii-me-2026.zip",
    "isPublished": true,
    "displayOrder": 12
  },
  {
    "examYear": "2026",
    "semester": "3rd Semester",
    "department": "EEE",
    "title": "Third Semester B.E. Degree Examinations (Jan / Feb 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-iii-eee-2026.zip",
    "isPublished": true,
    "displayOrder": 13
  },
  {
    "examYear": "2026",
    "semester": "3rd Semester",
    "department": "ECE",
    "title": "Third Semester B.E. Degree Examinations (Jan / Feb 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-iii-ece-2026.zip",
    "isPublished": true,
    "displayOrder": 14
  },
  {
    "examYear": "2026",
    "semester": "3rd Semester",
    "department": "Civil (CV)",
    "title": "Third Semester B.E. Degree Examinations (Jan / Feb 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-iii-cv-2026.zip",
    "isPublished": true,
    "displayOrder": 15
  },
  {
    "examYear": "2026",
    "semester": "3rd Semester",
    "department": "CSE / AIML / AI / DS",
    "title": "Third Semester B.E. Degree Examinations (Jan / Feb 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-iii-cse-ai-2026.zip",
    "isPublished": true,
    "displayOrder": 16
  },
  {
    "examYear": "2026",
    "semester": "3rd Semester",
    "department": "Common Course",
    "title": "Third Semester B.E. Degree Examinations (Jan / Feb 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-iii-common-2026.zip",
    "isPublished": true,
    "displayOrder": 17
  },
  {
    "examYear": "2026",
    "semester": "1st Semester",
    "department": "All Branches (2026 Batch)",
    "title": "First Semester B.E. Degree Examinations (Feb 2026)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/first-semester-be-2026-batch.zip",
    "isPublished": true,
    "displayOrder": 18
  },
  {
    "examYear": "2025",
    "semester": "8th Semester",
    "department": "Civil",
    "title": "Eighth Semester B.E. Degree Examinations (Apr / May 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/1-1-21CV81-April-May 2025.pdf",
    "isPublished": true,
    "displayOrder": 19
  },
  {
    "examYear": "2025",
    "semester": "8th Semester",
    "department": "ECE",
    "title": "Eighth Semester B.E. Degree Examinations (Apr / May 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/1-1-21EC81-April-May 2025.pdf",
    "isPublished": true,
    "displayOrder": 20
  },
  {
    "examYear": "2025",
    "semester": "8th Semester",
    "department": "EEE",
    "title": "Eighth Semester B.E. Degree Examinations (Apr / May 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/1-1-21EE81-April-May 2025.pdf",
    "isPublished": true,
    "displayOrder": 21
  },
  {
    "examYear": "2025",
    "semester": "8th Semester",
    "department": "CSE",
    "title": "Eighth Semester B.E. Degree Examinations (Apr / May 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/2-1-21CS81-April-May 2025.pdf",
    "isPublished": true,
    "displayOrder": 22
  },
  {
    "examYear": "2025",
    "semester": "8th Semester",
    "department": "AI",
    "title": "Eighth Semester B.E. Degree Examinations (Apr / May 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/2-1-21AI81-April-May 2025.pdf",
    "isPublished": true,
    "displayOrder": 23
  },
  {
    "examYear": "2025",
    "semester": "8th Semester",
    "department": "ME",
    "title": "Eighth Semester B.E. Degree Examinations (Apr / May 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/2-21ME81-April-May 2025.pdf",
    "isPublished": true,
    "displayOrder": 24
  },
  {
    "examYear": "2025",
    "semester": "7th Semester",
    "department": "CSE / AIML",
    "title": "Seventh Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-7th-sem-cse-aiml.zip",
    "isPublished": true,
    "displayOrder": 25
  },
  {
    "examYear": "2025",
    "semester": "7th Semester",
    "department": "ECE",
    "title": "Seventh Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-7th-sem-ece.zip",
    "isPublished": true,
    "displayOrder": 26
  },
  {
    "examYear": "2025",
    "semester": "7th Semester",
    "department": "EEE",
    "title": "Seventh Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-7th-sem-eee.zip",
    "isPublished": true,
    "displayOrder": 27
  },
  {
    "examYear": "2025",
    "semester": "7th Semester",
    "department": "ME",
    "title": "Seventh Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-7th-sem-me.zip",
    "isPublished": true,
    "displayOrder": 28
  },
  {
    "examYear": "2025",
    "semester": "7th Semester",
    "department": "Civil (CVL)",
    "title": "Seventh Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-7th-sem-civil.zip",
    "isPublished": true,
    "displayOrder": 29
  },
  {
    "examYear": "2025",
    "semester": "6th Semester",
    "department": "Civil",
    "title": "Sixth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-vi_civil.zip",
    "isPublished": true,
    "displayOrder": 30
  },
  {
    "examYear": "2025",
    "semester": "6th Semester",
    "department": "CSE / AIML / CA / CD",
    "title": "Sixth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-vi_cse-aiml-ca-cd.zip",
    "isPublished": true,
    "displayOrder": 31
  },
  {
    "examYear": "2025",
    "semester": "6th Semester",
    "department": "ECE",
    "title": "Sixth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-vi_ece.zip",
    "isPublished": true,
    "displayOrder": 32
  },
  {
    "examYear": "2025",
    "semester": "6th Semester",
    "department": "EEE",
    "title": "Sixth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-vi_eee.zip",
    "isPublished": true,
    "displayOrder": 33
  },
  {
    "examYear": "2025",
    "semester": "6th Semester",
    "department": "ME",
    "title": "Sixth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-vi_me.zip",
    "isPublished": true,
    "displayOrder": 34
  },
  {
    "examYear": "2025",
    "semester": "6th Semester",
    "department": "Research Methodology & IPR",
    "title": "Sixth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/be-vi_cv-1-1-22rm67-june-july2025.pdf",
    "isPublished": true,
    "displayOrder": 35
  },
  {
    "examYear": "2025",
    "semester": "5th Semester",
    "department": "CSE / AIML / CS-DS / CS-AI",
    "title": "Fifth Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-5th-sem-cse-aiml-ai-ds.zip",
    "isPublished": true,
    "displayOrder": 36
  },
  {
    "examYear": "2025",
    "semester": "5th Semester",
    "department": "ECE",
    "title": "Fifth Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-5th-sem-ece.zip",
    "isPublished": true,
    "displayOrder": 37
  },
  {
    "examYear": "2025",
    "semester": "5th Semester",
    "department": "EEE",
    "title": "Fifth Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-5th-sem-eee.zip",
    "isPublished": true,
    "displayOrder": 38
  },
  {
    "examYear": "2025",
    "semester": "5th Semester",
    "department": "ME",
    "title": "Fifth Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-5th-sem-me.zip",
    "isPublished": true,
    "displayOrder": 39
  },
  {
    "examYear": "2025",
    "semester": "5th Semester",
    "department": "Civil",
    "title": "Fifth Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-5th-sem-civil.zip",
    "isPublished": true,
    "displayOrder": 40
  },
  {
    "examYear": "2025",
    "semester": "5th Semester",
    "department": "Common Courses",
    "title": "Fifth Semester B.E. Degree Examinations (Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-5th-sem-common-courses.zip",
    "isPublished": true,
    "displayOrder": 41
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "CSE / AI / CA / CD",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be_iv_cse-ai-ca-cd.zip",
    "isPublished": true,
    "displayOrder": 42
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "Civil",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be_iv_civil.zip",
    "isPublished": true,
    "displayOrder": 43
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "ECE",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be_iv_ece.zip",
    "isPublished": true,
    "displayOrder": 44
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "EEE",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be_iv_eee.zip",
    "isPublished": true,
    "displayOrder": 45
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "Maths",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be_iv_maths.zip",
    "isPublished": true,
    "displayOrder": 46
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "ME",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be_iv_me.zip",
    "isPublished": true,
    "displayOrder": 47
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "Biology for Engineers",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/1-1-22BB31-41-June-July 2025.pdf",
    "isPublished": true,
    "displayOrder": 48
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "Professional Skills",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/22PSW47-June-July 2025.pdf",
    "isPublished": true,
    "displayOrder": 49
  },
  {
    "examYear": "2025",
    "semester": "4th Semester",
    "department": "Universal Human Values",
    "title": "Fourth Semester B.E. Degree Examinations (Jun / Jul 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/22UH48-June-July 2025.pdf",
    "isPublished": true,
    "displayOrder": 50
  },
  {
    "examYear": "2025",
    "semester": "3rd Semester",
    "department": "B.E. I & II Semester",
    "title": "I Year & III sem Previous Year Question Papers (Jan / Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-1-2-semester.zip",
    "isPublished": true,
    "displayOrder": 51
  },
  {
    "examYear": "2025",
    "semester": "3rd Semester",
    "department": "III Sem Civil",
    "title": "I Year & III sem Previous Year Question Papers (Jan / Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-3rd-year-civil.zip",
    "isPublished": true,
    "displayOrder": 52
  },
  {
    "examYear": "2025",
    "semester": "3rd Semester",
    "department": "III Sem CSE / AIML / AI / DS",
    "title": "I Year & III sem Previous Year Question Papers (Jan / Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-3rd-year-cse-aiml-ai-ds.zip",
    "isPublished": true,
    "displayOrder": 53
  },
  {
    "examYear": "2025",
    "semester": "3rd Semester",
    "department": "III Sem ECE",
    "title": "I Year & III sem Previous Year Question Papers (Jan / Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-3rd-year-ece.zip",
    "isPublished": true,
    "displayOrder": 54
  },
  {
    "examYear": "2025",
    "semester": "3rd Semester",
    "department": "III Sem EEE",
    "title": "I Year & III sem Previous Year Question Papers (Jan / Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-3rd-year-eee.zip",
    "isPublished": true,
    "displayOrder": 55
  },
  {
    "examYear": "2025",
    "semester": "3rd Semester",
    "department": "III Sem ME",
    "title": "I Year & III sem Previous Year Question Papers (Jan / Feb 2025)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-3rd-year-me.zip",
    "isPublished": true,
    "displayOrder": 56
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "AI",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-sixth-AI.zip",
    "isPublished": true,
    "displayOrder": 57
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "CS",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-sixth-CS.zip",
    "isPublished": true,
    "displayOrder": 58
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "EE",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-sixth-EE.zip",
    "isPublished": true,
    "displayOrder": 59
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "EC",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-sixth-EC.zip",
    "isPublished": true,
    "displayOrder": 60
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "CV",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-sixth-CV.zip",
    "isPublished": true,
    "displayOrder": 61
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "ME",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/be-sixth-ME.zip",
    "isPublished": true,
    "displayOrder": 62
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "2021 AI",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/six-sem-AIML.zip",
    "isPublished": true,
    "displayOrder": 63
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "2021 CS",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/six-sem-CSE.zip",
    "isPublished": true,
    "displayOrder": 64
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "2021 CV",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/six-sem-CV.zip",
    "isPublished": true,
    "displayOrder": 65
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "2021 ECE",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/six-sem-ECE.zip",
    "isPublished": true,
    "displayOrder": 66
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "2021 EEE",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/six-sem-EEE.zip",
    "isPublished": true,
    "displayOrder": 67
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "2021 ME",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/six-sem-ME.zip",
    "isPublished": true,
    "displayOrder": 68
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "21EC61",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21EC61.pdf",
    "isPublished": true,
    "displayOrder": 69
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "21CS654",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21CS654.pdf",
    "isPublished": true,
    "displayOrder": 70
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "21EC652",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21EC652.pdf",
    "isPublished": true,
    "displayOrder": 71
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "21EC641",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21EC641.pdf",
    "isPublished": true,
    "displayOrder": 72
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "21EC63",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21EC63.pdf",
    "isPublished": true,
    "displayOrder": 73
  },
  {
    "examYear": "2024",
    "semester": "6th Semester",
    "department": "21EC62",
    "title": "Sixth Semester Examinations (Regular & 2021 Scheme) (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21EC62.pdf",
    "isPublished": true,
    "displayOrder": 74
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "ADA",
    "title": "Fifth Semester B.E. Degree Examinations (Apr / May 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21-ADA.zip",
    "isPublished": true,
    "displayOrder": 75
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "MECH",
    "title": "Fifth Semester B.E. Degree Examinations (Apr / May 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21-MECH.zip",
    "isPublished": true,
    "displayOrder": 76
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "EEE",
    "title": "Fifth Semester B.E. Degree Examinations (Apr / May 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21-EEE.zip",
    "isPublished": true,
    "displayOrder": 77
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "ENV",
    "title": "Fifth Semester B.E. Degree Examinations (Apr / May 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21-ENV.zip",
    "isPublished": true,
    "displayOrder": 78
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "CSE",
    "title": "Fifth Semester B.E. Degree Examinations (Apr / May 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21-CSE.zip",
    "isPublished": true,
    "displayOrder": 79
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "CV",
    "title": "Fifth Semester B.E. Degree Examinations (Apr / May 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21-CV.zip",
    "isPublished": true,
    "displayOrder": 80
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "ECE",
    "title": "Fifth Semester B.E. Degree Examinations (Apr / May 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21-ECE.zip",
    "isPublished": true,
    "displayOrder": 81
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "AI",
    "title": "Fifth Semester B.E. Degree Examinations (Apr / May 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/21-AI.zip",
    "isPublished": true,
    "displayOrder": 82
  },
  {
    "examYear": "2024",
    "semester": "4th Semester",
    "department": "22EC461",
    "title": "IV-ECE Fourth Semester Examination Papers (Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22EC461.pdf",
    "isPublished": true,
    "displayOrder": 83
  },
  {
    "examYear": "2024",
    "semester": "4th Semester",
    "department": "22EC44",
    "title": "IV-ECE Fourth Semester Examination Papers (Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22EC44.pdf",
    "isPublished": true,
    "displayOrder": 84
  },
  {
    "examYear": "2024",
    "semester": "4th Semester",
    "department": "22EC43",
    "title": "IV-ECE Fourth Semester Examination Papers (Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22EC43.pdf",
    "isPublished": true,
    "displayOrder": 85
  },
  {
    "examYear": "2024",
    "semester": "4th Semester",
    "department": "22EC42",
    "title": "IV-ECE Fourth Semester Examination Papers (Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22EC42.pdf",
    "isPublished": true,
    "displayOrder": 86
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "AI / CA / CD / CS",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/AI-CA-CD-CS.zip",
    "isPublished": true,
    "displayOrder": 87
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "CV",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CV.zip",
    "isPublished": true,
    "displayOrder": 88
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "ECE",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ECE.zip",
    "isPublished": true,
    "displayOrder": 89
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "EEE",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/EEE.zip",
    "isPublished": true,
    "displayOrder": 90
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "ME",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ME.zip",
    "isPublished": true,
    "displayOrder": 91
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "22-CV",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22-CV.zip",
    "isPublished": true,
    "displayOrder": 92
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "22-ECE",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22-ECE.zip",
    "isPublished": true,
    "displayOrder": 93
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "22-EEE",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22-EEE.zip",
    "isPublished": true,
    "displayOrder": 94
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "22-MCS",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22-MCS.zip",
    "isPublished": true,
    "displayOrder": 95
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "22-MDA",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22-MDA.zip",
    "isPublished": true,
    "displayOrder": 96
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "22-ME",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22-ME.zip",
    "isPublished": true,
    "displayOrder": 97
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "22-BB",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22-BB.zip",
    "isPublished": true,
    "displayOrder": 98
  },
  {
    "examYear": "2024",
    "semester": "3rd Semester",
    "department": "22-CS-AI-CA-CD",
    "title": "Third Semester Examinations (Mar / Apr & Sep 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/22-CS-AI-CA-CD.zip",
    "isPublished": true,
    "displayOrder": 99
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "CSE",
    "title": "Examinations across streams (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CSE.zip",
    "isPublished": true,
    "displayOrder": 100
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "CV",
    "title": "Examinations across streams (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CV-1.zip",
    "isPublished": true,
    "displayOrder": 101
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "ECE",
    "title": "Examinations across streams (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ECE-1.zip",
    "isPublished": true,
    "displayOrder": 102
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "EE",
    "title": "Examinations across streams (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/EEE-1.zip",
    "isPublished": true,
    "displayOrder": 103
  },
  {
    "examYear": "2024",
    "semester": "5th Semester",
    "department": "ME",
    "title": "Examinations across streams (Sep / Oct 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ME-1.zip",
    "isPublished": true,
    "displayOrder": 104
  },
  {
    "examYear": "2024",
    "semester": "1st Semester",
    "department": "1st Semester All Streams",
    "title": "First Semester B.E. Degree Examinations (Mar / Apr 2024)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/BE-I-SEM-March-April-2023.zip",
    "isPublished": true,
    "displayOrder": 105
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "CIVIL",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/4-Civil.zip",
    "isPublished": true,
    "displayOrder": 106
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "EEE",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/4-EEE.zip",
    "isPublished": true,
    "displayOrder": 107
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "ECE",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/4-ECE.zip",
    "isPublished": true,
    "displayOrder": 108
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "CSE-AIML",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/4-CSE-AIML.zip",
    "isPublished": true,
    "displayOrder": 109
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "ME",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/4-ME.zip",
    "isPublished": true,
    "displayOrder": 110
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "MQP CSE-AIML",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CSE-AIML-1.zip",
    "isPublished": true,
    "displayOrder": 111
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "MQP ECE",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ECE-1.zip",
    "isPublished": true,
    "displayOrder": 112
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "MQP EEE",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/EEE-1.zip",
    "isPublished": true,
    "displayOrder": 113
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "MQP ME",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ME-1.zip",
    "isPublished": true,
    "displayOrder": 114
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "21ACV482",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/21ACV482.pdf",
    "isPublished": true,
    "displayOrder": 115
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "21CV42",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/21CV42.pdf",
    "isPublished": true,
    "displayOrder": 116
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "21CV43",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/21CV43.pdf",
    "isPublished": true,
    "displayOrder": 117
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "21CV44",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/21CV44.pdf",
    "isPublished": true,
    "displayOrder": 118
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "21MCM41",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/21MCM41.pdf",
    "isPublished": true,
    "displayOrder": 119
  },
  {
    "examYear": "2023",
    "semester": "4th Semester",
    "department": "21UHV490",
    "title": "Regular & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/pdf/21UHV490.pdf",
    "isPublished": true,
    "displayOrder": 120
  },
  {
    "examYear": "2023",
    "semester": "3rd Semester",
    "department": "CIVIL",
    "title": "Third Semester B.E. Degree Examinations (Mar / Apr 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/3rd-MQP-Civil.zip",
    "isPublished": true,
    "displayOrder": 121
  },
  {
    "examYear": "2023",
    "semester": "3rd Semester",
    "department": "EEE",
    "title": "Third Semester B.E. Degree Examinations (Mar / Apr 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/3rd-MQO-EEE.zip",
    "isPublished": true,
    "displayOrder": 122
  },
  {
    "examYear": "2023",
    "semester": "3rd Semester",
    "department": "ECE",
    "title": "Third Semester B.E. Degree Examinations (Mar / Apr 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/3rd-MQP-ECE.zip",
    "isPublished": true,
    "displayOrder": 123
  },
  {
    "examYear": "2023",
    "semester": "3rd Semester",
    "department": "CSE-AIML",
    "title": "Third Semester B.E. Degree Examinations (Mar / Apr 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/3rd-MQP-CSE-AIML.zip",
    "isPublished": true,
    "displayOrder": 124
  },
  {
    "examYear": "2023",
    "semester": "3rd Semester",
    "department": "ME",
    "title": "Third Semester B.E. Degree Examinations (Mar / Apr 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/3rd-MQP-ME.zip",
    "isPublished": true,
    "displayOrder": 125
  },
  {
    "examYear": "2023",
    "semester": "2nd Semester",
    "department": "ME Stream",
    "title": "Second Semester Streams & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ME-STREAM.zip",
    "isPublished": true,
    "displayOrder": 126
  },
  {
    "examYear": "2023",
    "semester": "2nd Semester",
    "department": "CSE Stream",
    "title": "Second Semester Streams & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CSE-STREAM.zip",
    "isPublished": true,
    "displayOrder": 127
  },
  {
    "examYear": "2023",
    "semester": "2nd Semester",
    "department": "CV Stream",
    "title": "Second Semester Streams & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CV-STREAM.zip",
    "isPublished": true,
    "displayOrder": 128
  },
  {
    "examYear": "2023",
    "semester": "2nd Semester",
    "department": "EEE Stream",
    "title": "Second Semester Streams & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/EEE-STREAM.zip",
    "isPublished": true,
    "displayOrder": 129
  },
  {
    "examYear": "2023",
    "semester": "2nd Semester",
    "department": "2nd Sem MQP Pack",
    "title": "Second Semester Streams & Model Question Papers (Sep / Oct 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/B.E-Second-Semester.zip",
    "isPublished": true,
    "displayOrder": 130
  },
  {
    "examYear": "2023",
    "semester": "1st Semester",
    "department": "CIVIL Stream",
    "title": "Regular & Makeup Examinations (Apr / May & Aug 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CIVIL-STREAM.zip",
    "isPublished": true,
    "displayOrder": 131
  },
  {
    "examYear": "2023",
    "semester": "1st Semester",
    "department": "EEE Stream",
    "title": "Regular & Makeup Examinations (Apr / May & Aug 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/EEE-STREAM.zip",
    "isPublished": true,
    "displayOrder": 132
  },
  {
    "examYear": "2023",
    "semester": "1st Semester",
    "department": "CSE-AIML Stream",
    "title": "Regular & Makeup Examinations (Apr / May & Aug 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CSE-STREAM.zip",
    "isPublished": true,
    "displayOrder": 133
  },
  {
    "examYear": "2023",
    "semester": "1st Semester",
    "department": "ME Stream",
    "title": "Regular & Makeup Examinations (Apr / May & Aug 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ME-STREAM.zip",
    "isPublished": true,
    "displayOrder": 134
  },
  {
    "examYear": "2023",
    "semester": "1st Semester",
    "department": "2022-23 Batch Pack",
    "title": "Regular & Makeup Examinations (Apr / May & Aug 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/FIRST-SEMESTER-2022-23-Batch.zip",
    "isPublished": true,
    "displayOrder": 135
  },
  {
    "examYear": "2023",
    "semester": "1st Semester",
    "department": "Makeup Exam (Aug 2023)",
    "title": "Regular & Makeup Examinations (Apr / May & Aug 2023)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/makeup-examination-august.zip",
    "isPublished": true,
    "displayOrder": 136
  },
  {
    "examYear": "2022 & Model Papers",
    "semester": "3rd Semester",
    "department": "Civil",
    "title": "3rd Semester Model Papers (2021-22) (Academic Year 2021-22)",
    "downloadUrl": "https://www.bitm.edu.in/academics/faculty-list",
    "isPublished": true,
    "displayOrder": 137
  },
  {
    "examYear": "2022 & Model Papers",
    "semester": "3rd Semester",
    "department": "EEE",
    "title": "3rd Semester Model Papers (2021-22) (Academic Year 2021-22)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/EEE.zip",
    "isPublished": true,
    "displayOrder": 138
  },
  {
    "examYear": "2022 & Model Papers",
    "semester": "3rd Semester",
    "department": "ECE",
    "title": "3rd Semester Model Papers (2021-22) (Academic Year 2021-22)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ECE.zip",
    "isPublished": true,
    "displayOrder": 139
  },
  {
    "examYear": "2022 & Model Papers",
    "semester": "3rd Semester",
    "department": "CSE-AIML",
    "title": "3rd Semester Model Papers (2021-22) (Academic Year 2021-22)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/CSE-AIML.zip",
    "isPublished": true,
    "displayOrder": 140
  },
  {
    "examYear": "2022 & Model Papers",
    "semester": "3rd Semester",
    "department": "ME",
    "title": "3rd Semester Model Papers (2021-22) (Academic Year 2021-22)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/ME.zip",
    "isPublished": true,
    "displayOrder": 141
  },
  {
    "examYear": "2022 & Model Papers",
    "semester": "2nd Semester",
    "department": "1st Sem Autonomous (May 2022)",
    "title": "1st & 2nd Semester (2022) (May & Sep/Oct 2022)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/B.E.-FIRST-SEMESTER-AUTONOMOUS.zip",
    "isPublished": true,
    "displayOrder": 142
  },
  {
    "examYear": "2022 & Model Papers",
    "semester": "2nd Semester",
    "department": "1st/2nd Sem Even (Sept/Oct 2022)",
    "title": "1st & 2nd Semester (2022) (May & Sep/Oct 2022)",
    "downloadUrl": "https://www.bitm.edu.in/assets/frontend/zip/B.E-SEPT.-OCT.-2022-EXAM-QP.zip",
    "isPublished": true,
    "displayOrder": 143
  },
  {
    "examYear": "2022 & Model Papers",
    "semester": "Model Papers",
    "department": "Open VTU Model Question Papers",
    "title": "Direct portal link for university-wide model question papers for B.E. / B.Tech. (VTU Official)",
    "downloadUrl": "https://vtu.ac.in/model-question-paper-b-e-b-tech-b-arch/",
    "isPublished": true,
    "displayOrder": 144
  }
];

export async function seedSemesterQps(): Promise<void> {
  try {
    // Fetch all existing question papers to prevent duplicates
    const existing = await db
      .select({
        examYear: semesterQps.examYear,
        semester: semesterQps.semester,
        department: semesterQps.department,
        downloadUrl: semesterQps.downloadUrl,
      })
      .from(semesterQps);

    const existingSet = new Set(
      existing.map((e) => `${e.examYear}__${e.semester}__${e.department}__${e.downloadUrl}`)
    );

    const toInsert = ALL_SEMESTER_QPS.filter(
      (item) => !existingSet.has(`${item.examYear}__${item.semester}__${item.department}__${item.downloadUrl}`)
    );

    if (toInsert.length > 0) {
      logger.info({ count: toInsert.length }, "Seeding new/missing semester question papers...");
      // Insert in chunks of 50 for safety
      const chunkSize = 50;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        await db.insert(semesterQps).values(chunk);
      }
      logger.info({ totalImported: toInsert.length }, "Semester question papers seeded successfully.");
    } else {
      logger.info("All semester question papers are already present in the database.");
    }
  } catch (err) {
    logger.warn({ err }, "Could not seed semester question papers (safe to ignore if already populated).");
  }
}
