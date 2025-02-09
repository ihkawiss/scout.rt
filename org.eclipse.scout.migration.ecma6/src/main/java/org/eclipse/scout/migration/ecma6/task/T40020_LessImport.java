/*
 * Copyright (c) 2010-2019 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
package org.eclipse.scout.migration.ecma6.task;

import java.util.regex.Pattern;

import org.eclipse.scout.migration.ecma6.PathInfo;
import org.eclipse.scout.migration.ecma6.WorkingCopy;
import org.eclipse.scout.migration.ecma6.context.Context;
import org.eclipse.scout.rt.platform.Order;

@Order(40020)
public class T40020_LessImport extends AbstractTask {

  private static final Pattern LESS_IMPORT_PAT = Pattern.compile("@import\\s+\"[\\w/.-]+\";\\n");

  @Override
  public boolean accept(PathInfo pathInfo, Context context) {
    if (pathInfo.getPath().toString().replace('\\', '/').contains("src/main/js/froala")) {
      // skip froala less migration. it does not follow our code style. migrate by hand
      return false;
    }

    String fileName = pathInfo.getPath().getFileName().toString();
    return fileName.endsWith(Context.LESS_FILE_SUFFIX)
        && !fileName.endsWith(T40010_LessModule.OLD_FILE_SUFFIX)
        && !("theme"+Context.LESS_FILE_SUFFIX).equals(fileName)
        && !fileName.startsWith("theme-");
  }

  @Override
  public void process(PathInfo pathInfo, Context context) {
    WorkingCopy workingCopy = context.ensureWorkingCopy(pathInfo.getPath());

    // remove all existing imports
    workingCopy.setSource(LESS_IMPORT_PAT.matcher(workingCopy.getSource()).replaceAll(""));
  }

}
