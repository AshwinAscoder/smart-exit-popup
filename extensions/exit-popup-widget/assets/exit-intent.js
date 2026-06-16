(function () {
  "use strict";

  if (window.__smartExitPopupInitialized) return;
  window.__smartExitPopupInitialized = true;

  var SETTINGS_ENDPOINT = "/apps/smart-exit-popup/api/settings";
  var STORAGE_KEY = "has_seen_exit_popup";
  var ROOT_ID = "smart-exit-popup-root";
  var STYLE_ID = "smart-exit-popup-styles";
  var MODAL_SELECTOR = "[data-smart-exit-popup]";
  var CLOSE_SELECTOR = "[data-smart-exit-popup-close]";
  var CLAIM_SELECTOR = "[data-smart-exit-popup-claim]";

  var hasTriggered = false;
  var touchStartY = 0;
  var touchStartTime = 0;
  var lastScrollY = window.scrollY || 0;
  var lastScrollTime = Date.now();

  function getSessionStorage() {
    try {
      window.sessionStorage.setItem("__smart_exit_test__", "1");
      window.sessionStorage.removeItem("__smart_exit_test__");
      return window.sessionStorage;
    } catch (error) {
      return null;
    }
  }

  var storage = getSessionStorage();

  function hasSeenPopup() {
    return storage && storage.getItem(STORAGE_KEY) === "true";
  }

  function markPopupSeen() {
    if (storage) {
      storage.setItem(STORAGE_KEY, "true");
    }
  }

  function isMobileViewport() {
    return (
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 768
    );
  }

  function sanitizeText(value, fallback) {
    if (typeof value !== "string") return fallback;

    var trimmedValue = value.trim();
    return trimmedValue || fallback;
  }

  function sanitizeCssColor(value) {
    if (typeof value !== "string") return "#008060";

    var trimmedValue = value.trim();
    var isHexColor = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
      trimmedValue,
    );
    var isNamedColor = /^[a-z]+$/i.test(trimmedValue);

    return isHexColor || isNamedColor ? trimmedValue : "#008060";
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#smart-exit-popup-root{display:none;position:fixed;inset:0;z-index:2147483647;font-family:inherit}" +
      "#smart-exit-popup-root.smart-exit-popup--visible{display:block}" +
      "#smart-exit-popup-root .smart-exit-popup__overlay{position:absolute;inset:0;background:rgba(0,0,0,.56)}" +
      "#smart-exit-popup-root .smart-exit-popup__dialog{position:absolute;top:50%;left:50%;width:min(92vw,460px);padding:32px;color:#202223;background:#fff;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.26);text-align:center;transform:translate(-50%,-50%)}" +
      "#smart-exit-popup-root .smart-exit-popup__close{position:absolute;top:12px;right:14px;width:36px;height:36px;border:0;border-radius:50%;color:#5c5f62;background:transparent;font-size:30px;line-height:1;cursor:pointer}" +
      "#smart-exit-popup-root .smart-exit-popup__close:hover{color:#202223;background:#f1f2f3}" +
      "#smart-exit-popup-root .smart-exit-popup__eyebrow{margin:0 0 10px;color:#6d7175;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}" +
      "#smart-exit-popup-root .smart-exit-popup__heading{margin:0 0 12px;color:#111827;font-size:clamp(26px,4vw,36px);line-height:1.12}" +
      "#smart-exit-popup-root .smart-exit-popup__message{margin:0 0 22px;color:#4b5563;font-size:16px;line-height:1.55}" +
      "#smart-exit-popup-root .smart-exit-popup__button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 24px;border-radius:8px;color:#fff;background:#008060;font-size:16px;font-weight:700;line-height:1;text-decoration:none;transition:filter 160ms ease,transform 160ms ease}" +
      "#smart-exit-popup-root .smart-exit-popup__button:hover{filter:brightness(.94);transform:translateY(-1px)}" +
      "#smart-exit-popup-root .smart-exit-popup__code{margin:16px 0 0;color:#374151;font-size:14px}" +
      "@media screen and (max-width:480px){#smart-exit-popup-root .smart-exit-popup__dialog{width:calc(100vw - 32px);padding:28px 20px 24px;border-radius:12px}#smart-exit-popup-root .smart-exit-popup__heading{font-size:26px}#smart-exit-popup-root .smart-exit-popup__button{width:100%}}";

    document.head.appendChild(style);
  }

  function buildPopup(config) {
    if (document.getElementById(ROOT_ID)) return;

    var popupHeading = sanitizeText(
      config.popupHeading,
      "Wait! Don't Go! Get 10% Off Now!",
    );
    var discountCode = sanitizeText(config.discountCode, "SAVE10");
    var buttonColor = sanitizeCssColor(config.buttonBackgroundColor);
    var discountUrl = "/discount/" + encodeURIComponent(discountCode);

    injectStyles();

    var root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("data-smart-exit-popup", "");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "smart-exit-popup-title");

    var overlay = document.createElement("div");
    overlay.className = "smart-exit-popup__overlay";
    overlay.setAttribute("data-smart-exit-popup-close", "");

    var dialog = document.createElement("div");
    dialog.className = "smart-exit-popup__dialog";

    var closeButton = document.createElement("button");
    closeButton.className = "smart-exit-popup__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close exit popup");
    closeButton.setAttribute("data-smart-exit-popup-close", "");
    closeButton.textContent = "\u00d7";

    var eyebrow = document.createElement("p");
    eyebrow.className = "smart-exit-popup__eyebrow";
    eyebrow.textContent = "Before you go";

    var title = document.createElement("h2");
    title.id = "smart-exit-popup-title";
    title.className = "smart-exit-popup__heading";
    title.textContent = popupHeading;

    var message = document.createElement("p");
    message.className = "smart-exit-popup__message";
    message.textContent = "Use this limited-time code before you leave.";

    var button = document.createElement("a");
    button.className = "smart-exit-popup__button";
    button.href = discountUrl;
    button.style.backgroundColor = buttonColor;
    button.setAttribute("data-smart-exit-popup-claim", "");
    button.setAttribute("data-discount-code", discountCode);
    button.textContent = "Claim " + discountCode;

    var codeText = document.createElement("p");
    codeText.className = "smart-exit-popup__code";
    codeText.textContent = "Use code: ";

    var strong = document.createElement("strong");
    strong.textContent = discountCode;

    codeText.appendChild(strong);
    dialog.appendChild(closeButton);
    dialog.appendChild(eyebrow);
    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(button);
    dialog.appendChild(codeText);
    root.appendChild(overlay);
    root.appendChild(dialog);
    document.body.appendChild(root);
  }

  function getPopup() {
    return document.querySelector(MODAL_SELECTOR);
  }

  function showPopup() {
    if (hasTriggered || hasSeenPopup()) return;

    var popup = getPopup();
    if (!popup) return;

    hasTriggered = true;
    popup.classList.add("smart-exit-popup--visible");
    document.documentElement.style.overflow = "hidden";
  }

  function closePopup() {
    var popup = getPopup();
    if (!popup) return;

    popup.classList.remove("smart-exit-popup--visible");
    document.documentElement.style.overflow = "";
    markPopupSeen();
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = "Applying...";
      button.setAttribute("aria-busy", "true");
      button.setAttribute("aria-disabled", "true");
      button.style.pointerEvents = "none";
      button.style.opacity = "0.82";
      return;
    }

    button.textContent = button.dataset.originalText || button.textContent;
    button.removeAttribute("aria-busy");
    button.removeAttribute("aria-disabled");
    button.style.pointerEvents = "";
    button.style.opacity = "";
  }

  async function applyDiscount(discountCode) {
    if (!discountCode) return;

    await fetch("/discount/" + encodeURIComponent(discountCode), {
      method: "GET",
      credentials: "same-origin",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });
  }

  async function getCartItemCount() {
    var response = await fetch("/cart.js", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Cart request failed with " + response.status);
    }

    var cart = await response.json();
    return Number(cart.item_count || 0);
  }

  async function handleClaimClick(event) {
    var button = event.target.closest(CLAIM_SELECTOR);
    if (!button) return;

    event.preventDefault();

    var discountCode = sanitizeText(
      button.getAttribute("data-discount-code"),
      "",
    );
    setButtonLoading(button, true);
    markPopupSeen();

    try {
      await applyDiscount(discountCode);
      var itemCount = await getCartItemCount();

      window.location.href = itemCount > 0 ? "/checkout" : "/cart";
    } catch (error) {
      window.location.href = "/cart";
    }
  }

  function handleMouseLeave(event) {
    if (isMobileViewport()) return;

    if (event.clientY < 20) {
      showPopup();
    }
  }

  function handlePopState() {
    if (isMobileViewport()) {
      showPopup();
    }
  }

  function handleTouchStart(event) {
    if (!isMobileViewport() || !event.changedTouches.length) return;

    touchStartY = event.changedTouches[0].clientY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(event) {
    if (
      !isMobileViewport() ||
      !event.changedTouches.length ||
      !touchStartTime
    ) {
      return;
    }

    var touchEndY = event.changedTouches[0].clientY;
    var elapsed = Date.now() - touchStartTime;
    var distance = touchEndY - touchStartY;
    var velocity = Math.abs(distance) / Math.max(elapsed, 1);

    if (distance < -80 && velocity > 0.65) {
      showPopup();
    }

    touchStartY = 0;
    touchStartTime = 0;
  }

  function handleScrollVelocity() {
    if (!isMobileViewport()) return;

    var currentScrollY = window.scrollY || 0;
    var now = Date.now();
    var distance = currentScrollY - lastScrollY;
    var elapsed = now - lastScrollTime;
    var velocity = Math.abs(distance) / Math.max(elapsed, 1);
    var isFastUpwardScroll = distance < -120 && velocity > 1.2;

    if (isFastUpwardScroll) {
      showPopup();
    }

    lastScrollY = currentScrollY;
    lastScrollTime = now;
  }

  function bindEvents() {
    document.addEventListener("mouseleave", handleMouseLeave, {
      passive: true,
    });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("scroll", handleScrollVelocity, { passive: true });
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    document.addEventListener("click", function (event) {
      if (event.target.closest(CLAIM_SELECTOR)) {
        handleClaimClick(event);
        return;
      }

      if (event.target.closest(CLOSE_SELECTOR)) {
        closePopup();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closePopup();
      }
    });
  }

  async function fetchSettings() {
    var response = await fetch(SETTINGS_ENDPOINT, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Settings request failed with " + response.status);
    }

    return response.json();
  }

  async function init() {
    if (hasSeenPopup()) return;

    try {
      var config = await fetchSettings();

      if (!config || config.ok !== true || config.isEnabled === false) {
        return;
      }

      buildPopup(config);
      bindEvents();
    } catch (error) {
      return;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
