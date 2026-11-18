// House of Verona: tea collection navigation only.
// Reuses existing Tea filter, leaves order and payment code untouched.
document.querySelectorAll('[data-hov-tea-link]').forEach(function (link) {
  link.addEventListener('click', function () {
    var teaFilter = document.querySelector('#shop button[data-filter="tea"]');
    if (teaFilter) teaFilter.click();
  });
});
