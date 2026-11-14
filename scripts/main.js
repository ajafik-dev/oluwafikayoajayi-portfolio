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
    var status = form.querySelector(".form-status");
    var button = form.querySelector('button[type="submit"]');
    var idleLabel = button ? button.textContent : "Send message";
    var submitting = false;

    form.addEventListener("input", function (event) {
      var target = event.target;
      if (!target || !target.classList || !target.classList.contains("is-invalid")) return;
      target.classList.remove("is-invalid");
      target.removeAttribute("aria-invalid");
      target.removeAttribute("aria-describedby");
      var slot = target.id ? document.getElementById(target.id + "-error") : null;
      if (slot) {
        slot.hidden = true;
        slot.textContent = "";
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submitting) return;

      clearFieldErrors(form);
      hideStatus();

      var firstInvalid = validateContactFields(form);
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var endpoint = getContactEndpoint(form);
      if (!endpoint) {
        showStatus("The contact form is not configured. Use GitHub, LinkedIn, or X instead.", "error");
        return;
      }

      var data = new FormData(form);
      var firstName = String(data.get("first_name") || "").trim();
      var lastName = String(data.get("last_name") || "").trim();
      var payload = {
        first_name: firstName,
        last_name: lastName,
        name: [firstName, lastName].filter(Boolean).join(" "),
        email: String(data.get("email") || "").trim(),
        subject: String(data.get("subject") || "").trim(),
        message: String(data.get("message") || "").trim(),
        "bot-field": String(data.get("bot-field") || "")
      };

      setBusy(true);
      showStatus("Sending…", "pending");

      postContact(endpoint, payload, true)
        .then(function () {
          clearFieldErrors(form);
          form.reset();
          showStatus("Thanks. I'll get back to you.", "success");
        })
        .catch(function (err) {
          showStatus(networkOrScriptError(err), "error");
        })
        .then(function () {
          setBusy(false);
        });
    });

    function setBusy(busy) {
      submitting = busy;
      form.setAttribute("aria-busy", busy ? "true" : "false");
      if (!button) return;
      button.disabled = busy;
      button.setAttribute("aria-busy", busy ? "true" : "false");
      button.textContent = busy ? "Sending…" : idleLabel;
    }

    function hideStatus() {
      if (!status) return;
      status.hidden = true;
      status.textContent = "";
      status.classList.remove("is-error", "is-success", "is-pending");
    }

    function showStatus(message, kind) {
      if (!status) return;
      status.hidden = false;
      status.textContent = message;
      status.classList.toggle("is-pending", kind === "pending");
      status.classList.toggle("is-success", kind === "success");
      status.classList.toggle("is-error", kind === "error");
      if (kind === "success" || kind === "error") {
        status.focus();
      }
    }
  }

  var FETCH_TIMEOUT_MS = 20000;

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

  function validateContactFields(formEl) {
    var first = formEl.querySelector('[name="first_name"]');
    var email = formEl.querySelector('[name="email"]');
    var message = formEl.querySelector('[name="message"]');
    var firstInvalid = null;

    if (first && !String(first.value || "").trim()) {
      setFieldError(first, "Enter your first name.");
      firstInvalid = firstInvalid || first;
    }

    if (email) {
      var emailValue = String(email.value || "").trim();
      if (!emailValue) {
        setFieldError(email, "Enter your email address.");
        firstInvalid = firstInvalid || email;
      } else if (!isValidEmail(emailValue)) {
        setFieldError(email, "Enter a valid email address.");
        firstInvalid = firstInvalid || email;
      }
    }

    if (message && !String(message.value || "").trim()) {
      setFieldError(message, "Enter a message.");
      firstInvalid = firstInvalid || message;
    }

    return firstInvalid;
  }

  function setFieldError(input, message) {
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    var slot = input.id ? document.getElementById(input.id + "-error") : null;
    if (slot) {
      slot.hidden = false;
      slot.textContent = message;
      input.setAttribute("aria-describedby", slot.id);
    }
  }

  function clearFieldErrors(formEl) {
    formEl.querySelectorAll(".is-invalid").forEach(function (input) {
      input.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    });
    formEl.querySelectorAll(".form-field-error").forEach(function (slot) {
      slot.hidden = true;
      slot.textContent = "";
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function postContact(endpoint, payload, allowRetry) {
    return fetchContact(endpoint, payload).catch(function (err) {
      if (allowRetry && isRetryableNetworkError(err)) {
        return wait(400).then(function () {
          return fetchContact(endpoint, payload);
        });
      }
      throw err;
    });
  }

  function fetchContact(endpoint, payload) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = null;
    var options = {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    };

    if (controller) {
      options.signal = controller.signal;
      timer = window.setTimeout(function () {
        controller.abort();
      }, FETCH_TIMEOUT_MS);
    }

    return fetch(endpoint, options)
      .then(function (response) {
        return response.text().then(
          function (text) {
            return { response: response, text: text };
          },
          function () {
            return { response: response, text: "" };
          }
        );
      })
      .then(function (pack) {
        var result = parseScriptJson(pack.text);
        if (result && result.ok === true) return result;
        throw new Error(scriptErrorMessage(pack.response, pack.text, result));
      })
      .then(
        function (result) {
          if (timer) window.clearTimeout(timer);
          return result;
        },
        function (err) {
          if (timer) window.clearTimeout(timer);
          throw err;
        }
      );
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function isRetryableNetworkError(err) {
    if (!err || err.name === "AbortError") return false;
    var message = err.message ? String(err.message) : "";
    return (
      message === "Failed to fetch" ||
      message === "Load failed" ||
      message === "NetworkError when attempting to fetch resource." ||
      message.indexOf("NetworkError") !== -1
    );
  }

  function parseScriptJson(text) {
    var raw = String(text || "").replace(/^\uFEFF/, "").replace(/^\s+/, "");
    if (!raw) return null;
    var start = raw.indexOf("{");
    var end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      var parsed = JSON.parse(raw.slice(start, end + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function scriptErrorMessage(response, text, result) {
    if (result && result.error) return String(result.error);
    var status = response && response.status;
    var blob = String(text || "").toLowerCase();
    var denied =
      blob.indexOf("access denied") !== -1 ||
      blob.indexOf("you need access") !== -1 ||
      blob.indexOf("authorization is required") !== -1 ||
      blob.indexOf("sign in to continue") !== -1;
    if (status === 401 || status === 403 || denied) {
      return "The contact service is not publicly accessible. Try GitHub, LinkedIn, or X, or check that the Apps Script web app is deployed with access set to Anyone.";
    }
    return "The contact service did not return a valid response. Try again, or use GitHub, LinkedIn, or X.";
  }

  function networkOrScriptError(err) {
    if (err && err.name === "AbortError") {
      return "The contact service took too long to respond. Try again, or use GitHub, LinkedIn, or X.";
    }
    var message = err && err.message ? String(err.message) : "";
    if (
      !message ||
      message === "Failed to fetch" ||
      message === "Load failed" ||
      message === "NetworkError when attempting to fetch resource." ||
      message.indexOf("NetworkError") !== -1
    ) {
      return "Could not reach the contact service. Check your connection and try again, or use GitHub, LinkedIn, or X.";
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
