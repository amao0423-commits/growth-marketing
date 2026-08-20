// Growth Marketing — shared interactions

// mobile nav toggle
function toggleNav() {
  document.querySelector('.nav-links')?.classList.toggle('open');
}

// scroll reveal
document.addEventListener('DOMContentLoaded', () => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // year
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  // blog filter
  const filterBtns = document.querySelectorAll('.filter-bar button');
  if (filterBtns.length) {
    filterBtns.forEach(btn => btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.post-card[data-cat]').forEach(card => {
        card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
      });
    }));
  }
});

// contact form: validate, then submit to Formspree (info@cocomake-guide.com)
function handleContact(e) {
  e.preventDefault();
  const form = e.target;
  let ok = true;
  ['name', 'email', 'message'].forEach(id => {
    const field = form.querySelector('#' + id).closest('.field');
    const val = form.querySelector('#' + id).value.trim();
    let valid = val.length > 0;
    if (id === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    field.classList.toggle('invalid', !valid);
    if (!valid) ok = false;
  });
  if (!ok) return false;

  // 受信メールで「どこからの・何の問い合わせか」が一目で分かるよう件名を動的生成
  const topicMap = { sns: 'SNS運用', ads: '広告運用', seo: 'SEO・コンテンツ', other: 'その他' };
  const topicLabel = topicMap[form.querySelector('#topic')?.value] || 'お問い合わせ';
  const nameVal = form.querySelector('#name').value.trim();
  const subjectField = form.querySelector('input[name="_subject"]');
  if (subjectField) subjectField.value = `【Growth Marketingサイト】${topicLabel}のご相談 - ${nameVal}様`;

  const btn = form.querySelector('button[type="submit"]');
  const errorBox = form.querySelector('.form-error');
  errorBox?.classList.remove('show');
  if (btn && !btn.dataset.label) btn.dataset.label = btn.innerHTML;
  if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }

  fetch(form.action, {
    method: 'POST',
    body: new FormData(form),
    headers: { Accept: 'application/json' },
  }).then(res => {
    if (!res.ok) throw new Error('send failed');
    form.style.display = 'none';
    document.querySelector('.form-success')?.classList.add('show');
  }).catch(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.label || '送信する'; }
    errorBox?.classList.add('show');
  });
  return false;
}
