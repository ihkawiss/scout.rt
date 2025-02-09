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

import {TreeNode} from '../../src/index';

describe('TreeNode', function() {
  var session;

  beforeEach(function() {
    setFixtures(sandbox());
    session = sandboxSession();
  });

  describe('isAncestorOf', function() {
    it('returns true if the node is an ancestor of the given node ', function() {
      var tree = scout.create('Tree', {parent: session.desktop});
      var rootNode = scout.create('TreeNode', {
        parent: tree
      });
      var parentNode = scout.create('TreeNode', {
        parent: tree,
        parentNode: rootNode
      });
      var node = scout.create('TreeNode', {
        parent: tree,
        parentNode: parentNode
      });
      expect(rootNode.isAncestorOf(parentNode)).toBe(true);
      expect(rootNode.isAncestorOf(node)).toBe(true);
      expect(parentNode.isAncestorOf(node)).toBe(true);

      expect(node.isAncestorOf(parentNode)).toBe(false);
      expect(node.isAncestorOf(rootNode)).toBe(false);
      expect(node.isAncestorOf(node)).toBe(false);
    });
  });

  describe('isDescendantOf', function() {
    it('returns true if the node is a descendant of the given node ', function() {
      var tree = scout.create('Tree', {parent: session.desktop});
      var rootNode = scout.create('TreeNode', {
        parent: tree
      });
      var parentNode = scout.create('TreeNode', {
        parent: tree,
        parentNode: rootNode
      });
      var node = scout.create('TreeNode', {
        parent: tree,
        parentNode: parentNode
      });
      expect(node.isDescendantOf(parentNode)).toBe(true);
      expect(node.isDescendantOf(rootNode)).toBe(true);

      expect(rootNode.isDescendantOf(parentNode)).toBe(false);
      expect(rootNode.isDescendantOf(node)).toBe(false);
      expect(parentNode.isDescendantOf(node)).toBe(false);
      expect(node.isDescendantOf(node)).toBe(false);
    });
  });
});
