/** Approved thresholds and five non-cumulative stat columns only. Draft rewards are not enabled. */
export const VIP_LEVELS = [
  {
    "level": 0,
    "threshold": 0,
    "bonuses": {
      "atkPct": 0,
      "defPct": 0,
      "hpPct": 0,
      "critRatePoints": 0,
      "critDamagePct": 0
    }
  },
  {
    "level": 1,
    "threshold": 1000,
    "bonuses": {
      "atkPct": 1,
      "defPct": 1,
      "hpPct": 2,
      "critRatePoints": 0.3,
      "critDamagePct": 2
    }
  },
  {
    "level": 2,
    "threshold": 10000,
    "bonuses": {
      "atkPct": 2,
      "defPct": 1,
      "hpPct": 3,
      "critRatePoints": 0.5,
      "critDamagePct": 3
    }
  },
  {
    "level": 3,
    "threshold": 50000,
    "bonuses": {
      "atkPct": 3,
      "defPct": 2,
      "hpPct": 5,
      "critRatePoints": 0.8,
      "critDamagePct": 5
    }
  },
  {
    "level": 4,
    "threshold": 150000,
    "bonuses": {
      "atkPct": 5,
      "defPct": 3,
      "hpPct": 8,
      "critRatePoints": 1,
      "critDamagePct": 7
    }
  },
  {
    "level": 5,
    "threshold": 300000,
    "bonuses": {
      "atkPct": 8,
      "defPct": 5,
      "hpPct": 12,
      "critRatePoints": 2,
      "critDamagePct": 10
    }
  },
  {
    "level": 6,
    "threshold": 500000,
    "bonuses": {
      "atkPct": 10,
      "defPct": 6,
      "hpPct": 15,
      "critRatePoints": 2.5,
      "critDamagePct": 13
    }
  },
  {
    "level": 7,
    "threshold": 1000000,
    "bonuses": {
      "atkPct": 13,
      "defPct": 8,
      "hpPct": 19,
      "critRatePoints": 3.5,
      "critDamagePct": 17
    }
  },
  {
    "level": 8,
    "threshold": 1500000,
    "bonuses": {
      "atkPct": 15,
      "defPct": 10,
      "hpPct": 22,
      "critRatePoints": 4,
      "critDamagePct": 20
    }
  },
  {
    "level": 9,
    "threshold": 2000000,
    "bonuses": {
      "atkPct": 17,
      "defPct": 11,
      "hpPct": 25,
      "critRatePoints": 4.5,
      "critDamagePct": 23
    }
  },
  {
    "level": 10,
    "threshold": 3000000,
    "bonuses": {
      "atkPct": 20,
      "defPct": 13,
      "hpPct": 30,
      "critRatePoints": 5.5,
      "critDamagePct": 27
    }
  },
  {
    "level": 11,
    "threshold": 4000000,
    "bonuses": {
      "atkPct": 22,
      "defPct": 15,
      "hpPct": 33,
      "critRatePoints": 6,
      "critDamagePct": 30
    }
  },
  {
    "level": 12,
    "threshold": 5500000,
    "bonuses": {
      "atkPct": 24,
      "defPct": 17,
      "hpPct": 36,
      "critRatePoints": 6.5,
      "critDamagePct": 33
    }
  },
  {
    "level": 13,
    "threshold": 7000000,
    "bonuses": {
      "atkPct": 26,
      "defPct": 19,
      "hpPct": 40,
      "critRatePoints": 7,
      "critDamagePct": 36
    }
  },
  {
    "level": 14,
    "threshold": 8500000,
    "bonuses": {
      "atkPct": 28,
      "defPct": 21,
      "hpPct": 44,
      "critRatePoints": 8,
      "critDamagePct": 40
    }
  },
  {
    "level": 15,
    "threshold": 10000000,
    "bonuses": {
      "atkPct": 31,
      "defPct": 23,
      "hpPct": 50,
      "critRatePoints": 9,
      "critDamagePct": 44
    }
  },
  {
    "level": 16,
    "threshold": 15000000,
    "bonuses": {
      "atkPct": 34,
      "defPct": 25,
      "hpPct": 55,
      "critRatePoints": 10,
      "critDamagePct": 48
    }
  },
  {
    "level": 17,
    "threshold": 25000000,
    "bonuses": {
      "atkPct": 37,
      "defPct": 28,
      "hpPct": 62,
      "critRatePoints": 11,
      "critDamagePct": 54
    }
  },
  {
    "level": 18,
    "threshold": 50000000,
    "bonuses": {
      "atkPct": 42,
      "defPct": 30,
      "hpPct": 70,
      "critRatePoints": 13,
      "critDamagePct": 60
    }
  }
] as const;
export const VIP_MAX = 18;
export const VIP_CONVERSION = { vnd: 10000, baseKnb: 1000 } as const;
