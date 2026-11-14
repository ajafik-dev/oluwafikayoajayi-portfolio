(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var year = document.getElementById("year");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  function onScroll() {
    if (!header) return;
    if (!header.classList.contains("is-solid")) {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    }
    spyNav();
  }

  function closeNav() {
    if (!header || !toggle) return;
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function spyNav() {
    if (!nav) return;
    var links = nav.querySelectorAll('a[href^="#"]');
    var fromTop = window.scrollY + (header ? header.offsetHeight + 24 : 80);
    var current = null;

    links.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var section = id && document.getElementById(id);
      if (section && section.offsetTop <= fromTop) {
        current = link;
      }
    });

    links.forEach(function (link) {
      link.classList.toggle("is-active", link === current);
    });
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && header && nav) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        var first = nav.querySelector("a");
        if (first) first.focus();
      }
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });
  }

  var form = document.querySelector(".contact-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var status = form.querySelector(".form-status");
      var data = new FormData(form);

      function show(message, isError) {
        if (!status) return;
        status.hidden = false;
        status.textContent = message;
        status.classList.toggle("is-error", Boolean(isError));
      }

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data).toString()
      }).then(function (response) {
        if (!response.ok) throw new Error("Submit failed");
        form.reset();
        show("Thanks. I'll get back to you.");
      }).catch(function () {
        show("The form could not send from this preview. Use GitHub, LinkedIn, or X instead.", true);
      });
    });
  }

  if (reduceMotion) return;

  var revealTargets = document.querySelectorAll(
    ".service, .work-card, .about-copy, .about-portrait, .stack-grid li, .focus-grid article, .timeline li"
  );
  if (!("IntersectionObserver" in window) || !revealTargets.length) return;

  revealTargets.forEach(function (el) {
    el.classList.add("is-pending");
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16 });

  revealTargets.forEach(function (el) {
    observer.observe(el);
  });
})();
