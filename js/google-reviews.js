"use strict";

/**
 * Відгуки з профілю клініки в Google Maps.
 *
 * Тягне відгуки через Places API (New) і показує їх у секції #reviews.
 * Скрипт Google Maps підвантажується ліниво — лише коли користувач
 * долистав до секції, щоб не гальмувати перший екран.
 *
 * ВАЖЛИВО: щоб відгуки з'явилися, у Google Cloud Console проєкту
 * потрібно увімкнути "Places API (New)" і дозволити ключу домен
 * kovmir-dental.com. Поки API вимкнено, секція показує запасний
 * варіант із посиланням на відгуки в Google — нічого не ламається.
 */
(function () {
  var CONFIG = {
    apiKey: 'AIzaSyBqoNTUmkigwg2b35C3mD8naewH4ZqiKog',
    placeId: 'ChIJtYEfnyfT1EARUwP9nIiesmA', // Kovmir Dental Clinic, Вишгород
    language: 'uk',
    maxReviews: 6,
    minRating: 4
  };

  var section = document.getElementById('reviews');
  if (!section) return;

  var grid = section.querySelector('[data-reviews-grid]');
  var summary = section.querySelector('[data-reviews-summary]');
  var scoreEl = section.querySelector('[data-reviews-score]');
  var starsEl = section.querySelector('[data-reviews-stars]');
  var countEl = section.querySelector('[data-reviews-count]');
  var stateEl = section.querySelector('[data-reviews-state]');
  var stateText = section.querySelector('[data-reviews-state-text]');
  var attribution = section.querySelector('[data-reviews-attribution]');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stars(rating) {
    var full = Math.round(Number(rating) || 0);
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<span class="review-star' + (i <= full ? ' is-on' : '') + '">★</span>';
    }
    return out;
  }

  function plural(count) {
    var n = Math.abs(count) % 100;
    var n1 = n % 10;
    if (n > 10 && n < 20) return 'відгуків';
    if (n1 > 1 && n1 < 5) return 'відгуки';
    if (n1 === 1) return 'відгук';
    return 'відгуків';
  }

  function showFallback() {
    if (grid) grid.hidden = true;
    if (summary) summary.hidden = true;
    if (attribution) attribution.hidden = true;
    if (stateText) {
      stateText.textContent = 'Усі відгуки наших пацієнтів зібрані у профілі клініки в Google Maps — ' +
        'там вони показані повністю і без нашої модерації.';
    }
    if (stateEl) stateEl.classList.add('reviews-state-fallback');
  }

  function render(place) {
    var reviews = (place.reviews || []).filter(function (review) {
      return review && review.text && Number(review.rating) >= CONFIG.minRating;
    }).slice(0, CONFIG.maxReviews);

    if (!reviews.length) {
      showFallback();
      return;
    }

    if (place.rating && scoreEl && summary) {
      scoreEl.textContent = Number(place.rating).toFixed(1).replace('.', ',');
      if (starsEl) starsEl.innerHTML = stars(place.rating);
      if (countEl && place.userRatingCount) {
        countEl.textContent = place.userRatingCount + ' ' + plural(place.userRatingCount) + ' у Google';
      }
      summary.hidden = false;
    }

    grid.innerHTML = reviews.map(function (review) {
      var author = review.authorAttribution || {};
      var name = escapeHtml(author.displayName || 'Пацієнт');
      var photo = author.photoURI
        ? '<img class="review-avatar" src="' + escapeHtml(author.photoURI) + '" alt="" loading="lazy" width="44" height="44">'
        : '<span class="review-avatar review-avatar-empty" aria-hidden="true">' + name.charAt(0) + '</span>';
      var when = review.relativePublishTimeDescription
        ? '<span class="review-date">' + escapeHtml(review.relativePublishTimeDescription) + '</span>'
        : '';

      return '<figure class="review-card">' +
        '<div class="review-head">' + photo +
        '<figcaption class="review-author"><span class="review-name">' + name + '</span>' + when + '</figcaption>' +
        '</div>' +
        '<div class="review-rating" aria-label="Оцінка ' + escapeHtml(review.rating) + ' з 5">' + stars(review.rating) + '</div>' +
        '<blockquote class="review-text">' + escapeHtml(review.text) + '</blockquote>' +
        '</figure>';
    }).join('');

    grid.hidden = false;
    if (stateEl) stateEl.hidden = true;
    if (attribution) attribution.hidden = false;
  }

  /**
   * Офіційний спосіб Google підвантажити google.maps.importLibrary().
   *
   * Важливо: сам скрипт maps/api/js — це лише "завантажувач", який після
   * onload асинхронно довантажує внутрішні модулі (places.js, common.js...)
   * і ЛИШЕ ПІСЛЯ ЦЬОГО виставляє google.maps.importLibrary. Тобто одразу
   * після onload функції importLibrary ще може не існувати — це гонка
   * станів, а не помилка ключа. Тому importLibrary визначаємо самі,
   * синхронно, одразу в цьому файлі (як і радить документація Google):
   * перший виклик сам створює тег <script> і чекає на callback, усі наступні
   * виклики просто чекають ту саму обіцянку.
   */
  function ensureImportLibrary() {
    var google = (window.google = window.google || {});
    var maps = (google.maps = google.maps || {});
    if (maps.importLibrary) return; // Maps API вже десь підвантажено раніше

    var requestedLibraries = [];
    var loaderPromise = null;
    var callbackName = '__kovmirGmapsInit';

    function startLoading() {
      if (loaderPromise) return loaderPromise;
      loaderPromise = new Promise(function (resolve, reject) {
        window[callbackName] = resolve;
        var script = document.createElement('script');
        var params = 'key=' + encodeURIComponent(CONFIG.apiKey) +
          '&v=weekly&language=' + encodeURIComponent(CONFIG.language) +
          '&libraries=' + requestedLibraries.join(',') +
          '&loading=async&callback=' + callbackName;
        script.src = 'https://maps.googleapis.com/maps/api/js?' + params;
        script.async = true;
        script.onerror = function () { reject(new Error('Не вдалося завантажити Google Maps API')); };
        document.head.appendChild(script);
      });
      return loaderPromise;
    }

    // Наша "заглушка": збирає, яку бібліотеку просили, чекає на реальне
    // підвантаження, а тоді делегує до справжнього importLibrary, яким
    // офіційний скрипт Google сам підмінить maps.importLibrary.
    maps.importLibrary = function (libraryName) {
      requestedLibraries.push(libraryName);
      return startLoading().then(function () {
        return google.maps.importLibrary(libraryName);
      });
    };
  }

  function fetchReviews() {
    ensureImportLibrary();
    google.maps.importLibrary('places')
      .then(function (placesLib) {
        var place = new placesLib.Place({ id: CONFIG.placeId, requestedLanguage: CONFIG.language });
        return place.fetchFields({ fields: ['rating', 'userRatingCount', 'reviews'] });
      })
      .then(function (result) {
        render(result.place);
      })
      .catch(function (error) {
        // Найчастіша причина: Places API (New) не увімкнено для ключа.
        if (window.console && console.warn) {
          console.warn('Відгуки Google недоступні:', error && error.message ? error.message : error);
        }
        showFallback();
      });
  }

  // Завантажуємо тільки коли секція наближається до екрана.
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        observer.disconnect();
        fetchReviews();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
  } else {
    fetchReviews();
  }
})();
