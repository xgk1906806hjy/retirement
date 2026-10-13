/* 职工基本养老金测算。
   基础养老金、个人账户养老金：国发〔2005〕38号。
   计发月数：该决定附件，退休年龄按周岁查表。
   法定退休年龄：全国人大常委会《关于实施渐进式延迟法定退休年龄的决定》
   （2025年1月1日起施行）及对照表。
   过渡性养老金没有全国统一公式，这里用通用估算式。 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Pension = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var DIVISOR_BY_AGE = {
    40: 233, 41: 230, 42: 226, 43: 223, 44: 220,
    45: 216, 46: 212, 47: 208, 48: 204, 49: 199,
    50: 195, 51: 190, 52: 185, 53: 180, 54: 175,
    55: 170, 56: 164, 57: 158, 58: 152, 59: 145,
    60: 139, 61: 132, 62: 125, 63: 117, 64: 109,
    65: 101, 66: 93, 67: 84, 68: 75, 69: 65, 70: 56
  };

  var ORIGINAL_AGE = { male: 60, female55: 55, female50: 50 };
  var DELAY_STEP = { male: 4, female55: 4, female50: 2 };
  var MAX_DELAY = { male: 36, female55: 36, female50: 60 };

  function toIndex(ym) {
    return ym.year * 12 + (ym.month - 1);
  }

  function fromIndex(index) {
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  }

  function addMonths(ym, delta) {
    return fromIndex(toIndex(ym) + delta);
  }

  function compareYM(a, b) {
    return toIndex(a) - toIndex(b);
  }

  function ageAt(birth, at) {
    var years = at.year - birth.year;
    var months = at.month - birth.month;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years: years, months: months };
  }

  function formatYM(ym) {
    return ym.year + "年" + ym.month + "月";
  }

  function formatAge(age) {
    return age.years + "岁" + age.months + "个月";
  }

  function formatDuration(totalMonths) {
    var sign = totalMonths < 0 ? "-" : "";
    var abs = Math.abs(totalMonths);
    var years = Math.floor(abs / 12);
    var months = abs % 12;
    if (months === 0) return sign + years + "年";
    if (years === 0) return sign + months + "个月";
    return sign + years + "年" + months + "个月";
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /* 原法定退休年龄落在 2025年1月及以后的，从当月起算延迟。
     男职工、原55周岁女职工每4个月延迟1个月，最多36个月；
     原50周岁女职工每2个月延迟1个月，最多60个月。 */
  function planRetirement(birth, category) {
    var originalAge = ORIGINAL_AGE[category];
    var step = DELAY_STEP[category];
    var maxDelay = MAX_DELAY[category];
    var original = addMonths(birth, originalAge * 12);
    var policy = { year: 2025, month: 1 };
    var monthsFromPolicy = compareYM(original, policy);
    var delay = 0;
    if (monthsFromPolicy >= 0) {
      delay = Math.min(maxDelay, Math.floor(monthsFromPolicy / step) + 1);
    }
    var statutory = addMonths(original, delay);
    var earliest = compareYM(original, addMonths(statutory, -36)) > 0
      ? original
      : addMonths(statutory, -36);
    var latest = addMonths(statutory, 36);
    return {
      category: category,
      originalAge: originalAge,
      original: original,
      delay: delay,
      statutory: statutory,
      earliest: earliest,
      latest: latest,
      statutoryAge: ageAt(birth, statutory)
    };
  }

  function windowStatus(retire, plan) {
    if (compareYM(retire, plan.original) < 0) return "before-original";
    if (compareYM(retire, plan.earliest) < 0) return "before-window";
    if (compareYM(retire, plan.latest) > 0) return "after-window";
    return "inside";
  }

  /* 2030年起每年提高6个月，2039年及以后为20年。
     弹性提前按所选退休年份；弹性延迟按达到法定退休年龄的年份。 */
  function minMonths(year) {
    if (year <= 2029) return 15 * 12;
    if (year >= 2039) return 20 * 12;
    return 15 * 12 + (year - 2029) * 6;
  }

  function paymentRequirement(retire, statutory) {
    var year = compareYM(retire, statutory) > 0 ? statutory.year : retire.year;
    return { year: year, months: minMonths(year) };
  }

  function divisorForCompletedAge(completedYears) {
    if (completedYears < 40) {
      return { months: DIVISOR_BY_AGE[40], age: 40, clamp: "low" };
    }
    if (completedYears > 70) {
      return { months: DIVISOR_BY_AGE[70], age: 70, clamp: "high" };
    }
    return { months: DIVISOR_BY_AGE[completedYears], age: completedYears, clamp: null };
  }

  function calculate(input) {
    var plan = planRetirement(input.birth, input.category);
    var age = ageAt(input.birth, input.retire);
    var divisor = divisorForCompletedAge(age.years);
    var years = input.contributionMonths / 12;
    var deemedYears = input.deemedMonths / 12;
    var basic = round2(input.base * (1 + input.index) / 2 * years * 0.01);
    var personal = round2(input.account / divisor.months);
    var transitional = round2(input.base * input.deemedIndex * deemedYears * input.coefficient);
    var total = round2(basic + personal + transitional);
    var requirement = paymentRequirement(input.retire, plan.statutory);
    return {
      plan: plan,
      age: age,
      window: windowStatus(input.retire, plan),
      divisor: divisor.months,
      divisorAge: divisor.age,
      divisorClamp: divisor.clamp,
      basic: basic,
      personal: personal,
      transitional: transitional,
      total: total,
      annual: round2(total * 12),
      contributionMonths: input.contributionMonths,
      deemedMonths: input.deemedMonths,
      requiredYear: requirement.year,
      requiredMonths: requirement.months,
      yearsMet: input.contributionMonths >= requirement.months,
      basicPerYear: round2(input.base * (1 + input.index) / 2 * 0.01)
    };
  }

  function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function dayNumber(year, month, day) {
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  }

  /* 从 from 到 to 的日历间隔。to 更早时 sign 为 -1，年月天仍是正数。 */
  function calendarSpan(from, to) {
    var totalDays = dayNumber(to.year, to.month, to.day) - dayNumber(from.year, from.month, from.day);
    var sign = totalDays < 0 ? -1 : 1;
    var start = sign < 0 ? to : from;
    var end = sign < 0 ? from : to;
    var years = 0;
    while (dayNumber(start.year + years + 1, start.month, Math.min(start.day, daysInMonth(start.year + years + 1, start.month))) <= dayNumber(end.year, end.month, end.day)) {
      years += 1;
    }
    var months = 0;
    var cursorYear = start.year + years;
    var cursorMonth = start.month;
    while (true) {
      var nextIndex = cursorYear * 12 + (cursorMonth - 1) + (months + 1);
      var nextYear = Math.floor(nextIndex / 12);
      var nextMonth = (nextIndex % 12) + 1;
      var nextDay = Math.min(start.day, daysInMonth(nextYear, nextMonth));
      if (dayNumber(nextYear, nextMonth, nextDay) > dayNumber(end.year, end.month, end.day)) break;
      months += 1;
    }
    var landedIndex = cursorYear * 12 + (cursorMonth - 1) + months;
    var landedYear = Math.floor(landedIndex / 12);
    var landedMonth = (landedIndex % 12) + 1;
    var landedDay = Math.min(start.day, daysInMonth(landedYear, landedMonth));
    var days = dayNumber(end.year, end.month, end.day) - dayNumber(landedYear, landedMonth, landedDay);
    return { years: years, months: months, days: days, totalDays: Math.abs(totalDays), sign: sign };
  }

  /* 以所选退休月的年限和储存额为基准，推到另一个退休月。
   grow 为真时，每差 1 个月按「计发基数 × 缴费指数 × 8%」增减个人账户，不计利息。
   视同缴费年限不变，实际缴费月数不会减成负数。 */
function projectRetirement(input) {
    var actual = input.contributionMonths - input.deemedMonths;
    if (actual < 0) actual = 0;
    var delta = input.grow ? compareYM(input.target, input.selected) : 0;
    var applied = delta;
    var clamped = false;
    if (actual + applied < 0) {
      applied = -actual;
      clamped = true;
    }
    var monthlyCredit = input.base * input.index * 0.08;
    var account = input.account + monthlyCredit * applied;
    if (account < 0) account = 0;
    return {
      delta: delta,
      applied: applied,
      clamped: clamped,
      contributionMonths: input.deemedMonths + actual + applied,
      account: round2(account),
      monthlyCredit: round2(monthlyCredit)
    };
  }

  function formatSpan(span, withDays) {
    var parts = [];
    if (span.years) parts.push(span.years + "年");
    if (span.months) parts.push(span.months + "个月");
    if (withDays || (!span.years && !span.months)) parts.push(span.days + "天");
    return parts.join("") || "0天";
  }

  /* 按不变月基数、固定年利率粗算个人账户。视同缴费不记入个人账户。 */
  function estimateAccount(monthlyBase, years, annualRate) {
    var yearly = monthlyBase * 0.08 * 12;
    if (years <= 0 || monthlyBase <= 0) return 0;
    if (!annualRate) return round2(yearly * years);
    return round2(yearly * (Math.pow(1 + annualRate, years) - 1) / annualRate);
  }

  return {
    DIVISOR_BY_AGE: DIVISOR_BY_AGE,
    addMonths: addMonths,
    compareYM: compareYM,
    ageAt: ageAt,
    formatYM: formatYM,
    formatAge: formatAge,
    formatDuration: formatDuration,
    round2: round2,
    planRetirement: planRetirement,
    minMonths: minMonths,
    paymentRequirement: paymentRequirement,
    calculate: calculate,
    estimateAccount: estimateAccount,
    daysInMonth: daysInMonth,
    calendarSpan: calendarSpan,
    formatSpan: formatSpan,
    projectRetirement: projectRetirement
  };
});
