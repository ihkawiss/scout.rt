/*******************************************************************************
 * Copyright (c) 2010-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the BSI CRM Software License v1.0
 * which accompanies this distribution as bsi-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package com.bsiag.scout.rt.client.ui.form.fields.chartfield;

import org.eclipse.scout.rt.client.ui.form.fields.IFormField;

import com.bsiag.scout.rt.client.ui.basic.chart.IChart;

/**
 * @since 5.2
 */
public interface IChartField<T extends IChart> extends IFormField {

  String PROP_CHART = "chart";

  void setChart(T chart);

  T getChart();
}
