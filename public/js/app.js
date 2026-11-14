// Small browser-side helpers for the MediAdmit

// Rows with data-href open that page when clicked
document.querySelectorAll('tr[data-href]').forEach((tr) => {
  tr.classList.add('click');
  tr.addEventListener('click', (e) => {
    if (e.target.closest('a,button,form')) return;
    window.location = tr.dataset.href;
  });
});

// Filter dropdowns submit their form right away
document.querySelectorAll('select[data-autosubmit]').forEach((s) => {
  s.addEventListener('change', () => s.form.submit());
});

// Ask before doing something important (e.g. Discharge)
document.querySelectorAll('form[data-confirm]').forEach((f) => {
  f.addEventListener('submit', (e) => { if (!confirm(f.dataset.confirm)) e.preventDefault(); });
});

// Registration stepper (patients/form.ejs)
const stepper = document.querySelector('[data-stepper]');
if (stepper) {
  const steps = [...stepper.querySelectorAll('.step')];
  const dots = [...document.querySelectorAll('.st')];
  const lines = [...document.querySelectorAll('.steps .line')];
  const back = document.getElementById('backBtn');
  const next = document.getElementById('nextBtn');
  const finish = document.getElementById('finishBtns');
  let cur = 0;

  const show = (i) => {
    cur = i;
    steps.forEach((s, k) => s.classList.toggle('on', k === i));
    dots.forEach((d, k) => { d.classList.toggle('done', k < i); d.classList.toggle('cur', k === i); d.querySelector('i').textContent = k < i ? '✓' : k + 1; });
    lines.forEach((l, k) => l.classList.toggle('g', k < i));
    back.style.visibility = i === 0 ? 'hidden' : 'visible';
    next.style.display = i === steps.length - 1 ? 'none' : '';
    // When editing, "Save Changes" is always shown so a quick fix doesn't need every step
    finish.style.display = (i === steps.length - 1 || editMode) ? 'flex' : 'none';
    if (editMode) finish.style.marginLeft = 'auto';
  };
  const editMode = stepper.hasAttribute('data-edit');
  // Check the required fields of the current step before moving on
  const valid = () => [...steps[cur].querySelectorAll('input,select,textarea')].every((el) => el.reportValidity());

  next.addEventListener('click', () => { if (valid()) show(cur + 1); });
  back.addEventListener('click', () => show(cur - 1));
  dots.forEach((d, k) => d.addEventListener('click', () => { if (k < cur || editMode || (k === cur + 1 && valid())) show(k); }));
  dots.forEach((d) => { d.style.cursor = 'pointer'; });

  // Before saving, jump to the first step that still has a missing required field
  stepper.closest('form').addEventListener('submit', (e) => {
    for (let k = 0; k < steps.length; k++) {
      const bad = [...steps[k].querySelectorAll('input,select,textarea')].find((el) => !el.checkValidity());
      if (bad) { e.preventDefault(); show(k); bad.reportValidity(); return; }
    }
  });
  show(0);
}
