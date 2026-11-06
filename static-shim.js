// 정적 공유본: 서버 API를 JSON 파일로 대체
(function () {
  var real = window.fetch.bind(window);
  var json = function (o, s) { return Promise.resolve(new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } })); };
  document.documentElement.classList.add('is-static');
  window.fetch = function (input, opts) {
    var url = typeof input === 'string' ? input : input.url;
    var u = new URL(url, location.href);
    var m = u.pathname.match(/\/api\/(.*)$/);
    if (!m) return real(input, opts);
    var p = m[1];
    if (opts && opts.method && opts.method !== 'GET') return json({ error: '공유용 페이지에서는 사용할 수 없는 기능입니다.' }, 403);
    if (p === 'status') return json({ busy: false, ai: false, kakaoEnabled: false, static: true });
    if (p === 'latest') return real('./api/latest.json');
    if (p === 'dates') return real('./api/dates.json');
    if (p.indexOf('day/') === 0) return real('./api/day/' + decodeURIComponent(p.slice(4)) + '.json');
    if (p === 'search') {
      var q = (u.searchParams.get('q') || '').trim();
      var days = Math.min(14, Math.max(1, Number(u.searchParams.get('days')) || 7));
      var cutoff = Date.now() - days * 864e5;
      var terms = q.split(/\s+/).filter(Boolean).map(function (t) { return t.toLowerCase(); });
      return real('./api/search-pool.json').then(function (r) { return r.json(); }).then(function (d) {
        var items = (d.items || []).filter(function (a) {
          if (a.publishedAt && Date.parse(a.publishedAt) < cutoff) return false;
          var h = (a.title + ' ' + (a.snippet || '') + ' ' + (a.source || '')).toLowerCase();
          return terms.every(function (t) { return h.indexOf(t) >= 0; });
        });
        return json({ q: q, days: days, from: new Date(cutoff).toISOString(), to: d.builtAt, count: items.length, liveError: null, items: items });
      });
    }
    return json({ error: 'not found' }, 404);
  };
  var st = document.createElement('style');
  st.textContent = '.is-static [data-action="refresh"],.is-static [data-action="kakao"],.is-static #btnRefresh,.is-static #btnKakao{display:none!important}';
  document.head.appendChild(st);
})();
