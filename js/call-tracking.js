"use strict";

/**
 * Відстеження звернень для GA4 / GTM.
 *
 * Кожен клік по телефону, онлайн-запису чи месенджеру відправляє подію
 * з міткою місця на сторінці (data-call-source / data-book-source).
 * Це дає зріз «яка саме кнопка приносить дзвінки» для заміру за 3-4 тижні.
 */
(function () {
  var PHONE = '+380738820180';

  function track(eventName, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: eventName }, params));

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href') || '';

    // Клік по номеру телефону
    if (href.indexOf('tel:') === 0) {
      track('phone_call_click', {
        call_source: link.getAttribute('data-call-source') || 'unknown',
        phone_number: PHONE
      });
      return;
    }

    // Перехід на онлайн-запис
    if (href.indexOf('bookon.ua') !== -1) {
      track('online_booking_click', {
        booking_source: link.getAttribute('data-book-source') || 'unknown'
      });
      return;
    }

    // Месенджери
    if (href.indexOf('t.me/') !== -1) {
      track('messenger_click', { messenger: 'telegram' });
      return;
    }
    if (href.indexOf('viber:') === 0) {
      track('messenger_click', { messenger: 'viber' });
      return;
    }

    // Маршрут до клініки
    if (href.indexOf('maps.app.goo.gl') !== -1 || href.indexOf('google.com/maps') !== -1) {
      track('directions_click', {});
    }
  }, false);
})();
