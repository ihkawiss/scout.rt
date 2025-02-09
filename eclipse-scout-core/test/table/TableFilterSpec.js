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
import {Range, RemoteEvent, Table} from '../../src/index';
import {TableSpecHelper} from '../../src/testing/index';

describe('TableFilter', function() {
  var session;
  var helper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new TableSpecHelper(session);
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

  function createColumnFilterModel(columnId, selectedValues) {
    return {
      objectType: 'TextColumnUserFilter',
      column: columnId,
      selectedValues: selectedValues
    };
  }

  function createAndRegisterColumnFilter(table, column, selectedValues) {
    return helper.createAndRegisterColumnFilter({
      table: table,
      session: session,
      column: column,
      selectedValues: selectedValues
    }, session);
  }

  describe('row filtering', function() {

    it('applies row filter when table gets initialized', function() {
      var model = helper.createModelFixture(2, 2);
      var filter = createColumnFilterModel(model.columns[0].id, ['1_0']);
      model.filters = [filter];
      var table = helper.createTable(model);

      var filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(1);
      expect(filteredRows[0]).toBe(table.rows[1]);
    });

    it('doesn\'t filter anymore if filter gets removed', function() {
      var model = helper.createModelFixture(2, 2);
      var filter = createColumnFilterModel(model.columns[0].id, ['1_0']);
      model.filters = [filter];
      var table = helper.createTable(model);

      var filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(1);
      expect(filteredRows[0]).toBe(table.rows[1]);

      table.removeFilterByKey(filter.column.id);
      table.filter();

      filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(2);
    });

    it('applies row filter if a new row gets inserted', function() {
      var model = helper.createModelFixture(2, 2),
        table = helper.createTable(model),
        column0 = table.columns[0];

      createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();
      table.render();
      expect(table.filteredRows().length).toBe(1);

      var rows = helper.createModelRows(2, 1);
      rows[0].cells[0].text = 'new';
      table.insertRows(rows);

      var filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(1);
      expect(table.rows[2].filterAccepted).toBe(false);
      expect(table.rows[2].$row).toBeFalsy();

      rows = helper.createModelRows(2, 1);
      rows[0].cells[0].text = '1_0';
      table.insertRows(rows);

      filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(2);
      expect(filteredRows[0]).toBe(table.rows[1]);
      expect(filteredRows[1]).toBe(table.rows[3]);
    });

    it('applies row filter if a new row gets inserted, even if table is not rendered', function() {
      var model = helper.createModelFixture(2, 2),
        table = helper.createTable(model),
        column0 = table.columns[0];

      createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();
      expect(table.filteredRows().length).toBe(1);

      var rows = helper.createModelRows(2, 1);
      rows[0].cells[0].value = 'newCell';
      table.insertRows(rows);

      var filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(1);
      expect(table.rows[2].filterAccepted).toBe(false);
      expect(table.rows[2].$row).toBeFalsy();

      table.render();
      expect(table.rows[2].$row).toBeFalsy();
    });

    // and insert rows

    it('applies row filter if a row gets updated', function() {
      var model = helper.createModelFixture(2, 2),
        table = helper.createTable(model),
        column0 = table.columns[0],
        row1 = table.rows[1];

      // expects 1 row to be visible
      createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();
      table.render();
      expect(table.filteredRows().length).toBe(1);
      expect(table.rows[0].$row).toBeFalsy();
      expect(table.rows[1].$row).toBeTruthy();

      var rows = helper.createModelRows(2, 1);
      rows[0].id = row1.id;
      rows[0].cells[0].text = 'updated';
      table.updateRows(rows);

      // expects no row to be visible
      var filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(0);
      expect(table.rows[0].$row).toBeFalsy();
      expect(table.rows[1].$row).toBeFalsy();

      rows = helper.createModelRows(2, 1);
      rows[0].id = row1.id;
      rows[0].cells[0].text = '1_0';
      table.updateRows(rows);

      // expects 1 row to be visible
      filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(1);
      expect(filteredRows[0]).toBe(table.rows[1]);
      expect(table.rows[0].$row).toBeFalsy();
      expect(table.rows[1].$row).toBeTruthy();

      // change cell 2 of row 1, filter state should not change
      rows = helper.createModelRows(2, 1);
      rows[0].id = row1.id;
      rows[0].cells[0].text = '1_0';
      rows[0].cells[1].text = '1_1';
      table.updateRows(rows);

      // still expects 1 row to be visible
      filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(1);
      // if this check fails, filteredRow cache has not been updated
      expect(filteredRows[0]).toBe(table.rows[1]);
      expect(table.rows[0].$row).toBeFalsy();
      expect(table.rows[1].$row).toBeTruthy();
    });

    it('applies row filter if a row gets updated, even if table is not rendered', function() {
      var model = helper.createModelFixture(2, 2),
        table = helper.createTable(model),
        column0 = table.columns[0],
        row1 = table.rows[1];

      // expects 1 row to be visible
      createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();
      expect(table.filteredRows().length).toBe(1);

      var rows = helper.createModelRows(2, 1);
      rows[0].id = row1.id;
      rows[0].cells[0].text = 'updated';
      table.updateRows(rows);

      // expects no row to be visible
      var filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(0);
      expect(table.rows[0].$row).toBeFalsy();
      expect(table.rows[1].$row).toBeFalsy();

      table.render();
      expect(table.rows[0].$row).toBeFalsy();
      expect(table.rows[1].$row).toBeFalsy();
    });

    it('properly handles successive row insertion and updates', function() {
      var model = helper.createModelFixture(2, 2),
        table = helper.createTable(model),
        column0 = table.columns[0];

      // expects 1 row to be visible
      createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();
      table.render();
      expect(table.filteredRows().length).toBe(1);

      // insert new row -> not visible
      var rows = helper.createModelRows(2, 1);
      rows[0].cells[0].text = 'new';
      table.insertRows(rows);

      var filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(1);
      expect(table.rows[2].filterAccepted).toBe(false);
      expect(table.rows[2].$row).toBeFalsy();

      // update new row -> still not visible
      rows = helper.createModelRows(2, 1);
      rows[0].id = table.rows[2].id;
      rows[0].cells[0].text = 'updated';
      table.updateRows(rows);

      filteredRows = table.filteredRows();
      expect(filteredRows.length).toBe(1);
      expect(table.rows[2].filterAccepted).toBe(false);
      expect(table.rows[2].$row).toBeFalsy();
    });

    it('properly handles reset table case', function() {
      var model = helper.createModelFixture(2, 2),
        table = helper.createTable(model),
        column0 = table.columns[0];

      // Filter active
      createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();
      table.render();
      expect(table._filterCount()).toBe(1);
      expect(table.rows.length).toBe(2);
      expect(table.filteredRows().length).toBe(1);
      expect(table.$rows().length).toBe(1);

      // Delete all rows
      table.deleteAllRows();
      expect(table.rows.length).toBe(0);
      expect(table.filteredRows().length).toBe(0);
      expect(table.$rows().length).toBe(0);

      // Remove filters
      table.setFilters([]);
      expect(table._filterCount()).toBe(0);

      // Insert rows again
      var rows = helper.createModelRows(2, 2);
      table.insertRows(rows);
      expect(table.rows.length).toBe(2);
      expect(table.filteredRows().length).toBe(2);
      expect(table.$rows().length).toBe(2);
    });

    it('considers view range', function() {
      var model = helper.createModelFixture(2, 7),
        table = helper.createTable(model),
        column0 = table.columns[0];

      table.viewRangeSize = 1;

      // expects 1 row to be visible
      createAndRegisterColumnFilter(table, column0, ['1_0', '3_0']);
      table.filter();
      table.render();

      expect(table.rows.length).toBe(7);
      expect(table.filteredRows().length).toBe(2);
      expect(table.$rows().length).toBe(1); // only one row in view range
      expect(table.$rows().eq(0).data('row')).toBe(table.filteredRows()[0]);

      // Use last filtered row as base row index
      spyOn(table, '_calculateCurrentViewRange').and.returnValue(new Range(1, 2));
      table._renderViewport();

      expect(table.$rows().length).toBe(1); // only one row in view range
      expect(table.$rows().eq(0).data('row')).toBe(table.filteredRows()[1]);
    });

    it('renders empty data if all rows are removed due to filtering', function() {
      var model = helper.createModelFixture(2, 7),
        table = helper.createTable(model),
        column0 = table.columns[0];

      table.render();
      expect(table.$emptyData).toBe(null);

      createAndRegisterColumnFilter(table, column0, ['asdf']);
      table.filter();

      expect(table.rows.length).toBe(7);
      expect(table.filteredRows().length).toBe(0);
      expect(table.$rows().length).toBe(0);
      expect(table.$emptyData).toBeDefined();

      createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();
      expect(table.$emptyData).toBe(null);

      table.resetUserFilter();
      expect(table.$emptyData).toBe(null);
      expect(table.$rows().length).toBe(7);
    });

  });

  describe('selection', function() {

    it('gets removed for non visible rows after filtering', function() {
      var model = helper.createModelFixture(2, 2),
        table = helper.createTable(model),
        column0 = table.columns[0];

      table.render();
      table.selectAll();
      expect(table.selectedRows.length).toBe(2);

      createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();

      expect(table.selectedRows.length).toBe(1);
      expect(table.selectedRows[0]).toBe(table.rows[1]);
    });

    it('stays removed even if filtered row is selected explicitly', function() {
      var model = helper.createModelFixture(2, 2),
        table = helper.createTable(model),
        column0 = table.columns[0];

      // Initially, no rows are selected
      table.render();
      expect(table.rows.length).toBe(2);
      expect(table.filteredRows().length).toBe(2);
      expect(table.selectedRows.length).toBe(0);

      // Add a filter that hides the first row (still no rows selected)
      var filter = createAndRegisterColumnFilter(table, column0, ['1_0']);
      table.filter();
      expect(table.rows.length).toBe(2);
      expect(table.filteredRows().length).toBe(1);
      expect(table.selectedRows.length).toBe(0);

      // Explicitly select the first row (currently invisible), expect still no selected row
      table.selectRows(table.rows[0]);
      expect(table.rows.length).toBe(2);
      expect(table.filteredRows().length).toBe(1);
      expect(table.selectedRows.length).toBe(0);

      // Remove the filter again (still no selection)
      table.removeFilter(filter);
      table.filter();
      expect(table.rows.length).toBe(2);
      expect(table.filteredRows().length).toBe(2);
      expect(table.selectedRows.length).toBe(0);

      // Now select the first row again, this time the selection should change
      table.selectRows(table.rows[0]);
      expect(table.rows.length).toBe(2);
      expect(table.filteredRows().length).toBe(2);
      expect(table.selectedRows.length).toBe(1);
      expect(table.selectedRows[0]).toBe(table.rows[0]);
    });

    it('gets removed for non visible rows after filtering if a row has been updated', function() {
      var model = helper.createModelFixture(2, 3),
        table = helper.createTable(model),
        column0 = table.columns[0],
        row1 = table.rows[1];

      createAndRegisterColumnFilter(table, column0, ['1_0', '2_0']);
      table.filter();
      table.render();
      table.selectAll();
      expect(table.selectedRows.length).toBe(2);
      expect(table.selectedRows[0]).toBe(table.rows[1]);
      expect(table.selectedRows[1]).toBe(table.rows[2]);

      // updateRows applies filter which should consider selection removal
      var rows = helper.createModelRows(2, 1);
      rows[0].id = row1.id;
      rows[0].cells[0].text = 'updated';
      table.updateRows(rows);

      expect(table.selectedRows.length).toBe(1);
      expect(table.selectedRows[0]).toBe(table.rows[2]);
    });

    it('gets restored for visible rows after filtering', function() {
      var model = helper.createModelSingleColumnByValues([5, 2, 1, 3, 4], 'NumberColumn'),
        table = helper.createTable(model),
        rows = table.rows;
      table._animationRowLimit = 0;
      table.render();

      var $rows = table.$rows();
      var $row0 = $rows.eq(0);
      var $row1 = $rows.eq(1);
      var $row2 = $rows.eq(2);
      var $row3 = $rows.eq(3);
      var $row4 = $rows.eq(4);

      expect([$row0, $row1, $row2, $row3, $row4]).not.anyToHaveClass('selected');

      table.selectRows([rows[1], rows[2], rows[3]]);

      // before filtering
      expect([$row1, $row2, $row3]).allToHaveClass('selected');
      expect($row1).toHaveClass('select-top');
      expect($row2).toHaveClass('select-middle');
      expect($row3).toHaveClass('select-bottom');

      expect([$row0, $row4]).not.anyToHaveClass('selected');
      expect([$row0, $row2, $row3, $row4]).not.anyToHaveClass('select-top');
      expect([$row0, $row1, $row3, $row4]).not.anyToHaveClass('select-middle');
      expect([$row0, $row1, $row2, $row4]).not.anyToHaveClass('select-bottom');
      expect([$row0, $row1, $row2, $row3, $row4]).not.anyToHaveClass('select-single');

      // filter table (descending)
      table.addFilter({
        createKey: function() {
          return 1;
        },
        accept: function(row) {
          return row.$row.text() % 2 === 0;
        }
      });
      table.filter();

      // after filtering
      $rows = table.$rows();
      expect($rows.eq(0)).toHaveClass('selected');
      expect($rows.eq(0)).toHaveClass('select-single');
      expect($rows.eq(1)).not.toHaveClass('selected');
      expect($rows.eq(1)).not.toHaveClass('select-single');
      expect($rows.eq(1)).not.toHaveClass('select-top');
    });

  });

  describe('events', function() {

    describe('filter', function() {
      var listener = {
        _onFilter: function() {
        }
      };

      it('gets fired when table with a filter is initializing', function() {
        var model = helper.createModelFixture(2, 2);
        var table = new Table();
        var filter = createColumnFilterModel(model.columns[0].id, ['cell1_0']);
        model.filters = [filter];

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        table.init(model);
        expect(listener._onFilter).toHaveBeenCalled();
      });

      it('does not get fired when table with no filters is initializing', function() {
        var model = helper.createModelFixture(2, 2);
        var table = new Table();

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        table.init(model);
        expect(listener._onFilter).not.toHaveBeenCalled();
      });

      it('gets fired if filter() is called', function() {
        var model = helper.createModelFixture(2, 2),
          table = helper.createTable(model),
          column0 = table.columns[0];

        table.render();

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();

        expect(listener._onFilter).toHaveBeenCalled();
      });

      it('gets fired if filter() is called, even if table is not rendered', function() {
        var model = helper.createModelFixture(2, 2),
          table = helper.createTable(model),
          column0 = table.columns[0];

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();

        expect(listener._onFilter).toHaveBeenCalled();
      });

      it('gets not fired if rows are filtered again but the filtered rows have not changed', function() {
        var model = helper.createModelFixture(2, 2),
          table = helper.createTable(model),
          column0 = table.columns[0];

        table.render();

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);
        table.filter();

        expect(listener._onFilter).not.toHaveBeenCalled();
      });

      it('gets fired if rows are filtered during updateRows', function() {
        var model = helper.createModelFixture(2, 2),
          table = helper.createTable(model),
          column0 = table.columns[0],
          row1 = table.rows[1];

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();
        table.render();

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        var rows = helper.createModelRows(2, 1);
        rows[0].id = row1.id;
        rows[0].cells[0].text = 'updated';
        table.updateRows(rows);

        expect(table.filteredRows().length).toBe(0);
        expect(listener._onFilter).toHaveBeenCalled();
      });

      it('gets fired if rows are filtered during insertRows', function() {
        var model = helper.createModelFixture(2, 2),
          table = helper.createTable(model),
          column0 = table.columns[0];

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();
        table.render();
        expect(table.filteredRows().length).toBe(1);

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        var rows = helper.createModelRows(2, 1);
        rows[0].cells[0].text = '1_0';
        table.insertRows(rows);

        expect(table.filteredRows().length).toBe(2);
        expect(listener._onFilter).toHaveBeenCalled();

        rows = helper.createModelRows(2, 1);
        rows[0].cells[0].value = 'wont accept';
        table.insertRows(rows);

        expect(table.filteredRows().length).toBe(2);
        expect(listener._onFilter).toHaveBeenCalled();
      });

      it('gets fired if rows are filtered during deleteRows', function() {
        var model = helper.createModelFixture(2, 2),
          table = helper.createTable(model),
          column0 = table.columns[0],
          row1 = table.rows[1];

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();
        table.render();
        expect(table.filteredRows().length).toBe(1);

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        table.deleteRows([row1]);

        expect(table.filteredRows().length).toBe(0);
        expect(listener._onFilter).toHaveBeenCalled();
      });

      it('gets fired if rows are filtered during deleteAllRows', function() {
        var model = helper.createModelFixture(2, 2),
          table = helper.createTable(model),
          column0 = table.columns[0];

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();
        table.render();
        expect(table.filteredRows().length).toBe(1);

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        table.deleteAllRows();

        expect(table.filteredRows().length).toBe(0);
        expect(listener._onFilter).toHaveBeenCalled();
      });

      it('does not get fired if rows are updated but row filter state has not changed', function() {
        var model = helper.createModelFixture(2, 2),
          table = helper.createTable(model),
          column0 = table.columns[0],
          row1 = table.rows[1];

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();
        table.render();

        spyOn(listener, '_onFilter');
        table.on('filter', listener._onFilter);

        // update cell 1 of row -> row still accepted by filter
        var rows = helper.createModelRows(2, 1);
        rows[0].id = row1.id;
        rows[0].cells[0].text = row1.cells[0].text;
        rows[0].cells[1].text = 'updated1';
        table.updateRows(rows);

        expect(table.filteredRows().length).toBe(1);
        expect(listener._onFilter).not.toHaveBeenCalled();
      });

      it('gets sent to server containing rowIds when rows are filtered', function() {
        var model = helper.createModelFixture(2, 2),
          adapter = helper.createTableAdapter(model),
          table = adapter.createWidget(model, session.desktop),
          column0 = table.columns[0];

        table.render();

        createAndRegisterColumnFilter(table, column0, ['1_0']);
        table.filter();

        expect(table.rows[0].filterAccepted).toBe(false);
        expect(table.rows[1].filterAccepted).toBe(true);

        sendQueuedAjaxCalls('', 400);

        expect(jasmine.Ajax.requests.count()).toBe(1);

        var event = new RemoteEvent(table.id, 'filter', {
          rowIds: [table.rows[1].id],
          showBusyIndicator: false
        });
        expect(mostRecentJsonRequest()).toContainEvents(event);
      });
    });
  });
});
