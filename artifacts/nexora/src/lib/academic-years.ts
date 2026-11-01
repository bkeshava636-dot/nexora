/**
 * Utility functions for managing academic and exam years across Nexora.
 *
 * Rules:
 * - Available years are generated dynamically up to the current calendar year (new Date().getFullYear()).
 * - Future years (e.g. 2027, 2028 when current year is 2026) are NEVER added until that calendar year is actually reached.
 * - When entering a new year (e.g. 2027 arrives), that new year option is automatically available across the entire site.
 */

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Returns available exam/academic years in descending order.
 * In 2026: ["2026", "2025", "2024", "2023"]
 * In 2027: ["2027", "2026", "2025", "2024", "2023"]
 */
export function getAvailableExamYears(baseYear: number = 2023): string[] {
  const current = getCurrentYear();
  const years: string[] = [];
  for (let y = current; y >= baseYear; y--) {
    years.push(y.toString());
  }
  return years;
}

/**
 * Returns popular exam years for PYQ filter tabs.
 * In 2026: ["All", "2026", "2025", "2024", "2023", "2022 & Model Papers"]
 */
export function getPopularExamYears(): string[] {
  const years = getAvailableExamYears(2023);
  return ["All", ...years, "2022 & Model Papers"];
}
