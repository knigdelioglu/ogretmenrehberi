// The book inventory owns form identities; external QR contents are not inferred.
export function assessmentFormsForLessons(index, lessons, bookUrl) {
  const remotePdf = index.current_remote_pdf_target;
  if (!remotePdf?.id || !remotePdf?.url || !/^[a-f0-9]{64}$/i.test(remotePdf.sha256 || "") ||
      !Number.isInteger(remotePdf.page_count) || remotePdf.page_count < 1 ||
      remotePdf.page_numbering !== "printed_page") {
    throw new Error("Güncel çevrim içi ders kitabı PDF eşlemesi geçersiz.");
  }
  if (bookUrl !== remotePdf.url) {
    throw new Error("Değerlendirme formları beklenen güncel ders kitabı PDF'sini kullanmıyor.");
  }
  const forms = index.forms.filter((form) => form.location_scope === "EXTERNAL_OFFICIAL_QR");
  const ids = new Set();
  for (const form of forms) {
    if (!form.form_id || ids.has(form.form_id) || !form.title || !Number.isInteger(form.printed_page) ||
        !Number.isInteger(form.pdf_page) || form.pdf_page < 1 ||
        form.remote_pdf_asset_id !== remotePdf.id ||
        form.remote_pdf_page !== form.printed_page || form.remote_pdf_page > remotePdf.page_count ||
        !form.linked_theme_ids?.length) {
      throw new Error(`Geçersiz değerlendirme formu: ${form.form_id}`);
    }
    ids.add(form.form_id);
    if (form.target_url) {
      const url = new URL(form.target_url);
      if (url.protocol !== "https:" || url.hostname !== "ders.eba.gov.tr") {
        throw new Error(`Geçersiz EBA form kaynağı: ${form.form_id}`);
      }
    }
  }
  const matched = new Set();
  const result = new Map(lessons.map((lesson) => {
    const [from, to = from] = lesson.printed_page_range.split("-").map(Number);
    const selected = forms.filter((form) => form.linked_theme_ids.includes(lesson.theme_id) &&
      form.printed_page >= from && form.printed_page <= to).map((form) => {
      matched.add(form.form_id);
      return {
        id: form.form_id,
        title: form.title.replace(" (QR)", ""),
        page: form.printed_page,
        source_url: form.target_url || `${remotePdf.url}#page=${form.remote_pdf_page}`,
        source_label: form.target_url ? "EBA form kaynağını aç" : "Kitaptaki karekodu aç"
      };
    });
    return [lesson.lesson_id, selected];
  }));
  for (const form of forms) {
    if (!matched.has(form.form_id)) throw new Error(`Derse bağlanamayan değerlendirme formu: ${form.form_id}`);
  }
  return result;
}
