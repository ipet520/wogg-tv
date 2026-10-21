/* TV Browse presentation adapter. WOGG_TV remains the only business/data authority. */
(function () {
  'use strict';

  const api = window.WOGG_TV;
  if (!api) return;

  const $ = (id) => document.getElementById(id);
  const browse = $('tvBrowse');
  const searchPage = $('tvSearchPage');
  const sourceLayer = $('tvSourceLayer');
  const rail = $('tvBrowseRail');
  const searchResults = $('tvSearchResults');
  const state = {
    route: 'home',
    homeItems: [],
    searchItems: [],
    historyItems: [],
    selectedItem: null,
    focusedItem: null,
    detailReturnElement: null,
    detailReturnKey: '',
    searchReturnElement: null,
    historyReturnElement: null,
    settingsReturnElement: null,
    historyManage: false,
    sourceOpen: false,
    filterCategory: '',
    backdropToken: 0,
    backdropPriority: 0,
    lastHomeKeys: [],
    lastSearchKeys: [],
    homeStatus: '',
    searchStatus: '',
    columnsSite: '',
    columnsKey: '',
    initialReady: false,
    continuePending: null
  };

  document.documentElement.classList.add('tv-browse-active');
  browse.hidden = false;

  function text(node, value) {
    if (node) node.textContent = value == null ? '' : String(value);
  }

  function keyOf(item) {
    if (!item) return '';
    return String(item.siteId || '') + '|' + String(item.href || '') + '|' + String(item.title || item.name || '');
  }

  function layoutTvBrowse() {
    if (browse.hidden) return;
    const rect = browse.getBoundingClientRect();
    const viewport = window.visualViewport;
    const height = Math.min(rect.height, (viewport ? viewport.offsetTop + viewport.height : window.innerHeight) - rect.top);
    if (height <= 0) return;
    const clamp = (min, value, max) => Math.max(min, Math.min(value, max));
    const set = (name, value) => {
      const property = '--tv-' + name;
      if (browse.style.getPropertyValue(property) !== String(value)) browse.style.setProperty(property, value);
    };
    const px = (name, value) => set(name, value + 'px');
    const gap = clamp(4, height * .01, 12);
    const infoGap = clamp(2, height * .004, 5);
    const top = clamp(8, height * .03, 32);
    const foreground = browse.querySelector('.tv-browse-foreground');
    const captionFont = clamp(13, height * 21 / 1080, 21);
    const metaFont = clamp(13, height * 22 / 1080, 22);
    const overviewFont = clamp(14, height * 24 / 1080, 24);
    const titleFont = clamp(24, height * .05, 54);
    px('visible-height', height); px('safe-top', top);
    px('gap', gap); px('info-gap', infoGap); px('caption-font', captionFont);
    px('meta-font', metaFont); px('overview-font', overviewFont); px('title-font', titleFont);
    px('filter-height', clamp(28, height * 34 / 1080, 36));
    px('control-height', clamp(36, height * .045, 50)); px('control-icon', clamp(21, height * .025, 28));
    px('column-font', clamp(16, height * 20 / 1080, 22));
    px('preview-gap', clamp(12, height * .03, 40));
    const feedback = $('tvBrowseFeedback');
    feedback.hidden = !Array.from(feedback.children).some((child) => !child.hidden && child.textContent.trim());
    const caption = Math.max(15, captionFont * 1.2) + 13;
    let core, poster, focusSpace, railSlot, upper, compact;
    for (let profile = 0; profile < 2; profile += 1) {
      compact = profile === 1;
      core = metaFont * (compact ? 1.2 : 2.4) + infoGap * 4;
      set('core-columns', compact ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)');
      px('column-pad-y', compact ? clamp(3, height * 3 / 1080, 4) : clamp(4, height * 4 / 1080, 6));
      px('column-pad-x', clamp(10, height * 12 / 1080, 12));
      px('column-gap', clamp(10, height * 12 / 1080, 12));
      px('function-gap', compact ? 6 : clamp(8, rect.width * .008, 16));
      px('resume-gap', compact ? 12 : 18);
      px('card-gap', clamp(12, rect.width * .014, 28));
      const minWidth = compact ? 96 : Math.max(96, captionFont * 6 + 16);
      poster = Math.max(minWidth * 1.5, height * .33);
      focusSpace = Math.ceil((poster + caption) * .02) + 2;
      railSlot = Math.ceil(poster + caption) + focusSpace * 2;
      const titleEdge = railSlot - focusSpace - (poster + caption) * 1.02 + 6 * 1.04;
      px('rail-title-bottom-gap', titleEdge);
      px('safe-bottom', Math.max(2, Math.max(8, height * .019) - titleEdge));
      const bottom = parseFloat(getComputedStyle(foreground).paddingBottom) || 0;
      upper = height - top - bottom - $('tvBrowseColumns').offsetHeight - railSlot - gap;
      if (upper >= height * .15 + core + overviewFont * 4.5 || compact) break;
    }
    const logoHeight = Math.min(height * (compact ? .11 : .15), Math.max(titleFont * 1.1, upper - core));
    const lines = Math.max(0, Math.min(3, Math.floor((upper - logoHeight - core) / (overviewFont * 1.5))));
    const sourceGap = (parseFloat(getComputedStyle($('tvBrowseSource')).height) || 36) + gap;
    px('logo-height', logoHeight); px('info-offset', Math.max(sourceGap, Math.min(height * .04, Math.max(0, upper - logoHeight - core - lines * overviewFont * 1.5))));
    set('title-lines', compact ? '1' : '2'); set('overview-lines', String(lines));
    set('overview-display', lines ? '-webkit-box' : 'none');
    px('poster-height', poster); px('poster-width', poster * 2 / 3);
    px('focus-space', focusSpace); px('rail-slot', railSlot);
    const filters = $('tvBrowseFilters');
    const upperHost = browse.querySelector('.tv-browse-upper');
    const used = Array.from(filters.querySelectorAll('.secondary-filter-row')).reduce((sum, row) =>
      sum + row.offsetHeight + (parseFloat(getComputedStyle(row).marginBottom) || 0), 4);
    const spare = upperHost.clientHeight - used - gap - (parseFloat(browse.style.getPropertyValue('--tv-preview-gap')) || 0);
    set('filter-overview-lines', String(height < 450 ? 0 : clamp(0, Math.floor(spare / (overviewFont * 1.5)), height >= 720 ? 3 : 2)));
    syncFilterOverview();
  }

  function scheduleRailAnchor(card) {
    if (!card || !rail.contains(card)) return;
    requestAnimationFrame(function () {
      if (!card.isConnected || !rail.contains(card)) return;
      const railRect = rail.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const style = getComputedStyle(rail);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const usableWidth = Math.max(0, rail.clientWidth - paddingLeft - paddingRight);
      const contentLeft = railRect.left + rail.clientLeft;
      const center = cardRect.left + cardRect.width / 2 - contentLeft + rail.scrollLeft;
      const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
      const target = Math.max(0, Math.min(max, center - paddingLeft - usableWidth / 2));
      try { rail.scrollTo({ left: target, behavior: 'smooth' }); }
      catch (error) { rail.scrollLeft = target; }
    });
  }

  function syncFilterOverview() {
    const overview = $('tvBrowseFilterOverview');
    text(overview, $('tvBrowseOverview').textContent);
    overview.hidden = !browse.classList.contains('filter-open') || !overview.textContent.trim()
      || Number(browse.style.getPropertyValue('--tv-filter-overview-lines')) < 1;
  }

  function rootVisible() {
    const detail = $('sheet');
    return !!(detail && detail.classList.contains('active'));
  }

  function showRoute() {
    const inSearch = state.route === 'search';
    browse.hidden = false;
    searchPage.hidden = !inSearch;
    browse.classList.toggle('tv-history-open', state.route === 'history');
    browse.classList.toggle('tv-history-manage-mode', state.historyManage);
    $('tvBrowseSource').hidden = state.route === 'history';
    $('tvHistoryManage').hidden = state.route !== 'history';
    $('tvBrowseColumns').hidden = false;
    $('tvBrowseColumns').setAttribute('aria-hidden', String(state.route === 'history'));
    $('tvBrowseColumns').querySelectorAll('button').forEach((button) => { button.tabIndex = state.route === 'history' ? -1 : 0; });
    $('tvHistoryResume').hidden = state.route !== 'history' || !state.focusedItem;
    if (!inSearch) {
      $('tvSearchPage').hidden = true;
      if (state.route === 'history') browse.classList.add('history-open');
      else browse.classList.remove('history-open');
    } else {
      browse.classList.remove('history-open');
      browse.hidden = true;
    }
  }

  function setStatus(value) {
    state.homeStatus = value || '';
    text($('tvBrowseStatus'), state.homeStatus);
    requestAnimationFrame(layoutTvBrowse);
  }

  function setSearchStatus(value) {
    state.searchStatus = value || '';
    text($('tvSearchStatus'), state.searchStatus);
  }

  function setLoading(loading) {
    const posters = $('tvBrowsePosters');
    $('tvBrowseRailLoader').hidden = !loading;
    posters.classList.toggle('rail-loading', !!loading);
    posters.classList.toggle('rail-switch-pending', !!loading);
  }

  function safeBackdropUrl(value) {
    const url = String(value || '').trim();
    if (!url || /^(javascript|data:text\/html):/i.test(url)) return '';
    return url;
  }

  function heroIsCurrent(item, token) {
    return token === state.backdropToken && state.selectedItem === item
      && (!item || api.itemsAllowed([item]).length > 0);
  }

  function transitionBackdrop(value, item, token, priority) {
    if (!heroIsCurrent(item, token) || priority < state.backdropPriority) return;
    const url = safeBackdropUrl(value);
    const a = $('tvBrowseBackdrop'), b = $('tvBrowseBackdropNext');
    const active = a.classList.contains('visible') ? a : (b.classList.contains('visible') ? b : a);
    const next = active === a ? b : a;
    next.style.backgroundImage = url ? 'url(' + JSON.stringify(url) + ')' : '';
    next.style.backgroundPosition = 'center center';
    next.style.backgroundSize = 'cover';
    next.classList.add('visible');
    active.classList.remove('visible');
    state.backdropPriority = priority;
    window.setTimeout(function () {
      if (token !== state.backdropToken) return;
      active.style.backgroundImage = '';
    }, 280);
  }

  function loadBackdrop(result, item, token, priority) {
    const visual = result || {};
    const candidates = [visual.url, visual.fallback].map(safeBackdropUrl).filter((url, index, urls) => url && urls.indexOf(url) === index);
    function tryCandidate(index) {
      if (!heroIsCurrent(item, token)) return;
      if (index >= candidates.length) {
        if (!index) transitionBackdrop('', item, token, priority);
        return;
      }
      const url = candidates[index];
      const probe = new Image();
      probe.onload = function () { transitionBackdrop(url, item, token, priority); };
      probe.onerror = function () { tryCandidate(index + 1); };
      probe.referrerPolicy = 'no-referrer';
      probe.src = url;
    }
    tryCandidate(0);
  }

  function loadHeroLogo(value, item, token) {
    const url = safeBackdropUrl(value);
    if (!url) return;
    const logo = $('tvBrowseLogo');
    const title = $('tvBrowseTitle');
    const probe = new Image();
    probe.onload = function () {
      if (!heroIsCurrent(item, token)) return;
      logo.src = url;
      logo.alt = String(item.title || item.name || '');
      logo.hidden = false;
      title.hidden = true;
    };
    probe.onerror = function () {
      if (!heroIsCurrent(item, token)) return;
      logo.hidden = true;
      logo.removeAttribute('src');
      title.hidden = false;
    };
    probe.referrerPolicy = 'no-referrer';
    probe.src = url;
  }

  function setHeroInfo(item, tmdb) {
    const siteName = item.siteName || api.getSiteName(item.siteId) || api.getCurrentSite().name || '';
    const title = String(item.title || item.name || '');
    const meta = [item.year || (tmdb && tmdb.year) || '', item.area || (tmdb && tmdb.area) || '', item.cls || item.typeName || (tmdb && (tmdb.cls || tmdb.typeName)) || ''].filter(Boolean).join(' · ');
    const update = String(item.remark || item.quality || siteName || '').trim();
    const overview = String(item.overview || item.content || item.description || (tmdb && tmdb.desc) || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    text($('tvBrowseTitle'), title);
    $('tvBrowseTitle').hidden = false;
    text($('tvBrowseMeta'), meta || siteName);
    text($('tvBrowseUpdate'), update && update !== siteName ? update : '');
    text($('tvBrowseOverview'), overview);
    syncFilterOverview();
  }

  function setHero(item) {
    const token = ++state.backdropToken;
    state.backdropPriority = 0;
    if (!item) {
      state.selectedItem = null;
      state.focusedItem = null;
      const logo = $('tvBrowseLogo');
      logo.hidden = true;
      logo.removeAttribute('src');
      $('tvBrowseTitle').hidden = false;
      text($('tvBrowseTitle'), '');
      text($('tvBrowseMeta'), '');
      text($('tvBrowseUpdate'), '');
      text($('tvBrowseOverview'), '');
      transitionBackdrop('', null, token, 0);
      if (state.route === 'history') updateHistoryResume(null);
      syncFilterOverview();
      return;
    }
    state.selectedItem = item;
    state.focusedItem = item;
    $('tvBrowseLogo').hidden = true;
    $('tvBrowseLogo').removeAttribute('src');
    $('tvBrowseTitle').hidden = false;
    setHeroInfo(item, null);
    transitionBackdrop('', item, token, 0);

    let visuals = null;
    try { visuals = api.getBrowseVisuals && api.getBrowseVisuals(item); } catch (error) {}
    if (visuals) {
      if (visuals.fallbackBackdrop) loadBackdrop({ url: visuals.fallbackBackdrop }, item, token, 1);
      Promise.resolve(visuals.backdrop).then((result) => loadBackdrop(result, item, token, 2)).catch(() => {});
      Promise.resolve(visuals.logo).then((url) => loadHeroLogo(url, item, token)).catch(() => {});
      Promise.resolve(visuals.metadata).then((metadata) => {
        if (!metadata || !heroIsCurrent(item, token)) return;
        setHeroInfo(item, metadata);
      }).catch(() => {});
    } else {
      loadBackdrop({ url: item.backdrop || item._backdrop || item.pic || '' }, item, token, 1);
    }

    if (state.route === 'history') updateHistoryResume(item);
  }

  function updateHistoryResume(item) {
    const progress = api.getHistoryProgress(item) || item || {};
    const episode = progress._lastEpName || progress.remark || '';
    text($('tvHistoryEpisode'), episode);
    text($('tvHistoryTime'), '');
    $('tvHistoryProgress').hidden = true;
    $('tvHistoryResume').hidden = !item;
  }

  function transformWoggCard(item, index, aggregateResult, historyCard) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = api.getCardHtml(item, index, aggregateResult).trim();
    const card = wrapper.firstElementChild;
    if (!card) return null;
    card.classList.add('focusable');
    card.tabIndex = 0;
    card.dataset.tvKey = keyOf(item);
    card.__woggItem = item;
    const poster = card.querySelector('.poster');
    if (poster) poster.classList.add('poster-wrap');
    const meta = card.querySelector('.meta');
    if (meta) meta.classList.add('card-body');
    const name = card.querySelector('.name');
    if (name) name.classList.add('card-title');

    card.addEventListener('focus', function () {
      state.focusedItem = item;
      setHero(item);
      if (rail.contains(card)) scheduleRailAnchor(card);
    });
    card.addEventListener('click', function (event) {
      const deleteButton = event.target.closest('.tv-history-delete');
      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        api.deleteHistory(item);
        renderHistory();
        return;
      }
      openItem(item);
    });

    if (historyCard) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tv-history-delete focusable';
      remove.textContent = '删除';
      remove.setAttribute('aria-label', '删除' + (item.title || '观看记录'));
      remove.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        api.deleteHistory(item);
        renderHistory();
      });
      card.appendChild(remove);
    }
    return card;
  }

  function renderCardCollection(container, items, mode, append, historyCard) {
    if (!container) return;
    const allowed = api.itemsAllowed(items || []);
    const isHistory = !!historyCard;
    const isAggregate = mode === 'search' && api.isAggregate();
    const keys = allowed.map(keyOf);
    const previous = mode === 'search' ? state.lastSearchKeys : state.lastHomeKeys;
    const canAppend = !!append && previous.length <= keys.length && previous.every((key, index) => key === keys[index]);

    if (!canAppend) container.replaceChildren();
    const start = canAppend ? previous.length : 0;
    for (let i = start; i < allowed.length; i += 1) {
      const card = transformWoggCard(allowed[i], i, isAggregate, isHistory);
      if (card) container.appendChild(card);
    }
    if (mode === 'search') state.lastSearchKeys = keys;
    else state.lastHomeKeys = keys;
    if (!allowed.length && !container.querySelector('.tv-empty')) {
      const empty = document.createElement('div');
      empty.className = 'tv-empty';
      empty.textContent = state.route === 'history' ? '暂无观看记录' : (mode === 'search' ? '暂无搜索结果' : '暂无内容');
      container.appendChild(empty);
    } else {
      const empty = container.querySelector('.tv-empty');
      if (empty) empty.remove();
    }
    api.hydrateCards(container, allowed);
    return allowed;
  }

  function currentCategoryIsSelected(id, siteId) {
    const active = String(api.getActiveCategory() || '');
    if (active === String(id)) return true;
    return api.getSecondaryCategories(siteId, id).some((option) => option.id === active);
  }

  function categoryButton(categoryId) {
    return Array.from($('tvBrowseColumns').querySelectorAll('[data-category]'))
      .find((button) => button.dataset.category === String(categoryId)) || null;
  }

  function renderColumns() {
    const site = api.getCurrentSite();
    const host = $('tvBrowseColumns');
    const categories = api.getCategories(site.id);
    const signature = site.id + '|' + categories.map((entry) => entry.id + ':' + entry.name).join('|');
    if (state.columnsSite === site.id && state.columnsKey === signature && host.children.length === categories.length) {
      Array.from(host.children).forEach(function (button) {
        button.setAttribute('aria-pressed', String(currentCategoryIsSelected(button.dataset.category, site.id)));
        button.tabIndex = state.route === 'history' ? -1 : 0;
      });
      return;
    }
    const focusedCategory = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.category;
    host.replaceChildren();
    state.columnsSite = site.id;
    state.columnsKey = signature;
    host.classList.remove('tv-browse-columns-pending');
    categories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tv-browse-column tv-browse-control tv-browse-pill focusable';
      button.tabIndex = state.route === 'history' ? -1 : 0;
      button.textContent = category.name;
      button.dataset.category = category.id;
      button.setAttribute('aria-pressed', String(currentCategoryIsSelected(category.id, site.id)));
      button.addEventListener('focus', function () {
        if (!currentCategoryIsSelected(category.id, site.id)) {
          setLoading(true);
          api.selectCategory(category.id).then(function () {
            renderColumns();
          });
        }
      });
      button.addEventListener('click', function () {
        const options = api.getSecondaryCategories(site.id, category.id);
        if (options.length) openFilters(category.id);
        else if (!currentCategoryIsSelected(category.id, site.id)) api.selectCategory(category.id);
      });
      host.appendChild(button);
    });
    if (focusedCategory) {
      const restored = categoryButton(focusedCategory);
      if (restored) restored.focus();
    }
    requestAnimationFrame(function () {
      const active = host.querySelector('[aria-pressed="true"]');
      if (active && state.route === 'home') {
        try { active.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
      }
    });
  }

  function renderFunctions() {
    const host = $('tvBrowseFunctions');
    host.innerHTML = '';
    const entries = [
      ['search', '搜索', '<circle cx="11" cy="11" r="6.25"></circle><path d="M15.8 15.8L20 20"></path>'],
      ['live', '直播', ''],
      ['history', '历史', ''],
      ['settings', '设置', '']
    ];
    entries.forEach(function (entry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tv-browse-control focusable';
      if (entry[0] === 'search') button.classList.add('tv-browse-search');
      button.dataset.action = entry[0];
      button.setAttribute('aria-label', entry[1]);
      button.innerHTML = entry[0] === 'search'
        ? '<span>' + entry[1] + '</span><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + entry[2] + '</svg>'
        : '<span>' + entry[1] + '</span>';
      host.appendChild(button);
    });
    const grid = document.createElement('button');
    grid.type = 'button';
    grid.className = 'tv-browse-control tv-browse-grid-button focusable';
    grid.dataset.action = 'html-settings';
    grid.setAttribute('aria-label', 'WOGG 基础设置');
    grid.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="5" height="5" rx="1"></rect><rect x="10" y="3" width="5" height="5" rx="1"></rect><rect x="17" y="3" width="5" height="5" rx="1"></rect><rect x="3" y="10" width="5" height="5" rx="1"></rect><rect x="10" y="10" width="5" height="5" rx="1"></rect><rect x="17" y="10" width="5" height="5" rx="1"></rect><rect x="3" y="17" width="5" height="5" rx="1"></rect><rect x="10" y="17" width="5" height="5" rx="1"></rect><rect x="17" y="17" width="5" height="5" rx="1"></rect></svg>';
    host.appendChild(grid);
  }

  function renderHome(items, append) {
    state.route = 'home';
    showRoute();
    if (items) state.homeItems = api.itemsAllowed(items);
    renderColumns();
    const cleanItems = renderCardCollection(rail, state.homeItems, 'category', !!append, false) || [];
    if (cleanItems.length) {
      const activeKey = state.selectedItem && keyOf(state.selectedItem);
      const selected = cleanItems.find((item) => keyOf(item) === activeKey) || cleanItems[0];
      if (selected !== state.selectedItem || !api.itemsAllowed([state.selectedItem]).length) setHero(selected);
    } else {
      setHero(null);
      text($('tvBrowseTitle'), api.getCurrentSite().name || 'WOGG TV');
    }
    setLoading(false);
    text($('tvBrowseStatus'), state.homeStatus);
  }

  function renderSourceOptions() {
    const host = $('tvSourceList');
    const current = api.getCurrentSite().id;
    host.replaceChildren();
    api.getSites().forEach(function (site) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tv-source-option focusable';
      button.dataset.siteId = site.id;
      button.setAttribute('aria-pressed', String(site.id === current));
      const name = document.createElement('span');
      name.textContent = site.name;
      button.appendChild(name);
      if (site.onlineOnly) {
        const mode = document.createElement('span');
        mode.className = 'tv-source-online';
        mode.textContent = '在线播放';
        button.appendChild(mode);
      }
      button.addEventListener('click', async function () {
        setLoading(true);
        const switchPromise = api.switchSite(site.id);
        closeSource(false);
        renderColumns();
        setStatus('正在切换到 ' + site.name + '…');
        const switched = await switchPromise;
        if (!switched) return;
        const first = rail.querySelector('.card');
        if (first) first.focus();
        else {
          const activeCategory = $('tvBrowseColumns').querySelector('[aria-pressed="true"]');
          if (activeCategory) activeCategory.focus();
        }
      });
      host.appendChild(button);
    });
  }

  function openSource() {
    renderSourceOptions();
    sourceLayer.hidden = false;
    state.sourceOpen = true;
    const current = sourceLayer.querySelector('[aria-pressed="true"]');
    if (current) current.focus();
  }

  function closeSource(restoreFocus) {
    sourceLayer.hidden = true;
    state.sourceOpen = false;
    if (restoreFocus !== false) $('tvBrowseSource').focus();
  }

  function openFilters(categoryId) {
    const site = api.getCurrentSite();
    const options = api.getSecondaryCategories(site.id, categoryId);
    const host = $('tvBrowseFilters');
    if (!options.length) return false;
    state.filterCategory = categoryId;
    host.replaceChildren();
    const row = document.createElement('div');
    row.className = 'secondary-filter-row';
    const label = document.createElement('span');
    label.className = 'secondary-filter-label';
    label.textContent = '分类';
    row.appendChild(label);
    const list = document.createElement('div');
    list.className = 'secondary-filter-options';
    options.forEach(function (option) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tv-browse-control tv-browse-pill focusable secondary-filter-option';
      button.textContent = option.name;
      button.dataset.value = option.id;
      button.setAttribute('aria-pressed', String(api.getActiveCategory() === option.id));
      button.addEventListener('click', async function () {
        setLoading(true);
        await api.selectCategory(option.id);
        closeFilters(false);
        renderColumns();
        const current = categoryButton(categoryId);
        if (current) current.focus();
      });
      list.appendChild(button);
    });
    row.appendChild(list);
    host.appendChild(row);
    host.hidden = false;
    browse.classList.add('filter-open');
    $('tvBrowseFunctions').hidden = true;
    $('tvBrowseInfo').hidden = true;
    $('tvBrowseFilterOverview').hidden = false;
    syncFilterOverview();
    layoutTvBrowse();
    const first = host.querySelector('button');
    if (first) first.focus();
    return true;
  }

  function closeFilters(restoreFocus) {
    $('tvBrowseFilters').hidden = true;
    browse.classList.remove('filter-open');
    $('tvBrowseFunctions').hidden = state.route === 'history';
    $('tvBrowseInfo').hidden = false;
    $('tvBrowseFilterOverview').hidden = true;
    if (restoreFocus !== false && state.filterCategory) {
      const button = categoryButton(state.filterCategory);
      if (button) button.focus();
    }
    state.filterCategory = '';
    layoutTvBrowse();
  }

  function renderSearchHistory() {
    const host = $('tvSearchHistory');
    const history = api.getSearchHistory();
    const previousFocus = host.contains(document.activeElement) ? {
      query: document.activeElement.dataset.searchQuery || '',
      remove: document.activeElement.classList.contains('tv-search-history-remove')
    } : null;
    host.replaceChildren();
    $('tvSearchHistorySection').hidden = !history.length;
    $('tvSearchHistoryClear').hidden = !history.length;
    history.forEach(function (query) {
      const group = document.createElement('div');
      group.className = 'tv-search-history-chip';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'focusable';
      button.textContent = query;
      button.dataset.searchQuery = query;
      button.addEventListener('click', function () {
        $('tvSearchInput').value = query;
        runSearch(query);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tv-search-history-remove focusable';
      remove.textContent = '×';
      remove.dataset.searchQuery = query;
      remove.setAttribute('aria-label', '删除搜索记录 ' + query);
      remove.addEventListener('click', function () {
        api.removeSearchHistory(query);
        renderSearchHistory();
      });
      group.append(button, remove);
      host.appendChild(group);
    });
    if (previousFocus) {
      const target = Array.from(host.querySelectorAll('button')).find((button) =>
        button.dataset.searchQuery === previousFocus.query && button.classList.contains('tv-search-history-remove') === previousFocus.remove);
      (target || $('tvSearchInput')).focus();
    }
  }

  function updateSearchMode() {
    const aggregate = api.isAggregate();
    const button = $('tvSearchMode');
    button.textContent = aggregate ? '聚合搜索' : '单站搜索 · ' + api.getCurrentSite().name;
    button.setAttribute('aria-pressed', String(aggregate));
  }

  function openSearch() {
    if (state.route !== 'search') state.searchReturnElement = document.activeElement;
    if (location.hash !== '#search') history.pushState({ wo: 'search' }, '', '#search');
    state.route = 'search';
    showRoute();
    renderSearchHistory();
    updateSearchMode();
    renderCardCollection(searchResults, state.searchItems, 'search', false, false);
    text($('tvSearchStatus'), state.searchStatus);
    requestAnimationFrame(() => $('tvSearchInput').focus());
  }

  async function runSearch(query) {
    const q = String(query == null ? $('tvSearchInput').value : query).trim();
    if (!q) return;
    $('tvSearchInput').value = q;
    state.searchItems = [];
    state.lastSearchKeys = [];
    searchResults.replaceChildren();
    setSearchStatus('正在搜索“' + q + '”…');
    renderSearchHistory();
    updateSearchMode();
    await api.search(q, api.isAggregate());
    renderSearchHistory();
  }

  function leaveSearch() {
    api.cancelSearch();
    api.exitSearch();
    if (location.hash === '#search') {
      state.route = 'home';
      showRoute();
      renderHome(state.homeItems, false);
      restoreSearchReturnFocus();
      history.back();
      return;
    }
    state.route = 'home';
    showRoute();
    renderHome(state.homeItems, false);
    restoreSearchReturnFocus();
  }

  function restoreSearchReturnFocus() {
    const previous = state.searchReturnElement;
    state.searchReturnElement = null;
    const active = previous && previous.isConnected && !previous.closest('[hidden]')
      ? previous
      : ($('tvBrowseColumns').querySelector('[aria-pressed="true"]') || rail.querySelector('.card'));
    if (active) active.focus();
  }

  function renderHistory() {
    const priorKey = state.route === 'history' && state.focusedItem ? keyOf(state.focusedItem) : '';
    const restoreRailFocus = rail.contains(document.activeElement);
    state.route = 'history';
    state.historyItems = api.getHistory();
    state.focusedItem = null;
    showRoute();
    renderCardCollection(rail, state.historyItems, 'history', false, true);
    if (state.historyItems.length) {
      const item = state.historyItems.find((entry) => keyOf(entry) === priorKey) || state.historyItems[0];
      setHero(item);
      state.historyItems = api.getHistory();
      if (restoreRailFocus) {
        const card = Array.from(rail.querySelectorAll('.card')).find((entry) => entry.dataset.tvKey === keyOf(item));
        if (card) card.focus();
      }
    } else {
      $('tvHistoryResume').hidden = true;
      setHero(null);
      browse.classList.add('empty-history');
      text($('tvBrowseTitle'), '最近观看');
    }
    browse.classList.toggle('empty-history', !state.historyItems.length);
    $('tvHistoryManage').setAttribute('aria-pressed', String(state.historyManage));
    $('tvHistoryManage').textContent = state.historyManage ? '完成' : '管理';
    text($('tvBrowseStatus'), '最近观看 · ' + state.historyItems.length + ' 条');
  }

  function openHistory() {
    if (location.hash !== '#history') history.pushState({ wo: 'history' }, '', '#history');
    state.historyReturnElement = document.activeElement;
    state.historyManage = false;
    state.focusedItem = null;
    renderHistory();
    const first = rail.querySelector('.card');
    if (first) first.focus();
  }

  function closeHistory() {
    state.historyManage = false;
    browse.classList.remove('empty-history');
    state.route = 'home';
    showRoute();
    renderHome(state.homeItems, false);
    const returnElement = state.historyReturnElement;
    state.historyReturnElement = null;
    const active = returnElement && returnElement.isConnected && !returnElement.closest('[hidden]')
      ? returnElement
      : ($('tvBrowseColumns').querySelector('[aria-pressed="true"]') || rail.querySelector('.card'));
    if (active) active.focus();
    if (location.hash === '#history') history.back();
  }

  function showMessage(message) {
    if (state.route === 'search') setSearchStatus(message);
    else setStatus(message);
  }

  async function openNative(action) {
    try {
      const app = (window.fm && window.fm.app) || (window.fongmi && window.fongmi.app) || null;
      const method = action === 'live' ? 'openLive' : 'openSetting';
      if (app && typeof app[method] === 'function') {
        await app[method]();
        return;
      }
      showMessage(action === 'live' ? '当前环境不支持打开直播' : '当前环境不支持打开 App 设置');
    } catch (error) {
      showMessage((action === 'live' ? '打开直播失败：' : '打开 App 设置失败：') + (error && error.message ? error.message : 'unknown'));
    }
  }

  function openHtmlSettings() {
    state.settingsReturnElement = document.activeElement;
    renderPinStatus();
    api.openDomainSettings();
    requestAnimationFrame(function () {
      const target = localStorage.getItem('wo_tv_pin_hash') ? $('tvPinCurrent') : $('tvPinNew');
      if (target && !target.disabled) target.focus();
    });
  }

  function openItem(item) {
    if (!api.itemsAllowed([item]).length) {
      showMessage('该站源当前处于锁定状态');
      return;
    }
    state.detailReturnElement = document.activeElement;
    state.detailReturnKey = keyOf(item);
    state.continuePending = null;
    api.openDetail(item);
  }

  function ensureDetailActions() {
    const sheet = $('sheet');
    const host = $('detHeroCta');
    if (!sheet || !sheet.classList.contains('active') || !host) return;
    if (host.querySelector('.tv-detail-resource-action')) return;
    const actions = document.createElement('div');
    actions.className = 'tv-detail-primary';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tv-detail-resource-action focusable';
    button.textContent = '资源';
    button.setAttribute('aria-label', '选择资源');
    button.addEventListener('click', openResources);
    host.appendChild(actions);
    actions.appendChild(button);
  }

  function openResources() {
    const row = document.querySelector('body > .det-collapse-row');
    if (!row || !row.querySelector('.det-res')) {
      showMessage('资源仍在读取，请稍后再试');
      return;
    }
    const collapse = row.querySelector('.det-collapse');
    const head = row.querySelector('.det-collapse-head');
    if (collapse && !collapse.classList.contains('open') && head) head.click();
    document.body.classList.add('tv-wogg-resource-open');
    const active = row.querySelector('.det-res-tab.active') || row.querySelector('.det-res-tab');
    if (active) active.click();
    requestAnimationFrame(function () {
      const first = row.querySelector('.det-res-pane:not([hidden]) .pan-item, .det-res-tab');
      if (first) first.focus();
    });
  }

  function closeResources() {
    const row = document.querySelector('body > .det-collapse-row');
    if (row) {
      const collapse = row.querySelector('.det-collapse');
      const head = row.querySelector('.det-collapse-head');
      if (head && collapse && collapse.classList.contains('open') && document.body.classList.contains('tv-wogg-resource-open')) head.click();
    }
    document.body.classList.remove('tv-wogg-resource-open');
    const action = $('detHeroCta') && $('detHeroCta').querySelector('.tv-detail-resource-action');
    if (action) action.focus();
  }

  function detailIsOpen() {
    const sheet = $('sheet');
    return !!(sheet && sheet.classList.contains('active'));
  }

  function renderPinStatus(message) {
    const status = $('tvPinStatus');
    if (message) {
      text(status, message);
      return;
    }
    const configured = !!localStorage.getItem('wo_tv_pin_hash');
    text(status, configured ? (api.isPinUnlocked() ? '已解锁，当前页面关闭或重新载入后会自动锁定。' : '已设置 PIN，受控站源保持锁定。') : '尚未设置 PIN，受控站源保持锁定。');
  }

  function randomSalt() {
    const bytes = new Uint8Array(12);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes).map((n) => n.toString(16).padStart(2, '0')).join('');
  }

  function fnv32(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  async function digestPin(pin, algorithm, salt) {
    const input = salt + ':' + pin;
    if (algorithm === 'sha256' && window.crypto && window.crypto.subtle) {
      const bytes = new Uint8Array(Array.from(input).map((character) => character.charCodeAt(0)));
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, '0')).join('');
    }
    return fnv32(input);
  }

  async function verifyPin(pin) {
    const stored = localStorage.getItem('wo_tv_pin_hash') || '';
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    try { return (await digestPin(String(pin || ''), parts[0], parts[1])) === parts[2]; }
    catch (error) { return false; }
  }

  async function savePin() {
    const current = $('tvPinCurrent').value.trim();
    const next = $('tvPinNew').value.trim();
    const confirm = $('tvPinConfirm').value.trim();
    const stored = localStorage.getItem('wo_tv_pin_hash') || '';
    if (stored && !(await verifyPin(current))) {
      renderPinStatus('当前 PIN 不正确。');
      return;
    }
    if (!/^\d{4,12}$/.test(next)) {
      renderPinStatus('PIN 需为 4 到 12 位数字。');
      return;
    }
    if (next !== confirm) {
      renderPinStatus('两次输入的新 PIN 不一致。');
      return;
    }
    const salt = randomSalt();
    const algorithm = window.crypto && window.crypto.subtle ? 'sha256' : 'fnv32';
    const digest = await digestPin(next, algorithm, salt);
    localStorage.setItem('wo_tv_pin_hash', algorithm + ':' + salt + ':' + digest);
    api.setPinUnlocked(false);
    $('tvPinCurrent').value = '';
    $('tvPinNew').value = '';
    $('tvPinConfirm').value = '';
    renderPinStatus('PIN 已保存；输入 PIN 并选择“验证并解锁”后显示受控站源。');
  }

  async function unlockPin() {
    const stored = localStorage.getItem('wo_tv_pin_hash') || '';
    if (!stored) {
      renderPinStatus('请先设置 PIN。');
      return;
    }
    const valid = await verifyPin($('tvPinCurrent').value.trim());
    if (!valid) {
      renderPinStatus('PIN 不正确。');
      return;
    }
    api.setPinUnlocked(true);
    $('tvPinCurrent').value = '';
    renderPinStatus('验证通过，五个受控站源已显示。');
    renderSourceOptions();
  }

  function lockPin() {
    const previousSite = api.getCurrentSite().id;
    api.setPinUnlocked(false);
    const currentSite = api.getCurrentSite().id;
    state.homeItems = api.itemsAllowed(state.homeItems);
    state.searchItems = api.itemsAllowed(state.searchItems);
    state.historyItems = api.itemsAllowed(state.historyItems);
    if (state.selectedItem && !api.itemsAllowed([state.selectedItem]).length) state.selectedItem = null;
    if (state.route === 'history') renderHistory();
    else if (state.route === 'home') renderHome(state.homeItems, false);
    else {
      renderCardCollection(searchResults, state.searchItems, 'search', false, false);
      renderSearchHistory();
    }
    renderPinStatus('已锁定，受控站源和相关缓存内容已从当前页面隐藏。');
    renderSourceOptions();
    if (currentSite !== previousSite) api.switchSite(currentSite);
  }

  function renderSourceAfterAccess() {
    renderSourceOptions();
    state.homeItems = api.itemsAllowed(state.homeItems);
    state.searchItems = api.itemsAllowed(state.searchItems);
    state.historyItems = api.itemsAllowed(state.historyItems);
    if (state.route === 'home') renderHome(state.homeItems, false);
    if (state.route === 'search') renderCardCollection(searchResults, state.searchItems, 'search', false, false);
    if (state.route === 'history') renderHistory();
  }

  function visibleFocusable(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('button,input,textarea,select,a[href],[tabindex]')).filter(function (el) {
      if (el.disabled || el.tabIndex < 0 || el.hidden) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    });
  }

  function activeFocusScope() {
    if (sourceLayer && !sourceLayer.hidden) return sourceLayer;
    if (!$('tvBrowseFilters').hidden) return $('tvBrowseFilters');
    if (document.body.classList.contains('tv-wogg-resource-open')) return document.querySelector('body > .det-collapse-row');
    const modal = document.querySelector('.custom-modal-mask.show');
    if (modal) return modal;
    if (detailIsOpen()) return $('sheet');
    if (state.route === 'search') return searchPage;
    if (state.route === 'history') return browse;
    return browse;
  }

  function point(el) {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function focusDirection(direction) {
    const scope = activeFocusScope();
    const elements = visibleFocusable(scope);
    if (!elements.length) return;
    const current = document.activeElement;
    if (!elements.includes(current)) {
      elements[0].focus();
      return;
    }
    const from = point(current);
    let best = null;
    let bestScore = Infinity;
    elements.forEach(function (candidate) {
      if (candidate === current) return;
      const to = point(candidate);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      let valid = false, along = 0, across = 0;
      if (direction === 'ArrowLeft') { valid = dx < -2; along = -dx; across = Math.abs(dy); }
      if (direction === 'ArrowRight') { valid = dx > 2; along = dx; across = Math.abs(dy); }
      if (direction === 'ArrowUp') { valid = dy < -2; along = -dy; across = Math.abs(dx); }
      if (direction === 'ArrowDown') { valid = dy > 2; along = dy; across = Math.abs(dx); }
      if (!valid) return;
      const score = along + across * 1.65;
      if (score < bestScore) { best = candidate; bestScore = score; }
    });
    if (best) {
      best.focus();
      if (best.closest('#tvBrowseRail')) scheduleRailAnchor(best);
      else try { best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (error) {}
    }
  }

  function closeAnyModal() {
    if (document.body.classList.contains('tv-wogg-resource-open')) { closeResources(); return true; }
    if (!sourceLayer.hidden) { closeSource(); return true; }
    if (!$('tvBrowseFilters').hidden) { closeFilters(); return true; }
    const modal = document.querySelector('.custom-modal-mask.show');
    if (modal) {
      const closeId = modal.id === 'siteDomainMask' ? '#siteDomainCancel' : (modal.id === 'panCfgMask' ? '#panCfgCancel' : '');
      const close = closeId ? modal.querySelector(closeId) : modal.querySelector('[data-tv-close]');
      if (close) close.click();
      return true;
    }
    return false;
  }

  function goBack() {
    if (closeAnyModal()) return;
    if (detailIsOpen()) { history.back(); return; }
    if (state.route === 'search') { leaveSearch(); return; }
    if (state.route === 'history') { closeHistory(); return; }
  }

  document.addEventListener('keydown', function (event) {
    const key = event.key;
    const active = document.activeElement;
    const pinField = active && /^tvPin/.test(active.id || '');
    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
      if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName) && (key === 'ArrowLeft' || key === 'ArrowRight')) return;
      event.preventDefault();
      focusDirection(key);
      return;
    }
    if (key === 'Enter' && pinField) {
      event.preventDefault();
      if (active.id === 'tvPinNew' || active.id === 'tvPinConfirm') $('tvPinSave').click();
      else $('tvPinUnlock').click();
      return;
    }
    if (key === 'Escape' || key === 'Backspace' || key === 'BrowserBack' || key === 'GoBack' || event.keyCode === 4 || event.keyCode === 10009) {
      if (key === 'Backspace' && active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) return;
      event.preventDefault();
      goBack();
      return;
    }
    if (key === 'Enter' && active && active !== document.body && !/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) {
      event.preventDefault();
      active.click();
    }
  }, true);

  document.addEventListener('click', function (event) {
    if (document.body.classList.contains('tv-wogg-resource-open')) {
      const row = document.querySelector('body > .det-collapse-row');
      if (event.target === document.body && row) closeResources();
    }
  }, true);

  $('tvBrowseSource').addEventListener('click', openSource);
  $('tvSearchBack').addEventListener('click', leaveSearch);
  $('tvSearchForm').addEventListener('submit', function (event) { event.preventDefault(); runSearch(); });
  $('tvSearchMode').addEventListener('click', function () { api.setAggregate(!api.isAggregate()); updateSearchMode(); });
  $('tvSearchHistoryClear').addEventListener('click', function () { api.clearSearchHistory(); renderSearchHistory(); });
  $('tvHistoryManage').addEventListener('click', function () { state.historyManage = !state.historyManage; renderHistory(); $('tvHistoryManage').focus(); });
  $('tvHistoryContinue').addEventListener('click', function () {
    const item = state.focusedItem || state.historyItems[0];
    if (!item) return;
    const progress = api.getHistoryProgress(item);
    state.continuePending = progress && (progress._lastEpUrl || progress._lastEpName || progress._lastEpIndex != null) ? keyOf(item) : null;
    openItem(item);
    if (state.continuePending) {
      const deadline = Date.now() + 12000;
      const observer = new MutationObserver(function () {
        if (state.continuePending !== keyOf(item) || !detailIsOpen()) { observer.disconnect(); return; }
        const button = $('detPlayBtn');
        if (button && /续播/.test(button.getAttribute('aria-label') || '') && !button.disabled) {
          state.continuePending = null;
          observer.disconnect();
          button.click();
        } else if (Date.now() > deadline) observer.disconnect();
      });
      observer.observe($('detHeroCta'), { childList: true, subtree: true, attributes: true });
    }
  });
  $('tvPanConfigButton').addEventListener('click', function () { api.openPanSettings(); });
  function restoreHtmlSettingsFocus() {
    requestAnimationFrame(function () {
      if ($('siteDomainMask').classList.contains('show') && !$('panCfgMask').classList.contains('show')) $('tvPanConfigButton').focus();
    });
  }
  function restoreSettingsLauncherFocus() {
    requestAnimationFrame(function () {
      if ($('siteDomainMask').classList.contains('show') || $('panCfgMask').classList.contains('show')) return;
      const target = state.settingsReturnElement;
      state.settingsReturnElement = null;
      if (target && target.isConnected && !target.closest('[hidden]')) target.focus();
    });
  }
  $('panCfgCancel').addEventListener('click', restoreHtmlSettingsFocus);
  $('panCfgOk').addEventListener('click', restoreHtmlSettingsFocus);
  $('tvPinSave').addEventListener('click', savePin);
  $('tvPinUnlock').addEventListener('click', unlockPin);
  $('tvPinLock').addEventListener('click', lockPin);
  $('siteDomainOk').addEventListener('click', function () { renderPinStatus(); restoreSettingsLauncherFocus(); });
  $('siteDomainCancel').addEventListener('click', function () { renderPinStatus(); restoreSettingsLauncherFocus(); });
  $('siteDomainMask').addEventListener('click', function (event) {
    if (event.target === $('siteDomainMask')) { renderPinStatus(); restoreSettingsLauncherFocus(); }
  });
  $('tvBrowseRetry').addEventListener('click', function () { const site = api.getCurrentSite(); api.switchSite(site.id); });

  $('tvBrowseFunctions').addEventListener('click', function (event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'search') openSearch();
    else if (button.dataset.action === 'live') openNative('live');
    else if (button.dataset.action === 'history') openHistory();
    else if (button.dataset.action === 'settings') openNative('settings');
    else if (button.dataset.action === 'html-settings') openHtmlSettings();
  });

  sourceLayer.addEventListener('click', function (event) {
    if (event.target.dataset.tvClose === 'source') closeSource();
  });

  document.addEventListener('wogg-tv:items', function (event) {
    const detail = event.detail || {};
    const items = api.itemsAllowed(detail.items || []);
    if (detail.mode === 'search') {
      state.searchItems = items;
      if (state.route === 'search') renderCardCollection(searchResults, state.searchItems, 'search', !!detail.append, false);
    } else {
      state.homeItems = items;
      if (state.route === 'home') renderHome(state.homeItems, !!detail.append);
    }
    if (detail.status) {
      if (detail.mode === 'search') setSearchStatus(detail.status);
      else setStatus(detail.status);
    }
  });
  document.addEventListener('wogg-tv:search-status', function (event) {
    const detail = event.detail || {};
    setSearchStatus(detail.status || '');
    if (!detail.loading && !detail.count) renderCardCollection(searchResults, [], 'search', false, false);
  });
  document.addEventListener('wogg-tv:search-history', renderSearchHistory);
  document.addEventListener('wogg-tv:history', function () {
    if (state.route === 'history') renderHistory();
  });
  document.addEventListener('wogg-tv:site', function () { renderColumns(); updateSearchMode(); });
  document.addEventListener('wogg-tv:access', renderSourceAfterAccess);
  document.addEventListener('wogg-tv:locked-item', function () { showMessage('受控站源已锁定，请在 WOGG 基础设置中验证 PIN。'); });
  document.addEventListener('wogg-tv:hidden-item', function (event) {
    const key = keyOf(event.detail && event.detail.item);
    [rail, searchResults].forEach(function (host) {
      const card = host && Array.from(host.querySelectorAll('.card')).find((element) => element.dataset.tvKey === key);
      if (card) { card.style.opacity = '0'; window.setTimeout(() => card.remove(), 300); }
    });
  });

  const detailObserver = new MutationObserver(ensureDetailActions);
  detailObserver.observe($('panel'), { childList: true, subtree: true });
  detailObserver.observe($('detHeroCta'), { childList: true, subtree: true });

  window.addEventListener('popstate', function () {
    window.setTimeout(function () {
      if (detailIsOpen()) return;
      document.body.classList.remove('tv-wogg-resource-open');
      state.continuePending = null;
      if (state.route === 'search' && location.hash !== '#search') {
        api.cancelSearch();
        api.exitSearch();
        state.route = 'home';
        showRoute();
        renderHome(state.homeItems, false);
        restoreSearchReturnFocus();
      }
      if (state.route === 'history' && location.hash !== '#history') closeHistory();
      const target = state.detailReturnElement;
      if (target && target.isConnected && !target.closest('[hidden]')) target.focus();
      else if (state.detailReturnKey) {
        const card = Array.from((state.route === 'search' ? searchResults : rail).querySelectorAll('.card')).find((element) => element.dataset.tvKey === state.detailReturnKey);
        if (card) card.focus();
      }
      state.detailReturnElement = null;
      state.detailReturnKey = '';
    }, 0);
  });

  window.addEventListener('beforeunload', function () { api.setPinUnlocked(false); });

  async function initialize() {
    api.setPinUnlocked(false);
    const resizeBrowse = function () { requestAnimationFrame(layoutTvBrowse); };
    if (typeof ResizeObserver === 'function') new ResizeObserver(resizeBrowse).observe(browse);
    else window.addEventListener('resize', resizeBrowse);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resizeBrowse);
    renderFunctions();
    showRoute();
    renderPinStatus();
    updateSearchMode();
    setLoading(true);
    setStatus('正在准备 WOGG TV…');
    layoutTvBrowse();
    const ready = await api.ready();
    renderColumns();
    await api.switchSite(ready.site.id);
    state.initialReady = true;
    if (state.homeItems.length) {
      const first = rail.querySelector('.card');
      if (first) first.focus();
    }
  }

  initialize().catch(function (error) {
    setLoading(false);
    setStatus('WOGG TV 启动失败：' + (error && error.message ? error.message : '未知错误'));
  });
})();
