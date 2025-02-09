/*******************************************************************************
 * Copyright (c) 2019 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.basic.table;

import java.util.List;

import org.eclipse.scout.rt.client.ui.tile.TileGridLayoutConfig;
import org.eclipse.scout.rt.platform.reflect.IPropertyObserver;

/**
 * @since 10.0
 */
public interface ITableTileGridMediator extends IPropertyObserver {

  /**
   * type {@link List} of {@link ITableRowTileMapping}
   */
  String PROP_TILE_MAPPINGS = "tileMappings";

  String PROP_EXCLUSIVE_EXPAND = "exclusiveExpand";
  String PROP_GRID_COLUMN_COUNT = "gridColumnCount";
  String PROP_TILE_GRID_LAYOUT_CONFIG = "tileGridLayoutConfig";
  String PROP_WITH_PLACEHOLDERS = "withPlaceholders";

  List<ITableRowTileMapping> getTileMappings();

  void setTileMappings(List<ITableRowTileMapping> tileMappings);

  boolean isExclusiveExpand();

  void setExclusiveExpand(boolean exclusiveExpand);

  void setGridColumnCount(int gridColumnCount);

  int getGridColumnCount();

  void setWithPlaceholders(boolean withPlaceholders);

  void setTileGridLayoutConfig(TileGridLayoutConfig layoutConfig);

  TileGridLayoutConfig getTileGridLayoutConfig();

  boolean isWithPlaceholders();

}
