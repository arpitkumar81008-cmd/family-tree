/* CSP-safe GA4 initializer (pairs with static gtag.js in index.html for Search Console verification) */
window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', 'G-89GMEHC09H', {
  anonymize_ip: true,
  send_page_view: false
});
