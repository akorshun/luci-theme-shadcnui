'use strict';
'require baseclass';
'require ui';

/*
 * luci-theme-shadcnui — menu-shadcnui.js
 *
 * Drop-in replacement for menu-bootstrap / menu-argon. Loads the menu tree via
 * ui.menu.load() and renders it into the sidebar shell that header.ut prepared:
 *
 *   #shadcn-sidebar
 *     .sidebar-header   — brand (rendered server-side)
 *     #shadcn-mainmenu  — primary nav (we fill this)
 *     #shadcn-modemenu  — secondary "mode" tabs (we fill this when there are >1)
 *   #shadcn-topbar
 *     #shadcn-breadcrumb — current path (we fill this)
 *   #tabmenu              — page-local sub-tabs (we fill this when active)
 *
 * The menu has 3 conceptual layers:
 *   level 0  — modes  (Status / System / Network / Services / ...)
 *              In bootstrap these go into #modemenu; in our layout we only
 *              switch the sidebar's main pane based on the active mode.
 *   level 1  — sections of the active mode  (e.g. under "System": System /
 *              Administration / Software / Startup / ...)
 *   level 2  — leaves; clicking them dispatches a view
 *   level 3+ — page-local sub-tabs, rendered into #tabmenu by tabmenu code.
 *
 * Layout:
 *   - The first mode's children become collapsible sections in the sidebar.
 *   - Other modes are listed at the bottom of the sidebar (#shadcn-modemenu)
 *     as small chips so the user can switch.
 */

return baseclass.extend({

	__init__: function () {
		ui.menu.load().then(L.bind(this.render, this));
	},

	render: function (tree) {
		this.renderModeSwitcher(tree);
		this.renderSidebarForActiveMode(tree);
		this.renderBreadcrumb(tree);
		this.renderTabMenu(tree);
	},

	/* --------------- Mode switcher (top-level) --------------- */

	renderModeSwitcher: function (tree) {
		var container = document.querySelector('#shadcn-modemenu');
		if (!container) return;

		var children = ui.menu.getChildren(tree);
		if (children.length <= 1) return;

		var requestpath = L.env.requestpath || [];
		var activeName  = requestpath.length ? requestpath[0] : (children[0] && children[0].name);

		container.innerHTML = '';
		children.forEach(function (child) {
			var isActive = (child.name === activeName);
			var a = E('a', {
				'class': 'mode-chip' + (isActive ? ' active' : ''),
				'href':  L.url(child.name)
			}, [ _(child.title) ]);
			container.appendChild(a);
		});
	},

	/* --------------- Sidebar nav for the active mode --------------- */

	renderSidebarForActiveMode: function (tree) {
		var container = document.querySelector('#shadcn-mainmenu');
		if (!container) return;

		var topChildren = ui.menu.getChildren(tree);
		if (topChildren.length === 0) return;

		var requestpath = L.env.requestpath || [];
		var dispatchpath = L.env.dispatchpath || [];

		// Pick the active mode (or first if no path).
		var activeMode = null;
		if (requestpath.length) {
			for (var i = 0; i < topChildren.length; i++) {
				if (topChildren[i].name === requestpath[0]) {
					activeMode = topChildren[i];
					break;
				}
			}
		}
		if (!activeMode) activeMode = topChildren[0];

		container.innerHTML = '';

		var sections = ui.menu.getChildren(activeMode);
		var self = this;

		sections.forEach(function (section) {
			var sectionUrl = activeMode.name + '/' + section.name;
			var leaves = ui.menu.getChildren(section);
			var isActiveSection = (dispatchpath[1] === section.name);

			if (leaves.length > 0) {
				// Collapsible section
				var div = E('div', {
					'class': 'sidebar-section',
					'data-open': isActiveSection ? 'true' : 'false'
				});

				var btn = E('button', {
					'class': 'sidebar-toggle' + (isActiveSection ? ' active' : ''),
					'type':  'button',
					'click': ui.createHandlerFn(self, 'handleSectionToggle')
				}, [
					E('svg', {
						'class':       'icon',
						'viewBox':     '0 0 24 24',
						'fill':        'none',
						'stroke':      'currentColor',
						'stroke-width':'2'
					}, [ E('circle', { 'cx': '12', 'cy': '12', 'r': '8' }) ]),
					E('span', {}, [ _(section.title) ]),
					E('svg', {
						'class':       'chevron',
						'viewBox':     '0 0 24 24',
						'fill':        'none',
						'stroke':      'currentColor',
						'stroke-width':'2'
					}, [ E('polyline', { 'points': '9 18 15 12 9 6' }) ])
				]);

				var childrenWrap = E('div', { 'class': 'sidebar-children' });
				leaves.forEach(function (leaf) {
					var leafUrl = sectionUrl + '/' + leaf.name;
					var isActiveLeaf = (dispatchpath[1] === section.name && dispatchpath[2] === leaf.name);
					var a = E('a', {
						'class': 'sidebar-link' + (isActiveLeaf ? ' active' : ''),
						'href':  L.url(leafUrl)
					}, [ E('span', {}, [ _(leaf.title) ]) ]);
					childrenWrap.appendChild(a);
				});

				div.appendChild(btn);
				div.appendChild(childrenWrap);
				container.appendChild(div);
			}
			else {
				// Direct link
				var a = E('a', {
					'class': 'sidebar-link sidebar-link-top' + (isActiveSection ? ' active' : ''),
					'href':  L.url(sectionUrl)
				}, [
					E('svg', {
						'class':       'icon',
						'viewBox':     '0 0 24 24',
						'fill':        'none',
						'stroke':      'currentColor',
						'stroke-width':'2'
					}, [ E('circle', { 'cx': '12', 'cy': '12', 'r': '8' }) ]),
					E('span', {}, [ _(section.title) ])
				]);
				container.appendChild(a);
			}
		});
	},

	handleSectionToggle: function (ev) {
		var btn = ev.currentTarget;
		var section = btn.closest('.sidebar-section');
		if (!section) return;
		var open = section.getAttribute('data-open') === 'true';
		section.setAttribute('data-open', open ? 'false' : 'true');
		ev.preventDefault();
		ev.stopPropagation();
	},

	/* --------------- Breadcrumb in the topbar --------------- */

	renderBreadcrumb: function (tree) {
		var container = document.querySelector('#shadcn-breadcrumb');
		if (!container) return;

		var dispatchpath = L.env.dispatchpath || [];
		if (dispatchpath.length === 0) return;

		var node = tree;
		var crumbs = [];
		var url = '';

		for (var i = 0; i < dispatchpath.length && node; i++) {
			var seg = dispatchpath[i];
			node = node.children && node.children[seg];
			if (!node) break;
			url = url + (url ? '/' : '') + seg;
			crumbs.push({ title: node.title, url: url });
		}

		container.innerHTML = '';
		crumbs.forEach(function (c, idx) {
			if (idx > 0) container.appendChild(E('span', { 'class': 'crumb-sep' }, [ '/' ]));
			if (idx === crumbs.length - 1) {
				container.appendChild(E('span', { 'class': 'crumb-current' }, [ _(c.title) ]));
			} else {
				container.appendChild(E('a', { 'href': L.url(c.url) }, [ _(c.title) ]));
			}
		});
	},

	/* --------------- Page-local sub-tabs in #tabmenu --------------- */

	renderTabMenu: function (tree) {
		var container = document.querySelector('#tabmenu');
		if (!container) return;

		var dispatchpath = L.env.dispatchpath || [];
		if (dispatchpath.length < 3) return;

		var node = tree;
		var url  = '';
		for (var i = 0; i < 3 && node; i++) {
			node = node.children && node.children[dispatchpath[i]];
			url  = url + (url ? '/' : '') + dispatchpath[i];
		}
		if (!node) return;

		this._renderTabLevel(node, url, 0, container);
	},

	_renderTabLevel: function (node, url, level, container) {
		var children = ui.menu.getChildren(node);
		if (children.length === 0) return;

		var ul = E('ul', { 'class': 'cbi-tabmenu' });
		var activeNode = null;

		var dispatchpath = L.env.dispatchpath || [];
		children.forEach(function (child) {
			var isActive = (dispatchpath[3 + level] === child.name);
			var li = E('li', { 'class': isActive ? 'cbi-tab' : 'cbi-tab-disabled' }, [
				E('a', { 'href': L.url(url, child.name) }, [ _(child.title) ])
			]);
			ul.appendChild(li);
			if (isActive) activeNode = child;
		});

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode) {
			this._renderTabLevel(activeNode, url + '/' + activeNode.name, level + 1, container);
		}
	}

});
