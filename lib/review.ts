// ルールベースの投稿審査（NGワード検出等）。
//
// 重要：この審査結果は投稿の公開をブロックしない。
// 投稿は送信と同時に status='published' で即時公開される。
// ここでの verdict は、編集部が事後に目視確認すべき投稿を
// review_logs.verdict='flagged' として拾い上げるためだけに使う。
//
// 将来、design-ref/ai-review-prompt.md にもとづく本格的なAI審査（Claude API）
// に差し替える場合も、この reviewArticle() のシグネチャを維持すればよい。

export const REVIEW_RULE_VERSION = "rule-based-v1";

export type ReviewViolation = {
  rule: string;
  detail: string;
  excerpt?: string;
};

export type ReviewResult = {
  verdict: "clean" | "flagged";
  violations: ReviewViolation[];
  summary: string;
  ruleVersion: string;
};

export type ReviewInput = {
  title: string;
  bodyHtml: string;
  bodyText: string;
  linkCount: number;
  isSponsored: boolean;
  contactOrg: string;
  contactEmail: string;
};

// 薬機法・景品表示法まわりで問題になりやすい断定表現・誇大表現。
// ヒットしても即NGにはせず「flagged」として編集部確認に回すだけ。
const NG_PATTERNS: { rule: string; pattern: RegExp }[] = [
  { rule: "薬機法_治療効果断定", pattern: /(必ず|絶対に)(治る|治せる|完治)/ },
  { rule: "薬機法_最上級表現", pattern: /(世界|業界|日本)(一|No\.?1|No1|ナンバーワン)(の効果|の効能)?/ },
  { rule: "誇大_断定的煽り", pattern: /(絶対|100%|完全に)(儲かる|稼げる|痩せる)/ },
  { rule: "違法_出会い系誘導", pattern: /(出会い系|援助交際|パパ活)(募集|相手探し)/ },
  { rule: "違法_無許可医療広告", pattern: /(無許可|無資格)(医療|施術|手術)/ },
  { rule: "スパム_過剰な連絡誘導", pattern: /(今すぐ|24時間以内).{0,6}(電話|LINE|DM).{0,6}(ください|してください)/ },
  { rule: "差別的表現_疑い", pattern: /(死ね|殺す|消えろ)/ },
];

const MAX_TITLE_LENGTH = 60;
const MIN_BODY_LENGTH = 200;
const MAX_LINK_COUNT_FREE = 2;
const MAX_LINK_COUNT_SPONSORED = 5;

export function reviewArticle(input: ReviewInput): ReviewResult {
  const violations: ReviewViolation[] = [];

  // 1. NGワード・危険表現の検出
  for (const { rule, pattern } of NG_PATTERNS) {
    const match = input.title.match(pattern) ?? input.bodyText.match(pattern);
    if (match) {
      violations.push({
        rule,
        detail: `パターン「${pattern}」に一致する表現を検出`,
        excerpt: match[0],
      });
    }
  }

  // 2. 必須項目チェック
  if (!input.title.trim()) {
    violations.push({ rule: "必須項目_タイトル未入力", detail: "タイトルが空です" });
  }
  if (input.title.length > MAX_TITLE_LENGTH) {
    violations.push({
      rule: "文字数_タイトル超過",
      detail: `タイトルが${MAX_TITLE_LENGTH}文字を超えています（${input.title.length}文字）`,
    });
  }
  if (input.bodyText.trim().length < MIN_BODY_LENGTH) {
    violations.push({
      rule: "文字数_本文不足",
      detail: `本文が${MIN_BODY_LENGTH}文字未満です（${input.bodyText.trim().length}文字）`,
    });
  }
  if (!input.contactOrg.trim()) {
    violations.push({ rule: "必須項目_発信元未入力", detail: "発信元（会社名・団体名等）が空です" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) {
    violations.push({ rule: "必須項目_連絡先メール不正", detail: "連絡先メールアドレスの形式が不正です" });
  }

  // 3. リンク本数上限
  const maxLinks = input.isSponsored ? MAX_LINK_COUNT_SPONSORED : MAX_LINK_COUNT_FREE;
  if (input.linkCount > maxLinks) {
    violations.push({
      rule: "リンク本数超過",
      detail: `リンクが上限（${maxLinks}本）を超えています（${input.linkCount}本）`,
    });
  }

  // 4. 連続する感嘆符・全角記号の乱用（スパム的な体裁の簡易検知）
  if (/[！!]{3,}/.test(input.title) || /[！!]{5,}/.test(input.bodyText)) {
    violations.push({
      rule: "体裁_感嘆符乱用",
      detail: "感嘆符の連続使用を検出しました",
    });
  }

  const verdict: ReviewResult["verdict"] = violations.length > 0 ? "flagged" : "clean";
  const summary =
    verdict === "clean"
      ? "ルールベース審査でNGパターンは検出されませんでした。"
      : `${violations.length}件の要確認項目を検出しました。編集部の目視確認対象です。`;

  return { verdict, violations, summary, ruleVersion: REVIEW_RULE_VERSION };
}
