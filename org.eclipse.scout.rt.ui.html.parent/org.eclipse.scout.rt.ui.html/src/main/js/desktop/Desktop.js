scout.Desktop = function() {
  scout.Desktop.parent.call(this);

  this.navigation;
  this.$bar;
  this.$tabbar;
  this.$toolbar;
  this.$bench;
  this.$toolContainer;

  this._allTabs = [];
  this._selectedTab;

  /**
   * TODO AWE/CGU: (key-handling, forms) wird nun auch als 'activeForm' verwendet (siehe TableKeystrokeAdapter.js)
   * Wahrscheinlich müssen wir das refactoren und eine activeForm property verwenden.  Diese Property muss
   * mit dem Server synchronisiert werden, damit auch das server-seitige desktop.getActiveForm() stimmt.
   * Auch im zusammenhang mit focus-handling nochmals überdenken.
   */
  this.selectedTool;
  this._addAdapterProperties(['viewButtons', 'actions', 'views', 'dialogs', 'outline', 'searchOutline', 'messageBoxes', 'addOns', 'keyStrokes', 'menus', 'toolButtons']);
};
scout.inherits(scout.Desktop, scout.BaseDesktop);

scout.Desktop.prototype.onChildAdapterCreated = function(propertyName, adapter) {
  if (propertyName === 'viewButtons') {
    adapter.desktop = this;
  }
  if (propertyName === 'actions') {
    adapter.desktop = this;
  }
};

scout.Desktop.prototype._render = function($parent) {
  var i, action;

  this.$parent = $parent;
  this.navigation = new scout.DesktopNavigation(this);
  this.navigation.render($parent);

  this.splitter = new scout.Splitter({
    $anchor: this.navigation.$navigation
  });
  this.splitter.render($parent);
  this.splitter.on('resize', this.onSplitterResize.bind(this));
  this.splitter.on('resizeend', this.onSplitterResizeEnd.bind(this));

  this.$bar = $parent.appendDiv('desktop-taskbar');
  this.$bar.appendDiv('taskbar-logo')
    .delay(1000)
    .animateAVCSD('width', 40, null, null, 1000)
    .on('click', function() {
      if (this.session.url === 'json') {
        this.session.url = 'http://localhost:123';
      } else {
        this.session.url = 'json';
      }
    }.bind(this));

  this.$tabbar = this.$bar.appendDiv('taskbar-tabs');
  this.$toolbar = this.$bar.appendDiv('taskbar-tools');
  this.$bench = this.$parent.appendDiv('desktop-bench');
  new scout.HtmlComponent(this.$bench, this.session);
  this.$toolContainer = this.$parent.appendDiv('desktop-tool-container').hide();

  this._outlineTab = new scout.Desktop.TabAndContent();

  for (i = 0; i < this.addOns.length; i++) {
    this.addOns[i].render($parent);
  }

  // we set the menuStyle property to render a menu with a different style
  // depending on where the menu is located (taskbar VS menubar).
  for (i = 0; i < this.actions.length; i++) {
    action = this.actions[i];
    action.menuStyle = 'taskbar';
    action.render(this.$toolbar);
  }
  if (action) {
    action.$container.addClass('last');
  }

  this.navigation.onOutlineChanged(this.outline);

  this.views.forEach(this._renderView.bind(this));
  this.dialogs.forEach(this._renderDialog.bind(this));
  this.messageBoxes.forEach(this._renderMessageBox.bind(this));

  $(window).on('resize', this.onResize.bind(this));

  // Switch off browser's default context menu for the entire scout desktop (except input fields)
  $parent.bind("contextmenu", function(event) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== "TEXTAREA" && !event.target.isContentEditable) {
      event.preventDefault();
    }
  });

  // TODO CRU: split and move
  scout.keyStrokeManager.installAdapter($parent, new scout.DesktopKeyStrokeAdapter(this));
};

scout.Desktop.prototype.onResize = function(event) {
  //FIXME AWE/CGU this is called by jquery ui when the dialog gets resized, why?
  if (this._selectedTab && this._selectedTab.content) {
    this._selectedTab.content.onResize();
  }
  if (this.outline) {
    this.outline.onResize();
  }
};

scout.Desktop.prototype.onSplitterResize = function(event) {
  this.navigation.onResize(event);
  this.onResize(event);
};

scout.Desktop.prototype.onSplitterResizeEnd = function(event) {
  var w = event.pageX;
  if (w < this.navigation.breadcrumbSwitchWidth) {
    this.navigation.$navigation.animateAVCSD('width', this.navigation.breadcrumbSwitchWidth);
    this.$bar.animateAVCSD('left', this.navigation.breadcrumbSwitchWidth);
    this.$bench.animate({
      left: this.navigation.breadcrumbSwitchWidth
    }, {
      progress: this.splitter.position.bind(this.splitter)
    });
  }
};

/* Tab-handling */

// TODO AWE/CGU: (dialoge) Über modale Dialoge sprechen, v.a. über folgenden Fall:
// - Outline-Tab > Autrag Xyz > Auftrag bearbeiten
// - Tab geht auf, nun wieder auf Outline-Tab wechseln und nochmals Auftrag bearbeiten
// - ein weiterer Tab geht auf, kann man beliebig wiederholen
// Lösungen besprechen. Eine Möglichkeit wäre, bei Klick auf Auftrag bearbeiten in den
// bereits geöffneten Tab/Dialog zu wecheseln. Oder das Menü-Item disablen.

// ist schon in AbstractForm mit execStartExclusive gelöst - muss von CRM überall implementiert werden.

scout.Desktop.prototype._addTab = function(tab, prepend) {
  tab.$container = $.makeDiv('taskbar-tab-item')
    .append($.makeDiv('title', tab.title).attr('title', tab.title))
    .append($.makeDiv('sub-title', tab.subTitle));
  if (prepend) {
    tab.$container.prependTo(this.$tabbar);
  } else {
    tab.$container.appendTo(this.$tabbar);
  }

  tab.$container.on('click', function() {
    if (tab !== this._selectedTab) {
      this._selectTab(tab);
    }
  }.bind(this));

  this._allTabs.push(tab);
  this._selectTab(tab);
};

scout.Desktop.prototype._isTabVisible = function(tab) {
  return this._allTabs.indexOf(tab) >= 0;
};

scout.Desktop.prototype._updateTab = function(tab) {
  var setTitle = function(selector, title) {
    var $e = tab.$container.children(selector);
    if (title) {
      $e.text(title).attr('title', title).setVisible(true);
    } else {
      $e.setVisible(false);
    }
  };
  setTitle('.title', tab.title);
  setTitle('.sub-title', tab.subTitle);
};

scout.Desktop.prototype._removeTab = function(tab) {
  scout.arrays.remove(this._allTabs, tab);

  // If tab was already rendered, unrender it
  if (tab.$container) {
    if (tab.$container.isSelected() && this._allTabs.length > 0) {
      this._selectTab(this._allTabs[this._allTabs.length - 1]);
    }
    tab.$container.remove();
  }
};

scout.Desktop.prototype._selectTab = function(tab) {
  if (this._selectedTab) {
    this._unselectTab(this._selectedTab);
  }

  tab.$container.select(true);
  this._selectedTab = tab;
  if (tab.content && tab.content.objectType === 'Table') {
    // Install adapter on parent (no table focus required)
    if (tab.content.keyStrokeAdapter.objectType !== 'TableKeyStrokeAdapter') {
      tab.content.injectKeyStrokeAdapter(new scout.DesktopTableKeyStrokeAdapter(tab.content), this.$parent);
    } else {
      scout.keyStrokeManager.installAdapter(this.$parent, tab.content.keyStrokeAdapter);
    }
  }
  if (tab.$storage && tab.$storage.length > 0) {
    this.$bench.append(tab.$storage);
    this.session.detachHelper.afterAttach(tab.$storage);

    //If the parent has been resized while the content was not visible, the content has the wrong size -> update
    var htmlComp = scout.HtmlComponent.get(tab.$storage);
    var htmlParent = htmlComp.getParent();
    htmlComp.setSize(htmlParent.getSize());
  }
};

scout.Desktop.prototype._unselectTab = function(tab) {
  //remove registered keyStrokeAdapters
  if (tab.content && scout.keyStrokeManager.isAdapterInstalled(tab.content.keyStrokeAdapter)) {
    scout.keyStrokeManager.uninstallAdapter(tab.content.keyStrokeAdapter);
  }

  tab.$storage = this.$bench.children();
  if (tab.$storage.length > 0) {
    scout.Tooltip.removeTooltips(tab.$storage);
    this.session.detachHelper.beforeDetach(tab.$storage);
    tab.$storage.detach();
  }
  tab.$container.select(false);
};

/* handling of forms */

scout.Desktop.prototype._renderDialog = function(dialog) {
  dialog.render(this.$parent);
  dialog.htmlComp.pixelBasedSizing = true;

  var prefSize = dialog.htmlComp.getPreferredSize(),
    documentSize = new scout.Dimension($(document).width(), $(document).height()),
    dialogSize = new scout.Dimension(),
    marginLeft, marginTop, opticalMiddleOffset;

  dialogSize.width = Math.min(documentSize.width, prefSize.width);
  dialogSize.height = Math.min(documentSize.height, prefSize.height);

  marginLeft = (documentSize.width - dialogSize.width) / 2;
  marginTop = (documentSize.height - dialogSize.height) / 2;

  // optical middle
  opticalMiddleOffset = Math.min(marginTop / 5, 10);
  marginTop -= opticalMiddleOffset;

  dialog.htmlComp.setSize(dialogSize);

  dialog.$container
    .cssMarginLeft(marginLeft)
    .cssMarginTop(marginTop);
};

scout.Desktop.prototype._renderView = function(view) {
  var tab = new scout.Desktop.TabAndContent(view, view.title, view.subTitle);
  this._addTab(tab);
  view.render(this.$bench);

  // FIXME CGU: maybe include in render?
  view.htmlComp.layout();
  view.htmlComp.validateRoot = true;
  view.tab = tab;
};

scout.Desktop.prototype._removeForm = function(form) {
  if (form.displayHint === 'view') {
    this._removeTab(form.tab);
  }
  form.remove();
};

scout.Desktop.prototype._showForm = function(form) {
  if (this._isDialog(form)) {
    // FIXME AWE: (modal dialog) - show dialogs
  } else {
    this._selectTab(form.tab);
  }
};

scout.Desktop.prototype._openUrlInBrowser = function(event) {
  $.log.debug('(Desktop#_openUrlInBrowser) path=' + event.path + ' urlTarget=' + event.urlTarget);
  if (!event.path) {
    return;
  }
  if (event.urlTarget === 'SELF') {
    window.location.href = event.path;
  } else {
    window.open(event.path);
  }
};

/* communication with outline */

scout.Desktop.prototype.updateOutlineTab = function(content, title, subTitle) {
  if (this._outlineTab.content && this._outlineTab.content !== content) {
    if (scout.keyStrokeManager.isAdapterInstalled(this._outlineTab.keyStrokeAdapter)) {
      scout.keyStrokeManager.uninstallAdapter(this._outlineTab.keyStrokeAdapter);
    }
    this._outlineTab.content.remove();
    // Also remove storage to make sure selectTab does not restore the content
    this._outlineTab.$storage = null;
  }

  // Remove tab completely if no content is available (neither a table nor a form)
  if (!content) {
    this._removeTab(this._outlineTab);
    return;
  }

  if (!this._isTabVisible(this._outlineTab)) {
    this._addTab(this._outlineTab, true);
  }

  this._outlineTab._update(content, title, subTitle);
  this._updateTab(this._outlineTab);
  this._selectTab(this._outlineTab);
  //FIXME CGU create DesktopTable or OutlineTable
  if (content instanceof scout.Table) {
    if (!scout.keyStrokeManager.isAdapterInstalled(content.keyStrokeAdapter)) {
      if (content.keyStrokeAdapter.objectType !== 'TableKeyStrokeAdapter') {
        content.injectKeyStrokeAdapter(new scout.DesktopTableKeyStrokeAdapter(content), this.$parent);
      } else {
        scout.keyStrokeManager.installAdapter(this.$parent, content.keyStrokeAdapter);
      }
    }
  }
  if (!content.rendered) {
    content.render(this.$bench);
    if (content instanceof scout.Table) {
      content.menuBar.$container.addClass('main-menubar');
    }
    // FIXME CGU: maybe include in render?
    content.htmlComp.layout();
    content.htmlComp.validateRoot = true;
  }
};

scout.Desktop.prototype.changeOutline = function(outline) {
  this.outline = outline;
  this.navigation.onOutlineChanged(this.outline);
};

/* message boxes */

scout.Desktop.prototype._renderMessageBox = function(messageBox) {
  messageBox.render(this.$parent);
};

scout.Desktop.prototype.onMessageBoxClosed = function(messageBox) {
  scout.arrays.remove(this.messageBoxes, messageBox);
};

/* event handling */

scout.Desktop.prototype._onModelFormAdded = function(event) {
  var form = this.session.getOrCreateModelAdapter(event.form, this);
  if (this._isDialog(form)) {
    this.dialogs.push(form);
    this._renderDialog(form);
  } else {
    this.views.push(form);
    this._renderView(form);
  }
};

scout.Desktop.prototype._onModelFormRemoved = function(event) {
  var form = this.session.getOrCreateModelAdapter(event.form, this);
  if (this._isDialog(form)) {
    scout.arrays.remove(this.dialogs, form);
  } else {
    scout.arrays.remove(this.views, form);
  }
  this._removeForm(form);
};

scout.Desktop.prototype._isDialog = function(form) {
  return form.displayHint === 'dialog';
};

scout.Desktop.prototype.onModelAction = function(event) {
  var form;
  if (event.type === 'formAdded') {
    this._onModelFormAdded(event);
  } else if (event.type === 'formRemoved') {
    this._onModelFormRemoved(event);
  } else if (event.type === 'formEnsureVisible') {
    form = this.session.getOrCreateModelAdapter(event.form, this);
    this._showForm(form);
  } else if (event.type === 'outlineChanged') {
    this.changeOutline(this.session.getOrCreateModelAdapter(event.outline, this));
  } else if (event.type === 'searchPerformed') {
    this.navigation.onSearchPerformed(event);
  } else if (event.type === 'messageBoxAdded') {
    this._renderMessageBox(this.session.getOrCreateModelAdapter(event.messageBox, this));
  } else if (event.type === 'openUrlInBrowser') {
    this._openUrlInBrowser(event);
  } else {
    scout.Desktop.parent.prototype.onModelAction.call(this, event);
  }
};

/* --- INNER TYPES ---------------------------------------------------------------- */

scout.Desktop.TabAndContent = function(content, title, subTitle) {
  this.content = content;
  this.title = title;
  this.subTitle = subTitle;
  this.$container;
  this.$storage;
};

scout.Desktop.TabAndContent.prototype._update = function(content, title, subTitle) {
  this.content = content;
  this.title = title;
  this.subTitle = subTitle;
};
