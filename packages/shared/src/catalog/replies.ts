import type { Localized, ReplyId } from '../types';
import { L } from './needs';

/**
 * One-tap crew replies. The crew taps a Japanese reply; the passenger receives
 * a pre-written translation (no live machine translation). Prototype drafts:
 * all translations need human review before a pilot.
 */
export interface ReplyTemplate {
  id: ReplyId;
  text: Localized;
  /** Shown on the crew console as the button's English gloss. */
  tone: 'positive' | 'wait' | 'negative' | 'info';
}

export const REPLIES: ReplyTemplate[] = [
  {
    id: 'bringing_now',
    tone: 'positive',
    text: L(
      'We are bringing it to you now.',
      'हम इसे तुरंत ला रहे हैं।',
      'すぐにお持ちします。',
      'เรากำลังนำมาให้ทันที',
      'Kami segera membawakannya.',
      'Chúng tôi đang mang đến ngay.',
    ),
  },
  {
    id: 'one_moment',
    tone: 'wait',
    text: L('One moment, please.', 'कृपया थोड़ा इंतज़ार करें।', '少々お待ちください。', 'กรุณารอสักครู่', 'Mohon tunggu sebentar.', 'Xin vui lòng chờ một chút.'),
  },
  {
    id: 'coming_to_seat',
    tone: 'positive',
    text: L(
      'A crew member is coming to your seat.',
      'क्रू सदस्य आपकी सीट पर आ रहे हैं।',
      'お席へ伺います。',
      'ลูกเรือกำลังไปที่ที่นั่งของคุณ',
      'Awak kabin sedang menuju kursi Anda.',
      'Tiếp viên đang đến ghế của bạn.',
    ),
  },
  {
    id: 'after_seatbelt',
    tone: 'wait',
    text: L(
      'We will come when the seatbelt sign is off.',
      'सीटबेल्ट का संकेत बंद होने पर हम आएँगे।',
      'シートベルト着用サインが消えたら伺います。',
      'เราจะมาเมื่อสัญญาณคาดเข็มขัดดับ',
      'Kami akan datang setelah tanda sabuk pengaman padam.',
      'Chúng tôi sẽ đến khi đèn thắt dây an toàn tắt.',
    ),
  },
  {
    id: 'not_available',
    tone: 'negative',
    text: L(
      'Sorry, we do not have this on board. A crew member will suggest something else.',
      'माफ़ कीजिए, यह विमान में उपलब्ध नहीं है। क्रू कोई और विकल्प बताएगा।',
      '申し訳ありません、機内にご用意がありません。代わりのものをご案内します。',
      'ขออภัย ไม่มีสิ่งนี้บนเครื่อง ลูกเรือจะแนะนำทางเลือกอื่น',
      'Maaf, ini tidak tersedia. Awak kabin akan menawarkan alternatif.',
      'Xin lỗi, không có trên máy bay. Tiếp viên sẽ gợi ý thứ khác.',
    ),
  },
  {
    id: 'ground_informed',
    tone: 'info',
    text: L(
      'We have told the ground staff. Help will be waiting when we land.',
      'हमने ग्राउंड स्टाफ़ को बता दिया है। उतरने पर मदद तैयार रहेगी।',
      '地上係員に連絡しました。到着時にお手伝いします。',
      'แจ้งเจ้าหน้าที่ภาคพื้นแล้ว จะมีคนรอช่วยเมื่อลงจอด',
      'Kami sudah memberi tahu petugas darat. Bantuan akan menunggu saat mendarat.',
      'Chúng tôi đã báo nhân viên mặt đất. Sẽ có người hỗ trợ khi hạ cánh.',
    ),
  },
];

export function getReply(id: ReplyId): ReplyTemplate {
  return REPLIES.find((r) => r.id === id) ?? REPLIES[0]!;
}
