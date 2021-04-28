/*
 * Copyright (c) 2014-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {StringFieldCtrlEnterKeyStroke, StringFieldEnterKeyStroke, Tile, ViewMenuPopupEnterKeyStroke, WidgetPopup} from '../../index';

/**
 * Popup menu to switch between outlines.
 */
export default class ViewMenuPopup extends WidgetPopup {

  constructor() {
    super();
    this.cssClass = 'view-menu-popup';
    this.defaultIconId = null;
    this.viewMenus = [];
    this.trimWidth = true;
  }

  _init(options) {
    super._init(options);
    let tiles = this._createTiles();
    let noIcons = tiles.every(tile => !tile.widgets[0].visible);
    this.widget = scout.create('TileGrid', {
      parent: this,
      tiles: tiles,
      cssClass: noIcons ? 'no-icons' : '',
      selectable: true,
      multiSelect: false,
      gridColumnCount: tiles.length > 4 ? 3 : 2,
      layoutConfig: {
        columnWidth: 106,
        rowHeight: 130,
        vgap: 18,
        hgap: 18
      }
    });
    let tile = this.widget.tiles.find(tile => tile.viewMenu.selected);
    if (tile) {
      this.widget.selectTile(tile);
    }
  }

  _createTiles() {
    return this.viewMenus.map(menu => ({
      objectType: 'CompositeTile',
      displayStyle: Tile.DisplayStyle.PLAIN,
      cssClass: 'view-menu-tile ' + (menu.selected ? 'checked ' : '') + (!menu.iconId ? 'text-only' : ''),
      viewMenu: menu,
      enabled: menu.enabled,
      gridDataHints: {
        useUiHeight: true
      },
      widgets: [
        {
          objectType: 'Icon',
          iconDesc: menu.iconId,
          visible: !!menu.iconId
        },
        {
          objectType: 'Label',
          value: menu.text,
          cssClass: 'label'
        }
      ]
    }));
  }

  _initKeyStrokeContext() {
    super._initKeyStrokeContext();

    this.keyStrokeContext.registerKeyStroke([
      new ViewMenuPopupEnterKeyStroke(this)
    ]);
  }

  _renderWidget() {
    super._renderWidget();
    this.widget.$container.on('click', '.tile', event => this.activateTile(scout.widget(event.target)));
  }

  activateTile(tile) {
    if (!tile || !tile.viewMenu.enabledComputed) {
      return;
    }
    tile.viewMenu.doAction();
    this.close();
  }
}
