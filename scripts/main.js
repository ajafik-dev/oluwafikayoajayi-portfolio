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
      var button = form.querySelector('button[type="submit"]');
      var endpoint = getContactEndpoint(form);

      function show(message, isError) {
        if (!status) return;
        status.hidden = false;
        status.textContent = message;
        status.classList.toggle("is-error", Boolean(isError));
      }

      if (!endpoint) {
        show("The contact form is not configured. Add the Google Apps Script /exec URL in scripts/config.js, or use GitHub, LinkedIn, or X instead.", true);
        return;
      }

      var data = new FormData(form);
      var payload = {
        first_name: String(data.get("first_name") || ""),
        last_name: String(data.get("last_name") || ""),
        name: [data.get("first_name"), data.get("last_name")].filter(Boolean).join(" ").trim(),
        email: String(data.get("email") || ""),
        subject: String(data.get("subject") || ""),
        message: String(data.get("message") || ""),
        "bot-field": String(data.get("bot-field") || "")
      };

      if (button) button.disabled = true;
      show("Sending…");

      fetch(endpoint, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      }).then(function (response) {
        return response.text().then(function (text) {
          var result = parseScriptJson(text);
          if (result && result.ok === true) return;
          throw new Error(scriptErrorMessage(response, text, result));
        });
      }).then(function () {
        form.reset();
        show("Thanks. I'll get back to you.");
      }).catch(function (err) {
        show(networkOrScriptError(err), true);
      }).then(function () {
        if (button) button.disabled = false;
      });
    });
  }

  function getContactEndpoint(formEl) {
    var fromForm = formEl.getAttribute("data-script-url");
    var fromConfig = window.PORTFOLIO_CONFIG && window.PORTFOLIO_CONFIG.googleScriptWebAppUrl;
    var url = String(fromForm || fromConfig || "").trim();
    if (!url || isPlaceholderEndpoint(url)) return "";
    return url;
  }

  function isPlaceholderEndpoint(url) {
    var value = String(url || "").toLowerCase();
    return (
      value.indexOf("your_google_script") !== -1 ||
      value.indexOf("your_deployment") !== -1 ||
      value.indexOf("placeholder") !== -1 ||
      value.indexOf("example.com") !== -1
    );
  }

  function parseScriptJson(text) {
    var trimmed = String(text || "").replace(/^\s+/, "");
    if (!trimmed || trimmed.charAt(0) !== "{") return null;
    try {
      var parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function scriptErrorMessage(response, text, result) {
    if (result && result.error) return String(result.error);
    var blob = String(text || "").toLowerCase();
    var denied = blob.indexOf("access denied") !== -1 || blob.indexOf("you need access") !== -1;
    if ((response && (response.status === 401 || response.status === 403)) || denied) {
      return "The contact service is not publicly accessible. Redeploy the Apps Script web app with “Who has access: Anyone”, then update scripts/config.js if the /exec URL changed.";
    }
    return "The contact service did not return a valid response. Check the Apps Script /exec URL and deployment.";
  }

  function networkOrScriptError(err) {
    var message = err && err.message ? String(err.message) : "";
    if (
      !message ||
      message === "Failed to fetch" ||
      message === "Load failed" ||
      message === "NetworkError when attempting to fetch resource."
    ) {
      return "Could not reach the contact service. Confirm the Apps Script /exec URL, deploy it with access set to Anyone, and try again. Or use GitHub, LinkedIn, or X.";
    }
    return message;
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
