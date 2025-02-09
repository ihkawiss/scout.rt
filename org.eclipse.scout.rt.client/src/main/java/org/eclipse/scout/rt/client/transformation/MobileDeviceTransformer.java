/*
 * Copyright (c) 2010-2018 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.rt.client.transformation;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

import org.eclipse.scout.rt.client.ui.action.menu.IMenu;
import org.eclipse.scout.rt.client.ui.action.menu.TableMenuType;
import org.eclipse.scout.rt.client.ui.basic.table.ITable;
import org.eclipse.scout.rt.client.ui.basic.table.controls.ITableControl;
import org.eclipse.scout.rt.client.ui.basic.table.controls.SearchFormTableControl;
import org.eclipse.scout.rt.client.ui.basic.tree.ITree;
import org.eclipse.scout.rt.client.ui.desktop.IDesktop;
import org.eclipse.scout.rt.client.ui.desktop.outline.IOutline;
import org.eclipse.scout.rt.client.ui.desktop.outline.MenuWrapper;
import org.eclipse.scout.rt.client.ui.desktop.outline.OutlineMenuWrapper;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.IPage;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.IPageWithTable;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.ISearchForm;
import org.eclipse.scout.rt.client.ui.form.FormEvent;
import org.eclipse.scout.rt.client.ui.form.FormUtility;
import org.eclipse.scout.rt.client.ui.form.IForm;
import org.eclipse.scout.rt.client.ui.form.fields.GridData;
import org.eclipse.scout.rt.client.ui.form.fields.ICompositeField;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.client.ui.form.fields.booleanfield.IBooleanField;
import org.eclipse.scout.rt.client.ui.form.fields.groupbox.IGroupBox;
import org.eclipse.scout.rt.client.ui.form.fields.placeholder.IPlaceholderField;
import org.eclipse.scout.rt.client.ui.form.fields.sequencebox.ISequenceBox;
import org.eclipse.scout.rt.platform.Order;
import org.eclipse.scout.rt.platform.util.CollectionUtility;
import org.eclipse.scout.rt.shared.ui.UserAgentUtility;

/**
 * @since 3.9.0
 */
@Order(5200)
public class MobileDeviceTransformer extends AbstractDeviceTransformer {

  @Override
  public boolean isActive() {
    return UserAgentUtility.isMobileDevice();
  }

  @Override
  protected void initTransformationConfig() {
    List<IDeviceTransformation> transformations = new LinkedList<>();

    transformations.add(MobileDeviceTransformation.MOVE_FIELD_LABEL_TO_TOP);
    transformations.add(MobileDeviceTransformation.MOVE_FIELD_STATUS_TO_TOP);
    transformations.add(MobileDeviceTransformation.MAKE_FIELD_SCALEABLE);
    transformations.add(MobileDeviceTransformation.MAKE_MAINBOX_SCROLLABLE);
    transformations.add(MobileDeviceTransformation.REDUCE_GROUPBOX_COLUMNS_TO_ONE);
    transformations.add(MobileDeviceTransformation.HIDE_PLACEHOLDER_FIELD);
    transformations.add(MobileDeviceTransformation.HIDE_FIELD_STATUS);
    transformations.add(MobileDeviceTransformation.DISABLE_FORM_CANCEL_CONFIRMATION);
    transformations.add(MobileDeviceTransformation.AUTO_CLOSE_SEARCH_FORM);
    transformations.add(MobileDeviceTransformation.SET_SEQUENCEBOX_UI_HEIGHT);

    for (IDeviceTransformation transformation : transformations) {
      getDeviceTransformationConfig().enableTransformation(transformation);
    }
  }

  @Override
  public void transformDesktop() {
    getDesktop().setDisplayStyle(IDesktop.DISPLAY_STYLE_COMPACT);
  }

  @Override
  public void transformForm(IForm form) {
    if (getDeviceTransformationConfig().isFormExcluded(form)) {
      return;
    }

    if (getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.DISABLE_FORM_CANCEL_CONFIRMATION)) {
      form.setAskIfNeedSave(false);
    }
    if (form.getDisplayHint() == IForm.DISPLAY_HINT_VIEW) {
      transformView(form);
    }
  }

  protected void transformView(IForm form) {
    form.setDisplayViewId(IForm.VIEW_ID_CENTER);
  }

  @Override
  public void transformOutline(IOutline outline) {
    outline.setNavigateButtonsVisible(false);
    outline.setLazyExpandingEnabled(false);
    outline.setToggleBreadcrumbStyleEnabled(false);
    outline.setDisplayStyle(ITree.DISPLAY_STYLE_BREADCRUMB);
  }

  @Override
  public void transformPage(IPage page) {
    if (page instanceof IPageWithTable) {
      transformPageWithTable((IPageWithTable) page);
    }
  }

  public void transformPageWithTable(IPageWithTable page) {
    page.setLeaf(false);
    page.setAlwaysCreateChildPage(true);
  }

  @Override
  public void transformPageTable(ITable table, IPage<?> page) {
    for (ITableControl control : table.getTableControls()) {
      if (!(control instanceof SearchFormTableControl)) {
        control.setVisibleGranted(false);
      }
    }
  }

  @Override
  public void notifyPageDetailFormChanged(IForm form) {
    // Detail forms will be displayed inside a page (tree node)
    // Make sure these inner forms are not scrollable because the outline already is
    IGroupBox mainBox = form.getRootGroupBox();
    if (mainBox.isScrollable().isTrue()) {
      mainBox.setScrollable(false);
      FormUtility.initRootBoxGridData(mainBox);
    }
  }

  @Override
  public void notifyPageDetailTableChanged(ITable table) {
    IPage<?> activePage = getDesktop().getOutline().getActivePage();
    IPage<?> parentPage = activePage.getParentPage();
    if (parentPage == null) {
      return;
    }
    ITable parentTable = parentPage.getTable(false);
    if (parentTable == null) {
      return;
    }

    // Remove empty space menus of the current detail table which are already defined on the parent detail table as single selection menus
    // This prevents duplicate menus because the ui concatenates these menus when a node is shown
    // It is important to only remove outline wrapper menus which are defined on the parent table because the menu could be defined on a page and therefore needs to be displayed
    List<IMenu> newMenus = new ArrayList<>();
    for (IMenu menu : table.getMenus()) {
      if ((menu instanceof OutlineMenuWrapper)) {
        OutlineMenuWrapper menuWrapper = (OutlineMenuWrapper) menu;
        IMenu originalMenu = unwrapOutlineWrapperMenu(menuWrapper);
        if (menuWrapper.getMenuTypes().contains(TableMenuType.EmptySpace)
            && originalMenu.getMenuTypes().contains(TableMenuType.SingleSelection)
            && parentTable.getMenus().contains(originalMenu)) {
          // This menu should be removed -> don't add it to the list of new menus
          continue;
        }
      }
      newMenus.add(menu);
    }
    if (!CollectionUtility.equalsCollection(newMenus, table.getContextMenu().getChildActions())) {
      table.getContextMenu().setChildActions(newMenus);
    }
  }

  protected static IMenu unwrapOutlineWrapperMenu(IMenu menu) {
    return MenuWrapper.unwrapMenu(menu);
  }

  @Override
  public void notifyPageSearchFormInit(final IPageWithTable<ITable> page) {
    if (!getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.AUTO_CLOSE_SEARCH_FORM)) {
      return;
    }
    ISearchForm searchForm = page.getSearchFormInternal();
    searchForm.addFormListener(e -> {
      if (FormEvent.TYPE_STORE_AFTER == e.getType()) {
        onSearchFormStored(page);
      }
    });
  }

  protected void onSearchFormStored(IPageWithTable<ITable> page) {
    SearchFormTableControl tableControl = page.getTable().getTableControl(SearchFormTableControl.class);
    if (tableControl != null) {
      tableControl.setSelected(false);
    }
  }

  @Override
  public void transformFormField(IFormField field) {
    if (getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.MOVE_FIELD_LABEL_TO_TOP, field)) {
      moveLabelToTop(field);
    }
    if (getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.MAKE_FIELD_SCALEABLE, field)) {
      makeFieldScalable(field);
    }
    if (getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.HIDE_FIELD_STATUS, field)) {
      hideStatus(field);
    }
    if (getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.MOVE_FIELD_STATUS_TO_TOP, field)) {
      moveStatusToTop(field);
    }

    if (field instanceof IGroupBox) {
      transformGroupBox((IGroupBox) field);
    }
    else if (field instanceof IPlaceholderField) {
      transformPlaceholderField((IPlaceholderField) field);
    }
    else if (field instanceof ISequenceBox) {
      transformSequenceBox((ISequenceBox) field);
    }
  }

  /**
   * Makes sure weightX is set to 1 which makes the field scalable.
   * <p>
   * Reason:<br>
   * The width of the field should be adjusted according to the display width, otherwise it may be too big to be
   * displayed. <br>
   * Additionally, since we use a one column layout, setting weightX to 0 might destroy the layout because it affects
   * all the fields in the groupBox.
   */
  protected void makeFieldScalable(IFormField field) {
    // Since a sequencebox contains several fields it's very risky to modify the gridData because it could make the fields too big or too small.
    if (field.getParentField() instanceof ISequenceBox) {
      return;
    }

    // Make sure weightX is set to 1 so the field grows and shrinks and does not break the 1 column layout
    GridData gridDataHints = field.getGridDataHints();
    if (gridDataHints.weightX == 0) {
      gridDataHints.weightX = 1;
      field.setGridDataHints(gridDataHints);
      rebuildParentGrid(field);
    }
  }

  protected void moveLabelToTop(IFormField field) {
    if (field instanceof IGroupBox) {
      return;
    }

    if (IFormField.LABEL_POSITION_ON_FIELD == field.getLabelPosition()) {
      return;
    }

    // Do not modify the labels inside a sequencebox
    if (field.getParentField() instanceof ISequenceBox) {
      return;
    }

    field.setLabelPosition(IFormField.LABEL_POSITION_TOP);

    // The actual label of the boolean field is on the right side and position=top has no effect.
    // Removing the label actually removes the place on the left side so that it gets aligned to the other fields.
    if (field instanceof IBooleanField) {
      field.setLabelVisible(false);
    }
  }

  protected void moveStatusToTop(IFormField field) {
    field.setStatusPosition(IFormField.STATUS_POSITION_TOP);
  }

  protected void hideStatus(IFormField field) {
    if ((field instanceof ICompositeField)) {
      ((ICompositeField) field).setStatusVisible(false, false);
    }
    else {
      field.setStatusVisible(false);
    }
  }

  protected void transformMainBox(IGroupBox groupBox) {
    if (getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.MAKE_MAINBOX_SCROLLABLE, groupBox)) {
      makeGroupBoxScrollable(groupBox);
    }
  }

  protected void makeGroupBoxScrollable(IGroupBox groupBox) {
    if (!groupBox.isScrollable().isTrue()) {
      groupBox.setScrollable(true);

      // GridDataHints have been modified by setScrollable. Update the actual gridData with those hints.
      if (groupBox.isMainBox()) {
        FormUtility.initRootBoxGridData(groupBox);
      }
      else {
        rebuildParentGrid(groupBox);
      }
    }
  }

  protected void transformGroupBox(IGroupBox groupBox) {
    if (groupBox.isMainBox()) {
      transformMainBox(groupBox);
    }
    if (getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.REDUCE_GROUPBOX_COLUMNS_TO_ONE, groupBox)) {
      groupBox.setGridColumnCount(1);
    }
    // Transformations already done.
    groupBox.setResponsive(false);
  }

  /**
   * Makes placeholder fields invisible since they just waste space on 1 column layouts
   */
  protected void transformPlaceholderField(IPlaceholderField field) {
    if (getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.HIDE_PLACEHOLDER_FIELD, field)) {
      field.setVisible(false);
    }
  }

  /**
   * Make the sequence box use its UI height. This is necessary if the labels of the containing fields are moved to top
   * because in that case a logical row height of 1 is not sufficient anymore.
   */
  protected void transformSequenceBox(ISequenceBox box) {
    if (!getDeviceTransformationConfig().isTransformationEnabled(MobileDeviceTransformation.SET_SEQUENCEBOX_UI_HEIGHT, box)) {
      return;
    }
    GridData gridDataHints = box.getGridDataHints();
    if (!gridDataHints.useUiHeight) {
      gridDataHints.useUiHeight = true;
      box.setGridDataHints(gridDataHints);
      rebuildParentGrid(box);
    }
  }

}
