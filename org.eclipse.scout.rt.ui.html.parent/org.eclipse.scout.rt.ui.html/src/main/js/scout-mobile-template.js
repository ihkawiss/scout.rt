// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG
//

//@include("jquery-scout.js");

// protects $ and undefined from being redefined by another library
(function(scout, $, undefined) {
//@include("main.js");

//@include("util/arrays.js");
//@include("util/EventSupport.js");
//@include("util/KeystrokeManager.js");
//@include("util/ModelAdapter.js");
//@include("util/NullAdapter.js");
//@include("util/ObjectFactory.js");
//@include("util/Device.js");
//@include("util/helpers.js");
//@include("util/numbers.js");
//@include("util/strings.js");
//@include("util/URL.js");
//@include("session/Session.js");
//@include("session/Event.js");
//@include("session/Locale.js");
//@include("session/UserAgent.js");
//@include("session/Reconnector.js");
//@include("datamodel/DataModel.js");
//@include("table/Table.js");
//@include("table/MobileTable.js");
//@include("table/TableHeader.js");
//@include("table/TableFooter.js");
//@include("table/TableHeaderMenu.js");
//@include("table/TableKeystrokeAdapter.js");
//@include("table/TableSelectionHandler.js");
//@include("table/control/TableControl.js");
//@include("table/control/ChartTableControl.js");
//@include("table/control/ChartTableControlMatrix.js");
//@include("table/control/GraphTableControl.js");
//@include("table/control/MapTableControl.js");
//@include("table/control/AnalysisTableControl.js");
//@include("tree/Tree.js");
//@include("desktop/BaseDesktop.js");
//@include("desktop/MobileDesktop.js");
//@include("desktop/MobileDesktopToolButtons.js");
//@include("desktop/DesktopKeystrokeAdapter.js");
//@include("desktop/DesktopNavigation.js");
//@include("desktop/Outline.js");
//@include("desktop/DesktopViewButton.js");
//@include("desktop/BreadCrumbNavigation.js");
//@include("menu/Menu.js");
//@include("menu/menus.js");
//@include("form/Form.js");
//@include("messagebox/MessageBox.js");
//@include("form/fields/FormField.js");
//@include("form/fields/ValueField.js");
//@include("form/fields/button/Button.js");
//@include("form/fields/checkbox/CheckBoxField.js");
//@include("form/fields/numberfield/NumberField.js");
//@include("form/fields/stringfield/StringField.js");
//@include("form/fields/groupbox/GroupBox.js");
//@include("form/fields/sequencebox/SequenceBox.js");
//@include("form/fields/tablefield/TableField.js");
//@include("form/fields/treefield/TreeField.js");
//@include("form/fields/tabbox/TabBox.js");
//@include("scrollbar/Scrollbar.js");
//@include("text/DecimalFormat.js");
//@include("text/DateFormat.js");
//@include("util/mobileObjectFactories.js");
}(window.scout = window.scout || {}, jQuery));
