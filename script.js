(function(){
  "use strict";

  var STORAGE_KEY = "csm-film-state-v1";

  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return { watched:false, liked:false, watchlist:false, rating:0 };
      var parsed = JSON.parse(raw);
      return {
        watched: !!parsed.watched,
        liked: !!parsed.liked,
        watchlist: !!parsed.watchlist,
        rating: typeof parsed.rating === "number" ? parsed.rating : 0
      };
    }catch(e){
      return { watched:false, liked:false, watchlist:false, rating:0 };
    }
  }

  function saveState(state){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  }

  var state = loadState();

  // ---------- Toast ----------
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){
      toastEl.classList.remove("show");
    }, 1800);
  }

  // ---------- Demo-only links (header, meta links, cast/crew names, tags) ----------
  document.querySelectorAll("[data-demo]").forEach(function(el){
    el.addEventListener("click", function(e){
      e.preventDefault();
      showToast("This demo only contains Carmen Silva Medina's page.");
    });
  });

  // ---------- Watch button ----------
  var watchBtn = document.getElementById("watchBtn");
  var watchLabel = document.getElementById("watchLabel");
  function renderWatch(){
    if(state.watched){
      watchBtn.classList.add("active");
      watchBtn.setAttribute("aria-pressed", "true");
      watchLabel.textContent = "Watched";
    }else{
      watchBtn.classList.remove("active");
      watchBtn.setAttribute("aria-pressed", "false");
      watchLabel.textContent = "Watch";
    }
  }
  watchBtn.addEventListener("click", function(){
    state.watched = !state.watched;
    saveState(state);
    renderWatch();
    showToast(state.watched ? "Marked as watched" : "Marked as unwatched");
  });

  // ---------- Like button ----------
  var likeBtn = document.getElementById("likeBtn");
  function renderLike(){
    likeBtn.classList.toggle("active", state.liked);
    likeBtn.setAttribute("aria-pressed", String(state.liked));
  }
  likeBtn.addEventListener("click", function(){
    state.liked = !state.liked;
    saveState(state);
    renderLike();
    showToast(state.liked ? "Added to Likes" : "Removed from Likes");
  });

  // ---------- Watchlist button ----------
  var watchlistBtn = document.getElementById("watchlistBtn");
  function renderWatchlist(){
    watchlistBtn.classList.toggle("active", state.watchlist);
    watchlistBtn.setAttribute("aria-pressed", String(state.watchlist));
  }
  watchlistBtn.addEventListener("click", function(){
    state.watchlist = !state.watchlist;
    saveState(state);
    renderWatchlist();
    showToast(state.watchlist ? "Added to Watchlist" : "Removed from Watchlist");
  });

  // ---------- Star rating (supports half stars) ----------
  var starContainer = document.getElementById("starRating");
  var stars = Array.prototype.slice.call(starContainer.querySelectorAll(".star"));

  function renderStars(value, isPreview){
    stars.forEach(function(star){
      var starValue = parseFloat(star.getAttribute("data-value"));
      star.classList.remove("filled", "hover");
      if(value >= starValue){
        star.classList.add(isPreview ? "hover" : "filled");
      }
    });
  }

  function getValueFromEvent(star, evt){
    var rect = star.getBoundingClientRect();
    var isHalf = (evt.clientX - rect.left) < rect.width / 2;
    var base = parseFloat(star.getAttribute("data-value"));
    return isHalf ? base - 0.5 : base;
  }

  stars.forEach(function(star){
    star.addEventListener("mousemove", function(e){
      renderStars(getValueFromEvent(star, e), true);
    });
    star.addEventListener("mouseleave", function(){
      renderStars(state.rating, false);
    });
    star.addEventListener("click", function(e){
      var value = getValueFromEvent(star, e);
      state.rating = (state.rating === value) ? 0 : value;
      saveState(state);
      renderStars(state.rating, false);
      showToast(state.rating > 0 ? ("Rating: " + state.rating + " / 5") : "Rating removed");
    });
    star.addEventListener("touchend", function(e){
      e.preventDefault();
      var value = parseFloat(star.getAttribute("data-value"));
      state.rating = (state.rating === value) ? 0 : value;
      saveState(state);
      renderStars(state.rating, false);
      showToast(state.rating > 0 ? ("Rating: " + state.rating + " / 5") : "Rating removed");
    });
  });

  // ---------- Trailer modal (YouTube embed) ----------
  var trailerBtn = document.getElementById("trailerBtn");
  var trailerModal = document.getElementById("trailerModal");
  var modalClose = document.getElementById("modalClose");
  var modalVideo = document.getElementById("modalVideo");

  var YOUTUBE_VIDEO_ID = "kM9NHUXfMLA";
  var YOUTUBE_WATCH_URL = "https://youtu.be/" + YOUTUBE_VIDEO_ID;
  var YOUTUBE_EMBED_SRC = "https://www.youtube.com/embed/" + YOUTUBE_VIDEO_ID + "?autoplay=1&rel=0&playsinline=1";
  var cspListener = null;

  function showEmbedFallback(){
    modalVideo.innerHTML =
      '<svg viewBox="0 0 24 24" width="34" height="34"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>' +
      '<p>This viewer does not allow embedding external video here.<br>' +
      '<a href="' + YOUTUBE_WATCH_URL + '" target="_blank" rel="noopener">Watch the trailer on YouTube ↗</a></p>';
  }

  function openModal(e){
    if(e) e.preventDefault();
    // Create the iframe fresh each time so playback actually starts (autoplay)
    var iframe = document.createElement("iframe");
    var embedSrc = YOUTUBE_EMBED_SRC;
    if(location.protocol === "http:" || location.protocol === "https:"){
      embedSrc += "&origin=" + encodeURIComponent(location.origin);
    }
    iframe.src = embedSrc;
    iframe.title = "Trailer — Carmen Silva Medina";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.setAttribute("allowfullscreen", "");
    iframe.frameBorder = "0";
    // YouTube needs to know which page embeds the video (avoids error 153)
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    modalVideo.innerHTML = "";
    modalVideo.appendChild(iframe);

    trailerModal.classList.add("open");
    document.body.style.overflow = "hidden";

    // Some hosting/preview environments send a Content-Security-Policy that
    // blocks third-party iframes (frame-src). Detect that and fall back to
    // a direct link instead of leaving an empty box.
    cspListener = function(ev){
      if(ev.violatedDirective && ev.violatedDirective.indexOf("frame-src") === 0){
        showEmbedFallback();
      }
    };
    document.addEventListener("securitypolicyviolation", cspListener);
  }
  function closeModal(){
    trailerModal.classList.remove("open");
    document.body.style.overflow = "";
    // Remove the iframe so the video stops playing in the background
    modalVideo.innerHTML = "";
    if(cspListener){
      document.removeEventListener("securitypolicyviolation", cspListener);
      cspListener = null;
    }
  }

  trailerBtn.addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  trailerModal.addEventListener("click", function(e){
    if(e.target === trailerModal) closeModal();
  });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && trailerModal.classList.contains("open")) closeModal();
  });

  // ---------- Tabs ----------
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));

  tabs.forEach(function(tab){
    tab.addEventListener("click", function(){
      var target = tab.getAttribute("data-tab");

      tabs.forEach(function(t){
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      panels.forEach(function(panel){
        panel.classList.toggle("active", panel.id === "panel-" + target);
      });
    });
  });

  // ---------- Search input (demo) ----------
  var searchInput = document.querySelector("[data-demo-input]");
  if(searchInput){
    searchInput.addEventListener("keydown", function(e){
      if(e.key === "Enter"){
        e.preventDefault();
        showToast("This demo only contains Carmen Silva Medina's page.");
        searchInput.blur();
      }
    });
  }

  // ---------- Initial render ----------
  renderWatch();
  renderLike();
  renderWatchlist();
  renderStars(state.rating, false);

})();
