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
scout.PopupWithHeadLayout = function(popup) {
  scout.PopupWithHeadLayout.parent.call(this, popup);
  this.popup = popup;
};
scout.inherits(scout.PopupWithHeadLayout, scout.PopupLayout);

scout.PopupWithHeadLayout.prototype.layout = function($container) {
  scout.PopupWithHeadLayout.parent.prototype.layout.call(this, $container);
  var htmlComp = this.popup.htmlComp,
    popupSize = htmlComp.getSize();

  // Set size of body
  popupSize = popupSize.subtract(htmlComp.getInsets());
  scout.graphics.setSize(this.popup.$body, popupSize);

  if (this.popup.$body.data('scrollable')) {
    scout.scrollbars.update(this.popup.$body);
  }
};

/**
 * @override
 */
scout.PopupWithHeadLayout.prototype._calcMaxSizes = function() {
  // Position the popup at the desired location before doing any calculations,
  // but do no try to switch the position if there is not enough space
  this.popup.position(false);

  var maxWidthLeft, maxWidthRight, maxHeightDown, maxHeightUp,
    htmlComp = this.popup.htmlComp,
    windowPaddingX = this.popup.windowPaddingX,
    windowPaddingY = this.popup.windowPaddingY,
    popupBounds = scout.graphics.offsetBounds(htmlComp.$comp),
    popupMargins = htmlComp.getMargins(),
    popupHeadSize = new scout.Dimension(0, 0),
    $window = this.popup.$container.window(),
    windowSize = new scout.Dimension($window.width(), $window.height());

  if (this.popup.$head) {
    popupHeadSize = scout.graphics.getSize(this.popup.$head);
  }

  maxWidthRight = (windowSize.width - popupBounds.x - windowPaddingX);
  maxWidthLeft = (popupBounds.x + popupHeadSize.width - popupMargins.horizontal() - windowPaddingX);
  maxHeightDown = (windowSize.height - popupBounds.y - windowPaddingY);
  // head height is irrelevant because popup has a margin as height as the header
  maxHeightUp = (popupBounds.y - popupMargins.vertical() - windowPaddingY);

  return new scout.Insets(maxHeightUp, maxWidthRight, maxHeightDown, maxWidthLeft);
};

scout.PopupWithHeadLayout.prototype.preferredLayoutSize = function($container) {
  var htmlComp = this.popup.htmlComp,
    prefSize;

  prefSize = scout.graphics.prefSize(this.popup.$body, true)
    .add(htmlComp.getInsets());

  return prefSize;
};
