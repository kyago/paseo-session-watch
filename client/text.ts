import { defineTranslations, type PluginI18n } from "@getpaseo/plugin/client";

const en = {
  sessions: "Sessions",
  workspaceBadge: "Session counts",
  workspaceSessions: "{{n}} sessions",
  running: "Running {{n}}",
  needsInput: "Needs input {{n}}",
  pin: "Keep open",
  unpin: "Unpin",
  pinLabel: "Keep the session list open",
  unpinLabel: "Unpin the session list",
  untitled: "Untitled",
  openSession: "Open session {{title}}",
  more: "+{{n}} more, see Sessions",
  allow: "Allow",
  deny: "Deny",
  answerInSession: "Answer in the session.",
  empty: "No active agents.",
  showDone: "Show {{n}} finished",
  hideDone: "Hide finished",
  bucketNeedsInput: "Needs input",
  bucketFailed: "Failed",
  bucketRunning: "Running",
  bucketAttention: "Finished (unread)",
  bucketDone: "Finished",
  now: "just now",
  minutesAgo: "{{n}}m ago",
  hoursAgo: "{{n}}h ago",
  daysAgo: "{{n}}d ago",
};

const ko: typeof en = {
  sessions: "세션 현황",
  workspaceBadge: "세션 수",
  workspaceSessions: "세션 {{n}}개",
  running: "실행 {{n}}",
  needsInput: "응답 {{n}}",
  pin: "항상 표시",
  unpin: "고정 해제",
  pinLabel: "세션 현황 항상 표시",
  unpinLabel: "세션 현황 고정 해제",
  untitled: "제목 없음",
  openSession: "{{title}} 세션 열기",
  more: "외 {{n}}건, 세션 현황에서 확인",
  allow: "허용",
  deny: "거부",
  answerInSession: "세션에서 답해주세요.",
  empty: "진행 중인 에이전트가 없습니다.",
  showDone: "완료 {{n}}개 보기",
  hideDone: "완료 숨기기",
  bucketNeedsInput: "응답 필요",
  bucketFailed: "오류",
  bucketRunning: "실행 중",
  bucketAttention: "완료(확인 전)",
  bucketDone: "완료",
  now: "방금",
  minutesAgo: "{{n}}분 전",
  hoursAgo: "{{n}}시간 전",
  daysAgo: "{{n}}일 전",
};

export const text = defineTranslations({ resources: { en, ko } });
export type TextKey = keyof typeof en;

let i18n: PluginI18n | undefined;
/** Set from the client entry: the overlay root is outside Paseo's providers, where useTranslation() is unavailable. */
export const setI18n = (value: PluginI18n) => {
  i18n = value;
};

/** Text in the app's language, read at render time; the overlay picks up a language change on its next render. */
export const t = (key: TextKey, options?: Record<string, string | number>): string =>
  (i18n as unknown as { t(messages: typeof text, key: string, options?: object): string }).t(text, key, options);
