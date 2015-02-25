/*******************************************************************************
 * Copyright (c) 2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.commons.job;

/**
 * Monitor to track the progress of an activity.
 *
 * @since 5.1
 */
public interface IProgressMonitor {

  /**
   * The {@link IProgressMonitor} which is currently associated with the current thread.
   */
  ThreadLocal<IProgressMonitor> CURRENT = new ThreadLocal<>();

  /**
   * @return <code>true</code> if this job was cancelled and the job should terminate its work; must be invoked from
   *         within the job.
   */
  boolean isCancelled();
}
