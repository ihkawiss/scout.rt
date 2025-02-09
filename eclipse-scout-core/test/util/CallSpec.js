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
// eslint-disable-next-line max-classes-per-file
import {Call} from '../../src/index';

describe('scout.Call', function() {

  beforeEach(function() {
    jasmine.clock().install();
  });

  afterEach(function() {
    jasmine.clock().uninstall();
  });

  // ----- Test classes -----

  class SuccessCall extends Call {
    _callImpl() {
      var deferred = $.Deferred();
      deferred.resolve();
      return deferred.promise();
    }
  }

  class FailCall extends Call {
    constructor() {
      super();
      this.maxRetries = 0;
    }

    _callImpl() {
      var deferred = $.Deferred();
      deferred.reject();
      return deferred.promise();
    }
  }

  class FailOnFirstTryCall extends Call {
    constructor() {
      super();
      this.maxRetries = 5;
    }

    _callImpl() {
      var deferred = $.Deferred();
      if (this.callCounter > 1) {
        deferred.resolve();
      } else {
        deferred.reject();
      }
      return deferred.promise();
    }
  }

  // ----- Tests -----

  it('calls done on success', function() {
    var call = new SuccessCall();
    call.init();
    var done = false;
    call.call()
      .done(function() {
        done = true;
      });

    expect(done).toBe(true);
    expect(call.callCounter).toBe(1);
  });

  it('calls fail on failure', function() {
    var call = new FailCall();
    call.init();
    var failed = false;
    call.call()
      .fail(function() {
        failed = true;
      });

    expect(failed).toBe(true);
    expect(call.callCounter).toBe(1);
  });

  it('retries on failure', function() {
    var call = new FailOnFirstTryCall();
    call.init();
    var done = false;
    var failed = false;
    call.call()
      .done(function() {
        done = true;
      })
      .fail(function() {
        failed = true;
      });

    jasmine.clock().tick(1000);
    expect(done).toBe(true);
    expect(failed).toBe(false);
    expect(call.callCounter).toBe(2);
  });

});
