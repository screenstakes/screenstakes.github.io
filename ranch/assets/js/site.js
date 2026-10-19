/* The Ranch Partnership — site behaviour.
   Everything here is an enhancement. With JavaScript off the pages still read,
   the nav still navigates, the FAQ still opens and the form still submits. */
(function () {
  "use strict";

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------ nav ---- */
  (function nav() {
    var bar = $("[data-nav]");
    if (!bar) return;

    // Solid once the hero has scrolled past. A sentinel beats a scroll listener.
    var hero = $(".hero") || $("main > section");
    if (hero && "IntersectionObserver" in window) {
      var mark = document.createElement("div");
      mark.style.cssText = "position:absolute;top:60px;height:1px;width:1px;";
      hero.style.position = hero.style.position || "relative";
      hero.appendChild(mark);
      new IntersectionObserver(function (entries) {
        bar.classList.toggle("nav--solid", !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(mark);
    } else {
      bar.classList.add("nav--solid");
    }

    var toggle = $("[data-nav-toggle]");
    var links  = $("[data-nav-links]");
    if (!toggle || !links) return;

    var mq = window.matchMedia("(max-width: 899px)");
    function sync() {
      if (mq.matches) {
        links.hidden = toggle.getAttribute("aria-expanded") !== "true";
      } else {
        links.hidden = false;
        toggle.setAttribute("aria-expanded", "false");
      }
    }
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.textContent = open ? "Menu" : "Close";
      sync();
    });
    mq.addEventListener ? mq.addEventListener("change", sync) : mq.addListener(sync);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.click(); toggle.focus();
      }
    });
    sync();
  })();

  /* ------------------------------------------------------ estimator ---- */
  (function estimator() {
    var root = $("[data-estimator]");
    var raw  = $("#tier-data");
    if (!root || !raw) return;

    var TIERS;
    try { TIERS = JSON.parse(raw.textContent); } catch (e) { return; }

    // Assumptions, stated on the page so nobody has to guess at them.
    var LB_PER_PERSON_YEAR = 55;   // a little under USDA per-capita availability
    var LB_PER_CUBIC_FOOT  = 25;   // conservative end of the 25-35 lb range, so
                                   // this agrees with the per-tier figures on the page

    var shareSeg  = $('[data-seg="share"]', root);
    var peopleSeg = $('[data-seg="people"]', root);
    if (!shareSeg || !peopleSeg) return;

    // Build the share buttons from the same data the page was built from,
    // so they can never drift out of step with the prices.
    TIERS.forEach(function (t, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.value = t.id;
      b.setAttribute("aria-pressed", String(i === 2));   // half share preselected
      b.textContent = t.share.replace(" share", "").replace("One-eighth", "Eighth");
      shareSeg.appendChild(b);
    });

    function selected(seg) {
      var b = seg.querySelector('[aria-pressed="true"]');
      return b ? b.dataset.value : null;
    }

    function fmt(n) { return n.toLocaleString("en-US"); }

    function render() {
      var tier = TIERS.filter(function (t) { return t.id === selected(shareSeg); })[0];
      var people = parseInt(selected(peopleSeg), 10) || 2;
      if (!tier) return;

      var mid     = Math.round((tier.lo + tier.hi) / 2);
      var months  = mid / (people * LB_PER_PERSON_YEAR / 12);
      var cuft    = mid / LB_PER_CUBIC_FOOT;
      var perLb   = tier.price / mid;

      var monthText = months >= 24
        ? (months / 12).toFixed(1) + " yrs"
        : (months >= 12 ? (months / 12).toFixed(1) + " yrs" : Math.round(months) + " mo");

      $("[data-out-lbs]", root).innerHTML =
        fmt(tier.lo) + "&ndash;" + fmt(tier.hi) + " lb<small>" + tier.name + ", " +
        "$" + fmt(tier.price) + "</small>";
      $("[data-out-months]", root).innerHTML =
        monthText + "<small>for " + people + (people === 6 ? "+" : "") +
        (people === 1 ? " person" : " people") + "</small>";
      $("[data-out-freezer]", root).innerHTML =
        Math.round(cuft) + " cu ft<small>" + tier.freezer + "</small>";
      $("[data-out-perlb]", root).innerHTML =
        "$" + perLb.toFixed(2) + "<small>per lb of packaged beef</small>";

      $("[data-out-working]", root).textContent =
        "A " + tier.share.toLowerCase() + " at $" + fmt(tier.price) + " returns about " +
        mid + " lb of packaged beef (the middle of the " + tier.lo + "–" + tier.hi +
        " lb range), which is $" + perLb.toFixed(2) + " per pound. " +
        people + (people === 6 ? " or more people" : (people === 1 ? " person" : " people")) +
        " eating roughly " + LB_PER_PERSON_YEAR + " lb of beef each per year get through " +
        Math.round(people * LB_PER_PERSON_YEAR / 12) + " lb a month, so " + mid +
        " lb lasts about " + Math.round(months) + " months. At one cubic foot per " +
        LB_PER_CUBIC_FOOT + " lb \u2014 the cautious end of the range \u2014 you need about " + Math.round(cuft) +
        " cubic feet of freezer to hold it.";
    }

    function wire(seg) {
      seg.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b || !seg.contains(b)) return;
        $$("button", seg).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        render();
      });
    }
    wire(shareSeg); wire(peopleSeg);
    render();
  })();

  /* -------------------------------------------------------- lightbox --- */
  (function lightbox() {
    var gallery = $("[data-gallery]");
    if (!gallery || typeof HTMLDialogElement === "undefined") return;

    var buttons = $$("button", gallery);
    if (!buttons.length) return;

    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.innerHTML =
      '<img class="lightbox__img" alt="" width="1" height="1" src="data:image/gif;base64,'+
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">' +
      '<div class="lightbox__bar">' +
        '<p data-lb-cap></p>' +
        '<div class="lightbox__nav">' +
          '<button type="button" data-lb-prev aria-label="Previous photograph">&#8592;</button>' +
          '<button type="button" data-lb-next aria-label="Next photograph">&#8594;</button>' +
          '<button type="button" class="lightbox__close" data-lb-close aria-label="Close">&#10005;</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    var img = $(".lightbox__img", dlg);
    var cap = $("[data-lb-cap]", dlg);
    var i = 0, opener = null;

    function show(n) {
      i = (n + buttons.length) % buttons.length;
      var src = $("img", buttons[i]);
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = buttons[i].dataset.caption || src.alt || "";
    }

    buttons.forEach(function (b, n) {
      b.addEventListener("click", function () {
        opener = b; show(n); dlg.showModal();
      });
    });

    $("[data-lb-prev]", dlg).addEventListener("click", function () { show(i - 1); });
    $("[data-lb-next]", dlg).addEventListener("click", function () { show(i + 1); });
    $("[data-lb-close]", dlg).addEventListener("click", function () { dlg.close(); });

    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft")  { e.preventDefault(); show(i - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(i + 1); }
    });
    // click the backdrop to close
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    // give focus back to the thumbnail that opened it
    dlg.addEventListener("close", function () { if (opener) opener.focus(); });
  })();

  /* ------------------------------------------------------------ form --- */
  (function form() {
    var f = $("[data-form]");
    if (!f) return;

    // Preselect the share if they arrived from a tier button.
    var want = new URLSearchParams(location.search).get("share");
    var sel  = $("[data-share-select]", f);
    if (want && sel && sel.querySelector('option[value="' + CSS.escape(want) + '"]')) {
      sel.value = want;
    }

    var status = $("[data-form-status]", f);
    var fields = $$("input[required], textarea[required], input[type=email], input[type=tel]", f);

    function messageFor(el) {
      if (el.validity.valueMissing)  return "This one is needed before we can reply.";
      if (el.validity.typeMismatch && el.type === "email")
        return "That does not look like an email address.";
      if (el.validity.typeMismatch && el.type === "tel")
        return "That does not look like a phone number.";
      return el.validationMessage || "";
    }

    function check(el) {
      var slot = el.parentElement.querySelector("[data-err]");
      var ok = el.checkValidity();
      el.setAttribute("aria-invalid", String(!ok));
      if (slot) slot.textContent = ok ? "" : messageFor(el);
      return ok;
    }

    fields.forEach(function (el) {
      el.addEventListener("blur", function () { check(el); });
      el.addEventListener("input", function () {
        if (el.getAttribute("aria-invalid") === "true") check(el);
      });
    });

    f.setAttribute("novalidate", "novalidate");

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = fields.map(check).indexOf(false);
      if (bad > -1) {
        status.hidden = false;
        status.textContent = "Some of the fields above still need filling in.";
        fields[bad].focus();
        return;
      }

      var d = new FormData(f);
      var shareLabel = sel && sel.selectedIndex > -1 ? sel.options[sel.selectedIndex].text : "";
      var body = [
        "Name:  " + (d.get("name")  || ""),
        "Email: " + (d.get("email") || ""),
        "Phone: " + (d.get("phone") || "not given"),
        "Share: " + shareLabel,
        "",
        d.get("message") || "",
        "",
        "— sent from theranchpartnership.com"
      ].join("\n");

      var href = f.getAttribute("action").split("?")[0] +
        "?subject=" + encodeURIComponent("Share enquiry — " + (d.get("name") || "")) +
        "&body=" + encodeURIComponent(body);

      status.hidden = false;
      status.textContent =
        "Opening your email app with this message ready to send. If nothing happens, " +
        "email zachwroan@icloud.com or call (940) 703-4991 directly.";
      window.location.href = href;
    });
  })();
})();
