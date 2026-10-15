const normalize = (value) => String(value ?? "").toLocaleLowerCase("tr-TR");
const flatten = (value) => Array.isArray(value)
  ? value.map(flatten).join(" ")
  : value && typeof value === "object"
    ? Object.values(value).map(flatten).join(" ")
    : String(value ?? "");

function requireContract(condition, message) {
  if (!condition) throw new Error(`[presentation-pedagogy] ${message}`);
}

function hasAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

/**
 * Protect the distinction between source-backed biography/life material and
 * fictional transformations without pinning the tests to answer wording.
 */
export function assertFactFictionBoundaries({ huzurAnswer, mimarFactAnswer, mimarRoleplayAnswer, mimarScenarioAnswer }) {
  const real = normalize(flatten(huzurAnswer?.answer_sections?.gercek_hayattan_alinanlar));
  const fictional = normalize(flatten(huzurAnswer?.answer_sections?.kurgusal_unsurlar));

  requireContract(huzurAnswer?.question_id === "T3-P182-Q01", "Theme 3 fact/fiction answer mapping changed unexpectedly.");
  requireContract(real.trim().length > 0 && fictional.trim().length > 0, "Theme 3 must keep separate, nonempty real-life and fiction groups.");
  requireContract(hasAny(real, [/tanpınar/u, /yahya kemal/u, /nuran/u]) && /hayat|gerçek/u.test(real),
    "Theme 3 real-life group must retain source-backed people or inspiration relationships.");
  requireContract(/romanda/u.test(fictional) && /akrabalık/u.test(fictional) && /kurgula|değiştir|yeniden düzenle/u.test(fictional),
    "Theme 3 fiction group must identify relationships or traits reconstructed in the novel.");
  requireContract(!/romanda|akrabalık|kurgula/u.test(real),
    "Theme 3 must not present fictional relationships as real-life facts.");

  const factSections = mimarFactAnswer?.answer_sections ?? {};
  const factText = normalize(Object.entries(factSections).map(([key, value]) => `${key} ${flatten(value)}`).join(" "));
  const sectionLabels = Object.keys(factSections).map(normalize);
  requireContract(mimarFactAnswer?.question_id === "T4-P240-FACT01" && sectionLabels.length >= 2,
    "Theme 4 must preserve separate source-fact and invented-text categories.");
  requireContract(hasAny(factText, [/doğrulan|kaynak|bilgi görseli/u]) && hasAny(factText, [/hayal|kurmaca|kurgusal/u]),
    "Theme 4 fact/fiction comparison must identify source-backed facts and imagined text.");

  const roleplay = normalize(flatten(mimarRoleplayAnswer));
  requireContract(mimarRoleplayAnswer?.question_id === "T4-P240-PERF01" && /hayal|kurmaca/u.test(roleplay),
    "Mimar Sinan dialogue and monologue must remain labeled as fictional work.");
  requireContract(/tarih[iî]/u.test(roleplay) && /alıntı|söz/u.test(roleplay) && /değil|göstermeyin|aktarmayın/u.test(roleplay),
    "Mimar Sinan's invented dialogue must not be presented as a historical quotation.");

  const scenario = normalize(flatten(mimarScenarioAnswer));
  requireContract(mimarScenarioAnswer?.question_id === "T4-P262-PERFQ02" && /kurmaca|hayal[iî]/u.test(scenario),
    "Theme 4 student-created scenario must remain labeled as fictional.");
  requireContract(/tarih[iî].{0,45}(olay|vaka).{0,24}(değil|olmay|sayılma)|(?:değil|olmay|sayılma).{0,24}tarih[iî].{0,30}(olay|vaka)/u.test(scenario),
    "Theme 4 student-created scenario must not be presented as a historical event.");
}
