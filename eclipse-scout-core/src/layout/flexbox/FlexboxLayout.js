/*
 * Copyright (c) 2014-2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {AbstractLayout, Dimension, HtmlComponent, Rectangle, webstorage} from '../../index';
import $ from 'jquery';

export default class FlexboxLayout extends AbstractLayout {

  constructor(direction, cacheKey) {
    super();
    this.childrenLayoutDatas = [];
    this.cacheKey = null;
    this.setCacheKey(cacheKey);
    if (direction === FlexboxLayout.Direction.ROW) {
      this.preferredLayoutSize = this.preferredLayoutSizeRow;
      this._getDimensionValue = this._getWidth;
      this._layoutFromLayoutData = this._layoutFromLayoutDataRow;
    } else {
      this.preferredLayoutSize = this.preferredLayoutSizeColumn;
      this._getDimensionValue = this._getHeight;
      this._layoutFromLayoutData = this._layoutFromLayoutDataColumn;
    }
  }

  // constants
  static Direction = {
    COLUMN: 0,
    ROW: 1
  };

  setCacheKey(cacheKey) {
    this.cacheKey = cacheKey;
    if (this.cacheKey && this.cacheKey.length > 0) {
      this.cacheKey.unshift('scout.flexboxLayout');
    }
  }

  _readCache(childCount) {
    if (!this.cacheKey || this.cacheKey.length === 0 || childCount < 2) {
      return;
    }
    var keySequence = this.cacheKey.slice(),
      cacheValue = webstorage.getItem(localStorage, keySequence[0]),
      i = 1,
      cacheObj;
    keySequence.push('' + childCount);
    if (cacheValue) {
      cacheObj = JSON.parse(cacheValue);
    }
    while (cacheObj && i < keySequence.length) {
      cacheObj = cacheObj[keySequence[i]];
      i++;
    }
    return cacheObj;
  }

  _writeCache(childCount, sizes) {
    if (!this.cacheKey || this.cacheKey.length === 0 || childCount < 2) {
      return;
    }
    var keySequence = this.cacheKey.slice(),
      cacheValue = webstorage.getItem(localStorage, keySequence[0]),
      i = 1,
      cacheObj,
      cachedSizes;
    keySequence.push('' + childCount);
    if (cacheValue) {
      cacheObj = JSON.parse(cacheValue);
    } else {
      cacheObj = {};
    }
    cachedSizes = cacheObj;
    while (i < keySequence.length - 1) {
      if (!cachedSizes[keySequence[i]]) {
        cachedSizes[keySequence[i]] = {};
      }
      cachedSizes = cachedSizes[keySequence[i]];
      i++;
    }
    cachedSizes[keySequence[i]] = sizes;
    webstorage.setItem(localStorage, keySequence[0], JSON.stringify(cacheObj));
  }

  _computeCacheKey(childCount) {
    // no need to cache bounds of a single child
    if (!this.cacheKey || childCount < 2) {
      return;
    }
    return this.cacheKey + '-' + childCount;
  }

  // layout functions
  layout($container) {
    var children = this._getChildren($container),
      htmlContainer = HtmlComponent.get($container),
      containerSize = htmlContainer.availableSize({
        exact: true
      }),
      splitterWithDelta;

    containerSize = containerSize.subtract(htmlContainer.insets());

    splitterWithDelta = children.filter(function(c) {
      return c.layoutData.diff;
    })[0];

    if (splitterWithDelta) {
      this._layoutDelta(children, splitterWithDelta, containerSize);
    } else {
      this._layoutComponents(children, containerSize);
    }
  }

  _getChildren($container) {
    var children = [];
    $container.children().each(function() {
      var htmlChild = HtmlComponent.optGet($(this));
      if (htmlChild) {
        children.push(htmlChild);
      }
    });
    children = children.sort(function(a, b) {
      return (a.layoutData.order || 0) - (b.layoutData.order || 0);
    });
    return children;
  }

  reset() {
    this.childrenLayoutDatas.forEach(function(ld) {
      ld.sizePx = 0;
      ld.initialPx = 0;
      ld.diff = null;
    });
    this.childrenLayoutDatas = [];
  }

  _layoutDelta(children, deltaComp, containerSize) {
    this.ensureInitialValues(children, containerSize);
    var delta = deltaComp.layoutData.diff,
      componentsBefore = children.slice(0, children.indexOf(deltaComp)).reverse(),
      componentsAfter = children.slice(children.indexOf(deltaComp) + 1),
      deltaDiffPrev,
      deltaDiffNext;

    // calculate if the delta can be applied to the previous and following columns
    deltaDiffPrev = _distributeDelta(componentsBefore, delta, false);
    deltaDiffNext = -_distributeDelta(componentsAfter, -delta, false);
    // compute the max delta could be applied

    delta = Math.sign(delta) * (Math.min(Math.abs(delta - deltaDiffPrev), Math.abs(delta - deltaDiffNext)));

    if (delta !== 0) {
      // apply the delta to the previous and following columns
      _distributeDelta(componentsBefore, delta, true);
      _distributeDelta(componentsAfter, -delta, true);
    }

    this._layoutFromLayoutDataWithCache(children, containerSize);

    /* private functions */
    function _distributeDelta(components, delta, applyDelta) {
      return components.reduce(function(diff, c) {
        if (diff !== 0) {
          diff = c.layoutData.acceptDelta(diff, applyDelta);
        }
        return diff;
      }, delta);
    }
  }

  _layoutComponents(children, containerSize) {
    var delta = this.ensureInitialValues(children, containerSize);
    if (delta < 0) {
      this._adjust(children, delta, function(ld) {
        return ld.shrink;
      });
    } else if (delta > 0) {
      this._adjust(children, delta, function(ld) {
        return ld.grow;
      });
    }
    this._layoutFromLayoutDataWithCache(children, containerSize);
  }

  _adjust(children, delta, getWeightFunction) {
    var weightSum,
      deltaFactor,
      layoutDatas = children.map(function(c) {
        return c.layoutData;
      }).filter(function(ld) {
        // resizable
        return ld.acceptDelta(Math.sign(delta)) === 0;
      });

    if (layoutDatas.length < 1) {
      return;
    }

    weightSum = layoutDatas.reduce(function(sum, ld) {
      return sum + getWeightFunction(ld);
    }, 0);

    // delta factor
    deltaFactor = delta / weightSum;
    delta = layoutDatas.reduce(function(delta, ld) {
      return ld.acceptDelta(deltaFactor * getWeightFunction(ld), true);
    }, delta);
    if (Math.abs(delta) > 0.2) {
      this._adjust(children, delta, getWeightFunction);
    }

  }

  _getPreferredSize(htmlComp) {
    var prefSize;
    prefSize = htmlComp.prefSize({
      useCssSize: true
    })
      .add(htmlComp.margins());
    return prefSize;
  }

  ensureInitialValues(children, containerSize) {
    var totalPx = this._getDimensionValue(containerSize),
      sumOfAbsolutePx = 0,
      sumOfRelatives = 0,
      colLayoutDatas = children.map(function(c) {
        return c.layoutData;
      }),
      cachedSizes = this._readCache(children.length) || [];

    // setup initial values
    children.forEach(function(comp, i) {
      var ld = comp.layoutData;

      if (ld.sizePx) {
        sumOfAbsolutePx += ld.sizePx;
      } else if (ld.initial < 0) {
        // use ui height
        ld.initialPx = this._getDimensionValue(this._getPreferredSize(comp));
        sumOfAbsolutePx += ld.initialPx;

      } else if (ld.relative) {
        sumOfRelatives += ld.initial;
      } else {
        ld.initialPx = ld.initial;
        sumOfAbsolutePx += ld.initialPx;
      }

    }.bind(this));

    var relativeFactor = (totalPx - sumOfAbsolutePx) / sumOfRelatives;
    colLayoutDatas.filter(function(ld) {
      return ld.relative && ld.initial > -1 && !ld.sizePx;
    }).reduce(function(restWidth, ld) {
      ld.initialPx = Math.max(30, relativeFactor * ld.initial);
      return restWidth - ld.initialPx;
    }, (totalPx - sumOfAbsolutePx));

    // set px values
    return colLayoutDatas
      .reduce(function(restWidth, ld, i) {
        if (!ld.sizePx) {
          if (cachedSizes[i]) {
            ld.sizePx = ld.validate(Math.round(totalPx * cachedSizes[i]));
          } else {
            ld.sizePx = ld.initialPx;
          }
        }
        this.childrenLayoutDatas.push(ld);
        return restWidth - ld.sizePx;
      }.bind(this), totalPx);

  }

  _layoutFromLayoutDataWithCache(children, containerSize) {
    this._cacheSizes(children, containerSize);
    this._layoutFromLayoutData(children, containerSize);
  }

  _cacheSizes(children, containerSize) {
    var totalPx = this._getDimensionValue(containerSize),
      value;
    value = children.map(function(c) {
      return c.layoutData.sizePx / totalPx;
    });
    this._writeCache(children.length, value);
  }

  // functions differ from row to column mode

  preferredLayoutSizeColumn($container, options) {
    return this._getChildren($container).reduce(function(size, c) {
      var prefSize = this._getPreferredSize(c);
      size.width = Math.max(prefSize.width, size.width);
      size.height += prefSize.height;
      return size;
    }.bind(this), new Dimension(0, 0));
  }

  preferredLayoutSizeRow($container, options) {
    return this._getChildren($container).reduce(function(size, c) {
      var prefSize = this._getPreferredSize(c);
      size.height = Math.max(prefSize.height, size.height);
      size.width += prefSize.width;
      return size;
    }.bind(this), new Dimension(0, 0));
  }

  _getWidth(dimension) {
    return dimension.width;
  }

  _getHeight(dimension) {
    return dimension.height;
  }

  _layoutFromLayoutDataRow(children, containerSize) {
    children.reduce(function(x, comp) {
      var margins = comp.margins();
      var insets = comp.insets();
      var w = comp.layoutData.sizePx;
      var bounds = new Rectangle(x - insets.left - margins.left, 0, w + insets.left + insets.right, containerSize.height);
      comp.setBounds(bounds);
      return x + w;
    }, 0);
  }

  _layoutFromLayoutDataColumn(children, containerSize) {
    children.reduce(function(y, comp) {
      var margins = comp.margins();
      var insets = comp.insets();
      var h = comp.layoutData.sizePx;
      var bounds = new Rectangle(0, y - insets.top - margins.top, containerSize.width, h + insets.top + insets.bottom);
      comp.setBounds(bounds);
      return y + h;
    }, 0);
  }
}
