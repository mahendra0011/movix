const tierPrice = {
  platinum: 180,
  gold: 250,
  vip: 400,
};

function buildSeatLayout() {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"];
  const tierFor = (r) => {
    if (["A", "B"].includes(r)) return "platinum";
    if (["J", "K"].includes(r)) return "vip";
    return "gold";
  };
  const bookedSet = /* @__PURE__ */ new Set();
  let seed = 7;

  rows.forEach((r) => {
    for (let c = 1; c <= 14; c++) {
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 < 0.18) bookedSet.add(`${r}${c}`);
    }
  });

  return { rows, cols: 14, bookedSet, tierFor };
}

export { buildSeatLayout, tierPrice };
