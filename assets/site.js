// Boddington Advisory, The Signet. Small page behaviours shared by every page (no modules, no network).
(function () {
  // If the 3D module never starts (import failed, old browser), show the plain page.
  window.addEventListener('load', function () {
    setTimeout(function () { if (!window.__signetBooted) document.documentElement.classList.add('nogl'); }, 1500);
  });

  // Keyboard focus into copy that has not scrolled into view yet reveals it.
  document.addEventListener('focusin', function (e) {
    var r = e.target.closest && e.target.closest('.reveal'); if (r) r.classList.add('in');
  });

  // Phone menu: one button, one drop-down.
  var btn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  }

  // Copy email button.
  var copy = document.getElementById('copy'), email = document.getElementById('email');
  if (copy && email) {
    copy.addEventListener('click', function () {
      var label = copy.textContent;
      var reset = function () { setTimeout(function () { copy.textContent = label; }, 1800); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(email);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        copy.textContent = 'Selected'; reset();
      };
      try {
        navigator.clipboard.writeText(email.textContent.trim()).then(function () { copy.textContent = 'Copied'; reset(); }, fallback);
      } catch (e) { fallback(); }
    });
  }
})();
