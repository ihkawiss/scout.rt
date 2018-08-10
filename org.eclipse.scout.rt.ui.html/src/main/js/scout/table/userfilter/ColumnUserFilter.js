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
scout.ColumnUserFilter = function() {
  scout.ColumnUserFilter.parent.call(this);
  this.filterType = scout.ColumnUserFilter.Type;
  this.events = new scout.EventSupport();

  /**
   * This property is used to check early whether or not this filter can produce filter-fields.
   * Set this property to true in your sub-class, if it creates filter fields.
   */
  this.hasFilterFields = false;

  /**
   * array of (normalized) key, text composite
   */
  this.availableValues = [];

  /**
   * array of (normalized) keys
   */
  this.selectedValues = [];
};
scout.inherits(scout.ColumnUserFilter, scout.TableUserFilter);

scout.ColumnUserFilter.Type = 'column';

scout.ColumnUserFilter.prototype.axisGroup = function() {
  return scout.TableMatrix.NumberGroup.COUNT;
};

scout.ColumnUserFilter.prototype.calculate = function() {
  var containsSelectedValue, reorderAxis;

  this.matrix = new scout.TableMatrix(this.table, this.session);
  this.matrix.addData(this.column, scout.TableMatrix.NumberGroup.COUNT);
  this.xAxis = this.matrix.addAxis(this.column, this.axisGroup());
  var cube = this.matrix.calculate();

  this.selectedValues.forEach(function(selectedValue) {
    containsSelectedValue = false;
    if (this._useTextInsteadOfNormValue(selectedValue)) {
      // selected value was not normalized -> normalize
      selectedValue = this.xAxis.norm(selectedValue);
    }
    this.xAxis.some(function(key) {
      if (key === selectedValue) {
        containsSelectedValue = true;
        return true;
      }
    }, this);

    if (!containsSelectedValue) {
      this.xAxis.push(selectedValue);
      reorderAxis = true;
    }
  }, this);

  if (reorderAxis) {
    this.xAxis.reorder();
  }

  var text, displayKey, cubeValue, iconId;
  this.availableValues = [];
  this.xAxis.forEach(function(key) {
    displayKey = key;
    text = this.xAxis.format(key);
    iconId = null;
    if (this._useTextInsteadOfNormValue(key)) {
      displayKey = text;
    }
    if (key !== null && this.xAxis.textIsIcon) {
      // Only display icon if textIsIcon (still display empty text if key is null)
      iconId = text;
      text = null;
    }
    cubeValue = cube.getValue([key]);
    this.availableValues.push({
      key: displayKey,
      text: text,
      iconId: iconId,
      count: cubeValue ? cubeValue[0] : 0
    });
  }, this);
};

/**
 * In case of text columns, the normalized key generated by the matrix is not deterministic,
 * it depends on the table data -> use the text. In the other cases it is possible to use the
 * normalized key which has the advantage that it is locale independent.
 */
scout.ColumnUserFilter.prototype._useTextInsteadOfNormValue = function(value) {
  return false;
};

/**
 * @override TableUserFilter.js
 */
scout.ColumnUserFilter.prototype.createFilterAddedEventData = function() {
  var data = scout.ColumnUserFilter.parent.prototype.createFilterAddedEventData.call(this);
  data.columnId = this.column.id;
  data.selectedValues = this.selectedValues;
  return data;
};

scout.ColumnUserFilter.prototype.createFilterRemovedEventData = function() {
  var data = scout.ColumnUserFilter.parent.prototype.createFilterRemovedEventData.call(this);
  data.columnId = this.column.id;
  return data;
};

scout.ColumnUserFilter.prototype.createLabel = function() {
  if (this.column.headerHtmlEnabled) {
    var plainText = scout.strings.plainText(this.column.text);
    return plainText.replace(/\n/g, ' ');
  }
  return this.column.text || '';
};

scout.ColumnUserFilter.prototype.createKey = function() {
  return this.column.id;
};

scout.ColumnUserFilter.prototype.accept = function(row) {
  if (!this.xAxis) {
    // Lazy calculation. It is not possible on init, because the table is not rendered yet.
    this.calculate();
  }
  var
    acceptByTable = true,
    acceptByFields = true,
    key = this.column.cellValueOrTextForCalculation(row),
    normKey = this.xAxis.norm(key);

  if (this._useTextInsteadOfNormValue(normKey)) {
    normKey = this.xAxis.format(normKey);
  }
  if (this.tableFilterActive()) {
    acceptByTable = this.selectedValues.indexOf(normKey) > -1;
  }
  if (this.fieldsFilterActive()) {
    acceptByFields = this.acceptByFields(key, normKey, row);
  }

  return acceptByTable && acceptByFields;
};

scout.ColumnUserFilter.prototype.filterActive = function() {
  return this.tableFilterActive() || this.fieldsFilterActive();
};

scout.ColumnUserFilter.prototype.tableFilterActive = function() {
  return this.selectedValues.length > 0;
};

scout.ColumnUserFilter.prototype.triggerFilterFieldsChanged = function(event) {
  this.events.trigger('filterFieldsChanged', event);
};

scout.ColumnUserFilter.prototype.on = function(type, func) {
  this.events.on(type, func);
};

scout.ColumnUserFilter.prototype.off = function(type, func) {
  this.events.off(type, func);
};

/**
 * Returns whether or not the given key is accepted by the filter-fields in their current state.
 * The default impl. returns true.
 */
scout.ColumnUserFilter.prototype.acceptByFields = function(key, normKey, row) {
  return true;
};

/**
 * Returns whether or not filter-fields have an effect on the column-filter in their current state.
 * The default impl. returns false.
 */
scout.ColumnUserFilter.prototype.fieldsFilterActive = function() {
  return false;
};

/**
 * Adds filter fields for this type of column filter.
 * The default impl. adds no fields.
 *
 * @param groupBox FilterFieldsGroupBox
 */
scout.ColumnUserFilter.prototype.addFilterFields = function(groupBox) {
  // NOP
};

/**
 * Called after filter group-box has been rendered. Gives the filter impl. a chance to
 * modify the rendered fields. The default impl. does nothing.
 */
scout.ColumnUserFilter.prototype.modifyFilterFields = function() {
  // NOP
};

/**
 * Returns the title displayed above the filter fields.
 * The default impl. returns a null value, which means the title is not displayed.
 */
scout.ColumnUserFilter.prototype.filterFieldsTitle = function() {
  return null;
};

scout.ColumnUserFilter.prototype.createComparator = function() {
  return scout.comparators.NUMERIC;
};
