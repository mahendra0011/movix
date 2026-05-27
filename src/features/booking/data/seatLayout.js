const tierPrice = {
  platinum: 180,
  gold: 250,
  vip: 400,
};

const defaultSeatLayoutConfig = {
  rowCount: 10,
  seatsPerRow: 14,
  platinumRows: 2,
  vipRows: 2,
  aisleAfter: 7,
  blockedSeats: [],
};

function buildSeatLayout(config = defaultSeatLayoutConfig) {
  const normalized = normalizeSeatLayoutConfig(config);
  const rows = buildRowLabels(normalized.rowCount);
  const blockedSet = new Set(normalized.blockedSeats);
  const tierFor = (row) => {
    const index = rows.indexOf(row);
    if (index >= 0 && index < normalized.platinumRows) return "platinum";
    if (index >= rows.length - normalized.vipRows) return "vip";
    return "gold";
  };

  return {
    ...normalized,
    rows,
    cols: normalized.seatsPerRow,
    blockedSet,
    bookedSet: /* @__PURE__ */ new Set(),
    tierFor,
    totalSeats: rows.length * normalized.seatsPerRow - blockedSet.size,
  };
}

function normalizeSeatLayoutConfig(config = {}) {
  const rowCount = clampNumber(
    config.rowCount ?? config.rows,
    4,
    26,
    defaultSeatLayoutConfig.rowCount,
  );
  const seatsPerRow = clampNumber(
    config.seatsPerRow ?? config.cols,
    6,
    30,
    defaultSeatLayoutConfig.seatsPerRow,
  );
  const platinumRows = clampNumber(
    config.platinumRows,
    0,
    rowCount,
    defaultSeatLayoutConfig.platinumRows,
  );
  const vipRows = clampNumber(
    config.vipRows,
    0,
    Math.max(0, rowCount - platinumRows),
    defaultSeatLayoutConfig.vipRows,
  );
  const aisleAfter = clampNumber(
    config.aisleAfter,
    0,
    seatsPerRow - 1,
    defaultSeatLayoutConfig.aisleAfter,
  );

  return {
    rowCount,
    seatsPerRow,
    platinumRows,
    vipRows,
    aisleAfter,
    blockedSeats: normalizeBlockedSeats(config.blockedSeats, rowCount, seatsPerRow),
  };
}

function normalizeBlockedSeats(value, rowCount, seatsPerRow) {
  const rows = buildRowLabels(rowCount);
  const allowedRows = new Set(rows);
  const values = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(",")
        .map((seat) => seat.trim());

  return [
    ...new Set(
      values
        .map((seat) => String(seat).trim().toUpperCase())
        .filter((seat) => {
          const match = seat.match(/^([A-Z]+)(\d{1,2})$/);
          if (!match) return false;
          const column = Number(match[2]);
          return allowedRows.has(match[1]) && column >= 1 && column <= seatsPerRow;
        }),
    ),
  ];
}

function buildRowLabels(rowCount) {
  const labels = [];
  let code = 65;
  while (labels.length < rowCount) {
    const label = String.fromCharCode(code);
    code += 1;
    if (label === "I" || label === "O") continue;
    labels.push(label);
  }
  return labels;
}

function clampNumber(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, Math.round(next)));
}

export { buildSeatLayout, defaultSeatLayoutConfig, normalizeSeatLayoutConfig, tierPrice };
