var assert = require("assert");
var p = require("./pension.js");

function ym(year, month) {
  return { year: year, month: month };
}

function plan(year, month, category) {
  return p.planRetirement(ym(year, month), category);
}

var male196501 = plan(1965, 1, "male");
assert.deepStrictEqual(male196501.statutory, ym(2025, 2));
assert.strictEqual(male196501.delay, 1);
assert.deepStrictEqual(male196501.statutoryAge, { years: 60, months: 1 });
assert.deepStrictEqual(male196501.earliest, ym(2025, 1));
assert.deepStrictEqual(male196501.latest, ym(2028, 2));

assert.deepStrictEqual(plan(1965, 5, "male").statutory, ym(2025, 7));
assert.strictEqual(plan(1965, 5, "male").delay, 2);
assert.strictEqual(plan(1965, 9, "male").delay, 3);
assert.deepStrictEqual(plan(1965, 9, "male").statutory, ym(2025, 12));

var male197601 = plan(1976, 1, "male");
assert.strictEqual(male197601.delay, 34);
assert.deepStrictEqual(male197601.statutoryAge, { years: 62, months: 10 });

var male197609 = plan(1976, 9, "male");
assert.strictEqual(male197609.delay, 36);
assert.deepStrictEqual(male197609.statutory, ym(2039, 9));
assert.deepStrictEqual(male197609.statutoryAge, { years: 63, months: 0 });

assert.strictEqual(plan(1964, 12, "male").delay, 0);
assert.deepStrictEqual(plan(1964, 12, "male").statutory, ym(2024, 12));
assert.deepStrictEqual(plan(1977, 1, "male").statutory, ym(2040, 1));
assert.strictEqual(plan(1977, 1, "male").delay, 36);
assert.deepStrictEqual(plan(1980, 6, "male").statutory, ym(2043, 6));
assert.deepStrictEqual(plan(1980, 6, "male").statutoryAge, { years: 63, months: 0 });
assert.deepStrictEqual(plan(1980, 6, "male").earliest, ym(2040, 6));
assert.deepStrictEqual(plan(1980, 6, "male").latest, ym(2046, 6));

assert.deepStrictEqual(plan(1970, 1, "female55").statutory, ym(2025, 2));
assert.strictEqual(plan(1970, 1, "female55").delay, 1);
assert.deepStrictEqual(plan(1970, 9, "female55").statutory, ym(2025, 12));
assert.deepStrictEqual(plan(1970, 9, "female55").statutoryAge, { years: 55, months: 3 });

assert.deepStrictEqual(plan(1975, 1, "female50").statutory, ym(2025, 2));
assert.strictEqual(plan(1975, 1, "female50").delay, 1);
assert.deepStrictEqual(plan(1975, 2, "female50").statutory, ym(2025, 3));
assert.strictEqual(plan(1975, 2, "female50").delay, 1);
assert.deepStrictEqual(plan(1975, 3, "female50").statutory, ym(2025, 5));
assert.strictEqual(plan(1976, 11, "female50").delay, 12);
assert.deepStrictEqual(plan(1976, 11, "female50").statutory, ym(2027, 11));
assert.deepStrictEqual(plan(1976, 11, "female50").statutoryAge, { years: 51, months: 0 });

var femaleFull = plan(1984, 11, "female50");
assert.strictEqual(femaleFull.delay, 60);
assert.deepStrictEqual(femaleFull.statutory, ym(2039, 11));
assert.deepStrictEqual(femaleFull.statutoryAge, { years: 55, months: 0 });
assert.deepStrictEqual(femaleFull.earliest, ym(2036, 11));
assert.deepStrictEqual(femaleFull.latest, ym(2042, 11));
assert.deepStrictEqual(plan(1985, 1, "female50").statutory, ym(2040, 1));

assert.strictEqual(p.minMonths(2029), 180);
assert.strictEqual(p.minMonths(2030), 186);
assert.strictEqual(p.minMonths(2031), 192);
assert.strictEqual(p.minMonths(2032), 198);
assert.strictEqual(p.minMonths(2038), 234);
assert.strictEqual(p.minMonths(2039), 240);
assert.strictEqual(p.minMonths(2043), 240);

var early = p.paymentRequirement(ym(2029, 6), ym(2031, 8));
assert.strictEqual(early.year, 2029);
assert.strictEqual(early.months, 180);
var late = p.paymentRequirement(ym(2034, 8), ym(2031, 8));
assert.strictEqual(late.year, 2031);
assert.strictEqual(late.months, 192);
var sameYearLater = p.paymentRequirement(ym(2033, 1), ym(2032, 8));
assert.strictEqual(sameYearLater.year, 2032);
assert.strictEqual(sameYearLater.months, 198);

var demo = p.calculate({
  birth: ym(1980, 6),
  category: "male",
  retire: ym(2043, 6),
  base: 9000,
  index: 1,
  contributionMonths: 360,
  deemedMonths: 0,
  deemedIndex: 1,
  coefficient: 0.012,
  account: 180000
});
assert.strictEqual(demo.divisor, 117);
assert.strictEqual(demo.basic, 2700);
assert.strictEqual(demo.personal, 1538.46);
assert.strictEqual(demo.transitional, 0);
assert.strictEqual(demo.total, 4238.46);
assert.strictEqual(demo.annual, 50861.52);
assert.strictEqual(demo.yearsMet, true);
assert.strictEqual(demo.requiredMonths, 240);
assert.strictEqual(demo.window, "inside");
assert.strictEqual(demo.basicPerYear, 90);

var mid = p.calculate({
  birth: ym(1965, 1),
  category: "male",
  retire: ym(2025, 2),
  base: 8000,
  index: 0.8,
  contributionMonths: 35 * 12,
  deemedMonths: 10 * 12,
  deemedIndex: 0.8,
  coefficient: 0.012,
  account: 100000
});
assert.deepStrictEqual(mid.age, { years: 60, months: 1 });
assert.strictEqual(mid.divisor, 139);
assert.strictEqual(mid.basic, 2520);
assert.strictEqual(mid.personal, 719.42);
assert.strictEqual(mid.transitional, 768);
assert.strictEqual(mid.total, 4007.42);

var exact60 = p.calculate({
  birth: ym(1965, 1),
  category: "male",
  retire: ym(2025, 1),
  base: 8000,
  index: 1,
  contributionMonths: 180,
  deemedMonths: 0,
  deemedIndex: 1,
  coefficient: 0.01,
  account: 13900
});
assert.strictEqual(exact60.age.years, 60);
assert.strictEqual(exact60.divisor, 139);
assert.strictEqual(exact60.personal, 100);

assert.strictEqual(p.estimateAccount(5000, 10, 0), 48000);
assert.strictEqual(p.estimateAccount(5000, 10, 0.03), 55026.62);
assert.strictEqual(p.DIVISOR_BY_AGE[45], 216);
assert.strictEqual(p.DIVISOR_BY_AGE[47], 208);
assert.strictEqual(p.DIVISOR_BY_AGE[55], 170);
assert.strictEqual(p.DIVISOR_BY_AGE[63], 117);
assert.strictEqual(p.DIVISOR_BY_AGE[70], 56);

var span = p.calendarSpan({ year: 2026, month: 10, day: 13 }, { year: 2043, month: 6, day: 1 });
assert.deepStrictEqual(
  { years: span.years, months: span.months, days: span.days, sign: span.sign },
  { years: 16, months: 7, days: 19, sign: 1 }
);
assert.strictEqual(span.totalDays > 6000, true);

var shortSpan = p.calendarSpan({ year: 2026, month: 10, day: 13 }, { year: 2026, month: 11, day: 1 });
assert.deepStrictEqual(
  { years: shortSpan.years, months: shortSpan.months, days: shortSpan.days },
  { years: 0, months: 0, days: 19 }
);

var monthEnd = p.calendarSpan({ year: 2026, month: 1, day: 31 }, { year: 2026, month: 3, day: 1 });
assert.deepStrictEqual(
  { years: monthEnd.years, months: monthEnd.months, days: monthEnd.days },
  { years: 0, months: 1, days: 1 }
);

var sameDay = p.calendarSpan({ year: 2026, month: 10, day: 13 }, { year: 2026, month: 10, day: 13 });
assert.strictEqual(sameDay.totalDays, 0);
assert.strictEqual(sameDay.sign, 1);

var backward = p.calendarSpan({ year: 2026, month: 10, day: 13 }, { year: 2025, month: 2, day: 1 });
assert.strictEqual(backward.sign, -1);
assert.deepStrictEqual(
  { years: backward.years, months: backward.months, days: backward.days },
  { years: 1, months: 8, days: 12 }
);
assert.strictEqual(p.formatSpan(span, false), "16年7个月");
assert.strictEqual(p.formatSpan(shortSpan, true), "19天");

var projectedLate = p.projectRetirement({
  selected: ym(2043, 6),
  target: ym(2046, 6),
  contributionMonths: 360,
  deemedMonths: 0,
  account: 180000,
  base: 9000,
  index: 1,
  grow: true
});
assert.strictEqual(projectedLate.applied, 36);
assert.strictEqual(projectedLate.contributionMonths, 396);
assert.strictEqual(projectedLate.account, 205920);
assert.strictEqual(projectedLate.monthlyCredit, 720);

var projectedEarly = p.projectRetirement({
  selected: ym(2043, 6),
  target: ym(2040, 6),
  contributionMonths: 360,
  deemedMonths: 0,
  account: 180000,
  base: 9000,
  index: 1,
  grow: true
});
assert.strictEqual(projectedEarly.contributionMonths, 324);
assert.strictEqual(projectedEarly.account, 154080);

var held = p.projectRetirement({
  selected: ym(2043, 6),
  target: ym(2046, 6),
  contributionMonths: 360,
  deemedMonths: 120,
  account: 180000,
  base: 9000,
  index: 1,
  grow: false
});
assert.strictEqual(held.contributionMonths, 360);
assert.strictEqual(held.account, 180000);

var clamped = p.projectRetirement({
  selected: ym(2043, 6),
  target: ym(2040, 6),
  contributionMonths: 12,
  deemedMonths: 12,
  account: 1000,
  base: 9000,
  index: 1,
  grow: true
});
assert.strictEqual(clamped.clamped, true);
assert.strictEqual(clamped.contributionMonths, 12);
assert.strictEqual(clamped.account, 1000);

console.log("pension.test.js: ok");
