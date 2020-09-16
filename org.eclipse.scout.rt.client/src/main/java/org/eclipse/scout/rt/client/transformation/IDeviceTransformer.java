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

import org.eclipse.scout.rt.client.ui.basic.table.ITable;
import org.eclipse.scout.rt.client.ui.desktop.IDesktop;
import org.eclipse.scout.rt.client.ui.desktop.outline.IOutline;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.IPage;
import org.eclipse.scout.rt.client.ui.desktop.outline.pages.IPageWithTable;
import org.eclipse.scout.rt.client.ui.form.IForm;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.platform.Bean;

/**
 * @since 3.9.0
 */
@Bean
public interface IDeviceTransformer {

  boolean isActive();

  void dispose();

  void setDesktop(IDesktop desktop);

  void transformDesktop();

  void transformForm(IForm form);

  void transformFormField(IFormField field);

  void transformOutline(IOutline outline);

  void transformPage(IPage<?> page);

  void transformPageTable(ITable table, IPage<?> page);

  void notifyPageDetailFormChanged(IForm form);

  void notifyPageDetailTableChanged(ITable table);

  void notifyFormAboutToShow(IForm form);

  void notifyFormDisposed(IForm form);

  void notifyFieldDisposed(IFormField formField);

  void notifyDesktopClosing();

  void notifyPageSearchFormInit(IPageWithTable<ITable> page);

  void excludeForm(IForm form);

  void excludeFormTransformation(IForm form, IDeviceTransformation transformation);

  boolean isFormExcluded(IForm form);

  void excludeField(IFormField formField);

  void excludeFieldTransformation(IFormField formField, IDeviceTransformation transformation);

  boolean isFormFieldExcluded(IFormField formField);

  DeviceTransformationConfig getDeviceTransformationConfig();
}
