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
import {BeanColumn, NullWidget, ObjectFactory, scout} from '../../../src/index';
import {TableSpecHelper} from '../../../src/testing/index';

describe('TableTextUserFilter', function() {
  var session;
  var helper;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
    helper = new TableSpecHelper(session);
    jasmine.Ajax.install();
    jasmine.clock().install();
  });

  afterEach(function() {
    session = null;
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
  });

  function createFilter(table) {
    return scout.create('TableTextUserFilter', {
      session: session,
      table: table
    });
  }

  class ASpecBeanColumn extends BeanColumn {
    _renderValue($cell, value) {
      $cell.appendDiv().text(value.a);
    }
  }

  describe('filter', function() {

    beforeEach(function() {
      ObjectFactory.get().register('ASpecBeanColumn', function() {
        return new ASpecBeanColumn();
      });
    });

    afterEach(function() {
      ObjectFactory.get().unregister('ASpecBeanColumn');
    });

    it('filters rows based on cell text', function() {
      var model = helper.createModelFixture(2, 0),
        table = helper.createTable(model),
        filter = createFilter(table);

      var rows = [{
        cells: ['cell00', 'cell01']
      }, {
        cells: ['cell10', 'cell11']
      }];
      table.insertRows(rows);

      expect(table.filteredRows().length).toBe(2);

      filter.text = 'cell11';
      table.addFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(1);
      expect(table.filteredRows()[0]).toBe(table.rows[1]);

      // Capitalization is not relevant
      filter.text = 'CeLL';
      table.addFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(2);
      expect(table.filteredRows()[0]).toBe(table.rows[0]);
      expect(table.filteredRows()[1]).toBe(table.rows[1]);

      filter.text = 'asdf';
      table.addFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(0);

      table.removeFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(2);
    });

    it('separates cell values with whitepace', function() {
      var model = helper.createModelFixture(2, 0),
        table = helper.createTable(model),
        filter = createFilter(table);

      var rows = [{
        cells: ['cell00', 'cell01']
      }, {
        cells: ['cell10', 'cell11']
      }];
      table.insertRows(rows);

      expect(table.filteredRows().length).toBe(2);

      filter.text = 'cell10cell';
      table.addFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(0);

      filter.text = 'cell10 cell';
      table.addFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(1);
      expect(table.filteredRows()[0]).toBe(table.rows[1]);
    });

    it('works with bean columns', function() {
      var table = scout.create('Table', {
        parent: new NullWidget(),
        session: session,
        columns: [
          scout.create('ASpecBeanColumn', {
            session: session,
            width: 100
          })
        ]
      });
      var filter = createFilter(table);
      var bean0 = {
        a: 'bean0 text'
      };
      var bean1 = {
        a: 'bean1 text'
      };
      var rows = [{
        cells: [bean0]
      }, {
        cells: [bean1]
      }];
      table.insertRows(rows);

      expect(table.filteredRows().length).toBe(2);

      filter.text = 'bean1';
      table.addFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(1);
      expect(table.filteredRows()[0]).toBe(table.rows[1]);

      filter.text = 'asdf';
      table.addFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(0);

      table.removeFilter(filter);
      table.filter();

      expect(table.filteredRows().length).toBe(2);
    });

  });
});
