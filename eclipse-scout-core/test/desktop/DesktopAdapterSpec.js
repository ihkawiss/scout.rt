/*
 * Copyright (c) 2010-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {FormSpecHelper, OutlineSpecHelper} from '../../src/testing/index';
import {RemoteEvent, Widget} from '../../src/index';

describe('DesktopAdapter', function() {
  var session, desktop, outlineHelper, formHelper, desktopAdapter;

  beforeEach(function() {
    setFixtures(sandbox());
    jasmine.Ajax.install();
    jasmine.clock().install();
    session = sandboxSession({
      desktop: {
        benchVisible: true
      },
      renderDesktop: false
    });
    outlineHelper = new OutlineSpecHelper(session);
    formHelper = new FormSpecHelper(session);
    desktop = session.desktop;
    linkWidgetAndAdapter(desktop, 'DesktopAdapter');
    desktopAdapter = desktop.modelAdapter;
  });

  afterEach(function() {
    jasmine.Ajax.uninstall();
    jasmine.clock().uninstall();
  });

  function createAndRegisterFormModel() {
    var groupBoxModel = createSimpleModel('GroupBox', session);
    groupBoxModel.mainBox = true;
    var formModel = createSimpleModel('Form', session);
    formModel.rootGroupBox = groupBoxModel.id;
    registerAdapterData([formModel, groupBoxModel], session);
    return formModel;
  }

  describe('activateForm', function() {
    var ntfc,
      parent = new Widget();

    it('sends formActivateEvent', function() {
      var formModel = createAndRegisterFormModel();
      var formModel2 = createAndRegisterFormModel();
      var form = session.getOrCreateWidget(formModel.id, desktop);
      var form2 = session.getOrCreateWidget(formModel2.id, desktop);
      desktop.dialogs = [form, form2];
      session._renderDesktop();

      desktop.activateForm(form);
      expect(desktop.activeForm).toBe(form);

      sendQueuedAjaxCalls();
      var event = new RemoteEvent(desktopAdapter.id, 'formActivate', {
        formId: form.modelAdapter.id
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);

      desktop.activateForm(form2);
      expect(desktop.activeForm).toBe(form2);

      sendQueuedAjaxCalls();
      event = new RemoteEvent(desktopAdapter.id, 'formActivate', {
        formId: form2.modelAdapter.id
      });
      expect(mostRecentJsonRequest()).toContainEvents(event);
    });

    it('can close and open new form in the same response', function() {
      var formModel = createAndRegisterFormModel();
      var form = session.getOrCreateWidget(formModel.id, desktop);
      desktop.dialogs = [form];
      session._renderDesktop();

      desktop.activateForm(form);
      expect(desktop.activeForm).toBe(form);

      expect(jasmine.Ajax.requests.count()).toBe(0);

      sendQueuedAjaxCalls();
      expect(jasmine.Ajax.requests.count()).toBe(1);

      // ------------------------

      // Close form and open new form --> new form must be activated

      var response = {
        adapterData: {
          '400': {
            displayHint: 'view',
            global: true,
            id: '400',
            objectType: 'Form',
            owner: '1',
            rootGroupBox: '401'
          },
          '401': {
            fields: [],
            id: '401',
            objectType: 'GroupBox',
            owner: '400'
          }
        },
        events: [
          {
            target: desktopAdapter.id,
            type: 'formHide',
            displayParent: desktopAdapter.id,
            form: formModel.id
          },
          {
            target: desktopAdapter.id,
            type: 'formShow',
            displayParent: desktopAdapter.id,
            form: '400'
          }
        ]
      };
      session._processSuccessResponse(response);
      sendQueuedAjaxCalls();

      var expectedEvents = [
        new RemoteEvent(desktopAdapter.id, 'formActivate', {
          formId: null
        }),
        new RemoteEvent(desktopAdapter.id, 'formActivate', {
          formId: '400'
        })
      ];
      expect(mostRecentJsonRequest()).toContainEventsExactly(expectedEvents);
      expect(jasmine.Ajax.requests.count()).toBe(2);

      // ------------------------

      // Only hide form --> no formActivate event is sent

      response = {
        events: [
          {
            target: desktopAdapter.id,
            type: 'formHide',
            displayParent: desktopAdapter.id,
            form: '400'
          }
        ]
      };
      session._processSuccessResponse(response);
      sendQueuedAjaxCalls();
      expect(jasmine.Ajax.requests.count()).toBe(2);
    });
  });

  describe('onFormShow', function() {
    var ntfc,
      parent = new Widget();

    it('activates form but does not send an activate form event', function() {
      session._renderDesktop();
      var formModel = createAndRegisterFormModel();

      var formShowEvent = new RemoteEvent(desktopAdapter.id, 'formShow', {
        form: formModel.id,
        displayParent: desktopAdapter.id
      });
      desktopAdapter.onModelAction(formShowEvent);
      var form = session.getModelAdapter(formModel.id).widget;
      expect(form.rendered).toBe(true);
      expect(desktop.activeForm).toBe(form);

      sendQueuedAjaxCalls();
      expect(jasmine.Ajax.requests.count()).toBe(0);
    });
  });

});
