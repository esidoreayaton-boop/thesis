// ─────────────────────────────────────────────────────────────────────────────
// Automated Scheduling Engine – Smart Barangay System
// Computes next dose dates for vaccines and next visit dates for maternal care
// based on DOH/WHO recommended immunization schedules.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Philippine DOH Expanded Program on Immunization (EPI) vaccine schedule.
 * Each vaccine has a list of doses with the recommended age/interval in days.
 * Source: DOH EPI Manual, WHO WPRO Philippines schedule.
 */
export const VACCINE_SCHEDULE = {
  'BCG': [
    { dose: 1, label: 'At birth', offsetDays: 0 },
  ],
  'Hepatitis B': [
    { dose: 1, label: 'At birth',    offsetDays: 0   },
    { dose: 2, label: '6 weeks',     offsetDays: 42  },
    { dose: 3, label: '10 weeks',    offsetDays: 70  },
    { dose: 4, label: '14 weeks',    offsetDays: 98  },
  ],
  'DPT': [
    { dose: 1, label: '6 weeks',     offsetDays: 42  },
    { dose: 2, label: '10 weeks',    offsetDays: 70  },
    { dose: 3, label: '14 weeks',    offsetDays: 98  },
    { dose: 4, label: 'DPT Booster (18 months)', offsetDays: 548 },
  ],
  'DPT Booster': [
    { dose: 1, label: '18 months',   offsetDays: 548 },
  ],
  'OPV': [
    { dose: 1, label: '6 weeks',     offsetDays: 42  },
    { dose: 2, label: '10 weeks',    offsetDays: 70  },
    { dose: 3, label: '14 weeks',    offsetDays: 98  },
  ],
  'Pentavalent': [
    { dose: 1, label: '6 weeks',     offsetDays: 42  },
    { dose: 2, label: '10 weeks',    offsetDays: 70  },
    { dose: 3, label: '14 weeks',    offsetDays: 98  },
  ],
  'MMR': [
    { dose: 1, label: '9 months',    offsetDays: 274 },
    { dose: 2, label: '12 months',   offsetDays: 365 },
  ],
  'Varicella': [
    { dose: 1, label: '12 months',   offsetDays: 365 },
    { dose: 2, label: '4-6 years',   offsetDays: 1461 },
  ],
  'Pneumococcal (PCV)': [
    { dose: 1, label: '6 weeks',     offsetDays: 42  },
    { dose: 2, label: '10 weeks',    offsetDays: 70  },
    { dose: 3, label: '14 weeks',    offsetDays: 98  },
  ],
  'Rotavirus': [
    { dose: 1, label: '6 weeks',     offsetDays: 42  },
    { dose: 2, label: '10 weeks',    offsetDays: 70  },
    { dose: 3, label: '14 weeks',    offsetDays: 98  },
  ],
  'Influenza': [
    { dose: 1, label: '6 months',    offsetDays: 182 },
    { dose: 2, label: '7 months',    offsetDays: 210 },
    { dose: 3, label: 'Annual',      offsetDays: 547 },
  ],
  'Typhoid': [
    { dose: 1, label: '2 years',     offsetDays: 730 },
  ],
};

/**
 * Minimum interval between consecutive doses of the same vaccine (days).
 * Prevents scheduling next dose too soon after the current.
 */
const MIN_INTERVAL_DAYS = 28;

/**
 * Add calendar days to a date string (YYYY-MM-DD).
 * Returns the new date as YYYY-MM-DD.
 */
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Format a date string for display.
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// IMMUNIZATION AUTO-SCHEDULING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the next dose schedule after a vaccine dose is marked as Completed.
 *
 * @param {string} vaccineName     - Name of the vaccine (e.g. "BCG", "DPT")
 * @param {number} completedDose   - Dose number just administered (1, 2, 3, ...)
 * @param {string} administeredDate - Date dose was given (YYYY-MM-DD, defaults to today)
 * @returns {{ hasNext: boolean, nextDose: number, nextDueDate: string, label: string } | null}
 */
export function computeNextDose(vaccineName, completedDose, administeredDate) {
  const today        = administeredDate || new Date().toISOString().split('T')[0];
  const schedule     = VACCINE_SCHEDULE[vaccineName];
  if (!schedule) return { hasNext: false };

  const nextDoseNum  = Number(completedDose) + 1;
  const nextSchedule = schedule.find(s => s.dose === nextDoseNum);
  if (!nextSchedule) return { hasNext: false };

  // Schedule next dose from today + minimum interval (at least MIN_INTERVAL_DAYS)
  const nextDueDate  = addDays(today, Math.max(MIN_INTERVAL_DAYS, nextSchedule.offsetDays - (schedule.find(s => s.dose === Number(completedDose))?.offsetDays || 0)));

  return {
    hasNext:     true,
    nextDose:    nextDoseNum,
    nextDueDate,
    label:       nextSchedule.label,
    displayDate: formatDate(nextDueDate),
  };
}

/**
 * Get the full recommended schedule for a vaccine starting from a birth date.
 *
 * @param {string} vaccineName  - Vaccine name
 * @param {string} birthDate    - Child's date of birth (YYYY-MM-DD)
 * @returns {Array<{ dose, label, dueDate, displayDate }>}
 */
export function getFullVaccineSchedule(vaccineName, birthDate) {
  const schedule = VACCINE_SCHEDULE[vaccineName];
  if (!schedule) return [];
  return schedule.map(s => ({
    dose:        s.dose,
    label:       s.label,
    dueDate:     addDays(birthDate, s.offsetDays),
    displayDate: formatDate(addDays(birthDate, s.offsetDays)),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERNAL HEALTH AUTO-SCHEDULING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DOH recommended prenatal visit schedule:
 * - 1st trimester  → every 4 weeks
 * - 2nd trimester  → every 4 weeks
 * - 3rd trimester (28-36 wks) → every 2 weeks
 * - 3rd trimester (36+ wks) → every 1 week
 * - Postnatal → 1 week after delivery, then 6 weeks after delivery
 */

/**
 * Determine next prenatal/postnatal visit date based on current status and last visit.
 *
 * @param {string} pregnancyStatus - e.g. "Prenatal - 1st Trimester", "Prenatal - 3rd Trimester", "Postnatal - 2 weeks"
 * @param {string} lastVisit       - Date of last visit (YYYY-MM-DD)
 * @param {string} expectedDueDate - Expected delivery date (YYYY-MM-DD, optional)
 * @returns {{ nextVisit: string, displayDate: string, interval: string, recommendation: string }}
 */
export function computeNextMaternalVisit(pregnancyStatus, lastVisit, expectedDueDate) {
  const baseDate = lastVisit || new Date().toISOString().split('T')[0];
  const status   = (pregnancyStatus || '').toLowerCase();

  let intervalDays    = 28; // default: every 4 weeks
  let intervalLabel   = 'every 4 weeks';
  let recommendation  = '';

  if (status.includes('postnatal')) {
    // After delivery
    if (status.includes('1 week') || status.includes('week 1')) {
      intervalDays   = 35;  // 6 weeks from delivery
      intervalLabel  = '6 weeks postpartum';
      recommendation = 'Check for postpartum recovery, breastfeeding support, family planning counseling.';
    } else {
      intervalDays   = 7;   // first postnatal check: 1 week after delivery
      intervalLabel  = '1 week postpartum';
      recommendation = 'Immediate postpartum check: check for bleeding, blood pressure, wound healing.';
    }
  } else if (status.includes('3rd trimester')) {
    // Determine how many weeks remain if due date is known
    let weeksRemaining = 99;
    if (expectedDueDate) {
      const daysRemaining = Math.floor((new Date(expectedDueDate) - new Date(baseDate)) / (1000 * 60 * 60 * 24));
      weeksRemaining = Math.floor(daysRemaining / 7);
    }
    if (weeksRemaining <= 4) {
      intervalDays   = 7;
      intervalLabel  = 'every 1 week (near term)';
      recommendation = 'Weekly monitoring: fetal position, blood pressure, signs of labor.';
    } else {
      intervalDays   = 14;
      intervalLabel  = 'every 2 weeks';
      recommendation = 'Bi-weekly check: fetal growth monitoring, Group B Strep test, birth plan.';
    }
  } else if (status.includes('2nd trimester')) {
    intervalDays   = 28;
    intervalLabel  = 'every 4 weeks';
    recommendation = 'Monthly visit: anomaly scan (18-20 wks), glucose screening, iron supplementation.';
  } else if (status.includes('1st trimester')) {
    intervalDays   = 28;
    intervalLabel  = 'every 4 weeks';
    recommendation = 'First trimester: blood tests, urinalysis, ultrasound, start prenatal vitamins.';
  }

  const nextVisit = addDays(baseDate, intervalDays);
  return {
    nextVisit,
    displayDate:    formatDate(nextVisit),
    interval:       intervalLabel,
    recommendation,
  };
}

/**
 * List all recommended prenatal visits from first visit to delivery.
 *
 * @param {string} firstVisitDate  - Date of first prenatal visit (YYYY-MM-DD)
 * @param {string} expectedDueDate - Expected delivery date (YYYY-MM-DD)
 * @returns {Array<{ visitNumber, estimatedDate, displayDate, trimester, recommendation }>}
 */
export function getFullPrenatalSchedule(firstVisitDate, expectedDueDate) {
  if (!firstVisitDate || !expectedDueDate) return [];

  const schedule  = [];
  let currentDate = firstVisitDate;
  let visitNumber = 1;
  const maxVisits = 15; // safety cap

  while (new Date(currentDate) < new Date(expectedDueDate) && visitNumber <= maxVisits) {
    const daysToDelivery = Math.floor((new Date(expectedDueDate) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
    const weeksToDelivery = Math.floor(daysToDelivery / 7);

    let trimester, interval, recommendation;
    if (daysToDelivery > 182) {
      trimester      = '1st Trimester';
      interval       = 28;
      recommendation = 'Initial labs, ultrasound, prenatal vitamins start.';
    } else if (daysToDelivery > 84) {
      trimester      = '2nd Trimester';
      interval       = 28;
      recommendation = 'Anomaly scan, glucose test, iron supplementation review.';
    } else if (weeksToDelivery > 4) {
      trimester      = '3rd Trimester (early)';
      interval       = 14;
      recommendation = 'Bi-weekly monitoring, Group B Strep, birth plan discussion.';
    } else {
      trimester      = '3rd Trimester (late)';
      interval       = 7;
      recommendation = 'Weekly monitoring, fetal position check, signs of labor.';
    }

    schedule.push({
      visitNumber,
      estimatedDate: currentDate,
      displayDate:   formatDate(currentDate),
      trimester,
      recommendation,
    });

    currentDate = addDays(currentDate, interval);
    visitNumber++;
  }

  return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERDUE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute days overdue for a scheduled visit/immunization.
 *
 * @param {string} dueDate - Scheduled date (YYYY-MM-DD)
 * @returns {number} Positive number = overdue by N days; 0 or negative = not overdue
 */
export function computeDaysOverdue(dueDate) {
  if (!dueDate) return 0;
  const today   = new Date();
  const due     = new Date(dueDate);
  const diff    = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/**
 * Build a list of overdue immunizations from a set of immunization records.
 *
 * @param {Array} immunizations - Array of immunization records from DB
 * @returns {Array} Filtered and annotated overdue records
 */
export function getOverdueImmunizations(immunizations) {
  return immunizations
    .filter(imm => imm.status !== 'Completed' && imm.due_date)
    .map(imm => ({
      ...imm,
      days_overdue: computeDaysOverdue(imm.due_date),
    }))
    .filter(imm => imm.days_overdue > 0)
    .sort((a, b) => b.days_overdue - a.days_overdue);
}

/**
 * Build a list of overdue maternal visits from maternal records.
 *
 * @param {Array} maternal - Array of maternal records from DB
 * @returns {Array} Overdue records annotated with days_overdue
 */
export function getOverdueMaternalVisits(maternal) {
  return maternal
    .filter(m => m.next_visit)
    .map(m => ({
      ...m,
      days_overdue: computeDaysOverdue(m.next_visit),
    }))
    .filter(m => m.days_overdue > 0)
    .sort((a, b) => b.days_overdue - a.days_overdue);
}

export { addDays, formatDate };
