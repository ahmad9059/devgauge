(function () {
  var menus = Array.prototype.slice.call(document.querySelectorAll('.menu'));

  function setOpen(menu, open) {
    menu.classList.toggle('is-open', open);
    menu.querySelector('.menu__trigger').setAttribute('aria-expanded', String(open));
  }

  function closeAll(except) {
    menus.forEach(function (menu) {
      if (menu !== except) setOpen(menu, false);
    });
  }

  menus.forEach(function (menu) {
    menu.querySelector('.menu__trigger').addEventListener('click', function () {
      var willOpen = !menu.classList.contains('is-open');
      closeAll(menu);
      setOpen(menu, willOpen);
    });
  });

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.menu')) closeAll(null);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAll(null);
  });

  // Subtle phone parallax that follows the cursor (fine pointers, no reduced motion).
  var canParallax =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (canParallax) {
    var phones = Array.prototype.slice.call(document.querySelectorAll('.phone'));
    var frame = 0;
    var nx = 0;
    var ny = 0;

    function paint() {
      frame = 0;
      phones.forEach(function (phone) {
        phone.style.setProperty('--dx', (-nx * 14).toFixed(1) + 'px');
        phone.style.setProperty('--dy', (-ny * 10).toFixed(1) + 'px');
      });
    }

    window.addEventListener(
      'pointermove',
      function (event) {
        nx = event.clientX / window.innerWidth - 0.5;
        ny = event.clientY / window.innerHeight - 0.5;
        if (!frame) frame = window.requestAnimationFrame(paint);
      },
      { passive: true }
    );

    document.documentElement.addEventListener('pointerleave', function () {
      nx = 0;
      ny = 0;
      if (!frame) frame = window.requestAnimationFrame(paint);
    });
  }
})();
