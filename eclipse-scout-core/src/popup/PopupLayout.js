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
import {AbstractLayout, Dimension, graphics, Insets, Popup, Rectangle, scout} from '../index';

export default class PopupLayout extends AbstractLayout {

  constructor(popup) {
    super();
    this.popup = popup;
    this.doubleCalcPrefSize = true; // enables popups with a height which depends on the width (= popups with wrapping content)
    this.autoPosition = true;
    this.autoSize = true;
  }

  layout($container) {
    if (this.popup.isOpeningAnimationRunning()) {
      this.popup.$container.oneAnimationEnd(this.layout.bind(this, $container));
      return;
    }
    if (this.popup.removalPending || this.popup.removing || !this.popup.rendered) {
      return;
    }
    if (!this.autoSize) {
      // Just layout the popup with the current size
      this._setSize(this.popup.htmlComp.size({exact: true}));
      return;
    }

    var htmlComp = this.popup.htmlComp;
    // Read current bounds before calling pref size, because pref size may change position (_calcMaxSize)
    var currentBounds = graphics.bounds(htmlComp.$comp);
    var prefSize = this.preferredLayoutSize($container, {
      exact: true,
      onlyWidth: this.doubleCalcPrefSize
    });

    prefSize = this.adjustSize(prefSize);
    if (this.doubleCalcPrefSize) {
      prefSize = this.preferredLayoutSize($container, {
        exact: true,
        widthHint: prefSize.width - htmlComp.insets().horizontal()
      });
      prefSize = this.adjustSize(prefSize);
    }

    this._setSize(prefSize);

    if (htmlComp.layouted && this.popup.animateResize) {
      this._resizeAnimated(currentBounds, prefSize);
    }
  }

  _resizeAnimated(currentBounds, prefSize) {
    this._position();
    var htmlComp = this.popup.htmlComp;
    var prefPosition = htmlComp.$comp.position();

    // Preferred size are exact, current bounds are rounded -> round preferred size up to make compare work
    var prefBounds = new Rectangle(prefPosition.left, prefPosition.top, Math.ceil(prefSize.width), Math.ceil(prefSize.height));
    if (currentBounds.equals(prefBounds)) {
      // Bounds did not change -> do nothing
      return;
    }
    htmlComp.$comp
      .stop(true)
      .cssHeight(currentBounds.height)
      .cssWidth(currentBounds.width)
      .cssLeft(currentBounds.x)
      .cssTop(currentBounds.y)
      .animate({
        height: prefSize.height,
        width: prefSize.width,
        left: prefPosition.left,
        top: prefPosition.top
      }, {
        complete: function() {
          if (!this.popup.rendered) {
            return;
          }
          // Ensure the arrow is at the correct position after the animation
          this._position();
        }.bind(this)
      });
  }

  _position(switchIfNecessary) {
    if (this.autoPosition) {
      this.popup.position(switchIfNecessary);
    }
  }

  _setSize(prefSize) {
    graphics.setSize(this.popup.htmlComp.$comp, prefSize);
  }

  adjustSize(prefSize) {
    // Consider CSS min/max rules
    this.popup.htmlComp._adjustPrefSizeWithMinMaxSize(prefSize);

    // Consider window boundaries
    if (this.popup.boundToAnchor && (this.popup.anchorBounds || this.popup.$anchor)) {
      return this._adjustSizeWithAnchor(prefSize);
    }
    return this._adjustSize(prefSize);
  }

  _adjustSize(prefSize) {
    var popupSize = new Dimension(),
      maxSize = this._calcMaxSize();

    // Ensure the popup is not larger than max size
    popupSize.width = Math.min(maxSize.width, prefSize.width);
    popupSize.height = Math.min(maxSize.height, prefSize.height);

    return popupSize;
  }

  /**
   * Considers window boundaries.
   *
   * @returns {Dimension}
   */
  _calcMaxSize() {
    if (this.popup.repositionEnabled) {
      // Position the popup at the desired location before doing any calculations to consider the preferred bounds
      this._position(false);
    }

    var maxWidth, maxHeight,
      htmlComp = this.popup.htmlComp,
      windowPaddingX = this.popup.windowPaddingX,
      windowPaddingY = this.popup.windowPaddingY,
      popupMargins = htmlComp.margins(),
      windowSize = this.popup.getWindowSize();

    maxWidth = (windowSize.width - popupMargins.horizontal() - windowPaddingX);
    maxHeight = (windowSize.height - popupMargins.vertical() - windowPaddingY);

    return new Dimension(maxWidth, maxHeight);
  }

  _adjustSizeWithAnchor(prefSize) {
    var popupSize = new Dimension(),
      maxSize = this._calcMaxSizeAroundAnchor(),
      windowSize = this._calcMaxSize(),
      Alignment = Popup.Alignment,
      horizontalAlignment = this.popup.horizontalAlignment,
      verticalAlignment = this.popup.verticalAlignment;

    // Compared to $comp.height() and width(), $comp.offset() may return fractional values. This means the maxSizes may be fractional as well.
    // The popup sizes must be integers, otherwise reading the height/width later on might result in wrong calculations.
    // This is especially important for the position calculation.
    // Popup.position() uses popup.overlap(), if the popup height is lets say 90.5, overlapY would be 0.5 because height returned 91
    // -> the popup switches its direction unnecessarily
    maxSize = maxSize.floor();

    // Decide whether the prefSize can be used or the popup needs to be shrinked so that it fits into the viewport
    // The decision is based on the preferred opening direction
    // Example: The popup would like to be opened leftedge and bottom
    // If there is enough space on the right and on the bottom -> pref size is used
    // If there is not enough space on the right it checks whether there is enough space on the left
    // If there is enough space on the left -> use preferred width -> The opening direction will be switched using position() at the end
    // If there is not enough space on the left as well, the greater width is used -> Position() will either switch the direction or not, depending on the size of the popup
    // The same happens for y direction if there is not enough space on the bottom
    popupSize.width = prefSize.width;
    if (this.popup.trimWidth) {
      if (this.popup.horizontalSwitch) {
        if (prefSize.width > maxSize.right && prefSize.width > maxSize.left) {
          popupSize.width = Math.max(maxSize.right, maxSize.left);
        }
      } else {
        if (horizontalAlignment === Alignment.RIGHT) {
          popupSize.width = Math.min(popupSize.width, maxSize.right);
        } else if (horizontalAlignment === Alignment.LEFT) {
          popupSize.width = Math.min(popupSize.width, maxSize.left);
        } else {
          popupSize.width = Math.min(popupSize.width, windowSize.width);
        }
      }
    }
    popupSize.height = prefSize.height;
    if (this.popup.trimHeight) {
      if (this.popup.verticalSwitch) {
        if (prefSize.height > maxSize.bottom && prefSize.height > maxSize.top) {
          popupSize.height = Math.max(maxSize.bottom, maxSize.top);
        }
      } else {
        if (verticalAlignment === Alignment.BOTTOM) {
          popupSize.height = Math.min(popupSize.height, maxSize.bottom);
        } else if (verticalAlignment === Alignment.TOP) {
          popupSize.height = Math.min(popupSize.height, maxSize.top);
        } else {
          popupSize.height = Math.min(popupSize.height, windowSize.height);
        }
      }
    }

    // On CENTER alignment, the anchor must ne be considered. Instead make sure the popup does not exceed window boundaries (same as in adjustSize)
    if (verticalAlignment === Alignment.CENTER || horizontalAlignment === Alignment.CENTER) {
      if (horizontalAlignment === Alignment.CENTER) {
        popupSize.width = Math.min(windowSize.width, prefSize.width);
      }
      if (verticalAlignment === Alignment.CENTER) {
        popupSize.height = Math.min(windowSize.height, prefSize.height);
      }
    }

    return popupSize;
  }

  /**
   * Considers window boundaries.
   *
   * @returns {Insets}
   */
  _calcMaxSizeAroundAnchor() {
    if (this.popup.repositionEnabled) {
      // Position the popup at the desired location before doing any calculations because positioning adds CSS classes which might change margins
      this._position(false);
    }

    var maxWidthLeft, maxWidthRight, maxHeightDown, maxHeightUp,
      htmlComp = this.popup.htmlComp,
      windowPaddingX = this.popup.windowPaddingX,
      windowPaddingY = this.popup.windowPaddingY,
      popupMargins = htmlComp.margins(),
      anchorBounds = this.popup.getAnchorBounds(),
      windowSize = this.popup.getWindowSize(),
      horizontalAlignment = this.popup.horizontalAlignment,
      verticalAlignment = this.popup.verticalAlignment,
      Alignment = Popup.Alignment;

    if (scout.isOneOf(horizontalAlignment, Alignment.LEFTEDGE, Alignment.RIGHTEDGE)) {
      maxWidthRight = windowSize.width - anchorBounds.x - popupMargins.horizontal() - windowPaddingX;
      maxWidthLeft = anchorBounds.right() - popupMargins.horizontal() - windowPaddingX;
    } else { // LEFT or RIGHT
      maxWidthRight = windowSize.width - anchorBounds.right() - popupMargins.horizontal() - windowPaddingX;
      maxWidthLeft = anchorBounds.x - popupMargins.horizontal() - windowPaddingX;
    }

    if (scout.isOneOf(verticalAlignment, Alignment.BOTTOMEDGE, Alignment.TOPEDGE)) {
      maxHeightDown = windowSize.height - anchorBounds.y - popupMargins.vertical() - windowPaddingY;
      maxHeightUp = anchorBounds.bottom() - popupMargins.vertical() - windowPaddingY;
    } else { // BOTTOM or TOP
      maxHeightDown = windowSize.height - anchorBounds.bottom() - popupMargins.vertical() - windowPaddingY;
      maxHeightUp = anchorBounds.y - popupMargins.vertical() - windowPaddingY;
    }

    return new Insets(maxHeightUp, maxWidthRight, maxHeightDown, maxWidthLeft);
  }
}
