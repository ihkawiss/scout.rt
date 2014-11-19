/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.desktop.outline.pages;

import java.util.List;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.basic.table.ITable5;
import org.eclipse.scout.rt.client.ui.basic.tree.ITree;
import org.eclipse.scout.rt.client.ui.desktop.outline.IOutline5;
import org.eclipse.scout.rt.client.ui.desktop.outline.OutlineEvent;
import org.eclipse.scout.rt.client.ui.desktop.outline.OutlineNavigateDownMenu;
import org.eclipse.scout.rt.shared.services.common.exceptionhandler.IExceptionHandlerService;
import org.eclipse.scout.service.SERVICES;

public abstract class AbstractPageWithTable5<T extends ITable5> extends AbstractPageWithTable<T> implements IPage5 {

  private boolean m_detailFormVisible = true;

  @Override
  protected void initConfig() {
    super.initConfig();
    getTable().setTableStatusVisible(true);
  }

  @Override
  public void setTreeInternal(ITree tree, boolean includeSubtree) {
    super.setTreeInternal(tree, includeSubtree);

    // FIXME how to do this properly? Das menu dürfte auch nicht auf den Baum synchronisiert werden
    if (getTable().getDefaultMenu() == null && !isLeaf()) {
      List<IMenu> tableMenus = getTable().getContextMenu().getChildActions();
      OutlineNavigateDownMenu menu = new OutlineNavigateDownMenu(getOutline());
      try {
        menu.initAction();
      }
      catch (ProcessingException e) {
        SERVICES.getService(IExceptionHandlerService.class).handleException(e);
      }
      tableMenus.add(0, menu);
      getTable().getContextMenu().setChildActions(tableMenus);
    }
  }

  @Override
  public boolean isDetailFormVisible() {
    return m_detailFormVisible;
  }

  @Override
  public void setDetailFormVisible(boolean visible) {
    m_detailFormVisible = visible;
    ((IOutline5) getOutline()).fireOutlineEvent(new OutlineEvent(getTree(), OutlineEvent.TYPE_PAGE_CHANGED, this));
  }

}
