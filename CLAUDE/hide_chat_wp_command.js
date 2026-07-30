/* Hide the floating "Chat with us" (Kiwi) widget on the teacher-conducted game
   pages: Swayamvar, Stock Rush, Stock Rush PRO.
   HOW TO RUN: log in to investingformummies.com/wp-admin, open the browser
   DevTools console (Cmd+Option+J), paste this whole block, press Enter.
   Safe to run more than once — it skips any page already done. */
(async () => {
  const slugs = ['swayamvar', 'stock-rush', 'stock-rush-pro'];
  const RULE =
    '\n/* Hide the floating "Chat with us" (Kiwi) widget while the game is on screen */\n' +
    '#kiwi-big-iframe-wrapper{display:none!important;}';
  const anchor = 'footer.wp-block-template-part{display:none!important;}';
  const out = [];
  for (const slug of slugs) {
    try {
      const pages = await wp.apiFetch({
        path: '/wp/v2/pages?slug=' + slug + '&context=edit&_fields=id,content',
      });
      if (!pages.length) { out.push('❓ ' + slug + ': page not found'); continue; }
      const page = pages[0];
      let raw = (page.content && page.content.raw) || '';
      if (raw.includes('kiwi-big-iframe-wrapper')) {
        out.push('✓ ' + slug + ': already hidden — skipped');
        continue;
      }
      if (raw.includes(anchor)) {
        raw = raw.replace(anchor, anchor + RULE);
      } else if (raw.includes('<style>')) {
        raw = raw.replace('<style>', '<style>' + RULE);
      } else {
        raw = '<!-- wp:html -->\n<style>' + RULE + '\n</style>\n<!-- /wp:html -->\n' + raw;
      }
      await wp.apiFetch({
        path: '/wp/v2/pages/' + page.id,
        method: 'POST',
        data: { content: raw },
      });
      out.push('✅ ' + slug + ': chat button hidden');
    } catch (e) {
      out.push('❌ ' + slug + ': ' + (e && e.message ? e.message : e));
    }
  }
  console.log(out.join('\n'));
  alert(out.join('\n'));
})();
