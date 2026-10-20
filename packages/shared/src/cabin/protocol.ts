import type { LangCode, NeedPurpose, ProfileTag, ReplyId, RequestSource } from '../types';

/**
 * Messages exchanged between passenger devices (phone web app / seatback IFE)
 * and the crew tablet over the cabin network. In production this is a
 * WebSocket to the crew tablet's local server (PDF: Python + FastAPI +
 * WebSockets, no internet). In this prototype it runs over a `CabinBus`
 * (in-memory or BroadcastChannel) — see `bus.ts`.
 *
 * Privacy: messages carry the seat, language, need id and (only with consent)
 * profile tags. No names, no audio, no transcripts.
 */

export type DeviceKind = 'phone' | 'ife';

export type PassengerToCrew =
  | {
      type: 'request.create';
      requestId: string;
      seat: string;
      device: DeviceKind;
      lang: LangCode;
      needId: string;
      purposeId?: NeedPurpose['id'];
      source: RequestSource;
      tags: ProfileTag[];
      createdAt: number;
    }
  | { type: 'request.cancel'; requestId: string; seat: string }
  | { type: 'request.thanks'; requestId: string; seat: string };

export type CrewToPassenger =
  | { type: 'request.received'; requestId: string; seat: string }
  | { type: 'request.reply'; requestId: string; seat: string; replyId: ReplyId; crewName?: string; at: number }
  | { type: 'announcement'; id: string; templateId: string; at: number }
  | { type: 'crew.heartbeat'; at: number };

export type CabinMessage = PassengerToCrew | CrewToPassenger;

export function isCrewMessage(m: CabinMessage): m is CrewToPassenger {
  return m.type === 'request.received' || m.type === 'request.reply' || m.type === 'announcement' || m.type === 'crew.heartbeat';
}
