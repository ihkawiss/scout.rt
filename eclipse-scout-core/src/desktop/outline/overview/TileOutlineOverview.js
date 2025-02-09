/*
 * Copyright (c) 2014-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {HtmlComponent, OutlineOverview, scout, TileOverviewLayout} from '../../../index';

export default class TileOutlineOverview extends OutlineOverview {

  constructor() {
    super();
    this.pageTileGrid = null;
    this.scrollable = true;
    this._addWidgetProperties(['pageTileGrid']);
  }

  _init(model) {
    super._init(model);
    if (!this.pageTileGrid) {
      this.pageTileGrid = this._createPageTileGrid();
    }
  }

  _render() {
    this.$container = this.$parent.appendDiv('tile-overview');
    this.htmlComp = HtmlComponent.install(this.$container, this.session);
    this.htmlComp.setLayout(new TileOverviewLayout(this));
    this.$content = this.$container.appendDiv('tile-overview-content');
    this.contentHtmlComp = HtmlComponent.install(this.$content, this.session);
    this.$title = this.$content.appendDiv('tile-overview-title').text(this.outline.title);
  }

  _renderProperties() {
    super._renderProperties();
    this._renderPageTileGrid();
    this._renderScrollable();
  }

  _renderPageTileGrid() {
    this.pageTileGrid.render(this.$content);
  }

  _createPageTileGrid() {
    return scout.create('PageTileGrid', {
      parent: this,
      outline: this.outline
    });
  }

  _renderScrollable() {
    if (this.scrollable) {
      this._installScrollbars({
        axis: 'y'
      });
    } else {
      this._uninstallScrollbars();
    }
  }
}
