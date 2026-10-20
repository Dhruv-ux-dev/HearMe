import type { Localized, Need, NeedCategory, NeedPurpose } from '../types';

/** Build a Localized record in a fixed order: en, hi, ja, th, id, vi. */
export function L(en: string, hi: string, ja: string, th: string, id: string, vi: string): Localized {
  return { en, hi, ja, th, id, vi };
}

/**
 * The needs catalogue.
 *
 * The PDF says most cabin requests are "the same 64 things" and that the
 * hackathon prototype targets 40. This prototype ships 22 to keep the demo
 * focused; the structure is the same and adding a need is data only.
 * Japanese labels are what the crew tablet shows (the demo route is a Japanese carrier).
 */
export const NEEDS: Need[] = [
  // ── Drinks ─────────────────────────────────────────────────────────────
  {
    id: 'water',
    category: 'drinks',
    icon: 'glass-water',
    common: true,
    purposes: ['for_medicine'],
    label: L('Water', 'पानी', 'お水', 'น้ำเปล่า', 'Air putih', 'Nước lọc'),
    phrases: {
      en: ['water', 'drinking water', 'cold water'],
      hi: ['पानी', 'paani', 'pani', 'ठंडा पानी'],
      ja: ['水', 'お水', 'みず'],
      th: ['น้ำเปล่า', 'น้ำดื่ม'],
      id: ['air putih', 'air minum'],
      vi: ['nuoc loc', 'nuoc uong'],
    },
    hints: { en: ['drink', 'thirsty'], hi: ['प्यास'], ja: ['飲み物'], th: ['หิวน้ำ'], id: ['haus'], vi: ['khat'] },
  },
  {
    id: 'hot_water',
    category: 'drinks',
    icon: 'coffee',
    common: true,
    purposes: ['for_medicine', 'for_child'],
    label: L('Hot water', 'गरम पानी', 'お湯', 'น้ำร้อน', 'Air panas', 'Nước nóng'),
    phrases: {
      en: ['hot water', 'warm water'],
      hi: ['गरम पानी', 'गर्म पानी', 'garam pani', 'garam paani'],
      ja: ['お湯', 'おゆ', '白湯'],
      th: ['น้ำร้อน', 'น้ำอุ่น'],
      id: ['air panas', 'air hangat'],
      vi: ['nuoc nong', 'nuoc am'],
    },
    hints: { en: ['hot', 'warm'], hi: ['गरम', 'गर्म', 'garam'], ja: ['熱い', '温かい'], th: ['ร้อน', 'อุ่น'], id: ['panas', 'hangat'], vi: ['nong'] },
  },
  {
    id: 'tea',
    category: 'drinks',
    icon: 'leaf',
    common: true,
    label: L('Tea', 'चाय', 'お茶', 'ชา', 'Teh', 'Trà'),
    phrases: { en: ['tea', 'chai'], hi: ['चाय', 'chai', 'chaay'], ja: ['お茶', '紅茶', '緑茶'], th: ['น้ำชา', 'ขอชา', 'ชาร้อน'], id: ['teh'], vi: ['tra'] },
    hints: { en: ['hot', 'warm'], hi: ['गरम', 'गर्म', 'garam'], ja: ['温かい'], th: ['อุ่น'], id: ['hangat'] },
  },
  {
    id: 'coffee',
    category: 'drinks',
    icon: 'coffee',
    label: L('Coffee', 'कॉफ़ी', 'コーヒー', 'กาแฟ', 'Kopi', 'Cà phê'),
    phrases: { en: ['coffee'], hi: ['कॉफ़ी', 'कॉफी', 'coffee'], ja: ['コーヒー'], th: ['กาแฟ'], id: ['kopi'], vi: ['ca phe'] },
  },
  {
    id: 'juice',
    category: 'drinks',
    icon: 'cup-soda',
    label: L('Juice', 'जूस', 'ジュース', 'น้ำผลไม้', 'Jus', 'Nước ép'),
    phrases: { en: ['juice', 'orange juice', 'apple juice'], hi: ['जूस', 'juice'], ja: ['ジュース'], th: ['น้ำผลไม้', 'น้ำส้ม'], id: ['jus'], vi: ['nuoc ep'] },
  },
  // ── Comfort ────────────────────────────────────────────────────────────
  {
    id: 'blanket',
    category: 'comfort',
    icon: 'bed',
    common: true,
    label: L('Blanket', 'कंबल', '毛布', 'ผ้าห่ม', 'Selimut', 'Chăn'),
    phrases: { en: ['blanket'], hi: ['कंबल', 'कम्बल', 'kambal'], ja: ['毛布', 'ブランケット'], th: ['ผ้าห่ม'], id: ['selimut'], vi: ['chan'] },
    hints: { en: ['warm', 'cold'], hi: ['गरम', 'गर्म', 'garam', 'ठंड'], ja: ['寒い'], th: ['หนาว'], id: ['dingin'], vi: ['lanh'] },
  },
  {
    id: 'pillow',
    category: 'comfort',
    icon: 'bed',
    label: L('Pillow', 'तकिया', '枕', 'หมอน', 'Bantal', 'Gối'),
    phrases: { en: ['pillow', 'cushion'], hi: ['तकिया', 'takiya'], ja: ['枕', 'まくら'], th: ['หมอน'], id: ['bantal'], vi: ['goi'] },
  },
  {
    id: 'too_cold',
    category: 'comfort',
    icon: 'snowflake',
    label: L('I feel cold', 'ठंड लग रही है', '寒い', 'หนาว', 'Kedinginan', 'Tôi thấy lạnh'),
    phrases: { en: ['too cold', 'feel cold', 'freezing'], hi: ['ठंड लग रही', 'thand'], ja: ['寒い', 'さむい'], th: ['หนาว'], id: ['kedinginan'], vi: ['thay lanh', 'lanh qua'] },
    hints: { en: ['cold'], hi: ['ठंड'], vi: ['lanh'], id: ['dingin'] },
  },
  {
    id: 'too_hot',
    category: 'comfort',
    icon: 'sun',
    label: L('I feel hot', 'गर्मी लग रही है', '暑い', 'ร้อน', 'Kepanasan', 'Tôi thấy nóng'),
    phrases: { en: ['too hot', 'feel hot', 'too warm'], hi: ['गर्मी', 'garmi'], ja: ['暑い', 'あつい'], th: ['ร้อนมาก'], id: ['kepanasan', 'gerah'], vi: ['thay nong', 'nong qua'] },
  },
  {
    id: 'headphones',
    category: 'comfort',
    icon: 'headphones',
    label: L('Headphones', 'हेडफ़ोन', 'ヘッドホン', 'หูฟัง', 'Headphone', 'Tai nghe'),
    phrases: { en: ['headphones', 'headphone', 'earphones'], hi: ['हेडफ़ोन', 'हेडफोन', 'headphone'], ja: ['ヘッドホン', 'イヤホン'], th: ['หูฟัง'], id: ['headphone', 'earphone'], vi: ['tai nghe'] },
  },
  // ── Food ───────────────────────────────────────────────────────────────
  {
    id: 'meal',
    category: 'food',
    icon: 'utensils',
    common: true,
    purposes: ['vegetarian', 'for_child'],
    label: L('Food', 'खाना', '食事', 'อาหาร', 'Makanan', 'Suất ăn'),
    phrases: { en: ['food', 'meal', 'hungry', 'eat'], hi: ['खाना', 'भूख', 'khana', 'bhookh'], ja: ['食事', 'ご飯', 'お腹が空'], th: ['อาหาร', 'หิวข้าว'], id: ['makanan', 'makan', 'lapar'], vi: ['do an', 'suat an', 'doi'] },
  },
  {
    id: 'snack',
    category: 'food',
    icon: 'cookie',
    label: L('Snack', 'हल्का नाश्ता', '軽食', 'ของว่าง', 'Camilan', 'Đồ ăn nhẹ'),
    phrases: { en: ['snack', 'biscuit'], hi: ['नाश्ता', 'बिस्कुट', 'nashta'], ja: ['軽食', 'お菓子'], th: ['ของว่าง', 'ขนม'], id: ['camilan', 'snack'], vi: ['do an nhe', 'banh'] },
  },
  // ── Help ───────────────────────────────────────────────────────────────
  {
    id: 'toilet',
    category: 'help',
    icon: 'toilet',
    common: true,
    label: L('Toilet', 'टॉयलेट', 'トイレ', 'ห้องน้ำ', 'Toilet', 'Nhà vệ sinh'),
    phrases: { en: ['toilet', 'bathroom', 'restroom', 'washroom', 'lavatory'], hi: ['टॉयलेट', 'शौचालय', 'बाथरूम', 'toilet'], ja: ['トイレ', 'お手洗い'], th: ['ห้องน้ำ'], id: ['toilet', 'kamar kecil'], vi: ['nha ve sinh', 'toilet'] },
  },
  {
    id: 'medicine',
    category: 'help',
    icon: 'pill',
    common: true,
    label: L('Medicine', 'दवाई', '薬', 'ยา', 'Obat', 'Thuốc'),
    phrases: { en: ['medicine', 'tablets', 'pills', 'painkiller'], hi: ['दवाई', 'दवा', 'dawai', 'dawa', 'goli', 'गोली'], ja: ['薬', 'くすり'], th: ['ขอยา', 'ยาแก้', 'ยาประจำตัว'], id: ['obat'], vi: ['thuoc'] },
  },
  {
    id: 'unwell',
    category: 'help',
    icon: 'thermometer',
    common: true,
    purposes: ['urgent'],
    label: L('I feel unwell', 'तबीयत ख़राब', '体調が悪い', 'ไม่สบาย', 'Tidak enak badan', 'Tôi thấy không khỏe'),
    phrases: { en: ['unwell', 'sick', 'not feeling well', 'dizzy', 'pain'], hi: ['तबीयत', 'चक्कर', 'दर्द', 'tabiyat', 'bimar', 'बीमार'], ja: ['体調', '気分が悪', 'めまい', '痛い'], th: ['ไม่สบาย', 'เวียนหัว', 'ปวด'], id: ['tidak enak badan', 'pusing', 'sakit'], vi: ['khong khoe', 'chong mat', 'dau'] },
  },
  {
    id: 'bag_help',
    category: 'help',
    icon: 'luggage',
    label: L('Help with my bag', 'सामान में मदद', '荷物の手伝い', 'ช่วยเรื่องกระเป๋า', 'Bantuan tas', 'Giúp hành lý'),
    phrases: { en: ['bag', 'luggage', 'suitcase', 'overhead'], hi: ['सामान', 'बैग', 'saman', 'bag'], ja: ['荷物', 'かばん'], th: ['กระเป๋า'], id: ['tas', 'koper'], vi: ['hanh ly', 'tui'] },
  },
  {
    id: 'call_crew',
    category: 'help',
    icon: 'bell-ring',
    label: L('Please come to my seat', 'कृपया मेरी सीट पर आएँ', '席に来てください', 'กรุณามาที่ที่นั่ง', 'Tolong datang ke kursi saya', 'Xin đến ghế của tôi'),
    phrases: { en: ['come here', 'call crew', 'call the crew', 'come to my seat'], hi: ['यहाँ आइए', 'क्रू को बुलाओ'], ja: ['来てください', '呼んで'], th: ['ช่วยด้วย'], id: ['tolong datang'], vi: ['den day'] },
    hints: { en: ['help'], hi: ['मदद', 'madad'], ja: ['助けて'], th: ['ช่วย'], id: ['tolong', 'bantu'], vi: ['giup'] },
  },
  {
    id: 'wheelchair_arrival',
    category: 'help',
    icon: 'accessibility',
    label: L('Wheelchair on arrival', 'पहुँचने पर व्हीलचेयर', '到着時に車いす', 'รถเข็นเมื่อถึงปลายทาง', 'Kursi roda saat tiba', 'Xe lăn khi đến nơi'),
    phrases: { en: ['wheelchair'], hi: ['व्हीलचेयर', 'wheelchair'], ja: ['車いす', '車椅子'], th: ['รถเข็น'], id: ['kursi roda'], vi: ['xe lan'] },
  },
  // ── Private ────────────────────────────────────────────────────────────
  {
    id: 'sanitary',
    category: 'private',
    icon: 'shopping-bag',
    private: true,
    label: L('Sanitary products', 'सैनिटरी पैड', '生理用品', 'ผ้าอนามัย', 'Pembalut', 'Băng vệ sinh'),
    phrases: { en: ['sanitary', 'pad', 'tampon', 'period'], hi: ['पैड', 'सैनिटरी', 'pad'], ja: ['生理用品', 'ナプキン'], th: ['ผ้าอนามัย'], id: ['pembalut'], vi: ['bang ve sinh'] },
  },
  {
    id: 'sick_bag',
    category: 'private',
    icon: 'shopping-bag',
    private: true,
    label: L('Sick bag', 'उल्टी की थैली', 'エチケット袋', 'ถุงอาเจียน', 'Kantong muntah', 'Túi nôn'),
    phrases: { en: ['sick bag', 'vomit', 'throw up', 'nausea'], hi: ['उल्टी', 'ulti'], ja: ['吐き気', 'エチケット袋'], th: ['อาเจียน', 'คลื่นไส้'], id: ['muntah', 'mual'], vi: ['buon non', 'muon non'] },
  },
  {
    id: 'toilet_assist',
    category: 'private',
    icon: 'hand-helping',
    private: true,
    label: L('Help going to the toilet', 'टॉयलेट जाने में मदद', 'トイレへの介助', 'ช่วยพาไปห้องน้ำ', 'Bantuan ke toilet', 'Giúp đi vệ sinh'),
    phrases: { en: ['help to the toilet', 'help going to the toilet'], hi: ['टॉयलेट जाने में मदद'], ja: ['トイレの介助'], th: ['ช่วยพาไปห้องน้ำ'], id: ['bantuan ke toilet'], vi: ['giup di ve sinh'] },
  },
  {
    id: 'private_talk',
    category: 'private',
    icon: 'lock',
    private: true,
    label: L('Talk to crew privately', 'क्रू से निजी बात', '内密に相談したい', 'ขอคุยเป็นการส่วนตัว', 'Bicara pribadi dengan awak', 'Nói chuyện riêng với tiếp viên'),
    phrases: { en: ['privately', 'private'], hi: ['निजी', 'अकेले में'], ja: ['内密', '内緒'], th: ['ส่วนตัว'], id: ['pribadi'], vi: ['rieng tu'] },
  },
];

export const PURPOSES: NeedPurpose[] = [
  { id: 'for_medicine', label: L('to take medicine', 'दवाई के लिए', '服薬のため', 'เพื่อกินยา', 'untuk minum obat', 'để uống thuốc') },
  { id: 'vegetarian', label: L('vegetarian', 'शाकाहारी', 'ベジタリアン', 'มังสวิรัติ', 'vegetarian', 'ăn chay') },
  { id: 'for_child', label: L('for a child', 'बच्चे के लिए', '子ども用', 'สำหรับเด็ก', 'untuk anak', 'cho trẻ em') },
  { id: 'urgent', label: L('urgent', 'जल्दी', '至急', 'ด่วน', 'mendesak', 'khẩn cấp') },
];

/** Vocabulary that marks a purpose in speech/typed input (matched before needs, so it is not mistaken for a need). */
export const PURPOSE_PHRASES: Record<NeedPurpose['id'], string[]> = {
  for_medicine: [
    'for medicine', 'for my medicine', 'to take medicine', 'to take my medicine', 'for my tablets', 'for my pills', 'for tablets',
    'दवाई के लिए', 'दवा के लिए', 'दवाई लेने', 'dawai ke liye', 'dawa ke liye',
    '薬を飲む', '服薬', '薬のため',
    'เพื่อกินยา', 'กินยา',
    'minum obat', 'untuk obat',
    'uong thuoc',
  ],
  vegetarian: ['vegetarian', 'veg', 'शाकाहारी', 'shakahari', 'ベジタリアン', 'มังสวิรัติ', 'ăn chay', 'an chay'],
  for_child: ['for my child', 'for a child', 'for my baby', 'बच्चे के लिए', 'bacche ke liye', '子ども', '赤ちゃん', 'สำหรับเด็ก', 'untuk anak', 'cho tre', 'cho be'],
  urgent: ['urgent', 'quickly', 'emergency', 'जल्दी', 'jaldi', '至急', '急いで', 'ด่วน', 'mendesak', 'darurat', 'khan cap'],
};

export const CATEGORY_LABELS: Record<NeedCategory, ReturnType<typeof L>> = {
  drinks: L('Drinks', 'पेय', '飲み物', 'เครื่องดื่ม', 'Minuman', 'Đồ uống'),
  comfort: L('Comfort', 'आराम', '快適', 'ความสบาย', 'Kenyamanan', 'Tiện nghi'),
  food: L('Food', 'खाना', '食事', 'อาหาร', 'Makanan', 'Đồ ăn'),
  help: L('Help', 'मदद', 'サポート', 'ช่วยเหลือ', 'Bantuan', 'Trợ giúp'),
  private: L('Private', 'निजी', 'プライベート', 'ส่วนตัว', 'Pribadi', 'Riêng tư'),
};

export const CATEGORIES: NeedCategory[] = ['drinks', 'comfort', 'food', 'help', 'private'];

const byId = new Map(NEEDS.map((n) => [n.id, n]));

export function getNeed(id: string): Need | undefined {
  return byId.get(id);
}

export function requireNeed(id: string): Need {
  const need = byId.get(id);
  if (!need) throw new Error(`Unknown need: ${id}`);
  return need;
}

export function getPurpose(id: NeedPurpose['id'] | undefined): NeedPurpose | undefined {
  return id ? PURPOSES.find((p) => p.id === id) : undefined;
}

export const COMMON_NEEDS: Need[] = NEEDS.filter((n) => n.common);
export const PRIVATE_NEEDS: Need[] = NEEDS.filter((n) => n.private);

export function needsInCategory(category: NeedCategory): Need[] {
  return NEEDS.filter((n) => n.category === category);
}
