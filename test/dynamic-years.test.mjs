import test from "node:test";
import assert from "node:assert/strict";

// Mirror logic from artifacts/nexora/src/lib/academic-years.ts
function getAvailableExamYears(baseYear = 2023, currentYear = new Date().getFullYear()) {
  const years = [];
  for (let y = currentYear; y >= baseYear; y--) {
    years.push(y.toString());
  }
  return years;
}

function getPopularExamYears(currentYear = new Date().getFullYear()) {
  const years = getAvailableExamYears(2023, currentYear);
  return ["All", ...years, "2022 & Model Papers"];
}

test("Dynamic Year Calculation — Current Year & Future Year Guard", async (t) => {
  await t.test("Generates years down to base year in descending order", () => {
    const years2026 = getAvailableExamYears(2023, 2026);
    assert.deepEqual(years2026, ["2026", "2025", "2024", "2023"]);
  });

  await t.test("Strictly excludes future years like 2027 and 2028 when year is 2026", () => {
    const years2026 = getAvailableExamYears(2023, 2026);
    assert.equal(years2026.includes("2027"), false, "2027 must NOT be added while still in 2026");
    assert.equal(years2026.includes("2028"), false, "2028 must NOT be added while still in 2026");
  });

  await t.test("Automatically includes 2027 once calendar year becomes 2027", () => {
    const years2027 = getAvailableExamYears(2023, 2027);
    assert.equal(years2027[0], "2027");
    assert.equal(years2027.includes("2027"), true);
    assert.equal(years2027.includes("2028"), false, "2028 must NOT be added while still in 2027");
  });

  await t.test("Popular exam years list format", () => {
    const pop2026 = getPopularExamYears(2026);
    assert.equal(pop2026[0], "All");
    assert.equal(pop2026.includes("2026"), true);
    assert.equal(pop2026.includes("2025"), true);
    assert.equal(pop2026.includes("2027"), false);
    assert.equal(pop2026[pop2026.length - 1], "2022 & Model Papers");
  });
});
