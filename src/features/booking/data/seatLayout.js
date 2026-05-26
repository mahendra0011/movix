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

  return { rows, cols: 14, bookedSet, tierFor };
}

export { buildSeatLayout, tierPrice };
