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
package org.eclipse.scout.migration.ecma6.model.references;

public class AliasedMember {

  private final String m_name;
  private String m_alias;

  public AliasedMember(String name){
    this(name,null);
  }
  public AliasedMember(String name, String alias){
    m_name = name;
    m_alias = alias;
  }

  public String getName() {
    return m_name;
  }

  public String getAlias() {
    return m_alias;
  }

  public void setAlias(String alias) {
    m_alias = alias;
  }

  public String getReferenceName(){
    if(getAlias() != null){
      return getAlias();
    }
    return getName();
  }
}
