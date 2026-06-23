/* ═══════════════════════════════════════════════════════════════
   THE OKTOP — main.js
   ─────────────────────────────────────────────────────────────
   API 설정 가이드
   ─────────────────────────────────────────────────────────────
   [네이버 지도 API]
   index.html 의 <script src="...ncpClientId=YOUR_NAVER_MAP_CLIENT_ID..."> 수정
   https://www.ncloud.com → Application 등록 → Maps + Geocoding 활성화

   [네이버 OAuth 로그인]
   아래 NAVER_CLIENT_ID, NAVER_REDIRECT_URI 상수를 실제 값으로 교체
   https://developers.naver.com → 애플리케이션 등록 → 로그인 API → 콜백 URL 등록
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const html = document.documentElement;

  /* ─────────────────────────────────────────────────────────────
     THEME SYSTEM
     Light / dark — persisted in localStorage, defaulting to
     the OS preference on first visit.
  ───────────────────────────────────────────────────────────── */

  const LS_THEME = 'oktop-theme';

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(LS_THEME, theme);
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  (function initTheme() {
    const saved = localStorage.getItem(LS_THEME);
    if (saved) {
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  })();

  document.getElementById('themeToggle')?.addEventListener('click', function () {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  /* ─────────────────────────────────────────────────────────────
     LAYOUT SYSTEM
     기본값 모바일. 768px 이하에서는 항상 모바일로 강제.
     데스크탑(>768px)에서만 'PC 화면' 버튼으로 수동 전환 가능.
  ───────────────────────────────────────────────────────────── */

  const LS_LAYOUT        = 'oktop-layout';
  const LS_LAYOUT_MANUAL = 'oktop-layout-manual';

  function isMobileViewport() {
    return window.innerWidth <= 768
      || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function applyLayout(layout) {
    /* 768px 이하에서는 PC 레이아웃 불가 */
    if (isMobileViewport()) layout = 'mobile';
    html.setAttribute('data-layout', layout);
    localStorage.setItem(LS_LAYOUT, layout);
    /* 푸터 버튼 텍스트 동기화 */
    const btn = document.getElementById('pcViewBtn');
    if (btn) btn.textContent = layout === 'pc' ? '모바일 화면' : 'PC 화면';
  }

  (function initLayout() {
    if (isMobileViewport()) {
      applyLayout('mobile');
    } else {
      const saved  = localStorage.getItem(LS_LAYOUT);
      const manual = localStorage.getItem(LS_LAYOUT_MANUAL);
      applyLayout(saved && manual ? saved : 'mobile');
    }
  })();

  /* 푸터 약관 모달 (개인정보처리방침 / 이용약관) */
  function openLegalModal(key, title) {
    const titleEl   = document.getElementById('legalModalTitle');
    const contentEl = document.getElementById('legalModalContent');
    if (titleEl)   titleEl.textContent = title;
    if (contentEl) contentEl.textContent = '불러오는 중...';
    openModal('legalModal');

    fetch('/api/site-settings?key=' + encodeURIComponent(key))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (contentEl) {
          contentEl.textContent = (data && data.value) ? data.value : '관리자가 내용을 등록하지 않았습니다.';
        }
      })
      .catch(function () {
        if (contentEl) contentEl.textContent = '관리자가 내용을 등록하지 않았습니다.';
      });
  }

  document.getElementById('footerPrivacyLink')?.addEventListener('click', function (e) {
    e.preventDefault();
    openLegalModal('privacy_policy', '개인정보처리방침');
  });

  document.getElementById('footerTermsLink')?.addEventListener('click', function (e) {
    e.preventDefault();
    openLegalModal('terms_of_service', '이용약관');
  });

  document.getElementById('signupTermsLink')?.addEventListener('click', function (e) {
    e.preventDefault();
    openLegalModal('terms_of_service', '이용약관');
  });

  /* 푸터 'PC 화면' 버튼 */
  document.getElementById('pcViewBtn')?.addEventListener('click', function () {
    const next = html.getAttribute('data-layout') === 'pc' ? 'mobile' : 'pc';
    localStorage.setItem(LS_LAYOUT_MANUAL, '1');
    applyLayout(next);
  });

  /* 리사이즈: 모바일 뷰포트에서는 항상 mobile로 강제 */
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (isMobileViewport()) {
        applyLayout('mobile');
      } else if (!localStorage.getItem(LS_LAYOUT_MANUAL)) {
        applyLayout('mobile');
      }
    }, 150);
  });

  /* ─────────────────────────────────────────────────────────────
     NAVBAR — scroll effect
  ───────────────────────────────────────────────────────────── */

  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', function () {
    navbar?.classList.toggle('scrolled', window.scrollY > 48);
  }, { passive: true });

  /* ─────────────────────────────────────────────────────────────
     MOBILE DRAWER
  ───────────────────────────────────────────────────────────── */

  const hamburger    = document.getElementById('hamburger');
  const drawer       = document.getElementById('mobileDrawer');
  const overlay      = document.getElementById('mobileOverlay');
  const drawerClose  = document.getElementById('drawerClose');

  function openDrawer() {
    drawer?.classList.add('active');
    overlay?.classList.add('active');
    hamburger?.classList.add('active');
    hamburger?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer?.classList.remove('active');
    overlay?.classList.remove('active');
    hamburger?.classList.remove('active');
    hamburger?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', openDrawer);
  drawerClose?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);

  document.querySelectorAll('.drawer-links a, .drawer-cta').forEach(function (el) {
    el.addEventListener('click', closeDrawer);
  });

  /* Close drawer on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  /* ─────────────────────────────────────────────────────────────
     ACTIVE NAV LINK — highlight on scroll
  ───────────────────────────────────────────────────────────── */

  const sectionEls = document.querySelectorAll('section[id]');
  const navLinks   = document.querySelectorAll('.nav-links a');

  const sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0.35 });

  sectionEls.forEach(function (sec) { sectionObserver.observe(sec); });

  /* ─────────────────────────────────────────────────────────────
     SCROLL-REVEAL — [data-animate] elements
     Stagger delay driven by data-delay attribute (0–n index).
  ───────────────────────────────────────────────────────────── */

  const STAGGER_MS = 90;

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;

      const el    = entry.target;
      const delay = parseInt(el.getAttribute('data-delay') || '0', 10) * STAGGER_MS;

      setTimeout(function () {
        el.classList.add('visible');
      }, delay);

      revealObserver.unobserve(el);
    });
  }, {
    threshold:  0.1,
    rootMargin: '0px 0px -56px 0px',
  });

  document.querySelectorAll('[data-animate]').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ─────────────────────────────────────────────────────────────
     COUNTER ANIMATION
  ───────────────────────────────────────────────────────────── */

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCounter(el) {
    const target   = parseFloat(el.getAttribute('data-target'));
    const suffix   = el.getAttribute('data-suffix') || '';
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const duration = 1600;
    let startTime  = null;

    function step(ts) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const value = target * easeOutCubic(progress);
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals) + suffix;
    }

    requestAnimationFrame(step);
  }

  const counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.counter').forEach(function (el) {
    counterObserver.observe(el);
  });


  /* ─────────────────────────────────────────────────────────────
     PROGRESS BAR ANIMATION (on scroll into view)
  ───────────────────────────────────────────────────────────── */

  const progressObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const fill = entry.target;
      const pct  = fill.getAttribute('data-progress');
      if (pct) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { fill.style.width = pct + '%'; });
        });
      }
      progressObserver.unobserve(fill);
    });
  }, { threshold: 0.3 });


  /* ─────────────────────────────────────────────────────────────
     MODAL SYSTEM
  ───────────────────────────────────────────────────────────── */

  const modalOverlay = document.getElementById('modalOverlay');

  function openModal(id) {
    if (!modalOverlay) return;
    modalOverlay.querySelectorAll('.modal').forEach(function (m) { m.hidden = true; });
    const target = document.getElementById(id);
    if (target) target.hidden = false;
    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeModal();
    });
    modalOverlay.querySelectorAll('.modal-close').forEach(function (btn) {
      btn.addEventListener('click', closeModal);
    });
    modalOverlay.querySelectorAll('.modal-cta').forEach(function (btn) {
      btn.addEventListener('click', closeModal);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalOverlay && !modalOverlay.hidden) closeModal();
  });


  /* ─────────────────────────────────────────────────────────────
     CONSTRUCTION SITES — DB(construction_sites)에서 불러와 동적으로 렌더링
  ───────────────────────────────────────────────────────────── */

  const projectsGrid = document.getElementById('projectsGrid');
  const filterBtns   = document.querySelectorAll('.filter-btn');

  const CONSTRUCTION_STATUS_LABEL = { ongoing: '시공중', completed: '완공' };
  const CONSTRUCTION_STATUS_FILTER_KEY = { ongoing: 'ongoing', completed: 'complete' };

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      document.querySelectorAll('#projectsGrid .project-card').forEach(function (card) {
        const show = filter === 'all' || card.getAttribute('data-status') === filter;
        card.style.display = show ? '' : 'none';
      });
    });
  });

  function renderProjectCards(sites) {
    if (!projectsGrid) return;
    projectsGrid.textContent = '';

    sites.forEach(function (site, index) {
      const filterKey   = CONSTRUCTION_STATUS_FILTER_KEY[site.construction_status] || 'ongoing';
      const statusLabel = CONSTRUCTION_STATUS_LABEL[site.construction_status] || '시공중';
      const thumb = site.images && site.images.length ? site.images[0].url : '';

      const card = document.createElement('article');
      card.className = 'project-card';
      card.setAttribute('data-status', filterKey);
      card.setAttribute('data-animate', '');
      card.setAttribute('data-delay', String(index));
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', site.title + ' 상세보기');

      const imgWrap = document.createElement('div');
      imgWrap.className = 'project-img';
      if (thumb) {
        const img = document.createElement('img');
        img.src = thumb;
        img.alt = site.title;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        imgWrap.appendChild(img);
      }
      const badges = document.createElement('div');
      badges.className = 'project-badges';
      const statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge ' + filterKey;
      statusBadge.appendChild(document.createElement('span')).className = 'status-dot';
      statusBadge.appendChild(document.createTextNode(statusLabel));
      const tag = document.createElement('span');
      tag.className = 'project-tag';
      tag.textContent = statusLabel;
      badges.appendChild(statusBadge);
      badges.appendChild(tag);
      imgWrap.appendChild(badges);
      card.appendChild(imgWrap);

      const info = document.createElement('div');
      info.className = 'project-info';

      const h3 = document.createElement('h3');
      h3.textContent = site.title;
      info.appendChild(h3);

      const meta = document.createElement('div');
      meta.className = 'project-meta';
      if (site.address) {
        const addrSpan = document.createElement('span');
        addrSpan.textContent = '📍 ' + site.address;
        meta.appendChild(addrSpan);
      }
      if (site.area != null) {
        const areaSpan = document.createElement('span');
        areaSpan.textContent = '📐 ' + site.area + (site.area_unit || '㎡');
        meta.appendChild(areaSpan);
      }
      info.appendChild(meta);

      if (site.progress_rate != null) {
        const progressWrap = document.createElement('div');
        progressWrap.className = 'progress-wrap';
        const progressHeader = document.createElement('div');
        progressHeader.className = 'progress-header';
        const lbl = document.createElement('span');
        lbl.textContent = '공정 진행률';
        const pct = document.createElement('strong');
        pct.textContent = site.progress_rate + '%';
        progressHeader.appendChild(lbl);
        progressHeader.appendChild(pct);
        const track = document.createElement('div');
        track.className = 'progress-track';
        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        fill.setAttribute('data-progress', String(site.progress_rate));
        track.appendChild(fill);
        progressWrap.appendChild(progressHeader);
        progressWrap.appendChild(track);
        info.appendChild(progressWrap);
      }

      card.appendChild(info);

      function activate() { openSiteModal(site); }
      card.addEventListener('click', activate);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });

      projectsGrid.appendChild(card);
      revealObserver.observe(card);
    });

    document.querySelectorAll('#projectsGrid .progress-fill').forEach(function (el) {
      progressObserver.observe(el);
    });
  }

  function bindGalleryLightbox() {
    document.querySelectorAll('#siteModalGallery .gallery-photo img').forEach(function (img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function (e) {
        e.stopPropagation();
        openLightbox(img.src);
      });
    });
  }

  function openSiteModal(site) {
    const filterKey   = CONSTRUCTION_STATUS_FILTER_KEY[site.construction_status] || 'ongoing';
    const statusLabel = CONSTRUCTION_STATUS_LABEL[site.construction_status] || '시공중';

    const statusBadge = document.getElementById('siteModalStatusBadge');
    const statusText  = document.getElementById('siteModalStatusText');
    const title       = document.getElementById('siteModalTitle');
    const gallery     = document.getElementById('siteModalGallery');
    const details     = document.getElementById('siteModalDetails');
    const desc        = document.getElementById('siteModalDesc');

    if (statusBadge) statusBadge.className = 'status-badge ' + filterKey;
    if (statusText)  statusText.textContent = statusLabel;
    if (title)       title.textContent = site.title;

    if (gallery) {
      gallery.textContent = '';
      (site.images || [])
        .slice()
        .sort(function (a, b) { return a.order - b.order; })
        .forEach(function (imgData, i) {
          const item = document.createElement('div');
          item.className = 'gallery-item gallery-photo';
          const img = document.createElement('img');
          img.src = imgData.url;
          img.alt = '시공 현장 사진 ' + (i + 1);
          const badge = document.createElement('div');
          badge.className = 'gallery-badge';
          badge.textContent = statusLabel;
          item.appendChild(img);
          item.appendChild(badge);
          gallery.appendChild(item);
        });
    }

    if (details) {
      details.textContent = '';
      const rows = [];
      if (site.address) rows.push(['위치', site.address]);
      if (site.area != null) rows.push(['면적', site.area + (site.area_unit || '㎡')]);
      if (site.site_type) rows.push(['유형', site.site_type]);
      if (site.progress_rate != null) rows.push(['공정률', site.progress_rate + '%']);
      rows.forEach(function (pair) {
        const row = document.createElement('div');
        row.className = 'detail-row';
        const span = document.createElement('span');
        span.textContent = pair[0];
        const strong = document.createElement('strong');
        strong.textContent = pair[1];
        row.appendChild(span);
        row.appendChild(strong);
        details.appendChild(row);
      });
    }

    if (desc) {
      desc.textContent = '';
      const lines = (site.description || '').split('\n');
      lines.forEach(function (line, i) {
        desc.appendChild(document.createTextNode(line));
        if (i < lines.length - 1) desc.appendChild(document.createElement('br'));
      });
    }

    bindGalleryLightbox();
    openModal('siteModal');
  }

  fetch('/api/construction-sites/featured')
    .then(function (r) { return r.ok ? r.json() : { sites: [] }; })
    .then(function (data) { renderProjectCards(data.sites || []); })
    .catch(function () { renderProjectCards([]); });


  /* ─────────────────────────────────────────────────────────────
     IMAGE LIGHTBOX
  ───────────────────────────────────────────────────────────── */

  var imgLightbox   = document.getElementById('imgLightbox');
  var lightboxImg   = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');

  function openLightbox(src) {
    if (!imgLightbox || !lightboxImg) return;
    lightboxImg.src = src;
    imgLightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!imgLightbox) return;
    imgLightbox.hidden = true;
    if (!modalOverlay || modalOverlay.hidden) {
      document.body.style.overflow = '';
    }
  }

  if (imgLightbox) {
    imgLightbox.addEventListener('click', closeLightbox);
  }
  if (lightboxImg) {
    lightboxImg.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  if (lightboxClose) {
    lightboxClose.addEventListener('click', function (e) {
      e.stopPropagation();
      closeLightbox();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && imgLightbox && !imgLightbox.hidden) closeLightbox();
  });


  /* ─────────────────────────────────────────────────────────────
     RECENT SEARCHES (localStorage)
  ───────────────────────────────────────────────────────────── */

  const LS_RECENT   = 'oktop-recent';
  const MAX_RECENT  = 5;
  const recentWrap  = document.getElementById('recentWrap');
  const recentTagsEl = document.getElementById('recentTags');
  const recentClear = document.getElementById('recentClear');

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(LS_RECENT)) || []; }
    catch { return []; }
  }

  function saveRecent(list) {
    localStorage.setItem(LS_RECENT, JSON.stringify(list));
  }

  function addRecentSearch(addr) {
    if (!addr) return;
    let list = getRecent().filter(function (a) { return a !== addr; });
    list.unshift(addr);
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    saveRecent(list);
    renderRecentTags();
  }

  function renderRecentTags() {
    if (!recentTagsEl || !recentWrap) return;
    const list = getRecent();
    recentWrap.style.display = list.length ? 'flex' : 'none';
    recentTagsEl.innerHTML = '';
    list.forEach(function (addr) {
      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'recent-tag';
      tag.innerHTML = addr + ' <span class="recent-tag-del" aria-hidden="true">✕</span>';
      tag.addEventListener('click', function (e) {
        if (e.target.closest('.recent-tag-del')) {
          const newList = getRecent().filter(function (a) { return a !== addr; });
          saveRecent(newList);
          renderRecentTags();
        } else {
          const inp = document.getElementById('addressInput');
          if (inp) { inp.value = addr; }
          runSearch();
        }
      });
      recentTagsEl.appendChild(tag);
    });
  }

  recentClear?.addEventListener('click', function () {
    saveRecent([]);
    renderRecentTags();
  });

  renderRecentTags();


  /* ─────────────────────────────────────────────────────────────
     BUILDING INFO CARD — simulated data
  ───────────────────────────────────────────────────────────── */

  const BUILDING_ZONES = [
    { pattern: /성수|뚝섬|서울숲/,       use: '근린생활시설',  area: '약 280㎡', floors: '5층', fit: 'good'   },
    { pattern: /한남|이태원|경리단/,      use: '다가구주택',    area: '약 195㎡', floors: '4층', fit: 'good'   },
    { pattern: /합정|홍대|연남|망원/,     use: '근린생활시설',  area: '약 320㎡', floors: '4층', fit: 'good'   },
    { pattern: /강남|서초|청담|압구정/,   use: '상업용 빌딩',   area: '약 450㎡', floors: '6층', fit: 'good'   },
    { pattern: /용산|후암|해방촌|녹사평/, use: '다가구주택',    area: '약 210㎡', floors: '4층', fit: 'good'   },
    { pattern: /종로|북촌|인사동/,        use: '근린생활시설',  area: '약 175㎡', floors: '3층', fit: 'review' },
    { pattern: /마포|공덕|아현/,          use: '다세대주택',    area: '약 260㎡', floors: '5층', fit: 'good'   },
    { pattern: /노원|도봉|중랑|강북/,     use: '다세대주택',    area: '약 230㎡', floors: '5층', fit: 'review' },
  ];

  const DEFAULT_BUILDING = { use: '근린생활시설', area: '약 200㎡', floors: '4층', fit: 'review' };

  function getBuildingData(addr) {
    for (const z of BUILDING_ZONES) {
      if (z.pattern.test(addr)) return z;
    }
    return DEFAULT_BUILDING;
  }

  function updateBuildingCard(addr) {
    const buildingIdle = document.getElementById('buildingIdle');
    const buildingCard = document.getElementById('buildingCard');
    if (!buildingCard) return;

    const data = getBuildingData(addr);
    const parts = addr.split(' ');
    const name  = parts.length >= 3
      ? parts.slice(0, 3).join(' ') + ' 건물'
      : addr + ' 건물';

    document.getElementById('buildingName').textContent    = name;
    document.getElementById('buildingAddrText').textContent = addr;
    document.getElementById('specUse').textContent         = data.use;
    document.getElementById('specArea').textContent        = data.area;
    document.getElementById('specFloors').textContent      = data.floors;

    const fitEl = document.getElementById('specFit');
    if (data.fit === 'good') {
      fitEl.innerHTML = '<span class="fit-badge good">✅ 적합</span>';
    } else {
      fitEl.innerHTML = '<span class="fit-badge review">⚠️ 검토필요</span>';
    }

    if (buildingIdle) buildingIdle.hidden = true;
    buildingCard.hidden = false;

    const consultBtn = document.getElementById('consultAddrBtn');
    if (consultBtn) {
      consultBtn.href = '#consultation';
      consultBtn.addEventListener('click', function () {
        const addrField = document.getElementById('addr');
        if (addrField) addrField.value = addr;
      }, { once: true });
    }
  }


  /* ─────────────────────────────────────────────────────────────
     NAVER MAP INIT
  ───────────────────────────────────────────────────────────── */

  let naverMap = null;
  let naverMarker = null;

  function initNaverMap() {
    if (typeof naver === 'undefined' || !naver.maps) return;
    const mapEl = document.getElementById('naverMap');
    if (!mapEl || naverMap) return;

    naverMap = new naver.maps.Map(mapEl, {
      center: new naver.maps.LatLng(37.5665, 126.9780),
      zoom: 13,
      mapTypeId: naver.maps.MapTypeId.NORMAL,
    });

    const mapIdle = document.getElementById('mapIdle');
    if (mapIdle) mapIdle.style.display = 'none';
  }

  function geocodeAndMoveMap(addr) {
    if (typeof naver === 'undefined' || !naver.maps || !naver.maps.Service) return;
    naver.maps.Service.geocode({ query: addr }, function (status, response) {
      if (status !== naver.maps.Service.Status.OK) return;
      const result = response.v2.addresses[0];
      if (!result) return;
      const latlng = new naver.maps.LatLng(result.y, result.x);
      if (naverMap) naverMap.morph(latlng, 19);
      if (naverMarker) naverMarker.setPosition(latlng);
      else {
        naverMarker = new naver.maps.Marker({ position: latlng, map: naverMap });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNaverMap);
  } else {
    setTimeout(initNaverMap, 300);
  }


  /* ─────────────────────────────────────────────────────────────
     LOCATION BUTTON
  ───────────────────────────────────────────────────────────── */

  document.getElementById('locBtn')?.addEventListener('click', function () {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (typeof naver !== 'undefined' && naver.maps && naver.maps.Service) {
        const latlng = new naver.maps.LatLng(lat, lng);
        naver.maps.Service.reverseGeocode(
          { coords: latlng, orders: naver.maps.Service.OrderType.ADDR },
          function (status, response) {
            if (status !== naver.maps.Service.Status.OK) return;
            const addr = response.v2.address.jibunAddress || response.v2.address.roadAddress;
            if (addr) {
              const inp = document.getElementById('addressInput');
              if (inp) inp.value = addr;
              runSearch();
            }
          }
        );
      }
    });
  });


  /* ─────────────────────────────────────────────────────────────
     MAP SEARCH — simulated address analysis
  ───────────────────────────────────────────────────────────── */

  const addressInput = document.getElementById('addressInput');
  const searchBtn    = document.getElementById('searchBtn');
  const mapResult    = document.getElementById('mapResult');
  const resultAddr   = document.getElementById('resultAddress');
  const resultBadge  = document.getElementById('resultBadge');
  const scoreFill    = document.getElementById('scoreFill');
  const scoreValue   = document.getElementById('scoreValue');
  const scoreComment = document.getElementById('scoreComment');

  const SCORE_ZONES = [
    { pattern: /성수|뚝섬|서울숲/,        score: 92, label: '최고', badge: 'high',   comment: '핫플레이스 밀집 지역으로 단기 임대 및 F&B 운영에 최적화된 환경입니다.' },
    { pattern: /한남|이태원|경리단/,       score: 89, label: '최고', badge: 'high',   comment: '고소득 외국인 거주 밀집 지역으로 프리미엄 레지던스 수익률이 높습니다.' },
    { pattern: /합정|홍대|연남|망원/,      score: 85, label: '높음', badge: 'high',   comment: '유동인구가 풍부하고 브런치 카페 및 갤러리 등 문화 공간 수요가 높습니다.' },
    { pattern: /강남|서초|청담|압구정/,    score: 82, label: '높음', badge: 'high',   comment: '높은 임대 단가 덕분에 소규모 면적도 안정적인 수익이 가능합니다.' },
    { pattern: /용산|후암|해방촌|녹사평/,  score: 80, label: '높음', badge: 'high',   comment: '재개발 호재와 함께 루프탑 공간의 희소가치가 높아지고 있습니다.' },
    { pattern: /종로|북촌|인사동|창경궁/,  score: 76, label: '보통', badge: 'medium', comment: '관광 수요를 활용한 단기 임대 모델이 유효합니다. 전문가 상담을 권장합니다.' },
    { pattern: /마포|공덕|아현|염리/,      score: 74, label: '보통', badge: 'medium', comment: '직주근접 수요를 겨냥한 공유 오피스 또는 코워킹 스페이스가 적합합니다.' },
    { pattern: /노원|도봉|중랑|강북/,      score: 54, label: '낮음', badge: 'low',    comment: '수익화 잠재력이 낮은 지역입니다. 시공 전 전문가 심층 상담을 강력 권장합니다.' },
  ];

  const DEFAULT_SCORE = { score: 63, label: '보통', badge: 'medium', comment: '해당 지역에 대한 상세 분석은 전문가 현장 방문 상담을 통해 확인하실 수 있습니다.' };

  function analyzeAddress(addr) {
    for (const zone of SCORE_ZONES) {
      if (zone.pattern.test(addr)) return zone;
    }
    return DEFAULT_SCORE;
  }

  function runSearch() {
    const raw = addressInput?.value.trim();
    if (!raw) {
      addressInput?.focus();
      shakeEl(addressInput);
      return;
    }

    const result = analyzeAddress(raw);

    /* Hide idle, show result panel */
    const mapIdleEl = document.getElementById('mapIdle');
    if (mapIdleEl) mapIdleEl.style.display = 'none';

    if (mapResult) {
      mapResult.hidden = false;
      if (resultAddr)   resultAddr.textContent   = raw;
      if (resultBadge) {
        resultBadge.textContent  = result.label;
        resultBadge.className    = 'result-badge ' + result.badge;
      }
      if (scoreValue)  scoreValue.textContent   = result.score + '점 / 100';
      if (scoreComment) scoreComment.textContent = result.comment;

      if (scoreFill) {
        scoreFill.style.width = '0';
        scoreFill.setAttribute('aria-valuenow', result.score);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            scoreFill.style.width = result.score + '%';
          });
        });
      }
    }

    /* Building card + recent searches + map geocode */
    updateBuildingCard(raw);
    addRecentSearch(raw);
    geocodeAndMoveMap(raw);
  }

  searchBtn?.addEventListener('click', runSearch);
  addressInput?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') runSearch();
  });

  function shakeEl(el) {
    if (!el) return;
    el.style.animation = 'none';
    el.style.borderColor = 'var(--gold-primary)';
    setTimeout(function () { el.style.borderColor = ''; }, 900);
  }

  /* ─────────────────────────────────────────────────────────────
     TOAST UTILITY
  ───────────────────────────────────────────────────────────── */

  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function showToast(msg, type) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.className = 'toast show ' + (type || '');
    toastTimer = setTimeout(function () {
      toastEl.className = 'toast';
    }, 3400);
  }


  /* ─────────────────────────────────────────────────────────────
     AUTH — Supabase 세션 기반 인증 상태 관리
  ───────────────────────────────────────────────────────────── */

  var supabaseClient = null;

  /* 로컬 사용자 스토리지 (Supabase 미설정 시 폴백) */
  var LS_LOCAL_USER = 'oktop-local-user';
  function setUser(u)     { try { localStorage.setItem(LS_LOCAL_USER, JSON.stringify(u)); } catch {} }
  function clearUser()    { localStorage.removeItem(LS_LOCAL_USER); }
  function getLocalUser() { try { return JSON.parse(localStorage.getItem(LS_LOCAL_USER)); } catch { return null; } }

  (function initSupabase() {
    if (!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
    supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    // 초기 세션 확인
    supabaseClient.auth.getUser().then(function (res) {
      applyAuthState(res.data.user || null);
    });

    // 실시간 세션 변경 감지
    supabaseClient.auth.onAuthStateChange(function (event, session) {
      applyAuthState(session ? session.user : null);
    });
  })();

  function getDisplayName(user) {
    if (!user) return '';
    return (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name))
      || (user.email ? user.email.split('@')[0] : '사용자');
  }

  function applyAuthState(user) {
    /* 인자가 없으면(로컬 가입/로그아웃 후) localStorage 폴백 */
    if (user === undefined) {
      var local = getLocalUser();
      user = local ? { user_metadata: { full_name: local.name }, email: local.email } : null;
    }
    var name = user ? getDisplayName(user) : null;

    /* 상담 패널 (페이지 내 상담 섹션) */
    var authPanel    = document.getElementById('authPanel');
    var consultPanel = document.getElementById('consultPanel');
    var consultNameEl = document.getElementById('consultUserName');
    if (authPanel)     authPanel.hidden    = !!user;
    if (consultPanel)  consultPanel.hidden = !user;
    if (consultNameEl) consultNameEl.textContent = name || '사용자';

    /* 네비게이션 바 */
    var navGuest  = document.getElementById('navAuthGuest');
    var navLogged = document.getElementById('navAuthLogged');
    var navName   = document.getElementById('navUserName');
    if (navGuest)  navGuest.style.display  = user ? 'none'  : 'flex';
    if (navLogged) navLogged.style.display = user ? 'flex'  : 'none';
    if (navName)   navName.textContent     = name ? name + '님' : '';

    /* 모바일 드로어 */
    var drawerGuest  = document.getElementById('drawerAuthGuest');
    var drawerLogged = document.getElementById('drawerAuthLogged');
    var drawerName   = document.getElementById('drawerUserName');
    if (drawerGuest)  drawerGuest.style.display  = user ? 'none'  : 'flex';
    if (drawerLogged) drawerLogged.style.display = user ? 'flex'  : 'none';
    if (drawerName)   drawerName.textContent     = name ? name + '님' : '';

    /* 프리미엄 등급(★)은 DB 조회가 필요해 비동기로 한 박자 늦게 반영 */
    if (user && name) {
      fetch('/api/auth/me')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && data.membership_tier === 'premium') {
            renderNameWithStar(navName, name);
            renderNameWithStar(drawerName, name);
          }
        })
        .catch(function () {});
    }
  }

  /* innerHTML 대신 DOM을 직접 구성 (name은 OAuth 닉네임 등 사용자 입력값이라 XSS 방지) */
  function renderNameWithStar(el, name) {
    if (!el) return;
    el.textContent = '';
    el.appendChild(document.createTextNode(name + '님 '));
    var star = document.createElement('span');
    star.style.color = '#B8860B';
    star.textContent = '★';
    el.appendChild(star);
  }

  // 로그아웃 버튼
  document.getElementById('navLogoutBtn')?.addEventListener('click', function () {
    window.location.href = '/api/auth/logout';
  });

  document.getElementById('drawerLogoutBtn')?.addEventListener('click', function () {
    window.location.href = '/api/auth/logout';
  });

  applyAuthState(null); // 초기 렌더 (Supabase 응답 전 기본값)

  /* Tab switching */
  document.querySelectorAll('.auth-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.auth-tab').forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const target = tab.getAttribute('data-tab');
      var paneLogin  = document.getElementById('paneLogin');
      var paneSignup = document.getElementById('paneSignup');
      if (paneLogin)  paneLogin.hidden  = target !== 'login';
      if (paneSignup) paneSignup.hidden = target !== 'signup';
    });
  });

  /* Nav 로그인 / 회원가입 버튼 — consultation 섹션으로 스크롤 + 탭 전환 */
  function scrollToAuthTab(tabName) {
    var consultSection = document.getElementById('consultation');
    if (consultSection) consultSection.scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.auth-tab').forEach(function (t) {
      var isTarget = t.getAttribute('data-tab') === tabName;
      t.classList.toggle('active', isTarget);
      t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });
    var paneLogin  = document.getElementById('paneLogin');
    var paneSignup = document.getElementById('paneSignup');
    if (paneLogin)  paneLogin.hidden  = tabName !== 'login';
    if (paneSignup) paneSignup.hidden = tabName !== 'signup';
  }

  document.getElementById('navLoginBtn')?.addEventListener('click', function () {
    scrollToAuthTab('login');
  });
  document.getElementById('navRegisterBtn')?.addEventListener('click', function () {
    scrollToAuthTab('signup');
  });
  document.getElementById('drawerLoginBtn')?.addEventListener('click', function () {
    closeDrawer();
    setTimeout(function () { scrollToAuthTab('login'); }, 300);
  });
  document.getElementById('drawerRegisterBtn')?.addEventListener('click', function () {
    closeDrawer();
    setTimeout(function () { scrollToAuthTab('signup'); }, 300);
  });
  document.getElementById('drawerConsultBtn')?.addEventListener('click', closeDrawer);

  /* Logout */
  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    window.location.href = '/api/auth/logout';
  });


  /* ─────────────────────────────────────────────────────────────
     SIGNUP FORM — form submit
  ───────────────────────────────────────────────────────────── */

  function setFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(function (el) {
      el.textContent = '';
    });
    document.querySelectorAll('.auth-form input').forEach(function (el) {
      el.style.borderColor = '';
    });
  }

  function markInvalid(inputId, errId, msg) {
    const inp = document.getElementById(inputId);
    if (inp) inp.style.borderColor = '#E57373';
    setFieldError(errId, msg);
  }

  /* Signup form submit */
  /* ── 로그인 폼 ─────────────────────────────────────────────── */
  document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearFieldErrors();

    const email = document.getElementById('loginEmail')?.value.trim();
    const pw    = document.getElementById('loginPw')?.value;

    let ok = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      markInvalid('loginEmail', 'errLoginEmail', '올바른 이메일 주소를 입력해주세요.');
      ok = false;
    }
    if (!pw) {
      markInvalid('loginPw', 'errLoginPw', '비밀번호를 입력해주세요.');
      ok = false;
    }
    if (!ok) return;

    if (!supabaseClient) { showToast('인증 서비스를 이용할 수 없습니다.', 'error'); return; }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) { loginBtn.classList.add('loading'); loginBtn.disabled = true; }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: pw });

    if (loginBtn) { loginBtn.classList.remove('loading'); loginBtn.disabled = false; }

    if (error) {
      var errMsgMap = {
        'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
        'Email not confirmed':       '이메일 인증이 필요합니다.',
        'Too many requests':         '잠시 후 다시 시도해주세요.',
      };
      showToast(errMsgMap[error.message] || '로그인에 실패했습니다.', 'error');
    } else {
      applyAuthState(data.user);
      showToast('로그인되었습니다. 상담 신청을 진행해주세요.', 'success');
      // Next.js 미들웨어가 쿠키 기반 세션을 읽을 수 있도록 동기화
      if (data.session) {
        fetch('/api/auth/sync-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        }).catch(function () {});
      }
    }
  });

  /* ── 회원가입 폼 ─────────────────────────────────────────────── */
  document.getElementById('signupForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearFieldErrors();
    let ok = true;

    const name  = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const phone = document.getElementById('signupPhone')?.value.trim();
    const pw    = document.getElementById('signupPw')?.value;
    const pwc   = document.getElementById('signupPwConfirm')?.value;
    const agreeTerms = document.getElementById('signupAgreeTerms')?.checked;

    if (!name)  { markInvalid('signupName',  'errSignupName',  '이름을 입력해주세요.'); ok = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      markInvalid('signupEmail', 'errSignupEmail', '올바른 이메일 주소를 입력해주세요.'); ok = false;
    }
    if (!phone || !/^01[0-9]-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ''))) {
      markInvalid('signupPhone', 'errSignupPhone', '올바른 휴대폰번호를 입력해주세요.'); ok = false;
    }
    if (!pw || pw.length < 8) {
      markInvalid('signupPw', 'errSignupPw', '비밀번호는 8자 이상 입력해주세요.'); ok = false;
    }
    if (pw !== pwc) {
      markInvalid('signupPwConfirm', 'errSignupPwConfirm', '비밀번호가 일치하지 않습니다.'); ok = false;
    }
    if (!agreeTerms) {
      setFieldError('errSignupAgreeTerms', '이용약관 동의가 필요합니다.'); ok = false;
    }
    if (!ok) return;

    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) { signupBtn.classList.add('loading'); signupBtn.disabled = true; }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pw, name: name, phone: phone, agreedTerms: agreeTerms }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || '회원가입에 실패했습니다.', 'error');
        if (signupBtn) { signupBtn.classList.remove('loading'); signupBtn.disabled = false; }
        return;
      }

      /* 가입 후 자동 로그인 */
      if (supabaseClient) {
        const { data: loginData } = await supabaseClient.auth.signInWithPassword({ email: email, password: pw });
        if (loginData?.user) applyAuthState(loginData.user);
        if (loginData?.session) {
          fetch('/api/auth/sync-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: loginData.session.access_token,
              refresh_token: loginData.session.refresh_token,
            }),
          }).catch(function () {});
        }
      }

      showToast('가입이 완료되었습니다! 상담 신청을 진행해주세요.', 'success');
    } catch {
      showToast('네트워크 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }

    if (signupBtn) { signupBtn.classList.remove('loading'); signupBtn.disabled = false; }
  });


  /* ─────────────────────────────────────────────────────────────
     NAVER OAUTH LOGIN
  ───────────────────────────────────────────────────────────── */

  /* Google / Kakao 소셜 로그인 (Supabase OAuth) */
  // www 여부와 관계없이 항상 정규 도메인 콜백 사용
  const OAUTH_CALLBACK = 'https://theoktop.com/api/auth/callback';

  document.getElementById('googleLoginBtn')?.addEventListener('click', function () {
    if (!supabaseClient) { showToast('Supabase가 설정되지 않았습니다.', 'error'); return; }
    supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: OAUTH_CALLBACK },
    });
  });

  document.getElementById('kakaoLoginBtn')?.addEventListener('click', function () {
    if (!supabaseClient) { showToast('Supabase가 설정되지 않았습니다.', 'error'); return; }
    supabaseClient.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: OAUTH_CALLBACK },
    });
  });

  const NAVER_CLIENT_ID    = 'TZhEtpjM4v2iLGe6P4Zw';
  const NAVER_REDIRECT_URI = 'https://theoktop.com/api/auth/naver-callback';

  document.getElementById('naverLoginBtn')?.addEventListener('click', function () {
    if (NAVER_CLIENT_ID === 'YOUR_NAVER_CLIENT_ID') {
      showToast('네이버 Client ID를 main.js에 설정해주세요.', 'error');
      return;
    }
    const state = Math.random().toString(36).slice(2, 12);
    sessionStorage.setItem('naver_state', state);
    const url = 'https://nid.naver.com/oauth2.0/authorize'
      + '?response_type=code'
      + '&client_id=' + encodeURIComponent(NAVER_CLIENT_ID)
      + '&redirect_uri=' + encodeURIComponent(NAVER_REDIRECT_URI)
      + '&state=' + state;
    window.location.href = url;
  });

  /* Handle OAuth callback (if this page IS the redirect URI) */
  (function handleNaverCallback() {
    const params = new URLSearchParams(window.location.search);
    const code  = params.get('code');
    const state = params.get('state');
    if (!code || !state) return;
    if (state !== sessionStorage.getItem('naver_state')) return;

    /* In production, exchange code for token on your server.
       Here we simulate a successful login. */
    setUser({ name: '네이버 사용자', email: '', phone: '' });
    applyAuthState();
    /* Clean URL */
    history.replaceState(null, '', window.location.pathname + '#consultation');
    showToast('네이버 로그인이 완료되었습니다.', 'success');
  })();


  /* ─────────────────────────────────────────────────────────────
     DROP ZONE — 등기부등본 업로드
  ───────────────────────────────────────────────────────────── */

  const dropZone  = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const dropFiles = document.getElementById('dropFiles');
  const MAX_FILES = 3;
  const MAX_MB    = 20;
  const ALLOWED   = ['application/pdf', 'image/jpeg', 'image/png'];

  let uploadedFiles = [];

  function formatSize(bytes) {
    if (bytes < 1024)       return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }

  function renderFileList() {
    if (!dropFiles) return;
    dropFiles.innerHTML = '';
    uploadedFiles.forEach(function (f, i) {
      const badge = document.createElement('div');
      badge.className = 'file-badge';
      badge.innerHTML =
        '<span class="file-badge-name">📄 ' + f.name + '</span>' +
        '<span class="file-badge-size">' + formatSize(f.size) + '</span>' +
        '<button class="file-badge-del" data-idx="' + i + '" type="button" aria-label="삭제">✕</button>';
      dropFiles.appendChild(badge);
    });

    dropFiles.querySelectorAll('.file-badge-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uploadedFiles.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
        renderFileList();
      });
    });
  }

  function addFiles(fileList) {
    Array.from(fileList).forEach(function (f) {
      if (uploadedFiles.length >= MAX_FILES) {
        showToast('최대 ' + MAX_FILES + '개까지 업로드할 수 있습니다.', 'error'); return;
      }
      if (!ALLOWED.includes(f.type)) {
        showToast('PDF, JPG, PNG 파일만 업로드 가능합니다.', 'error'); return;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        showToast(f.name + ' 파일이 ' + MAX_MB + 'MB를 초과합니다.', 'error'); return;
      }
      uploadedFiles.push(f);
    });
    renderFileList();
  }

  if (dropZone) {
    dropZone.addEventListener('click', function () { fileInput?.click(); });
    dropZone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); }
    });
    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', function (e) {
      if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      addFiles(e.dataTransfer.files);
    });
  }

  fileInput?.addEventListener('change', function () {
    addFiles(fileInput.files);
    fileInput.value = '';
  });


  /* ─────────────────────────────────────────────────────────────
     CONSULTATION FORM — submit + success modal
  ───────────────────────────────────────────────────────────── */

  function generateReceipt() {
    const now = new Date();
    const d = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 8999) + 1000);
    return '#OKT-' + d + '-' + seq;
  }

  const consultForm = document.getElementById('consultForm');
  const submitBtn   = document.getElementById('submitBtn');

  function setConsultError(inputSelector, errId, msg) {
    const el = typeof inputSelector === 'string'
      ? document.querySelector(inputSelector)
      : inputSelector;
    if (el) el.style.borderColor = '#E57373';
    const errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = msg;
  }

  consultForm?.addEventListener('submit', async function (e) {
    e.preventDefault();

    /* Clear previous errors */
    consultForm.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
    consultForm.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.style.borderColor = '';
    });

    let ok = true;

    /* 상담 유형 */
    const typeVal = consultForm.querySelector('input[name="consultType"]:checked');
    if (!typeVal) {
      setConsultError(null, 'errConsultType', '상담 유형을 선택해주세요.');
      ok = false;
    }

    /* 건물 주소 */
    const addr = document.getElementById('addr');
    if (!addr?.value.trim()) {
      setConsultError('#addr', 'errAddr', '건물 주소를 입력해주세요.');
      if (ok) addr?.focus();
      ok = false;
    }

    if (!ok) return;

    /* Loading state */
    if (submitBtn) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    }

    try {
      /* 세션 토큰 획득 */
      var token = null;
      if (supabaseClient) {
        var sessionRes = await supabaseClient.auth.getSession();
        token = sessionRes.data.session?.access_token ?? null;
      }

      var message = document.getElementById('message')?.value.trim() || '';

      var response = await fetch('/api/inquiries/create', {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { 'Authorization': 'Bearer ' + token } : {}
        ),
        body: JSON.stringify({
          inquiry_type: typeVal?.value || '',
          building_address: addr?.value.trim() || '',
          content: message || '상담 신청',
        }),
      });

      var json = await response.json();

      if (!response.ok) {
        showToast(json.error || '상담 신청 중 오류가 발생했습니다.', 'error');
        return;
      }

      /* Show success modal */
      var receiptEl = document.getElementById('receiptNo');
      if (receiptEl) receiptEl.textContent = generateReceipt();
      var overlay = document.getElementById('consultSuccessOverlay');
      if (overlay) {
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
      }

      consultForm.reset();
      uploadedFiles = [];
      renderFileList();
    } catch (err) {
      console.error('[consultForm] submit error:', err);
      showToast('상담 신청 중 오류가 발생했습니다.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    }
  });

  /* Success modal close */
  document.getElementById('successHomeBtn')?.addEventListener('click', function () {
    const overlay = document.getElementById('consultSuccessOverlay');
    document.body.style.overflow = '';
    if (overlay) overlay.hidden = true;
    /* smooth scroll 충돌 방지 후 최상단 이동 */
    document.documentElement.style.scrollBehavior = 'auto';
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.style.scrollBehavior = '';
  });

  document.getElementById('consultSuccessOverlay')?.addEventListener('click', function (e) {
    if (e.target === this) {
      this.hidden = true;
      document.body.style.overflow = '';
    }
  });

  /* ─────────────────────────────────────────────────────────────
     SMOOTH ANCHOR SCROLL (accounts for fixed navbar height)
  ───────────────────────────────────────────────────────────── */

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      const navHeight = parseInt(getComputedStyle(html).getPropertyValue('--nav-h')) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });


  /* ─────────────────────────────────────────────────────────────
     SCROLL-TO-TOP BUTTON
  ───────────────────────────────────────────────────────────── */

  const scrollTopBtn = document.getElementById('scrollTop');

  window.addEventListener('scroll', function () {
    if (!scrollTopBtn) return;
    if (window.scrollY > 300) {
      scrollTopBtn.hidden = false;
      requestAnimationFrame(function () {
        scrollTopBtn.classList.add('visible');
      });
    } else {
      scrollTopBtn.classList.remove('visible');
      setTimeout(function () {
        if (window.scrollY <= 300) scrollTopBtn.hidden = true;
      }, 300);
    }
  }, { passive: true });

  scrollTopBtn?.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

})();
