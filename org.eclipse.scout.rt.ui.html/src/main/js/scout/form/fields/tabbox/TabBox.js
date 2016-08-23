/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
/**
 * Tab-area = where the 1-n tabs are placed (may have multiple runs = lines).
 * Tab-content = where the content of a single tab is displayed.
 */
scout.TabBox = function() {
  scout.TabBox.parent.call(this);
  this._addAdapterProperties(['tabItems', 'selectedTab']);
  this._addPreserveOnPropertyChangeProperties(['selectedTab']); // FIXME [awe] 6.1 - do this in Calendar too, for selectedComponent
  this.selectedTab;
  this._$tabArea;
  this._$tabContent;

  this._tabItemPropertyChangeListener = function(event) {
    if (event.changedProperties.length > 0) {
      if (event.changedProperties.length === 1 && event.changedProperties[0] === 'enabled') {
        // Optimization: don't invalidate layout when only the enabled state has changed (this should not affect the layout).
        return;
      }
      this.htmlComp.invalidateLayoutTree();
    }
  }.bind(this);
};
scout.inherits(scout.TabBox, scout.CompositeField);

/**
 * @override FormField.js
 */
scout.TabBox.prototype._init = function(model) {
  scout.TabBox.parent.prototype._init.call(this, model);
  // FIXME [awe] 6.1 - check commit on 5.2 branch from michael schmucki, should not cause errors when no tab is selected initially
  this.selectedTab.setTabActive(true);
  this.menuBar = scout.create('MenuBar', {
    parent: this,
    menuOrder: new scout.GroupBoxMenuItemsOrder()
  });
  this._updateMenuBar(this.menus);
};

scout.TabBox.prototype._render = function($parent) {
  this.addContainer($parent, 'tab-box', new scout.TabBoxLayout(this));

  this._$tabArea = this.$container
    .appendDiv('tab-area')
    .on('keydown', this._onKeyDown.bind(this));
  this.addStatus();
  this.htmlComp = new scout.HtmlComponent(this._$tabArea, this.session);
  this.htmlComp.setLayout(new scout.TabAreaLayout(this));

  this.menuBar.render(this._$tabArea);

  this._$tabContent = this.$container.appendDiv('tab-content');
  var htmlCompContent = new scout.HtmlComponent(this._$tabContent, this.session);
  htmlCompContent.setLayout(new scout.SingleLayout());
};

/**
 * @override FormField.js
 */
scout.TabBox.prototype._renderProperties = function() {
  scout.TabBox.parent.prototype._renderProperties.call(this);
  this._renderTabs();
  this._renderTabContent();
};

/**
 * @override FormField.js
 */
scout.TabBox.prototype._remove = function() {
  scout.TabBox.parent.prototype._remove.call(this);
  this._removeTabs();
  this._removeTabContent();
};

scout.TabBox.prototype._renderSelectedTab = function() {
  // NOP - already handled by _syncSelectedTab
};

scout.TabBox.prototype._renderTabs = function() {
  this.tabItems.forEach(function(tabItem) {
    tabItem.renderTab(this._$tabArea);
    tabItem.on('propertyChange', this._tabItemPropertyChangeListener);
  }, this);
};

scout.TabBox.prototype._removeTabs = function() {
  this.tabItems.forEach(function(tabItem) {
    tabItem.removeTab();
    tabItem.off('propertyChange', this._tabItemPropertyChangeListener);
  }, this);
};

scout.TabBox.prototype._removeTabContent = function() {
  this.tabItems.forEach(function(tabItem) {
    tabItem.remove();
  }, this);
};

scout.TabBox.prototype.rebuildTabs = function() {
  // FIXME awe: (tab-box) refactor this and work with a clone in the TabBoxLayout - when we remove an existing
  // DOM element which currently has the focus - the focus is lost. An other solution would be, to render the
  // tab at the correct position but probably that's not so easy because the render impl. does always append.
  // Temporary focus fix
  var $focusedElement = $(document.activeElement),
    focusedElement = null;
  if ($focusedElement.is('.tab-item')) {
    focusedElement = $focusedElement.data('tabItem');
  }
  this.tabItems.forEach(function(tabItem) {
    if (tabItem._tabRendered) {
      tabItem.removeTab();
    }
  }, this);
  this._renderTabs();
  if (focusedElement) {
    this.session.focusManager.requestFocus(focusedElement.$tabContainer);
  }
};

scout.TabBox.prototype.setSelectedTab = function(selectedTab) {
  this.setProperty('selectedTab', selectedTab);
};

scout.TabBox.prototype._syncSelectedTab = function(tab, notifyServer) {
  if (this.selectedTab === tab) {
    return;
  }

  $.log.debug('(TabBox#_selectTab) tab=' + tab);
  var oldSelectedTab = this.selectedTab;
  var selectedTab = tab;
  oldSelectedTab.setTabActive(false);
  selectedTab.setTabActive(true);
  this._setProperty('selectedTab', selectedTab);

  if (this.rendered) {
    // revalidateLayoutTree layout when tab-area has changed, because overflow tabs must be re-arranged
    if (!this.selectedTab._tabRendered) {
      scout.HtmlComponent.get(this._$tabArea).revalidateLayoutTree();
    }
    this.selectedTab.focusTab();
    oldSelectedTab.detach();
    this._renderTabContent();
  }
};

// keyboard navigation in tab-box button area
// TODO awe: (tab-box) overflow menu should be accessible by keyboard navigation
scout.TabBox.prototype._onKeyDown = function(event) {
  var tabIndex, navigationKey =
    event.which === scout.keys.LEFT ||
    event.which === scout.keys.RIGHT;

  if (!navigationKey) {
    return true;
  }

  event.preventDefault();
  event.stopPropagation();
  tabIndex = this._getNextVisibleTabIndexForKeyStroke(this.selectedTab, event.which);

  if (tabIndex >= 0 && tabIndex < this.tabItems.length) {
    var tabItem = this.tabItems[tabIndex];
    if (tabItem._tabRendered) {
      this._selectTab(tabItem);
    }
  }
};

scout.TabBox.prototype._getNextVisibleTabIndexForKeyStroke = function(actualIndex, keyStroke) {
  var i, tabItem,
    modifier = keyStroke === scout.keys.LEFT ? -1 : 1,
    endFunc = function(i) {
      if (keyStroke === scout.keys.LEFT) {
        return i >= 0;
      }
      return i < this.tabItems.length;
    }.bind(this);
  for (i = actualIndex + modifier; endFunc(i); i = i + modifier) {
    tabItem = this.tabItems[i];
    if (tabItem.visible) {
      return i;
    }
  }
  return actualIndex;
};

scout.TabBox.prototype._renderTabContent = function() {
  // add new tab-content (use from cache or render)
  var selectedTab = this.selectedTab;
  if (selectedTab.rendered && !selectedTab.attached) {
    selectedTab.attach();
  } else {
    // in Swing there's some complicated logic dealing with borders and labels
    // that determines whether the first group-box in a tab-box has a title or not.
    // I decided to simplify this and always set the title of the first group-box
    // to invisible.
    selectedTab.render(this._$tabContent);
  }
  if (this.rendered) {
    scout.HtmlComponent.get(this._$tabContent).revalidateLayoutTree();
  }
};

scout.TabBox.prototype._syncMenus = function(menus) {
  scout.TabBox.parent.prototype._syncMenus.call(this, menus);
  if (this.menuBar) {
    // updateMenuBar is required because menuBar is not created yet when synMenus is called initially
    this._updateMenuBar(menus);
  }
};

scout.TabBox.prototype._renderMenus = function() {
  // NOP
};

scout.TabBox.prototype._removeMenus = function() {
  // menubar takes care about removal
};

scout.TabBox.prototype._updateMenuBar = function(menus) {
  var menuItems = scout.menus.filter(this.menus, ['TabBox.Header']);
  this.menuBar.setMenuItems(menuItems);
};

scout.TabBox.prototype._renderStatusPosition = function() {
  if (this.statusPosition === scout.FormField.STATUS_POSITION_TOP) {
    // move into title
    this.$status.appendTo(this._$tabArea);
  } else {
    this.$status.appendTo(this.$container);
  }
  this.invalidateLayoutTree();
};

/**
 * @override CompositeField.js
 */
scout.TabBox.prototype.getFields = function() {
  return this.tabItems;
};
