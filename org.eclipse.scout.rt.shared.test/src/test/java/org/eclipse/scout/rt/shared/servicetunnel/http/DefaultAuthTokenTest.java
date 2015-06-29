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
package org.eclipse.scout.rt.shared.servicetunnel.http;

import java.io.UnsupportedEncodingException;
import java.util.ArrayList;

import org.eclipse.scout.commons.HexUtility;
import org.eclipse.scout.commons.SecurityUtility;
import org.eclipse.scout.commons.SecurityUtility.KeyPairBytes;
import org.eclipse.scout.commons.annotations.Replace;
import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.platform.IBean;
import org.eclipse.scout.rt.platform.IBeanMetaDataFacotry;
import org.eclipse.scout.rt.shared.SharedConfigProperties.AuthTokenPrivateKeyProperty;
import org.eclipse.scout.rt.shared.SharedConfigProperties.AuthTokenPublicKeyProperty;
import org.eclipse.scout.rt.testing.platform.runner.PlatformTestRunner;
import org.eclipse.scout.rt.testing.shared.TestingUtility;
import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(PlatformTestRunner.class)
public class DefaultAuthTokenTest {
  private static KeyPairBytes s_pair;
  private static ArrayList<IBean<?>> s_beans = new ArrayList<>();

  @Replace
  private static class AuthTokenPrivateKeyPropertyEx extends AuthTokenPrivateKeyProperty {
    @Override
    protected byte[] createValue() {
      return s_pair.getPrivateKey();
    }
  }

  @Replace
  private static class AuthTokenPublicKeyPropertyEx extends AuthTokenPublicKeyProperty {
    @Override
    protected byte[] createValue() {
      return s_pair.getPublicKey();
    }
  }

  @BeforeClass
  public static void beforeClass() throws ProcessingException {
    s_pair = SecurityUtility.generateKeyPair();
    s_beans.addAll(TestingUtility.registerBeans(
        BEANS.get(IBeanMetaDataFacotry.class).create(AuthTokenPrivateKeyProperty.class).applicationScoped(true).initialInstance(new AuthTokenPrivateKeyPropertyEx()),
        BEANS.get(IBeanMetaDataFacotry.class).create(AuthTokenPublicKeyProperty.class).applicationScoped(true).initialInstance(new AuthTokenPublicKeyPropertyEx())
        ));
  }

  @AfterClass
  public static void afterClass() {
    TestingUtility.unregisterBeans(s_beans);
  }

  @Test
  public void testSimple() throws ProcessingException {
    Assert.assertTrue(DefaultAuthToken.isActive());

    DefaultAuthToken t = BEANS.get(DefaultAuthToken.class);
    t.init("foo");
    Assert.assertEquals("foo", t.getUserId());
    Assert.assertEquals(0, t.getCustomArgCount());
    Assert.assertTrue(t.getValidUntil() - System.currentTimeMillis() > 0);
    Assert.assertNotNull(t.getSignature());
    Assert.assertTrue(t.isValid());
    Assert.assertEquals(toUtf8Hex("foo") + ";" + Long.toHexString(t.getValidUntil()), new String(t.createUnsignedData()));

    String encoded = t.toString();

    DefaultAuthToken t2 = BEANS.get(DefaultAuthToken.class);
    Assert.assertTrue(t2.parse(encoded));
    Assert.assertEquals(t.getUserId(), t2.getUserId());
    Assert.assertEquals(t.getValidUntil(), t2.getValidUntil());
    Assert.assertTrue(t2.isValid());

    String encodedAndTampered = new String(t.createUnsignedData()) + ";" + toUtf8Hex("abc");
    DefaultAuthToken t3 = BEANS.get(DefaultAuthToken.class);
    Assert.assertTrue(t3.parse(encodedAndTampered));
    Assert.assertEquals(t.getUserId(), t3.getUserId());
    Assert.assertEquals(t.getValidUntil(), t3.getValidUntil());
    Assert.assertFalse(t3.isValid());
  }

  @Test
  public void testWithCustomToken() throws ProcessingException {
    Assert.assertTrue(DefaultAuthToken.isActive());

    DefaultAuthToken t = BEANS.get(DefaultAuthToken.class);
    t.init("foo", "bar");
    Assert.assertEquals("foo", t.getUserId());
    Assert.assertEquals(1, t.getCustomArgCount());
    Assert.assertTrue(t.isValid());
    Assert.assertEquals(toUtf8Hex("foo") + ";" + Long.toHexString(t.getValidUntil()) + ";" + toUtf8Hex("bar"), new String(t.createUnsignedData()));

    String encoded = t.toString();

    DefaultAuthToken t2 = BEANS.get(DefaultAuthToken.class);
    Assert.assertTrue(t2.parse(encoded));
    Assert.assertEquals(t.getUserId(), t2.getUserId());
    Assert.assertEquals(t.getValidUntil(), t2.getValidUntil());
    Assert.assertEquals(t.getCustomArg(0), t2.getCustomArg(0));
    Assert.assertTrue(t2.isValid());
  }

  private static String toUtf8Hex(String s) {
    try {
      return HexUtility.encode(s.getBytes("UTF-8"));
    }
    catch (UnsupportedEncodingException e) {
      throw new RuntimeException(e);
    }
  }

}
