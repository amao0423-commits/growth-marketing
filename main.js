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

// contact form validation (no backend; demo handler)
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
  form.style.display = 'none';
  document.querySelector('.form-success')?.classList.add('show');
  return false;
}
