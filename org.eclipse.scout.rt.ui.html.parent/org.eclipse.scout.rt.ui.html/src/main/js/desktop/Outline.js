scout.Outline = function() {
  scout.Outline.parent.call(this);
  this._addAdapterProperties('defaultDetailForm');
};
scout.inherits(scout.Outline, scout.Tree);

/**
 * @Override
 */
scout.Outline.prototype._render = function($parent) {
  scout.Outline.parent.prototype._render.call(this, $parent);

  if (this.selectedNodeIds.length === 0) {
    this._updateOutlineTab();
  }
};

/**
 * @Override
 */
scout.Outline.prototype._initTreeNode = function(parentNode, node) {
  scout.Outline.parent.prototype._initTreeNode.call(this, parentNode, node);

  if (node.detailTable) {
    node.detailTable = this.session.getOrCreateModelAdapter(node.detailTable, this);
  }

  if (node.detailForm) {
    node.detailForm = this.session.getOrCreateModelAdapter(node.detailForm, this);
  }
};

scout.Outline.prototype._renderSelection = function($nodes) {
  scout.Outline.parent.prototype._renderSelection.call(this, $nodes);

  if (!$nodes) {
    //Outline does not support multi selection -> [0]
    $nodes = [this._findNodeById(this.selectedNodeIds[0])];
  }

  if ($nodes.length === 0) {
    return;
  }

  var node = $nodes[0].data('node');
  if (node) {
    this._updateOutlineTab(node);
  }
};

scout.Outline.prototype._updateOutlineTab = function(node) {
  var content, text;

  if (node) {
    // Unlink detail form if it was closed.
    // May happen in the following case:
    // The form gets closed on execPageDeactivated.
    // No detailFormChanged event will be fired because the deactivated page is not selected anymore
    if (node.detailForm && node.detailForm.destroyed) {
      node.detailForm = null;
    }

    content = node.detailForm;
    text = node.text;
    if (!content) {
      content = node.detailTable;
    }
    else {
      text = node.detailForm.title;
    }
  }
  else if (this.defaultDetailForm) {
    content = this.defaultDetailForm;
    text = this.defaultDetailForm.title;
  }
  this.session.desktop.updateOutlineTab(content, text);
};

/* event handling */

scout.Outline.prototype.onFormChanged = function(nodeId, detailForm) {
  var node;
  if (nodeId >= 0) {
    node = this._nodeMap[nodeId];
    node.detailForm = this.session.getOrCreateModelAdapter(detailForm, this);
    //If the following condition is false, the selection state is not synchronized yet which means there is a selection event in the queue which will be processed right afterwards.
    if (this.selectedNodeIds.indexOf(node.id) >= 0) {
      this._updateOutlineTab(node);
    }
  }
  else {
    this.defaultDetailForm = this.session.getOrCreateModelAdapter(detailForm, this);
    this._updateOutlineTab();
  }
};

scout.Outline.prototype.onTableChanged = function(nodeId, detailTable) {
  var node;
  if (nodeId >= 0) {
    node = this._nodeMap[nodeId];
    node.detailTable = this.session.getOrCreateModelAdapter(detailTable, this);
    //If the following condition is false, the selection state is not synchronized yet which means there is a selection event in the queue which will be processed right afterwards.
    if (this.selectedNodeIds.indexOf(node.id) >= 0) {
      this._updateOutlineTab(node);
    }
  }
  else {
    this._updateOutlineTab();
  }
};

scout.Outline.prototype.onModelAction = function(event) {
  if (event.type == 'detailFormChanged') {
    this.onFormChanged(event.nodeId, event.detailForm);
  } else if (event.type == 'detailTableChanged') {
    this.onTableChanged(event.nodeId, event.detailTable);
  } else {
    scout.Outline.parent.prototype.onModelAction.call(this, event);
  }
};
