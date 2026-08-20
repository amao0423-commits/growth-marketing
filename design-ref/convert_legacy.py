#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
既存ブログ記事（Growth Marketing）をアドプレス編集部記事へ一括変換する。

  python3 convert_legacy.py --src ./blog --out ./blog_converted
  python3 convert_legacy.py --src ./blog --out ./blog_converted --report report.csv

URL は変更しない。ファイル名・ディレクトリ構成をそのまま維持したまま
中身だけを差し替えるため、被リンクとインデックスを失わない。

主な処理
  1. ブランド名の置換（Growth Marketing → アドプレス編集部）
  2. 実在しない代理店としての営業文・実績主張の削除
  3. ヘッダー / フッター / パンくずをアドプレスのものへ差し替え
  4. 記事末尾の「無料相談」CTA を投稿 CTA へ差し替え
  5. 旧カテゴリを新カテゴリへマッピング
  6. JSON-LD（Article）の付与
  7. 削除する旧 LP（../index.html, ../contact.html）への内部リンク除去
"""

import argparse
import csv
import re
import shutil
import sys
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString

SITE = "アドプレス"
AUTHOR = "アドプレス編集部"
BASE = "https://www.nishinippon-adv.jp"

# 旧 data-cat → (新カテゴリ slug, 表示名)
CATEGORY_MAP = {
    "sns":     ("sns", "SNS・マーケ"),
    "ads":     ("sns", "SNS・マーケ"),
    "seo":     ("sns", "SNS・マーケ"),
    "content": ("sns", "SNS・マーケ"),
    "brand":   ("biz", "ビジネス"),
    "compare": ("biz", "ビジネス"),
}
# 旧 eyebrow / post-cat の表示名 → 旧 slug（data-cat が無い場合の保険）
LABEL_TO_SLUG = {
    "SNS運用": "sns", "広告運用": "ads", "SEO": "seo",
    "コンテンツマーケティング": "content", "コンテンツ": "content",
    "ブランディング": "brand", "比較・選び方": "compare",
}

NAV = [
    ("/category/kpop/", "K-POP"), ("/category/korea/", "韓国情報"),
    ("/category/ent/", "エンタメ"), ("/category/tech/", "IT・テック"),
    ("/category/sns/", "SNS・マーケ"), ("/category/life/", "ライフ"),
    ("/category/trip/", "旅行"), ("/category/biz/", "ビジネス"),
]

# 削除対象：実在しない代理店としての営業・実績主張を含む文
BRAND_SENTENCE = re.compile(
    r"[^。！？]*Growth\s*Marketing(?:では|は|の|が)[^。！？]*[。！？]"
)
# 本文に残る単独のブランド名
BRAND_PLAIN = re.compile(r"Growth\s*Marketing\s*編集部|Growth&nbsp;Marketing|Growth\s*Marketing")

# 営業色の強い定型句（残っていれば文ごと落とす）
SALES_PATTERNS = [
    re.compile(r"[^。]*無料相談[^。]*。"),
    re.compile(r"[^。]*お問い合わせください[^。]*。"),
    re.compile(r"[^。]*改善支援[^。]*。"),
    re.compile(r"[^。]*ご提案[^。]*。"),
]

AUTHOR_BOX_HTML = """
<p><strong>著者：アドプレス編集部</strong></p>
<p>アドプレスは、企業・団体・個人が無料でプレスリリースを掲載できるメディアです。編集部の記事は、各プラットフォームの公式ドキュメントとヘルプセンターの記載を一次情報として整理しています。</p>
<p><strong>編集方針</strong></p>
<ul>
<li>仕様や機能は各社の公式情報を参照し、参照日を記事末尾に明記します。</li>
<li>数値を挙げる場合は、出典・調査時点・母数をあわせて示します。</li>
<li>特定のサービスを勧誘する目的では執筆しません。</li>
<li>公式情報の更新を確認した際は本文を改訂し、更新日を記録します。</li>
</ul>
"""

HEADER_HTML = """
<header class="ap-header">
  <div class="ap-wrap">
    <a href="/" class="ap-mast">アドプレス<small>ADPRESS</small></a>
    <nav class="ap-nav">{links}</nav>
    <a href="/submit/" class="ap-post">記事を投稿する</a>
  </div>
</header>
"""

CTA_HTML = """
<div class="ap-cta">
  <h2>あなたのニュースも、無料で記事になります。</h2>
  <p>ログインして入稿するだけ。AIの自動審査を通過すると、最短数十分で公開されます。掲載料はかかりません。</p>
  <a href="/submit/" class="ap-cta-btn">記事を投稿する</a>
</div>
"""

FOOTER_HTML = """
<footer class="ap-footer">
  <div class="ap-wrap">
    <div class="ap-fnav">{links}</div>
    <div class="ap-fnav">
      <a href="/about/">運営会社</a><a href="/guideline/">掲載ガイドライン</a>
      <a href="/editorial-policy/">編集方針</a><a href="/ad/">広告枠掲載のご案内</a>
      <a href="/terms/">利用規約</a><a href="/privacy/">プライバシーポリシー</a>
    </div>
    <p>掲載記事の内容は各投稿者に帰属します。「PR」表記のある記事は、掲載費用を受け取って掲載しています。</p>
    <p>© <span data-year></span> ADPRESS</p>
  </div>
</footer>
"""


def frag(html):
    """断片HTMLを html.parser で解析し、<html>/<body> の混入を防ぐ。"""
    return BeautifulSoup(html, "html.parser")


def nav_links(cls=""):
    a = ' class="%s"' % cls if cls else ""
    return "".join('<a href="%s"%s>%s</a>' % (u, a, t) for u, t in NAV)


def clean_text(s: str) -> str:
    """本文テキストから代理店としての営業文・実績主張を除去する。"""
    s = BRAND_SENTENCE.sub("", s)
    if "Growth" in s:
        for p in SALES_PATTERNS:
            s = p.sub("", s)
    s = BRAND_PLAIN.sub(AUTHOR, s)
    return re.sub(r"[ \u3000]{2,}", " ", s).strip()


def strip_brand(soup, log):
    """テキストノードを走査してブランド由来の記述を消す。"""
    for node in list(soup.find_all(string=True)):
        if node.parent.name in ("script", "style"):
            continue
        t = str(node)
        if "Growth" not in t:
            continue
        new = clean_text(t)
        log.append(("brand_text", t.strip()[:60]))
        node.replace_with(NavigableString(new))

    # 空になった段落を削除
    for p in soup.select("p, li"):
        if not p.get_text(strip=True) and not p.find(["img", "a", "table"]):
            p.decompose()


def detect_category(soup):
    for sel in ("section.article-hero .eyebrow", ".eyebrow", ".post-cat"):
        el = soup.select_one(sel)
        if el:
            label = el.get_text(strip=True)
            slug = LABEL_TO_SLUG.get(label)
            if slug:
                return CATEGORY_MAP[slug]
    card = soup.select_one("[data-cat]")
    if card and card["data-cat"] in CATEGORY_MAP:
        return CATEGORY_MAP[card["data-cat"]]
    return ("biz", "ビジネス")


def convert(path: Path, out: Path):
    html = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "lxml")
    log = []

    slug, label = detect_category(soup)
    log.append(("category", "%s (%s)" % (label, slug)))

    # ---- head ----
    if soup.title:
        soup.title.string = re.sub(
            r"｜.*$", "", soup.title.get_text()).strip() + "｜" + SITE
    for prop, val in (("og:site_name", SITE), ("article:section", label)):
        tag = soup.find("meta", property=prop)
        if tag:
            tag["content"] = val
        else:
            m = soup.new_tag("meta"); m["property"] = prop; m["content"] = val
            soup.head.append(m)
    canon = soup.find("link", rel="canonical")
    url = canon["href"] if canon else BASE + "/blog/" + path.name

    # ---- header ----
    old = soup.select_one("header.site-header")
    if old:
        old.replace_with(frag(HEADER_HTML.format(links=nav_links())))
        log.append(("header", "replaced"))

    # ---- パンくず ----
    crumb = soup.select_one(".crumb")
    if crumb:
        crumb.clear()
        crumb.append(frag(
            '<a href="/">ホーム</a><span>/</span>'
            '<a href="/category/{s}/">{l}</a>'.format(s=slug, l=label)))
        log.append(("crumb", label))

    # ---- カテゴリ表示 ----
    for el in soup.select(".article-hero .eyebrow, .post-cat"):
        if el.get_text(strip=True) in LABEL_TO_SLUG:
            el.string = label

    # ---- 著者表記 ----
    meta = soup.select_one(".article-meta")
    if meta:
        for sp in meta.find_all("span"):
            if "Growth" in sp.get_text():
                sp.string = AUTHOR
                log.append(("author", AUTHOR))

    # ---- 著者ボックス ----
    box = soup.select_one(".author-box")
    if box:
        h = box.find(["h2", "h3"])
        box.clear()
        if h:
            box.append(h)
        box.append(frag(AUTHOR_BOX_HTML))
        log.append(("author_box", "rewritten"))

    # ---- 本文のブランド記述 ----
    strip_brand(soup, log)

    # ---- CTA バンド ----
    for band in soup.select(".cta-band"):
        band.replace_with(frag(CTA_HTML))
        log.append(("cta", "replaced"))

    # ---- footer ----
    f = soup.select_one("footer.site-footer")
    if f:
        f.replace_with(frag(FOOTER_HTML.format(links=nav_links())))
        log.append(("footer", "replaced"))

    # ---- 旧 LP へのリンク除去 ----
    dead = 0
    for a in soup.find_all("a", href=True):
        h = a["href"]
        if re.search(r"(\.\./)?(index|contact|editorial-policy)\.html", h):
            if "#services" in h or "contact" in h:
                a.unwrap()
            else:
                a["href"] = "/"
            dead += 1
    if dead:
        log.append(("dead_links", str(dead)))

    # ---- JSON-LD ----
    # FAQPage / BreadcrumbList / HowTo は資産なので残す。Article 系のみ差し替える。
    import json as _json
    for tag in soup.find_all("script", type="application/ld+json"):
        raw = tag.string or ""
        try:
            data = _json.loads(raw)
        except Exception:
            log.append(("ld_json", "解析できないため削除"))
            tag.decompose()
            continue
        # @graph 形式にも対応する
        graph = isinstance(data, dict) and "@graph" in data
        nodes = data["@graph"] if graph else (data if isinstance(data, list) else [data])
        keep = []
        for n in nodes:
            t = n.get("@type") if isinstance(n, dict) else None
            if t in ("Article", "BlogPosting", "NewsArticle"):
                continue                      # 下で作り直す
            if isinstance(n, dict):
                # author / publisher の社名だけ差し替える
                blob = _json.dumps(n, ensure_ascii=False)
                blob = BRAND_PLAIN.sub(AUTHOR, blob)
                n = _json.loads(blob)
            keep.append(n)
        if keep:
            if graph:
                out_ld = {"@context": data.get("@context", "https://schema.org"),
                          "@graph": keep}
            else:
                out_ld = keep[0] if len(keep) == 1 else keep
            tag.string = _json.dumps(out_ld, ensure_ascii=False)
            log.append(("ld_json", "保持 %d件" % len(keep)))
        else:
            tag.decompose()
    pub = soup.find("meta", attrs={"property": "article:published_time"})
    date = pub["content"] if pub else ""
    if not date:
        m = soup.select_one(".article-meta span")
        if m:
            d = re.sub(r"\.", "-", m.get_text(strip=True))
            date = d + "T09:00:00+09:00" if re.match(r"\d{4}-\d{2}-\d{2}", d) else ""
    title = soup.title.get_text().split("｜")[0] if soup.title else path.stem
    ld = soup.new_tag("script", type="application/ld+json")
    ld.string = (
        '{"@context":"https://schema.org","@type":"Article",'
        '"headline":%s,"datePublished":"%s",'
        '"mainEntityOfPage":{"@type":"WebPage","@id":"%s"},'
        '"author":{"@type":"Organization","name":"%s"},'
        '"publisher":{"@type":"Organization","name":"%s","url":"%s/"},'
        '"articleSection":"%s"}'
        % (
            '"' + title.replace('"', "'") + '"',
            date, url, AUTHOR, SITE, BASE, label,
        )
    )
    soup.head.append(ld)

    # ---- アセットパス ----
    out_html = str(soup)
    out_html = out_html.replace('href="../style.css"', 'href="/assets/adpress.css"')
    out_html = out_html.replace('src="../main.js"', 'src="/assets/adpress.js"')

    dest = out / path.name
    dest.write_text(out_html, encoding="utf-8")
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--report", default="")
    a = ap.parse_args()

    src, out = Path(a.src), Path(a.out)
    if not src.is_dir():
        sys.exit("src が見つかりません: %s" % src)
    out.mkdir(parents=True, exist_ok=True)

    rows, n = [], 0
    for f in sorted(src.glob("*.html")):
        if f.name == "index.html":
            shutil.copy2(f, out / f.name)   # 一覧は別途新デザインで再生成
            print("skip (一覧ページ): %s" % f.name)
            continue
        log = convert(f, out)
        n += 1
        cat = dict(log).get("category", "")
        brand = sum(1 for k, _ in log if k == "brand_text")
        print("%-42s %-16s ブランド記述 %d件" % (f.name, cat, brand))
        for k, v in log:
            rows.append([f.name, k, v])

    if a.report:
        with open(a.report, "w", newline="", encoding="utf-8-sig") as fh:
            w = csv.writer(fh)
            w.writerow(["file", "type", "detail"])
            w.writerows(rows)
        print("\nレポート: %s" % a.report)

    print("\n変換完了: %d 件 → %s" % (n, out))
    print("URL は変更していません。デプロイ前に必ず差分を確認してください。")


if __name__ == "__main__":
    main()
