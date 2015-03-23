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
package org.eclipse.scout.rt.client.ui.basic.table.control;

import org.eclipse.scout.rt.client.ui.action.keystroke.IKeyStroke;

public class GraphTableControl extends AbstractTableControl implements IGraphTableControl {

  public GraphTableControl() {
    this(true);
  }

  public GraphTableControl(boolean callInitializer) {
    super(callInitializer);
  }

  @Override
  protected void initConfig() {
    super.initConfig();
    setTooltipText("Netzwerk");
    setIconId("\uE023"); //Icons.Graph
  }

  @Override
  protected String getConfiguredKeyStroke() {
    return IKeyStroke.CONTROL + "-" + IKeyStroke.F9;
  }
}
