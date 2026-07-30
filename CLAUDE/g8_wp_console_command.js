wp.apiFetch({
  path: "/wp/v2/pages",
  method: "POST",
  data: {
    title: "3 Buckets",
    slug: "3-buckets",
    status: "publish",
    content: "<!-- wp:html -->\n<!-- 3 Buckets \u2014 Investing for Mummies -->\n<style>\nbody{background:#f7faf9!important;}\n.wp-block-post-title, h1.entry-title, .page-title{display:none!important;}\n.wp-site-blocks, .is-layout-constrained, .entry-content,\n.wp-block-group{background:#f7faf9!important;padding:0!important;max-width:100%!important;}\nfooter.wp-block-template-part{display:none!important;}\nheader.wp-block-template-part{position:relative!important;top:auto!important;}\nhtml,body{margin:0!important;padding:0!important;}\n#game-wrap{width:100%;background:#f7faf9;}\n#game-wrap iframe{width:100%;display:block;border:none;}\n</style>\n\n<div id=\"game-wrap\">\n  <iframe id=\"game-iframe\"\n    src=\"https://ifm-deploy.vercel.app/3-buckets.html\"\n    title=\"3 Buckets\" allowfullscreen loading=\"eager\">\n  </iframe>\n</div>\n\n<script>\n(function(){\n  function sizeIframe(){\n    var header = document.querySelector(\"header.wp-block-template-part\");\n    var adminBar = document.getElementById(\"wpadminbar\");\n    var used = (header ? header.offsetHeight : 0) + (adminBar ? adminBar.offsetHeight : 0);\n    var iframe = document.getElementById(\"game-iframe\");\n    if(iframe) iframe.style.height = (window.innerHeight - used) + \"px\";\n  }\n  sizeIframe();\n  window.addEventListener(\"resize\", sizeIframe);\n  window.addEventListener(\"load\", sizeIframe);\n})();\n</script>\n\n<!-- /wp:html -->"
  }
}).then(function(p){ alert("✅ Live at: " + p.link); });