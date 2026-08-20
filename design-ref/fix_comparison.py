#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
比較記事の二次修正スクリプト。

  python3 fix_comparison.py --dir ./blog_converted --sources sources.csv

convert_legacy.py の後に実行する。処理は4つ。

  1. 架空企業「Growth Marketing」のランキング項目を削除し、以降を繰り上げる
  2. 運営会社が提供するサービス（COCOマーケ）を紹介している記事に
     関係性の明示ボックスを挿入する（景品表示法・ステルスマーケティング規制）
  3. 確認できない監修者クレジットを削除する
  4. sources.csv をもとに、記事末尾へ出典リンクをアウトラインで追加する

出典リンクは本文中のインラインではなく、記事末尾にまとめて置く。
本文が読みにくくならず、URL変更時の差し替えも1箇所で済む。
"""

import argparse
import csv
import re
from collections import defaultdict
from pathlib import Path

from bs4 import BeautifulSoup

# 運営会社と、それが提供するサービス名
OPERATOR = "株式会社ホットセラー"
OPERATOR_URL = "https://www.cocomarke.com/about/"
OWN_SERVICES = ["COCOマーケ", "JEMIA"]

# 削除対象の架空企業（convert_legacy.py で置換された後の表記も含む）
FICTIONAL = ["Growth Marketing", "アドプレス編集部｜"]
# 比較表の行判定は「｜」が付かないため別に持つ
FICTIONAL_ROW = ["Growth Marketing", "アドプレス編集部"]
# 編集部を代行事業者として紹介している文
AUTHOR_AS_VENDOR = re.compile(
    r"[^。]*アドプレス編集部(?:から紹介|（当社）|は、SNS運用)[^。]*。"
)

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮"

DISCLOSURE = """
<div class="relation-note">
<h2>本記事と運営会社の関係について</h2>
<p>本記事で紹介している <strong>{svc}</strong> は、アドプレスの運営会社である
{op}が提供するサービスです。自社サービスを含む比較記事であることを明示します。</p>
<p>各社の情報は、記事末尾に記載した公式サイトの公表内容にもとづいて整理しています。
料金や提供内容は変更される場合があるため、最新の情報は各社の公式サイトでご確認ください。</p>
</div>
"""

SOURCES_BLOCK = """
<div class="source-links">
<h2>出典</h2>
<p>本記事に記載した各社の料金・サービス内容は、以下の公式サイトの公表情報を参照しています。
（参照日：{checked}）</p>
<ul>{items}</ul>
<p class="source-caveat">料金・プラン・提供内容は変更される場合があります。
検討にあたっては必ず各社の公式サイトで最新の情報をご確認ください。</p>
</div>
"""


def load_sources(path):
    """sources.csv → {file: [(company, url, checked), ...]}"""
    out = defaultdict(list)
    if not path:
        return out
    with open(path, encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            url = (row.get("url") or "").strip()
            if not url:
                continue          # URL 未記入の行は出力しない
            out[row["file"].strip()].append(
                (row["company"].strip(), url, (row.get("checked") or "").strip())
            )
    return out


def remove_fictional_entry(soup, log):
    """架空企業の h3 セクションを削除し、以降の丸数字を繰り上げる。

    戻り値は「N選」の N（削除があった場合のみ）。meta / JSON-LD を含む
    ファイル全体で件数表記を直すため、呼び出し側で使う。
    """
    target = None
    for h in soup.select(".article-body h3"):
        t = h.get_text()
        if any(f in t for f in FICTIONAL) and re.match(r"\s*[%s]" % CIRCLED, t):
            target = h
            break
    if not target:
        return None

    # h3 から次の h2/h3 の直前までを削除
    node, doomed = target, [target]
    while True:
        node = node.find_next_sibling()
        if node is None or node.name in ("h2", "h3"):
            break
        doomed.append(node)
    for n in doomed:
        n.decompose()
    log.append(("removed_entry", "架空企業のランキング項目を削除"))

    body = soup.select_one(".article-body")

    # 比較表から該当行を削除（丸数字の繰り上げより先に行う）
    for tr in body.select("table tr"):
        cell = tr.find(["td", "th"])
        if cell and any(f in cell.get_text() for f in FICTIONAL_ROW):
            tr.decompose()
            log.append(("removed_row", "比較表から該当行を削除"))

    # 編集部を事業者として紹介している文を削除
    for el in body.find_all(string=True):
        t = str(el)
        if AUTHOR_AS_VENDOR.search(t):
            new_t = AUTHOR_AS_VENDOR.sub("", t)
            el.replace_with(new_t)
            log.append(("vendor_sentence", t.strip()[:40]))

    # 本文の丸数字を1つ繰り上げる
    for el in body.find_all(string=True):
        s2 = str(el)
        if not any(c in s2 for c in CIRCLED):
            continue
        el.replace_with("".join(
            CIRCLED[CIRCLED.index(c) - 1] if c in CIRCLED and CIRCLED.index(c) > 0 else c
            for c in s2
        ))

    # 「N選」「N社」を拾って返す（置換は呼び出し側で全文に対して行う）
    m = re.search(r"(\d+)選", soup.title.get_text() if soup.title else "")
    return int(m.group(1)) if m else None


def add_disclosure(soup, log):
    """自社サービスを扱う記事に関係性の明示を挿入する。"""
    body = soup.select_one(".article-body")
    if not body:
        return
    found = [s for s in OWN_SERVICES if s in body.get_text()]
    if not found:
        return
    html = DISCLOSURE.format(
        svc="・".join(found),
        op='<a href="%s" rel="noopener">%s</a>' % (OPERATOR_URL, OPERATOR),
    )
    # 導入文の直後（最初の h2 の前）に置く
    anchor = body.find("h2")
    node = BeautifulSoup(html, "html.parser")
    if anchor:
        anchor.insert_before(node)
    else:
        body.insert(0, node)
    log.append(("disclosure", "・".join(found)))


def strip_supervisor(soup, log):
    """確認できない監修者クレジットを削除する。"""
    pat = re.compile(r"(SEO歴|監修者|が監修|監修：)")
    for el in soup.select(".article-body p, .author-box p, .expertise-note p"):
        t = el.get_text()
        if pat.search(t):
            cleaned = re.sub(r"[^。]*監修[^。]*。", "", t)
            if cleaned.strip() != t.strip():
                el.string = cleaned.strip()
                log.append(("supervisor", t.strip()[:50]))


def add_sources(soup, rows, log):
    """記事末尾に出典リンクをアウトラインで追加する。"""
    if not rows:
        return
    items = "".join(
        '<li><span class="src-name">%s</span>'
        '<a href="%s" target="_blank" rel="noopener nofollow">%s</a></li>'
        % (c, u, u)
        for c, u, _ in rows
    )
    checked = next((c for _, _, c in rows if c), "")
    block = BeautifulSoup(
        SOURCES_BLOCK.format(items=items, checked=checked or "—"), "html.parser"
    )
    anchor = soup.select_one(".source-history") or soup.select_one(".ap-cta")
    if anchor:
        anchor.insert_before(block)
    else:
        soup.select_one(".article-body").append(block)
    log.append(("sources", "%d件" % len(rows)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="convert_legacy.py の出力ディレクトリ")
    ap.add_argument("--sources", default="", help="sources.csv")
    a = ap.parse_args()

    src = load_sources(a.sources)
    d = Path(a.dir)

    for f in sorted(d.glob("*comparison*.html")):
        soup = BeautifulSoup(f.read_text(encoding="utf-8"), "lxml")
        log = []
        count = remove_fictional_entry(soup, log)
        add_disclosure(soup, log)
        strip_supervisor(soup, log)
        add_sources(soup, src.get(f.name, []), log)

        out = str(soup)
        if count:
            # title / h1 / meta description / og / JSON-LD をまとめて直す
            for unit in ("選", "社"):
                out = out.replace("%d%s" % (count, unit), "%d%s" % (count - 1, unit))
            log.append(("count", "%d → %d" % (count, count - 1)))
        f.write_text(out, encoding="utf-8")
        print("%-40s %s" % (f.name, " / ".join("%s:%s" % kv for kv in log) or "変更なし"))

    print("\n完了。sources.csv の url 列が空の行はスキップしています。")


if __name__ == "__main__":
    main()
