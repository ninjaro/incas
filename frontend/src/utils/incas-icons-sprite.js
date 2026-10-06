// Injects the INCAS glyph sprite: the exact icons orbiting the hero globe, plus
// three more drawn in the same solid-fill language for the working groups.
(function () {
  var markup = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
<symbol id="ic-pot" viewBox="-26 -26 52 52"><path fill="currentColor" fill-rule="evenodd" d="M-21 -4 a3 3 0 0 1 3-3 h36 a3 3 0 0 1 3 3 a3 3 0 0 1 -3 3 h-1 v8 a10 10 0 0 1 -10 10 h-14 a10 10 0 0 1 -10-10 v-8 h-1 a3 3 0 0 1 -3-3 Z M-3 -7 a3 3 0 0 1 6 0 Z"></path><path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" d="M-9 -13c4-4-2-8 1-12M9 -13c4-4-2-8 1-12"></path></symbol>
<symbol id="ic-chat" viewBox="-26 -26 52 52"><path fill="currentColor" d="M-24 -10 a6 6 0 0 1 6-6 h22 a6 6 0 0 1 6 6 v9 a6 6 0 0 1 -6 6 h-10 l-9 8 v-8 h-3 a6 6 0 0 1 -6-6 Z"></path><path fill="currentColor" opacity="0.72" d="M14 -4 h4 a6 6 0 0 1 6 6 v7 a6 6 0 0 1 -6 6 h-1 v7 l-8-7 h-3 a6 6 0 0 1 -5-6 l9 0 a9 9 0 0 0 4-3 Z"></path></symbol>
<symbol id="ic-die" viewBox="-26 -26 52 52"><path fill="currentColor" fill-rule="evenodd" d="M-20 -11 a9 9 0 0 1 9-9 h22 a9 9 0 0 1 9 9 v22 a9 9 0 0 1 -9 9 h-22 a9 9 0 0 1 -9-9 Z M-9 -13 a4 4 0 1 0 0.01 0 Z M9 -13 a4 4 0 1 0 0.01 0 Z M0 -4 a4 4 0 1 0 0.01 0 Z M-9 5 a4 4 0 1 0 0.01 0 Z M9 5 a4 4 0 1 0 0.01 0 Z"></path></symbol>
<symbol id="ic-signpost" viewBox="-26 -26 52 52"><path fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" d="M0 23V-21"></path><path fill="currentColor" d="M-3 -19 h22 a2.5 2.5 0 0 1 2 1 l6 6.5 a2.5 2.5 0 0 1 0 3 l-6 6.5 a2.5 2.5 0 0 1 -2 1 h-22 Z"></path><path fill="currentColor" opacity="0.72" d="M3 1 h-22 a2.5 2.5 0 0 0 -2 1 l-6 6.5 a2.5 2.5 0 0 0 0 3 l6 6.5 a2.5 2.5 0 0 0 2 1 h22 Z"></path></symbol>
<symbol id="ic-cup" viewBox="-26 -26 52 52"><path fill="currentColor" d="M-19 -7 a2 2 0 0 1 2-2 h24 a2 2 0 0 1 2 2 v13 a13 13 0 0 1 -14 13 a13 13 0 0 1 -14-13 Z"></path><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M11 -3h5a7 7 0 0 1 0 14h-5"></path><path fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" d="M-22 24h36"></path><path fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" d="M-6 -15c4-4-2-8 1-12M6 -15c4-4-2-8 1-12"></path></symbol>
<symbol id="ic-mic" viewBox="-26 -26 52 52"><rect x="-8" y="-25" width="16" height="28" rx="8" fill="currentColor"></rect><path fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round" d="M-14 5a14 14 0 0 0 28 0M0 19v5M-9 24h18"></path></symbol>
<symbol id="ic-compass" viewBox="-26 -26 52 52"><path fill="currentColor" fill-rule="evenodd" d="M0 -23 a23 23 0 1 0 0.01 0 Z M0 -17 a17 17 0 1 1 -0.01 0 Z"></path><path fill="currentColor" d="M14 -14 -3 -8 -8 -3 Z"></path><path fill="currentColor" opacity="0.6" d="M-14 14 3 8 8 3 Z"></path></symbol>
<symbol id="ic-house" viewBox="-26 -26 52 52"><path fill="currentColor" d="M0 -22 24 -1 a2.6 2.6 0 0 1 -3 4 l-3-3 v18 a4 4 0 0 1 -4 4 h-9 v-14 h-10 v14 h-9 a4 4 0 0 1 -4-4 v-18 l-3 3 a2.6 2.6 0 0 1 -3-4 Z"></path></symbol>
<symbol id="ic-exchange" viewBox="-26 -26 52 52"><path fill="currentColor" d="M-20 -13 h27 v-8 l14 12 -14 12 v-8 h-27 a3.5 3.5 0 0 1 0-8 Z"></path><path fill="currentColor" opacity="0.72" d="M20 9 h-27 v-8 l-14 12 14 12 v-8 h27 a3.5 3.5 0 0 0 0-8 Z"></path></symbol>
<symbol id="ic-megaphone" viewBox="-26 -26 52 52"><path fill="currentColor" d="M16 -21 a4 4 0 0 1 6 3 v36 a4 4 0 0 1 -6 3 L-6 7 v-10 Z"></path><path fill="currentColor" d="M-20 -4 h13 v8 h-13 a4 4 0 0 1 0-8 Z"></path><path fill="currentColor" opacity="0.72" d="M-13 6 h9 l3 12 a5 5 0 0 1 -10 2 Z"></path></symbol>
</svg>`;
  function inject() {
    if (document.getElementById('incas-sprite')) return;
    var holder = document.createElement('div');
    holder.id = 'incas-sprite';
    holder.style.display = 'none';
    holder.innerHTML = markup;
    document.body.insertBefore(holder, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
