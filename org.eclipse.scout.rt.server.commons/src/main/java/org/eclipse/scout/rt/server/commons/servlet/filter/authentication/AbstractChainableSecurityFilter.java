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
package org.eclipse.scout.rt.server.commons.servlet.filter.authentication;

import java.io.IOException;
import java.security.AccessController;
import java.security.Principal;
import java.security.PrivilegedActionException;
import java.security.PrivilegedExceptionAction;

import javax.security.auth.Subject;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.security.SimplePrincipal;
import org.eclipse.scout.rt.platform.BEANS;
import org.eclipse.scout.rt.server.commons.cache.IHttpSessionCacheService;

/**
 * <h4>AbstractChainableSecurityFilter</h4> The following properties can be set
 * in the <code>web.xml</code> file:
 * <ul>
 * <li><code>realm=abcde</code> <b>default: "Default"</b></li>
 * <li><code>failover=true/false</code> <b>default false</b></li>
 * </ul>
 * <p>
 * <h5>NOTE</h5> All security filters inheriting from {@link AbstractChainableSecurityFilter} are chainable. What means
 * can be used together with other Filters. To make this filter chainable set the flag failover to true. <b>Ensure to
 * set the failover flag on the last security filter to false!</b>
 * <p>
 * Make sure to dectivate session persistence. In tomcat: in server.xml inside <Context> tag add
 *
 * <pre>
 * &lt;Manager className="org.apache.catalina.session.StandardManager" pathname=""&gt; &lt;/Manager&gt;
 * </pre>
 *
 * @since 1.0.3 06.02.2009
 *        TODO imo remove in 6.0
 */
public abstract class AbstractChainableSecurityFilter implements Filter {
  public static final String PROP_SUBJECT = Subject.class.getName();

  public static final int STATUS_CONTINUE_CHAIN = 1;
  public static final int STATUS_BREAK_CHAIN = 2;
  public static final int STATUS_CONTINUE_WITH_PRINCIPAL = 3;

  private boolean m_failover;
  private String m_realm;

  /**
   * identifier for this filter.
   *
   * @rn aho, 4.6.09
   */
  protected String getFilterId() {
    return this.getClass().getSimpleName();
  }

  @Override
  public void init(FilterConfig config) throws ServletException {

    // read config
    m_failover = "true".equals(config.getInitParameter("failover"));
    m_realm = StringUtility.nvl(config.getInitParameter("realm"), "Default");
  }

  @Override
  public final void doFilter(ServletRequest in, ServletResponse out, final FilterChain chain) throws IOException, ServletException {
    final HttpServletRequest req = (HttpServletRequest) in;
    final HttpServletResponse res = (HttpServletResponse) out;
    //touch the session so it is effectively used
    req.getSession();
    // check subject on session
    Subject subject = findSubject(req, res);

    if (subject == null || subject.getPrincipals().size() == 0) {
      //try negotiate
      PrincipalHolder pHolder = new PrincipalHolder();
      switch (negotiate(req, res, pHolder)) {
        case STATUS_CONTINUE_CHAIN:
          if (m_failover) {
            chain.doFilter(req, res);
            return;
          }
          else {
            res.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
          }
        case STATUS_BREAK_CHAIN:
          return;
        case STATUS_CONTINUE_WITH_PRINCIPAL:
          if (subject == null || subject.isReadOnly()) {
            subject = new Subject();
          }
          subject.getPrincipals().add(pHolder.getPrincipal());
          subject.setReadOnly();
          cacheSubject(req, res, subject);
          break;
      }
    }
    //run in subject
    if (Subject.getSubject(AccessController.getContext()) != null) {
      doFilterInternal(req, res, chain);
    }
    else {
      try {
        Subject.doAs(subject, new PrivilegedExceptionAction<Object>() {
          @Override
          public Object run() throws Exception {
            HttpServletRequest secureReq = req;
            if (!(secureReq instanceof SecureHttpServletRequestWrapper)) {
              Principal principal = Subject.getSubject(AccessController.getContext()).getPrincipals().iterator().next();
              secureReq = new SecureHttpServletRequestWrapper(req, principal);
            }
            doFilterInternal(secureReq, res, chain);
            return null;
          }
        });
      }
      catch (PrivilegedActionException e) {
        Throwable t = e.getCause();
        if (t instanceof IOException) {
          throw (IOException) t;
        }
        else if (t instanceof ServletException) {
          throw (ServletException) t;
        }
        else {
          throw new ServletException(t);
        }
      }
    }
  }

  /**
   * Find already existing subject
   */
  protected Subject findSubject(final HttpServletRequest req, final HttpServletResponse res) {
    synchronized (req.getSession()) {
      Subject subject = getCachedSubject(req, res);
      //check if we are already authenticated
      if (subject == null) {
        subject = Subject.getSubject(AccessController.getContext());
      }
      if (subject == null) {
        Principal principal = req.getUserPrincipal();
        if (principal == null || !StringUtility.hasText(principal.getName())) {
          principal = null;
          String name = req.getRemoteUser();
          if (StringUtility.hasText(name)) {
            principal = new SimplePrincipal(name);
          }
        }
        if (principal != null) {
          subject = createSubject(principal);
          cacheSubject(req, res, subject);
        }
      }
      return subject;
    }
  }

  protected void cacheSubject(final HttpServletRequest req, final HttpServletResponse res, Subject subject) {
    synchronized (req.getSession()) {
      BEANS.get(IHttpSessionCacheService.class).put(PROP_SUBJECT, subject, req, res);
    }
  }

  protected Subject getCachedSubject(final HttpServletRequest req, final HttpServletResponse res) {
    synchronized (req.getSession()) {
      Object s = BEANS.get(IHttpSessionCacheService.class).getAndTouch(PROP_SUBJECT, req, res);
      if (s instanceof Subject) {
        return (Subject) s;
      }
      return null;
    }
  }

  protected Subject createSubject(Principal principal) {
    Subject s = new Subject();
    s.getPrincipals().add(principal);
    s.setReadOnly();
    return s;
  }

  /**
   * set the 'WWW-Authenticate' value on the response to enforce the client to provide login data.
   *
   * @param req
   * @param resp
   * @return
   */
  protected abstract int negotiate(HttpServletRequest req, HttpServletResponse resp, PrincipalHolder holder) throws IOException, ServletException;

  private void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws IOException, ServletException {
    chain.doFilter(req, res);
  }

  public String getRealm() {
    return m_realm;
  }

  public boolean isFailover() {
    return m_failover;
  }

}
