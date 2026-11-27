// Shared behaviour for every page: nav, scroll reveal, reels, lightbox.
(function(){
  // ---- Nav ----
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var links = document.getElementById('navlinks');
  if (nav) {
    window.addEventListener('scroll', function(){
      nav.classList.toggle('scrolled', window.scrollY > 12);
    }, { passive: true });
  }
  if (burger && links) {
    burger.addEventListener('click', function(){ links.classList.toggle('open'); });
    links.addEventListener('click', function(e){ if (e.target.tagName === 'A') links.classList.remove('open'); });
  }

  // ---- Scroll reveal ----
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el){ io.observe(el); });
  } else {
    els.forEach(function(el){ el.classList.add('in'); });
  }

  // ---- Reels: tap to play, only one plays at a time ----
  var reels = document.querySelectorAll('.reel-card');
  function stopOthers(except){
    reels.forEach(function(card){
      if (card === except) return;
      var v = card.querySelector('video');
      if (!v.paused) v.pause();
    });
  }
  reels.forEach(function(card){
    var v = card.querySelector('video');
    var btn = card.querySelector('.play');
    function start(){
      if (!v.src) v.src = v.getAttribute('data-src');
      stopOthers(card);
      card.classList.add('playing');
      v.controls = true;
      var p = v.play();
      if (p && p.catch) p.catch(function(){});
    }
    btn.addEventListener('click', start);
    v.addEventListener('play', function(){ stopOthers(card); card.classList.add('playing'); });
    v.addEventListener('ended', function(){ card.classList.remove('playing'); v.controls = false; });
  });

  // ---- Lightbox (gallery photos and team cards) ----
  var groups = document.querySelectorAll('[data-lightbox]');
  if (!groups.length) return;

  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML =
    '<button class="lb-x" type="button" aria-label="Close">&times;</button>' +
    '<button class="lb-nav lb-prev" type="button" aria-label="Previous">&#8249;</button>' +
    '<button class="lb-nav lb-next" type="button" aria-label="Next">&#8250;</button>' +
    '<figure class="lb-stage">' +
      '<div class="lb-frame"><img class="lb-img" alt=""><div class="lb-initial"></div><span class="lb-spin"></span></div>' +
      '<figcaption class="lb-cap"><b></b><span></span></figcaption>' +
    '</figure>';
  document.body.appendChild(lb);

  var img = lb.querySelector('.lb-img');
  var initial = lb.querySelector('.lb-initial');
  var frame = lb.querySelector('.lb-frame');
  var capTitle = lb.querySelector('.lb-cap b');
  var capSub = lb.querySelector('.lb-cap span');
  var closeBtn = lb.querySelector('.lb-x');
  var prevBtn = lb.querySelector('.lb-prev');
  var nextBtn = lb.querySelector('.lb-next');

  var items = [], index = 0, lastFocus = null, token = 0;

  function show(i){
    index = (i + items.length) % items.length;
    var el = items[index];
    var thumb = el.querySelector('img');
    var full = el.getAttribute('data-full');
    var fallback = el.getAttribute('data-fallback');
    var my = ++token;

    capTitle.textContent = el.getAttribute('data-title') || '';
    capSub.textContent = el.getAttribute('data-sub') || '';
    lb.classList.toggle('is-person', el.hasAttribute('data-person'));

    if (!full && !thumb) {
      // Team member without a photo: show a big initial instead.
      frame.classList.add('no-photo');
      img.removeAttribute('src');
      initial.textContent = el.getAttribute('data-initial') || '';
      frame.classList.remove('loading');
      return;
    }
    frame.classList.remove('no-photo');
    // Show the already-loaded thumbnail straight away, then swap in the sharp version.
    img.src = thumb ? (thumb.currentSrc || thumb.src) : full;
    if (full && (!thumb || full !== thumb.src)) {
      frame.classList.add('loading');
      var hi = new Image();
      hi.decoding = 'async';
      hi.onload = function(){ if (my === token) { img.src = hi.src; frame.classList.remove('loading'); } };
      hi.onerror = function(){
        if (fallback && hi.src !== fallback) { hi.src = fallback; return; }
        if (my === token) frame.classList.remove('loading');
      };
      hi.src = full;
    }
    var many = items.length > 1;
    prevBtn.hidden = nextBtn.hidden = !many;
  }

  function open(group, el){
    items = Array.prototype.slice.call(group.querySelectorAll('[data-lb-item]'));
    lastFocus = document.activeElement;
    show(items.indexOf(el));
    lb.classList.add('on');
    lb.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('lb-open');
    closeBtn.focus({ preventScroll: true });
  }
  function close(){
    if (!lb.classList.contains('on')) return;
    token++;
    lb.classList.remove('on');
    lb.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('lb-open');
    img.removeAttribute('src');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  groups.forEach(function(group){
    group.addEventListener('click', function(e){
      var el = e.target.closest('[data-lb-item]');
      if (el && group.contains(el)) { e.preventDefault(); open(group, el); }
    });
    group.addEventListener('keydown', function(e){
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var el = e.target.closest('[data-lb-item]');
      if (el) { e.preventDefault(); open(group, el); }
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', function(e){ e.stopPropagation(); show(index - 1); });
  nextBtn.addEventListener('click', function(e){ e.stopPropagation(); show(index + 1); });
  // Clicking anywhere on the dimmed backdrop (not the photo or caption) closes it.
  lb.addEventListener('click', function(e){
    if (e.target === lb || e.target.classList.contains('lb-stage')) close();
  });
  document.addEventListener('keydown', function(e){
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });

  // Swipe left/right on phones to move between photos, swipe down to close.
  var sx = 0, sy = 0, tracking = false;
  lb.addEventListener('touchstart', function(e){
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener('touchend', function(e){
    if (!tracking) return;
    tracking = false;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && items.length > 1) show(index + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  }, { passive: true });
})();
