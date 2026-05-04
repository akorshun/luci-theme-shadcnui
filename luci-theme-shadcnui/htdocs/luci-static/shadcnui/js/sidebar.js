/*
 * luci-theme-shadcnui — sidebar.js
 * Handles the collapsed/expanded sidebar state on desktop and the slide-in
 * drawer on mobile. Section toggle and active-link highlighting are owned by
 * menu-shadcnui.js because that module renders the menu DOM after this script
 * runs.
 */
(function () {
	'use strict';

	var LS_KEY = 'shadcnui:sidebar';
	var app = document.getElementById('shadcn-app');
	if (!app) return;

	function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }

	function applyState(state) {
		app.setAttribute('data-sidebar', state);
	}

	function loadState() {
		try { return localStorage.getItem(LS_KEY) || 'expanded'; }
		catch (e) { return 'expanded'; }
	}
	function saveState(s) {
		try { localStorage.setItem(LS_KEY, s); } catch (e) {}
	}

	applyState(isMobile() ? 'closed' : loadState());

	var toggle = document.getElementById('shadcn-sidebar-toggle');
	if (toggle) {
		toggle.addEventListener('click', function (e) {
			e.preventDefault();
			var current = app.getAttribute('data-sidebar') || 'expanded';
			var next;
			if (isMobile()) {
				next = (current === 'open') ? 'closed' : 'open';
			} else {
				next = (current === 'collapsed') ? 'expanded' : 'collapsed';
				saveState(next);
			}
			applyState(next);
		});
	}

	// Tap on overlay closes the mobile drawer.
	var overlay = document.getElementById('shadcn-overlay');
	if (overlay) {
		overlay.addEventListener('click', function () {
			applyState('closed');
		});
	}

	var lastMobile = isMobile();
	window.addEventListener('resize', function () {
		var mob = isMobile();
		if (mob === lastMobile) return;
		lastMobile = mob;
		applyState(mob ? 'closed' : loadState());
	});
})();
