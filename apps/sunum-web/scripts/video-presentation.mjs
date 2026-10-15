// Sunum Web'e özgü, denetlenmiş video kartları.
// Ayrıntılı konuşma/ekran dökümleri kanonik ders akışlarında ve QR kanıt notlarında kalır.
// Bu projeksiyon yalnız şifreli Web Sunum kataloğuna uygulanır.
const cards = {
  "T11-T01-MEKTUP/s43-video-transcript": {
    title: "Mektup Türünün Serüveni",
    file: "19XU49ME.mp4",
    lead: "Mektubun kişisel ilişkiler ve kültürel hafıza açısından önemini ele alan videoyu izleyin.",
    items: ["Mektupların duyguları ve yaşanan dönemi nasıl yansıttığını düşünün.", "Mektup ile günümüzün dijital iletişim biçimlerini karşılaştırmak üzere not alın."]
  },
  "T11-T01-KONUSMA/s53-video-summary": {
    title: "Seksenler — İletişim Engelleri",
    file: "19XU49K2.mp4",
    lead: "Diziden alınan sahnelerde aile içi konuşmaları ve iletişim engellerini gözlemleyin.",
    items: ["Dinleme ve söz kesme davranışlarına dikkat edin.", "İletişimi kolaylaştıracak farklı tutumlar önerin."]
  },
  "T11-T01-DINLEME-IZLEME/s64-video-summary": {
    title: "Aklıselim — Mektuptan E-postaya",
    file: "19XU49LL.mp4",
    lead: "İletişim araçlarının değişimini konu alan söyleşiyi dinleyin. Konuşmacıların görüşlerini kendi notlarınızla değerlendirin.",
    items: ["Mektup ve e-postanın kullanımını karşılaştırın.", "İletişimin hızlanmasının yararlarını ve sınırlılıklarını tartışın."]
  },
  "T11-T01-DINLEME-IZLEME/s67-qr-communication": {
    title: "Geçmişten Günümüze İletişim Araçları",
    file: "19XU4CVR.mp4",
    lead: "Tarih boyunca kullanılan iletişim araçlarını tanıtan kısa videoyu izleyin. Anlatım, enstrümantal müzik ve ekrandaki yazılarla ilerler.",
    items: ["Araçların hangi ihtiyaçları karşıladığını belirleyin.", "İletişim biçimlerinin zamanla nasıl değiştiğini karşılaştırın."]
  },
  "T11-T02-GIRIS/s88-video-transcript": {
    title: "Ortak Miras — Toylar ve Şenlikler",
    file: "19XU49LO.mp4",
    fileCandidate: true,
    lead: "Türk kültüründeki toy, tören ve şenlik geleneklerine ilişkin videoyu izleyin.",
    items: ["Geleneklerin toplumsal birliktelikteki rolünü gözlemleyin.", "Geçmişten günümüze süren ve değişen özellikleri karşılaştırın."]
  },
  "T11-T02-ORHUN/s113-media-reminder": {
    title: "Orhun Vadisi — İzleme",
    file: "19XU49LT.mp4",
    fileCandidate: true,
    lead: "İlk soruya geçmeden önce Orhun Vadisi videosunu izleyin; yazıtların tarihî ve kültürel önemine ilişkin gözlemlerinizi kaydedin.",
    items: ["Yazıtların bulunduğu çevre ve işlevleriyle ilgili ayrıntılara dikkat edin.", "Videoda duyduğunuz bilgilerle kendi yorumlarınızı ayırın."]
  },
  "T11-T02-KONUSMA/s129-media-reminder": { omit: true },
  "T11-T02-KONUSMA/s129-video-transcript": {
    title: "Dünyadaki Türkiye — İzleme",
    file: "19XU49LP.mp4",
    fileCandidate: true,
    lead: "Türklerin farklı coğrafyalardaki tarihî ve kültürel etkilerini konu alan videoyu izleyin.",
    items: ["Öne çıkan örnekleri not alın.", "İleri sürülen görüşlerle gözlemlediğiniz görsel kanıtları ayırın."]
  },
  "T11-T02-ASIK-ATISMASI/s140-video-transcript": {
    title: "Murat Çobanoğlu ve Şeref Taşlıova — Âşık Atışması",
    file: "19XU49JV.mp4",
    fileCandidate: true,
    lead: "İki âşığın karşılıklı söyleyişini dinleyerek sözlü kültür geleneğinin özelliklerini gözlemleyin.",
    items: ["Söyleyiş sırasına, uyaklara ve bağlama eşliğine dikkat edin.", "Atışmanın anlatım ve icra özelliklerini değerlendirin."]
  },
  "T11-T02-ASIK-ATISMASI/s141-video-transcript": {
    title: "Geleneğin Kalp Atışları — Âşıklık",
    file: "19XU49MG.mp4",
    fileCandidate: true,
    lead: "Âşıklık geleneğinin geçmişini ve günümüze aktarılışını konu alan söyleşiyi izleyin.",
    items: ["Geleneği yaşatan kişi ve ortamları belirleyin.", "Sözlü kültürün kuşaklar arası aktarımını tartışın."]
  },
  "T11-T02-DEGERLENDIRME/s159-video-transcript": {
    title: "Göktürklerin Dirilişi — Yazıtlar",
    file: "19XU49MB.mp4",
    fileCandidate: true,
    lead: "Göktürk tarihi ve Orhun Yazıtları üzerine hazırlanan videoyu izleyin.",
    items: ["Yazıtların tarihî tanıklığına ilişkin bilgilerden notlar çıkarın.", "İzlediğiniz içeriği farklı bir kültürel miras örneğiyle ilişkilendirin."]
  },
  "T11-T02-DEGERLENDIRME/s159-q8": {
    lead: "Orhun Abideleri ile seçtiğiniz başka bir eserin kültürel miras açısından ortak yönünü somut örneklerle gerekçelendirin."
  },
  "T11-T03-DIRENISIN-USTALARI-215-220/s220-map-intro": {
    title: "Osmancık ve Direnişin Ustaları — Karşılaştırmaya Hazırlık",
    lead: "İki yapımdaki olay, kişi, mekân ve ses kullanımını karşılaştırmaya hazırlanın.",
    items: ["Osmancık'taki sahne ve diyaloglara ilişkin gözlemlerinizi kullanın.", "Direnişin Ustaları kaydını dinleyin; benzerlikleri ve farklılıkları gerekçelendirin."]
  },
  "T11-T04-ANADOLU-INSANI-284-290/s285-short-teaser-transcript": {
    title: "Anadolu İnsanı — Fedakârlık (Tanıtım)",
    file: "19XU4GDV.mp4",
    fileCandidate: true,
    lead: "Fedakârlık temasını tanıtan kısa jeneriği izleyin.",
    items: ["Görüntü ve sesin birlikte oluşturduğu duyguya dikkat edin.", "Belgeselin hangi insani değerleri işleyeceğini tahmin edin."]
  },
  "T11-T04-ANADOLU-INSANI-284-290/s286-video-notes": {
    title: "Anadolu İnsanı — Fedakârlık (Belgesel)",
    file: "19XU49LQ.mp4",
    fileCandidate: true,
    lead: "Doğaya ve canlılara karşı duyarlılığı konu alan belgeseli izleyerek gözlemlerinizi kaydedin.",
    items: ["Mehmet Bey'in davranışlarını ve bunların gerekçelerini gözlemleyin.", "Fedakârlık kavramını belgeselden örneklerle değerlendirin."]
  },
  "T11-T04-ANADOLU-INSANI-284-290/s286-screen-text": { omit: true },
  "T11-T04-ANADOLU-INSANI-284-290/s286-closing-credits": { omit: true },
  "T11-T04-ANADOLU-INSANI-COZUMLEME-291-297/s293-video-summary": {
    title: "Anadolu İnsanı — Çalışkanlık",
    file: "19XU49KB.mp4",
    fileCandidate: true,
    lead: "Kırsal yaşamda emek, üretim ve çalışkanlığı konu alan belgeseli izleyin.",
    items: ["Gündelik çalışma hayatından somut gözlemler kaydedin.", "Geleneksel üretim ve kuşaklar arası bilgi aktarımı üzerine düşünün."]
  },
  "T11-T04-AFIS-ATOLYESI-298-302/s300-video-poster-steps": {
    title: "Afiş Hazırlama Basamakları",
    file: "19XU3SW3.mp4",
    fileCandidate: true,
    lead: "Ekran yazıları ve müzikle anlatılan afiş tasarım sürecini izleyin.",
    items: ["Hedef kitle, ana ileti, görsel seçim ve düzenleme aşamalarını gözlemleyin.", "Kendi afişinizi tasarlarken kullanabileceğiniz ilkeleri seçin."]
  },
  "T11-T04-DEGERLENDIRME-303-307/s307-aidiyet-media-reminder": {
    title: "Anadolu İnsanı — Aidiyet",
    file: "19XU49LS.mp4",
    fileCandidate: true,
    lead: "Aidiyet ve yaşadığı çevreye sahip çıkma temasını işleyen videoyu, 13. ve 14. soruları yanıtlamadan önce izleyin.",
    items: ["Kişilerin davranışları ile bu davranışların dayandığı değerleri ayırın.", "Gözlemlediğiniz somut örnekleri not edin."]
  },
  "T11-T04-DEGERLENDIRME-303-307/s307-video-transcript": { omit: true }
};

export const videoPresentationCases = Object.freeze(Object.keys(cards));

export function videoPresentationRule(lessonId, stepId) {
  return cards[`${lessonId}/${stepId}`] ?? null;
}

// Kanonik akışı değiştirme: yalnız Web Sunum için öğrenciye uygun
// tek sayfalık video tanıtımları üret, teknik dökümleri hiç paketleme.
export function projectVideoStep(step, lessonId) {
  const card = videoPresentationRule(lessonId, step.id);
  if (!card) return step;
  if (card.omit) return null;
  if (!card.title) {
    return { ...step, content: { ...step.content, lead: card.lead } };
  }
  const sources = step.content?.sources;
  return {
    ...step,
    display_prompt: card.title,
    video_file: card.file ? `${card.fileCandidate ? "Video dosyası adayı" : "Video dosyası"}: ${card.file}` : undefined,
    content: {
      lead: card.lead,
      items: card.items,
      ...(sources?.length ? { sources } : {})
    }
  };
}
