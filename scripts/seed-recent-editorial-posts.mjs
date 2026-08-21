import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { loadEnvLocal } from "./lib/env.mjs";

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local に見つかりません。");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EDITORIAL_EMAIL = "editorial@nishinippon-adv.jp";
const EDITORIAL_DISPLAY_NAME = "アドプレス編集部";

function html(strings, ...values) {
  return strings.reduce((out, str, i) => out + str + (values[i] ?? ""), "");
}

function makeBody({ lead, points, insight, takeaway, sourceUrl, sourceLabel }) {
  return html`
    <p>${lead}</p>
    <h2>発表のポイント</h2>
    <ul>${points.map((point) => `<li>${point}</li>`).join("")}</ul>
    <h2>編集部の注目点</h2>
    <p>${insight}</p>
    <h2>読者へのヒント</h2>
    <p>${takeaway}</p>
    <p class="source-note">参考：<a href="${sourceUrl}" target="_blank" rel="nofollow noopener">${sourceLabel}</a></p>
  `.trim();
}

const articles = [
  {
    legacyPath: "recent-2026-08-21-kpop-bigbang-20th.html",
    categorySlug: "kpop",
    title: "BIGBANG、20周年プロジェクトでファン接点を再設計",
    excerpt: "YGがBIGBANGの20周年プロジェクトを案内。記念イベントとツアー情報から、長期IPの熱量づくりを読み解きます。",
    publishedAt: "2026-08-21T09:00:00+09:00",
    body: makeBody({
      lead:
        "YG ENTERTAINMENTは、BIGBANGのデビュー20周年に合わせたプロジェクトを案内しています。無料ファンイベントやワールドツアーの展開は、長く愛されるアーティストIPがどのように節目をファン体験へ変えるかを考える材料になります。",
      points: [
        "20周年を記念したファン向け企画が告知され、リアルイベントを含む接点が用意されています。",
        "G-DRAGONのワールドツアーは、複数都市を巡る大規模な展開として紹介されています。",
        "記念日、ライブ、SNSでの話題化を組み合わせることで、既存ファンと新規層の双方に届きやすい構成です。",
      ],
      insight:
        "K-POPの大型プロジェクトは、単発ニュースではなく、発表、現地体験、二次拡散、アーカイブ視聴までが一続きの導線になります。20周年のような節目は、過去の記憶を再編集しながら次の活動へ期待をつなげる好機です。",
      takeaway:
        "ブランドや店舗の周年施策でも、懐かしさだけに寄せず、参加できる場と次のアクションを同時に設計すると広がりやすくなります。",
      sourceUrl: "https://ygfamily.com/jp/news/report/7554",
      sourceLabel: "YG ENTERTAINMENT 公式ニュース",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-kpop-stray-kids-this-and-that.html",
    categorySlug: "kpop",
    title: "Stray Kids新曲情報に見る、短い告知期間で熱量を高める設計",
    excerpt: "JYPがStray Kidsの新曲情報を掲載。短期間でファンの会話を作るK-POP告知の流れを整理します。",
    publishedAt: "2026-08-21T09:08:00+09:00",
    body: makeBody({
      lead:
        "JYP ENTERTAINMENTの公式サイトでは、Stray Kidsの楽曲「THIS & THAT」に関するニュースが掲載されています。K-POPの新曲告知は、音源公開だけでなく、ティザー、ビジュアル、ファン投稿が重なって話題を作るのが特徴です。",
      points: [
        "公式発表を起点に、楽曲名や公開日の情報がファンコミュニティへ広がります。",
        "短いスパンで複数の素材を出すことで、検索やSNS上の接触頻度を高めやすくなります。",
        "グローバルファンが同時に反応できるため、言語を越えた二次拡散が起きやすい領域です。",
      ],
      insight:
        "新曲のプロモーションでは、情報量を一度に出し切らず、段階的に期待を積み上げる設計が効果的です。タイトルやビジュアルの小さな更新でも、ファンは考察や翻訳、リアクション動画として再編集します。",
      takeaway:
        "企業の新商品発表でも、発売日だけを告知するのではなく、準備段階から話したくなる断片を用意すると、自然な会話が生まれます。",
      sourceUrl: "https://www.jype.com/",
      sourceLabel: "JYP ENTERTAINMENT 公式サイト",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-korea-hanbok-expo-2026.html",
    categorySlug: "korea",
    title: "2026 Hanbok Expo、DDP開催で伝統服を都市文化として発信",
    excerpt: "韓国文化体育観光部が2026 Hanbok Expoを案内。韓服を現代のライフスタイルへ接続する動きを見ます。",
    publishedAt: "2026-08-21T09:16:00+09:00",
    body: makeBody({
      lead:
        "韓国文化体育観光部は、2026 Hanbok Expoの開催情報を発表しています。会場にDDPを据え、韓服を伝統衣装としてだけでなく、都市のファッションや観光体験として見せる動きが強まっています。",
      points: [
        "発表では、DDPでの開催と韓服文化を紹介する企画が案内されています。",
        "伝統産業、若手デザイナー、観光消費をつなぐ場として期待されます。",
        "韓国旅行の体験価値を、食や音楽だけでなく装いにも広げる取り組みです。",
      ],
      insight:
        "韓服は写真映えする観光コンテンツである一方、素材、仕立て、地域の商いを含む文化産業でもあります。展示会として発信することで、体験消費と産業振興の両面をつなげられます。",
      takeaway:
        "地域文化をPRする際は、歴史の説明だけで終わらせず、着る、撮る、買う、学ぶといった複数の体験に分解すると参加しやすくなります。",
      sourceUrl: "https://www.mcst.go.kr/english/policy/pressList.jsp",
      sourceLabel: "Ministry of Culture, Sports and Tourism 公式発表",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-korea-kculture-inbound.html",
    categorySlug: "korea",
    title: "Kカルチャー人気、欧米・長距離市場の訪韓需要にも波及",
    excerpt: "韓国文化体育観光部の発表から、Kカルチャーが訪韓旅行の入口として機能する流れを整理します。",
    publishedAt: "2026-08-21T09:24:00+09:00",
    body: makeBody({
      lead:
        "韓国文化体育観光部は、Kカルチャー人気が訪韓需要に与える影響について発信しています。音楽、ドラマ、食、美容といった文化接点が、旅行先としての韓国を選ぶ理由になっている点が注目です。",
      points: [
        "発表では、上半期の訪韓者数や長距離市場からの関心が紹介されています。",
        "K-POPや映像作品のロケ地、グルメ、買い物が旅行動機として結びついています。",
        "文化コンテンツと観光施策の連動が、地方への誘客にもつながる可能性があります。",
      ],
      insight:
        "コンテンツを見た人が旅行者になるまでには、検索、比較、予約、現地投稿という段階があります。国の観光PRでは、その間にある不安を減らし、具体的な旅程へ変える情報設計が重要です。",
      takeaway:
        "日本側の観光・小売事業者も、韓国カルチャー起点の来店動機を読み取り、体験の前後でSNS共有しやすい導線を整えると効果が出やすくなります。",
      sourceUrl: "https://www.mcst.go.kr/english/policy/pressList.jsp",
      sourceLabel: "Ministry of Culture, Sports and Tourism 公式発表",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-ent-disneyplus-august.html",
    categorySlug: "ent",
    title: "Disney+ 8月ラインナップ、話題作の続編とシリーズ展開が充実",
    excerpt: "Disney+の8月おすすめ配信情報から、続編・シリーズ作品が視聴継続を促す流れを読み解きます。",
    publishedAt: "2026-08-21T09:32:00+09:00",
    body: makeBody({
      lead:
        "Disney+は、2026年8月のおすすめ配信作品を紹介しています。映画、アニメ、スター・ウォーズ関連作品など、既存ファンが反応しやすいシリーズ展開が目立ちます。",
      points: [
        "8月配信の注目作品として、映画やシリーズ作品がまとめて案内されています。",
        "関連作を続けて見られる配信サービスでは、話題化と視聴継続が連動しやすくなります。",
        "夏休み時期の配信は、家族視聴やまとめ見需要にも合いやすいタイミングです。",
      ],
      insight:
        "配信サービスのラインナップ告知は、作品単体の宣伝だけではありません。過去作、関連作、派生シリーズを横断して見せることで、ユーザーの滞在時間を伸ばす役割があります。",
      takeaway:
        "エンタメ系の告知では、単独の発売日や公開日だけでなく、関連コンテンツの見方まで提案すると、ファンの行動につながりやすくなります。",
      sourceUrl: "https://disneyplus.disney.co.jp/news/2026/08_recommend",
      sourceLabel: "Disney+ 公式ニュース",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-ent-sony-pictures-lineup.html",
    categorySlug: "ent",
    title: "ソニー・ピクチャーズ、新作映画情報で劇場体験への期待を喚起",
    excerpt: "ソニーのニュースリリースから、新作映画の邦題・公開時期・予告解禁が作るプロモーション導線を見ます。",
    publishedAt: "2026-08-21T09:40:00+09:00",
    body: makeBody({
      lead:
        "ソニー・ピクチャーズ関連のニュースでは、新作映画の邦題、公開時期、予告映像などが発表されています。配信視聴が定着した今も、劇場公開作品は初報の設計が期待値を左右します。",
      points: [
        "作品タイトルや公開時期の発表は、映画ファンの検索行動を生みます。",
        "予告映像の公開は、SNSでの感想共有やメディア記事化につながりやすい素材です。",
        "シリーズ性や出演者情報がある作品ほど、公開前から会話を作りやすくなります。",
      ],
      insight:
        "映画宣伝では、公開日までの期間をどう分割するかが重要です。邦題発表、ビジュアル、予告、キャストコメント、イベントを段階的に配置することで、関心を維持できます。",
      takeaway:
        "地域イベントや舞台公演のPRでも、チケット発売日に情報を集中させず、複数回の話題化ポイントを作ると認知が広がりやすくなります。",
      sourceUrl: "https://www.sony.com/ja/SonyInfo/News/Press/",
      sourceLabel: "Sony Group 公式ニュースリリース",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-tech-google-ai-july.html",
    categorySlug: "tech",
    title: "Googleの7月AI更新、エージェントと創作支援が実装段階へ",
    excerpt: "GoogleのAI更新まとめから、Gemini系モデルやロボティクス、動画・音楽生成の実務利用を考えます。",
    publishedAt: "2026-08-21T09:48:00+09:00",
    body: makeBody({
      lead:
        "Googleは、2026年7月のAI関連アップデートをまとめて紹介しています。Geminiモデル、ロボティクス、クリエイティブ支援など、研究発表から日常利用へ近づく動きが見えます。",
      points: [
        "エージェント用途を意識したGeminiモデルの更新が紹介されています。",
        "ロボティクスや災害対応など、画面上の生成AIに留まらない用途が広がっています。",
        "動画や音楽など、クリエイティブ制作を支援する機能も継続的に強化されています。",
      ],
      insight:
        "生成AIの競争軸は、文章を作るだけでなく、タスクを理解し、道具を使い、成果物を組み立てる方向へ移っています。企業導入では、機能単体よりもワークフローに組み込めるかが評価ポイントになります。",
      takeaway:
        "新しいAI機能を試す際は、社内の定型業務、制作補助、問い合わせ対応など、効果を測りやすい小さな用途から検証するのが現実的です。",
      sourceUrl: "https://blog.google/innovation-and-ai/technology/ai/google-ai-updates-july-2026/",
      sourceLabel: "Google Blog",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-tech-sony-tsmc-joint-venture.html",
    categorySlug: "tech",
    title: "ソニーとTSMCの協業、半導体供給網の国内強化を後押し",
    excerpt: "ソニーのニュースリリースから、半導体製造の協業が日本のテック産業へ与える意味を整理します。",
    publishedAt: "2026-08-21T09:56:00+09:00",
    body: makeBody({
      lead:
        "ソニーグループのニュースリリースでは、TSMCとの合弁事業に関する発表が掲載されています。半導体はスマートフォン、自動車、AI機器まで幅広い産業を支える基盤であり、供給網の強化は企業活動にも直結します。",
      points: [
        "先端・特殊半導体の安定供給は、製造業やデジタルサービスの競争力に関わります。",
        "国内拠点への投資は、雇用、人材育成、関連企業の集積にも波及します。",
        "AI需要の拡大により、半導体の調達力は事業継続の重要なテーマになっています。",
      ],
      insight:
        "半導体ニュースは専門的に見えますが、実際には家電、自動車、医療、物流、広告配信まで多くのサービスの土台です。大手企業の協業は、周辺サプライヤーや地域経済にも影響します。",
      takeaway:
        "テック企業以外でも、重要部品やクラウド基盤の供給リスクを把握し、代替策や調達先の見直しを定期的に行うことが求められます。",
      sourceUrl: "https://www.sony.com/en//SonyInfo/News/Press/",
      sourceLabel: "Sony Group Global News Releases",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-sns-threads-500m.html",
    categorySlug: "sns",
    title: "Threads月間5億ユーザー発表、テキストSNSの使い分けが進む",
    excerpt: "MetaのThreads関連発表から、ブランドが短文SNSをどう使い分けるべきか整理します。",
    publishedAt: "2026-08-21T10:04:00+09:00",
    body: makeBody({
      lead:
        "Metaは、Threadsの月間ユーザー規模と新機能に関する発表を行っています。短文SNSは速報性だけでなく、コミュニティとの距離感を作る場所として再評価されています。",
      points: [
        "ThreadsはInstagramとの親和性が高く、既存フォロワーとの接点を増やしやすい媒体です。",
        "テキスト投稿は制作負荷が低く、速報、補足、舞台裏の共有に向いています。",
        "複数SNSを使う企業では、同じ投稿を流用するだけでなく、役割分担が重要になります。",
      ],
      insight:
        "SNS運用では、どの媒体に何を投稿するかを決める前に、ユーザーがその場で求めている速度と温度感を見極める必要があります。Threadsは、画像中心のInstagramよりも会話の余白を作りやすい点が特徴です。",
      takeaway:
        "ブランドアカウントは、キャンペーン告知だけでなく、開発メモ、イベント実況、よくある質問への短い回答など、軽い接点を増やす運用から始めると続けやすくなります。",
      sourceUrl: "https://about.fb.com/news/category/technologies/threads/",
      sourceLabel: "Meta Newsroom Threads",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-sns-tiktok-tesda-content-camp.html",
    categorySlug: "sns",
    title: "TikTokとTESDAのContent Camp、学びと収益化をつなぐSNS活用",
    excerpt: "TikTokの公式発表から、動画制作スキルが就業・起業支援へ広がる流れを紹介します。",
    publishedAt: "2026-08-21T10:12:00+09:00",
    body: makeBody({
      lead:
        "TikTokは、フィリピンのTESDAと連携したContent Campについて発表しています。ショート動画は娯楽の場に留まらず、スキル習得、販売促進、仕事づくりの基盤としても注目されています。",
      points: [
        "発表では、デジタル生計やコンテンツ制作スキルの支援がテーマになっています。",
        "小規模事業者や求職者にとって、動画制作は低コストで始められる発信手段です。",
        "行政や教育機関との連携により、SNS活用が職業訓練の文脈にも広がっています。",
      ],
      insight:
        "TikTok運用の価値は、バズを狙うことだけではありません。商品説明、制作過程、利用者の声を短い動画にすることで、信頼形成と販売促進を同時に進められます。",
      takeaway:
        "中小企業が動画を始めるなら、撮影機材より先に、誰に何を理解してもらうかを決めることが大切です。短いQ&A動画や作業風景からでも十分に始められます。",
      sourceUrl: "https://newsroom.tiktok.com/tiktok-and-tesda-open-new-avenues-to-digital-livelihood-with-content-camp?lang=en-PH",
      sourceLabel: "TikTok Newsroom",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-life-cool-work-heatstroke.html",
    categorySlug: "life",
    title: "STOP！熱中症 クールワークキャンペーン、職場の暑さ対策を再確認",
    excerpt: "厚生労働省の2026年キャンペーン情報から、職場で実践したい暑さ対策をまとめます。",
    publishedAt: "2026-08-21T10:20:00+09:00",
    body: makeBody({
      lead:
        "厚生労働省は、2026年の「STOP！熱中症 クールワークキャンペーン」を案内しています。夏の暑さが長期化するなか、屋外作業だけでなく、倉庫、厨房、イベント現場など幅広い職場で対策が必要です。",
      points: [
        "暑さ指数の確認、休憩、給水、作業計画の見直しが基本になります。",
        "体調不良を言い出しやすい職場づくりも、熱中症対策の一部です。",
        "管理者は、経験や体力に頼らず、客観的な基準で判断することが求められます。",
      ],
      insight:
        "熱中症対策は、個人の注意だけでは限界があります。現場の温度、作業時間、休憩場所、緊急時の連絡体制をセットで整えることで、初めて実効性が高まります。",
      takeaway:
        "小さな事業所でも、朝礼で暑さ指数を共有する、休憩を予定に組み込む、体調申告の言葉を決めておくなど、すぐ始められる対策があります。",
      sourceUrl: "https://www.mhlw.go.jp/stf/coolwork_2026.html",
      sourceLabel: "厚生労働省 公式サイト",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-life-rolling-stock.html",
    categorySlug: "life",
    title: "食べながら備える家庭備蓄、ローリングストックを暮らしに入れる",
    excerpt: "政府広報オンラインの防災記事を参考に、食品備蓄を無理なく続ける考え方を整理します。",
    publishedAt: "2026-08-21T10:28:00+09:00",
    body: makeBody({
      lead:
        "政府広報オンラインでは、家庭の食品備蓄について、普段の食事に使いながら備える考え方を紹介しています。災害時の備えは特別なものを大量に買うより、日常に組み込むほうが続けやすくなります。",
      points: [
        "主食、たんぱく源、飲料水、調味料などを、家庭の人数に合わせて備えます。",
        "賞味期限が近いものから食べ、食べた分を買い足すことで在庫を保ちます。",
        "乳幼児、高齢者、持病のある人、ペットなど、家族ごとの事情も考慮が必要です。",
      ],
      insight:
        "防災情報は、正しさだけでなく実行しやすさが重要です。いつもの買い物の延長に備蓄を置くと、期限切れや保管場所の問題を減らせます。",
      takeaway:
        "週末に一度、家にある食品と水を確認し、足りないものを一つだけ買い足すところから始めると、負担なく備えを更新できます。",
      sourceUrl: "https://www.gov-online.go.jp/article/202607/entry-11422.html",
      sourceLabel: "政府広報オンライン",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-trip-jnto-inbound-safety.html",
    categorySlug: "trip",
    title: "JNTOの訪日促進と安全情報更新、旅行前後の安心導線が重要に",
    excerpt: "JNTOの発表から、訪日需要の高まりと安全情報整備が観光体験に与える影響を見ます。",
    publishedAt: "2026-08-21T10:36:00+09:00",
    body: makeBody({
      lead:
        "日本政府観光局（JNTO）は、訪日旅行促進や旅行安全情報に関する発表を行っています。訪日客数が高水準で推移するなか、誘客だけでなく、滞在中の安心を支える情報提供が重要になっています。",
      points: [
        "訪日旅行プロモーションでは、市場ごとの関心や旅行スタイルに合わせた発信が必要です。",
        "安全情報の整備は、災害や体調不良など不安を減らす役割があります。",
        "観光地側は、多言語案内、交通情報、緊急時の導線を分かりやすくすることが求められます。",
      ],
      insight:
        "インバウンド施策は、来てもらう前の広告だけで完結しません。予約後、移動中、現地滞在、帰国後の投稿までを一連の体験として見直すことで、満足度と再訪意向が高まります。",
      takeaway:
        "店舗や施設は、営業時間、決済方法、アクセス、混雑時の案内を英語などで整理するだけでも、訪日客の不安を減らせます。",
      sourceUrl: "https://www.jnto.go.jp/",
      sourceLabel: "日本政府観光局（JNTO）",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-trip-visitkorea-jeju.html",
    categorySlug: "trip",
    title: "VisitKoreaの地方旅提案、ソウル以外の魅力をどう届けるか",
    excerpt: "VisitKoreaの観光情報から、済州や漢江周辺など地方・周遊旅行の訴求ポイントを整理します。",
    publishedAt: "2026-08-21T10:44:00+09:00",
    body: makeBody({
      lead:
        "韓国観光公社のVisitKoreaでは、ソウル以外の旅行先やアートツアーなど、テーマ性のある観光情報が発信されています。韓国旅行の選択肢が広がるほど、目的別の分かりやすい提案が重要になります。",
      points: [
        "済州など地方旅行は、自然、食、リゾート、直行便といった複数の魅力を伝えられます。",
        "都市部のアートツアーは、短時間でも参加しやすい体験型コンテンツです。",
        "観光サイトでは、イベント、交通、モデルコースをまとめることで行動に移しやすくなります。",
      ],
      insight:
        "旅行者は、行き先そのものよりも、そこで何ができるかを知りたい場合が多くあります。地方観光のPRでは、名所の羅列ではなく、半日、一日、週末といった時間軸で見せると選ばれやすくなります。",
      takeaway:
        "観光事業者は、写真映え、雨の日対応、子連れ向け、夜の過ごし方など、具体的な利用シーンごとに情報を分けると検索にもSNSにも届きやすくなります。",
      sourceUrl: "https://english.visitkorea.or.kr/svc/main/index.do",
      sourceLabel: "VisitKorea",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-biz-dx-stocks-2026.html",
    categorySlug: "biz",
    title: "DX銘柄2026、AIトランスフォーメーションが企業評価の軸に",
    excerpt: "経済産業省のDX銘柄2026発表から、AI時代の企業変革に求められる視点を整理します。",
    publishedAt: "2026-08-21T10:52:00+09:00",
    body: makeBody({
      lead:
        "経済産業省は、東京証券取引所などと共同でDX銘柄2026を発表しています。近年のDXは、業務のデジタル化に留まらず、AIを使って事業モデルや組織能力を変える段階へ進んでいます。",
      points: [
        "発表では、DX銘柄、注目企業、プラチナ企業が選定されています。",
        "AIを事業成長や業務変革にどう結びつけるかが、企業評価の重要な視点になります。",
        "経営層の意思決定、データ基盤、人材育成を同時に進める必要があります。",
      ],
      insight:
        "DXはシステム導入の有無では測れません。顧客体験、収益構造、現場業務が変わっているか、さらに継続的に改善できる組織になっているかが問われます。",
      takeaway:
        "中小企業でも、AIツールの試用で終わらせず、問い合わせ対応、見積作成、在庫確認など、成果を数字で見られる業務から取り入れると改善が進みます。",
      sourceUrl: "https://www.meti.go.jp/english/press/2026/0410_001.html",
      sourceLabel: "経済産業省 公式発表",
    }),
  },
  {
    legacyPath: "recent-2026-08-21-biz-startup-ecosystem-impact.html",
    categorySlug: "biz",
    title: "スタートアップの経済波及効果、地域と雇用を動かす成長基盤に",
    excerpt: "経済産業省の調査発表をもとに、スタートアップ・エコシステムが経済へ与える影響を紹介します。",
    publishedAt: "2026-08-21T11:00:00+09:00",
    body: makeBody({
      lead:
        "経済産業省は、スタートアップ・エコシステムの経済波及効果に関する調査結果を公表しています。スタートアップは新規事業の担い手であるだけでなく、雇用、所得、地域産業への波及を生みます。",
      points: [
        "調査では、スタートアップが生み出すGDPや雇用への影響が推計されています。",
        "成長企業が増えることで、取引先、投資家、人材、自治体を含む周辺環境も変化します。",
        "研究開発、規制対応、販路開拓などを支える仕組みが、成長速度を左右します。",
      ],
      insight:
        "スタートアップ支援は、個別企業への補助に見えがちですが、実際には挑戦が連鎖する環境づくりです。成功事例が生まれると、人材や資金が次の起業へ循環しやすくなります。",
      takeaway:
        "地域企業にとっても、スタートアップとの協業は新規事業や業務改善のきっかけになります。まずは課題を具体化し、小さな実証から始めることが現実的です。",
      sourceUrl: "https://www.meti.go.jp/english/press/2026/0521_003.html",
      sourceLabel: "経済産業省 公式発表",
    }),
  },
];

async function ensureEditorialProfile() {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_editorial", true)
    .limit(1)
    .maybeSingle();
  if (selectError) throw new Error(`編集部プロフィールの確認に失敗しました: ${selectError.message}`);
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: EDITORIAL_EMAIL,
    email_confirm: true,
    password: `${randomUUID()}${randomUUID()}`,
    user_metadata: { full_name: EDITORIAL_DISPLAY_NAME },
  });
  if (createError || !created.user) {
    throw new Error(`編集部アカウントの作成に失敗しました: ${createError?.message}`);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ display_name: EDITORIAL_DISPLAY_NAME, is_editorial: true, email: EDITORIAL_EMAIL })
    .eq("id", created.user.id);
  if (updateError) throw new Error(`編集部プロフィールの更新に失敗しました: ${updateError.message}`);

  return created.user.id;
}

async function main() {
  const editorialId = await ensureEditorialProfile();
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of articles) {
    const { data: existing, error: existingError } = await supabase
      .from("articles")
      .select("id")
      .eq("legacy_path", article.legacyPath)
      .maybeSingle();
    if (existingError) {
      console.error(`[確認失敗] ${article.legacyPath}: ${existingError.message}`);
      failed++;
      continue;
    }
    if (existing) {
      console.log(`[既存] ${article.legacyPath} -> /news/${existing.id}/`);
      skipped++;
      continue;
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({
        author_id: editorialId,
        category_slug: article.categorySlug,
        title: article.title,
        body_html: article.body,
        excerpt: article.excerpt,
        status: "published",
        source: "editorial",
        legacy_path: article.legacyPath,
        contact_org: EDITORIAL_DISPLAY_NAME,
        contact_email: EDITORIAL_EMAIL,
        contact_public: false,
        published_at: article.publishedAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(`[登録失敗] ${article.legacyPath}: ${error?.message}`);
      failed++;
      continue;
    }

    console.log(`[登録] ${article.categorySlug} ${article.legacyPath} -> /news/${data.id}/`);
    inserted++;
  }

  console.log(`完了: 登録${inserted}件 / 既存${skipped}件 / 失敗${failed}件`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
