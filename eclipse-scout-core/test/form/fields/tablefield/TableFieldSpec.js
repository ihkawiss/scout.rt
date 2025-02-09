/*
 * Copyright (c) 2010-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {TableRow} from '../../../../src/index';
import {FormSpecHelper, TableSpecHelper} from '../../../../src/testing/index';

describe('TableField', function() {
  var session;
  var helper;
  /** @type {TableSpecHelper} */
  var tableHelper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    tableHelper = new TableSpecHelper(session);
    helper = new FormSpecHelper(session);
    $.fx.off = true;
    jasmine.Ajax.install();
    jasmine.clock().install();
  });

  afterEach(function() {
    session = null;
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
    $.fx.off = false;
  });

  function createTableFieldWithTable() {
    var table = createTableModel(2, 2);
    return createTableField({table: table});
  }

  function createTableField(tableModel) {
    return helper.createField('TableField', session.desktop, tableModel);
  }

  function createTable(colCount, rowCount) {
    return tableHelper.createTable(createTableModel(colCount, rowCount));
  }

  function createTableModel(colCount, rowCount) {
    return tableHelper.createModelFixture(colCount, rowCount);
  }

  describe('property table', function() {

    it('shows (renders) the table if the value is set', function() {
      var table = createTable(2, 2);
      var tableField = createTableField();
      tableField.render();

      expect(tableField.table).toBeUndefined();
      tableField.setTable(table);
      expect(tableField.table.rendered).toBe(true);

      // Field is necessary for the FormFieldLayout
      expect(tableField.$field).toBeTruthy();
    });

    it('destroys the table if value is changed to null', function() {
      var tableField = createTableFieldWithTable();
      var table = tableField.table;
      tableField.render();
      expect(table.rendered).toBe(true);
      expect(table.owner).toBe(tableField);
      expect(table.parent).toBe(tableField);

      tableField.setTable(null);
      expect(tableField.table).toBeFalsy();
      expect(tableField.$field).toBeFalsy();
      expect(table.rendered).toBe(false);
      expect(table.destroyed).toBe(true);
      expect(session.getModelAdapter(table.id)).toBeFalsy();
    });

    it('table gets class \'field\' to make it work with the form field layout', function() {
      var tableField = createTableFieldWithTable();
      tableField.render();

      expect(tableField.table.$container).toHaveClass('field');
    });

    it('table gets class \'field\' to make it work with the form field layout (also when table is set later)', function() {
      var table = createTable(2, 2);
      var tableField = createTableField();
      tableField.render();

      expect(tableField.table).toBeUndefined();
      tableField.setTable(table);
      expect(tableField.table.$container).toHaveClass('field');
    });
  });

  describe('requiresSave', function() {

    var tableField, firstRow;

    beforeEach(function() {
      tableField = createTableFieldWithTable();
      firstRow = tableField.table.rows[0];
      expect(tableField.requiresSave).toBe(false);
    });

    it('should require save when row has been updated', function() {
      tableField.table.updateRow(firstRow);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false); // <-- no change yet (because value was not changed)

      tableField.table.columns[0].setCellValue(firstRow, 77);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(true);
    });

    it('does not create a memory leak if same row is updated multiple times', function() {
      tableField.table.columns[0].setCellValue(firstRow, 77);
      tableField.table.updateRow(firstRow);
      tableField.updateRequiresSave();
      expect(Object.keys(tableField._updatedRows).length).toBe(1);

      tableField.table.columns[0].setCellValue(firstRow, 88);
      tableField.table.updateRow(firstRow);
      tableField.updateRequiresSave();
      expect(Object.keys(tableField._updatedRows).length).toBe(1);
    });

    it('should require save when row has been deleted', function() {
      tableField.table.deleteRow(firstRow);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(true);
    });

    it('should require save when row has been inserted', function() {
      var rowModel = tableHelper.createModelRow('new', ['foo', 'bar']);
      tableField.table.insertRow(rowModel);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(true);
    });

    it('should NOT require save when row has been inserted and deleted again', function() {
      var rowModel = tableHelper.createModelRow('new', ['foo', 'bar']);
      tableField.table.insertRow(rowModel);
      var insertedRow = tableField.table.rowsMap['new'];
      tableField.table.deleteRow(insertedRow);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false);
    });

    it('should NOT require save when row has been inserted and deleted again even if it was updated or checked in the meantime', function() {
      var rowModel = tableHelper.createModelRow('new', ['foo', 'bar']);
      tableField.table.insertRow(rowModel);
      var insertedRow = tableField.table.rowsMap['new'];
      tableField.table.updateRow(insertedRow);
      tableField.table.checkRow(insertedRow);
      tableField.table.deleteRow(insertedRow);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false);
    });

    it('should require save when row has been checked', function() {
      tableField.table.setProperty('checkable', true);
      tableField.table.checkRow(firstRow);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(true);
    });

    it('should NOT require save when row has been checked and unchecked again', function() {
      tableField.table.setProperty('checkable', true);
      tableField.table.checkRow(firstRow);
      tableField.table.uncheckRow(firstRow);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false);
    });

    it('should require save after a cell edit.', function() {
      tableField.render();
      tableField.table.columns[0].setEditable(true);
      tableField.markAsSaved();
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false);
      tableField.table.prepareCellEdit(tableField.table.columns[0], tableField.table.rows[0]);
      jasmine.clock().tick();
      tableField.table.cellEditorPopup.cell.field.setValue('my new value');
      tableField.table.completeCellEdit();
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(true);
    });

    it('should NOT require save open and close cell editor without any text change.', function() {
      tableField.render();
      tableField.table.columns[0].setEditable(true);
      tableField.markAsSaved();
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false);
      tableField.table.prepareCellEdit(tableField.table.columns[0], tableField.table.rows[0]);
      jasmine.clock().tick();
      tableField.table.completeCellEdit();
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false);
    });

    it('resets row status on markAsSaved', function() {
      expect(firstRow.status).toBe(TableRow.Status.NON_CHANGED);
      expect(tableField.requiresSave).toBe(false);

      tableField.table.columns[0].setCellValue(firstRow, 77);
      expect(firstRow.status).toBe(TableRow.Status.UPDATED);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(true);

      tableField.markAsSaved();
      expect(firstRow.status).toBe(TableRow.Status.NON_CHANGED);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false);

      tableField.table.insertRow({
        cells: [null, null]
      });
      var lastRow = tableField.table.rows[tableField.table.rows.length - 1];
      expect(lastRow.status).toBe(TableRow.Status.INSERTED);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(true);

      tableField.markAsSaved();
      expect(lastRow.status).toBe(TableRow.Status.NON_CHANGED);
      tableField.updateRequiresSave();
      expect(tableField.requiresSave).toBe(false);
    });

  });
});
