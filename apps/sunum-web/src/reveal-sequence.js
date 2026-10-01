export function groupItems(items, groupSize) {
  if (!Number.isInteger(groupSize) || groupSize < 1) throw new RangeError("groupSize must be a positive integer");
  const groups = [];
  for (let start = 0; start < items.length; start += groupSize) {
    groups.push(items.slice(start, start + groupSize));
  }
  return groups;
}

// Complete one group's answer before revealing the next group's prompt.
export function interleaveStages(groups) {
  return groups.flatMap((group, index) => index === 0
    ? [{ group, stage: "answer" }]
    : [{ group, stage: "prompt" }, { group, stage: "answer" }]);
}
