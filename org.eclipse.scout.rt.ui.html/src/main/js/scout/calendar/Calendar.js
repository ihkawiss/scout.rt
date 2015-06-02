// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

// FIXME AWE: (calendar) check bug reported from Michael: switch month when items are still loading (async)
scout.Calendar = function() {
  scout.Calendar.parent.call(this);

  // main elements
  this.$container;
  this.$header;
  this.$range;
  this.$modes;
  this.$yearContainer;
  this.$yearTitle;
  this.$yearList;
  this.$grid;
  this.$list;
  this.$progress;

  // additional modes; should be stored in model
  this._showYearPanel = false;
  this._showListPanel = false;

  /**
   * The narrow view range is different from the regular view range.
   * It contains only dates that exactly match the requested dates,
   * the regular view range contains also dates from the first and
   * next month. The exact range is not sent to the server.
   */
  this._exactRange;

  /**
   * When the list panel is shown, this list contains the scout.CalenderListComponent
   * items visible on the list.
   */
  this._listComponents = [];

  this._addAdapterProperties(['components', 'menus', 'selectedComponent']);
};
scout.inherits(scout.Calendar, scout.ModelAdapter);

scout.Calendar.DisplayMode = {
  DAY: 1,
  WEEK: 2,
  MONTH: 3,
  WORK: 4 // FIXME AWE: (calendar) rename to WORKWEEK
};

/**
 * Used as a multiplier in date calculations back- and forward (in time).
 */
scout.Calendar.Direction = {
  BACKWARD: -1,
  FORWARD: 1
};

scout.Calendar.prototype._isDay = function() {
  return this.displayMode === scout.Calendar.DisplayMode.DAY;
};

scout.Calendar.prototype._isWeek = function() {
  return this.displayMode === scout.Calendar.DisplayMode.WEEK;
};

scout.Calendar.prototype._isMonth = function() {
  return this.displayMode === scout.Calendar.DisplayMode.MONTH;
};

scout.Calendar.prototype._isWork = function() {
  return this.displayMode === scout.Calendar.DisplayMode.WORK;
};

scout.Calendar.prototype.init = function(model, session) {
  scout.Calendar.parent.prototype.init.call(this, model, session);
  this._syncSelectedDate(model.selectedDate);
  this._exactRange = this._calcExactRange();
  this.viewRange = this._calcViewRange();
  // We must send the view-range to the client-model on the server.
  // The view-range is determined by the UI. Thus the calendar cannot
  // be completely initialized without the view-range from the UI.
  this._sendViewRangeChanged();
};

scout.Calendar.prototype._syncSelectedDate = function(dateString) {
  this.selectedDate = scout.dates.create(dateString);
};

scout.Calendar.prototype._syncViewRange = function(viewRange) {
  this.viewRange = new scout.Range(
    scout.dates.create(viewRange.from),
    scout.dates.create(viewRange.to));
};

scout.Calendar.prototype._render = function($parent) {
  $.log.debug('(Calendar#_render)');

  this._$parent = $parent;
  this.$container = this._$parent.appendDiv('calendar');

  var layout = new scout.CalendarLayout(this);
  this.htmlComp = new scout.HtmlComponent(this.$container, this.session);
  this.htmlComp.setLayout(layout);
  this.htmlComp.pixelBasedSizing = false;

  // main elements
  this.$header = this.$container.appendDiv('calendar-header');
  this.$yearContainer = this.$container.appendDiv('calendar-year-container');
  this.$yearTitle = this.$yearContainer.appendDiv('calendar-year-title');
  this.$yearList = this.$yearContainer.appendDiv('calendar-year-list');
  scout.scrollbars.install(this.$yearList);

  this.$grid = this.$container.appendDiv('calendar-grid');
  this.$list = this.$container.appendDiv('calendar-list-container').appendDiv('calendar-list');
  this.$listTitle = this.$list.appendDiv('list-title');

  // header contains all controls
  this.$progress = this.$header.appendDiv('calendar-progress').text('Lade Kalender-Einträge...'); // FIXME AWE: (calendar) i18n
  this.$range = this.$header.appendDiv('calendar-range');
  this.$range.appendDiv('calendar-previous').click(this._onClickPrevious.bind(this));
  this.$range.appendDiv('calendar-today', this.session.text('CalendarToday')).click(this._onClickToday.bind(this));
  this.$range.appendDiv('calendar-next').click(this._onClickNext.bind(this));
  this.$range.appendDiv('calendar-select');

  // ... and modes
  this.$commands = this.$header.appendDiv('calendar-commands');
  this.$commands.appendDiv('calendar-mode-day calendar-mode first', this.session.text('CalendarDay')).attr('data-mode', scout.Calendar.DisplayMode.DAY).click(this._onClickDisplayMode.bind(this));
  this.$commands.appendDiv('calendar-mode-work calendar-mode', this.session.text('CalendarWork')).attr('data-mode', scout.Calendar.DisplayMode.WORK).click(this._onClickDisplayMode.bind(this));
  this.$commands.appendDiv('calendar-mode-week calendar-mode', this.session.text('CalendarWeek')).attr('data-mode', scout.Calendar.DisplayMode.WEEK).click(this._onClickDisplayMode.bind(this));
  this.$commands.appendDiv('calendar-mode-month calendar-mode last', this.session.text('CalendarMonth')).attr('data-mode', scout.Calendar.DisplayMode.MONTH).click(this._onClickDisplayMode.bind(this));
  this.$commands.appendDiv('calendar-toggle-year').click(this._onClickYear.bind(this));
  this.$commands.appendDiv('calendar-toggle-list').click(this._onClickList.bind(this));

  // append the main grid
  for (var w = 0; w < 7; w++) {
    var $w = this.$grid.appendDiv();
    if (w === 0) {
      $w.addClass('calendar-week-header');
    } else {
      $w.addClass('calendar-week');
    }

    for (var d = 0; d < 8; d++) {
      var $d = $w.appendDiv();
      if (w === 0 && d === 0) {
        $d.addClass('calendar-week-name');
      } else if (w === 0 && d > 0) {
        $d.addClass('calendar-day-name');
      } else if (w > 0 && d === 0) {
        $d.addClass('calendar-week-name');
      } else if (w > 0 && d > 0) {
        // FIXME AWE: (calendar) we must also select the clicked day and update the model
        $d.addClass('calendar-day')
          .data('day', d)
          .data('week', w)
          .on('contextmenu', this._onDayContextMenu.bind(this));
      }
    }
  }

  // click event on all day and children elements
  $('.calendar-day', this.$grid).mousedown(this._onMousedownDay.bind(this));
  this._updateScreen();
};

scout.Calendar.prototype._renderProperties = function() {
  this._renderComponents();
  this._renderSelectedComponent();
  this._renderLoadInProgress();
  this._renderMenus();
  this._renderDisplayMode();
  this._renderSelectedDate();
  this._renderViewRange();
};

scout.Calendar.prototype._renderComponents = function() {
  var taskOffset = 5;

  this.components.forEach(function(component) {
    component.remove();
    component.render(this.$container);
    if (component._isTask()) {
      component._arrangeTask(taskOffset);
      taskOffset += 25;
    }
  });
  this._arrangeComponents();
  this._updateListPanel();
};

scout.Calendar.prototype._renderSelectedComponent = function() {
  $.log.debug('(Calendar#_renderSelectedComponent)');
  if (this.selectedComponent) {
    this.selectedComponent.setSelected(true);
  }
};

scout.Calendar.prototype._renderLoadInProgress = function() {
  $.log.debug('(Calendar#_renderLoadInProgress)');
  this.$progress.setVisible(this.loadInProgress);
  if (this.loadInProgress) {
    scout.status.animateStatusMessage(this.$progress, 'Lade Kalender-Einträge...');
  }
};

scout.Calendar.prototype._renderViewRange = function() {
  $.log.debug('(Calendar#_renderViewRange) impl.');
};

scout.Calendar.prototype._renderDisplayMode = function() {
  $.log.debug('(Calendar#_renderDisplayMode) impl.');
};

scout.Calendar.prototype._renderSelectedDate = function() {
  $.log.debug('(Calendar#_renderSelectedDate) impl.');
};

scout.Calendar.prototype._renderMenus = function() {
  // FIXME AWE: (calendar) here we should update the menu-bar (see Table.js)
  $.log.debug('(Calendar#_renderMenus) impl.');
};

/* -- basics, events -------------------------------------------- */

scout.Calendar.prototype._onClickPrevious = function(event) {
  this._navigateDate(scout.Calendar.Direction.BACKWARD);
};

scout.Calendar.prototype._onClickNext = function(event) {
  this._navigateDate(scout.Calendar.Direction.FORWARD);
};

scout.Calendar.prototype._dateParts = function(date, modulo) {
  var parts = {
    year: date.getFullYear(),
    month: date.getMonth(),
    date: date.getDate(),
    day: date.getDay()
  };
  if (modulo) {
    parts.day = (date.getDay() + 6) % 7;
  }
  return parts;
};

scout.Calendar.prototype._navigateDate = function(direction) {
  this.selectedDate = this._calcSelectedDate(direction);
  this._updateModel();
};

scout.Calendar.prototype._calcSelectedDate = function(direction) {
  var p = this._dateParts(this.selectedDate),
    dayOperand = direction,
    weekOperand = direction * 7,
    monthOperand = direction;

  if (this._isDay()) {
    return new Date(p.year, p.month, p.date + dayOperand);
  } else if (this._isWeek() || this._isWork()) {
    return new Date(p.year, p.month, p.date + weekOperand);
  } else if (this._isMonth()) {
    return new Date(p.year, p.month + monthOperand, p.date);
  }
};

scout.Calendar.prototype._updateModel = function() {
  this._exactRange = this._calcExactRange();
  this.viewRange = this._calcViewRange();
  this._sendModelChanged();
  this._updateScreen();
};

/**
 * Calculates exact date range of displayed components based on selected-date.
 */
scout.Calendar.prototype._calcExactRange = function() {
  var from, to,
    p = this._dateParts(this.selectedDate, true);

  if (this._isDay()) {
    from = new Date(p.year, p.month, p.date);
    to = new Date(p.year, p.month, p.date + 1);
  } else if (this._isWeek()) {
    from = new Date(p.year, p.month, p.date - p.day);
    to = new Date(p.year, p.month, p.date - p.day + 6);
  } else if (this._isMonth()) {
    from = new Date(p.year, p.month, 1);
    to = new Date(p.year, p.month + 1, 0);
  } else if (this._isWork()) {
    from = new Date(p.year, p.month, p.date - p.day);
    to = new Date(p.year, p.month, p.date - p.day + 4);
  }

  return new scout.Range(from, to);
};

/**
 * Calculates the view-range, which is what the user sees in the UI.
 * The view-range is wider than the exact-range in the monthly mode,
 * as it contains also dates from the previous and next month.
 */
scout.Calendar.prototype._calcViewRange = function() {
  if (this._isMonth()) {
    var viewFrom = _calcViewFromDate(this._exactRange.from),
      viewTo = _calcViewToDate(viewFrom);
    return new scout.Range(viewFrom, viewTo);
  } else {
    return this._exactRange;
  }

  function _calcViewFromDate(fromDate) {
    var i, tmpDate = new Date(fromDate.valueOf());
    for (i = 0; i < 42; i++) {
      tmpDate.setDate(tmpDate.getDate() - 1);
      if ((tmpDate.getDay() === 1) && tmpDate.getMonth() !== fromDate.getMonth()) {
        return tmpDate;
      }
    }
    throw new Error('failed to calc viewFrom date');
  }

  function _calcViewToDate(fromDate) {
    var i, tmpDate = new Date(fromDate.valueOf());
    for (i = 0; i < 42; i++) {
      tmpDate.setDate(tmpDate.getDate() + 1);
    }
    return tmpDate;
  }
};

scout.Calendar.prototype._onClickToday = function(event) {
  this.selectedDate = new Date();
  this._updateModel();
};

scout.Calendar.prototype._onClickDisplayMode = function(event) {
  var p, displayMode,
    oldDisplayMode = this.displayMode;

  displayMode = $(event.target).data('mode');
  if (oldDisplayMode != displayMode) {
    this.displayMode = displayMode;
    if (this._isWork()) {
      // change date if selectedDate is on a weekend
      p = this._dateParts(this.selectedDate, true);
      if (p.day > 4) {
        this.selectedDate = new Date(p.year, p.month, p.date - p.day + 4);
      }
    }
    this._updateModel();
    this._renderComponents();
  }
};

scout.Calendar.prototype._onClickYear = function(event) {
  this._showYearPanel = !this._showYearPanel;
  this._updateScreen();
};
scout.Calendar.prototype._onClickList = function(event) {
  this._showListPanel = !this._showListPanel;
  this._updateScreen();
};

scout.Calendar.prototype._onMousedownDay = function(event) {
  // we cannot use event.stopPropagation() in CalendarComponent.js because this would
  // prevent context-menus from being closed. With this awkward if-statement we only
  // process the event, when it is not bubbling up from somewhere else (= from mousedown
  // event on component).
  if (event.eventPhase === Event.AT_TARGET) {
    var selectedDate = $(event.delegateTarget).data('date');
    this._setSelection(selectedDate, null);
  }
};

/**
 * @param selectedDate
 * @param selectedComponent may be null when a day is selected
 */
scout.Calendar.prototype._setSelection = function(selectedDate, selectedComponent) {
  var changed = false;

  // selected date
  if (scout.dates.compare(this.selectedDate, selectedDate) !== 0) {
    changed = true;
    $('.calendar-day').each(function(index, element) {
      var $day = $(element),
      date = $day.data('date');
      if (scout.dates.compare(date, this.selectedDate) === 0) {
        $day.select(false); // de-select old date
      } else if (scout.dates.compare(date, selectedDate) === 0) {
        $day.select(true);  // select new date
      }
    }.bind(this));
    this.selectedDate = selectedDate;
  }

  // selected component / part (may be null)
  if (this.selectedComponent != selectedComponent) {
    changed = true;
    if (this.selectedComponent) {
      this.selectedComponent.setSelected(false);
    }
    if (selectedComponent) {
      selectedComponent.setSelected(true);
    }
    this.selectedComponent = selectedComponent;
  }

  if (changed) {
    this._sendSelectionChanged();
    this._colorYear();
    this._updateListPanel();
  }
};

/* --  set display mode and range ------------------------------------- */

scout.Calendar.prototype._sendModelChanged = function() {
  var data = {
    viewRange: this._jsonViewRange(),
    selectedDate: scout.dates.toJsonDate(this.selectedDate),
    displayMode: this.displayMode
  };
  this.session.send(this.id, 'modelChanged', data);
};

scout.Calendar.prototype._sendViewRangeChanged = function() {
  this.session.send(this.id, 'viewRangeChanged', {
    viewRange: this._jsonViewRange()
  });
};

scout.Calendar.prototype._sendSelectionChanged = function() {
  var selectedComponentId = this.selectedComponent ? this.selectedComponent.id : null;
  this.session.send(this.id, 'selectionChanged', {
    date: scout.dates.toJsonDate(this.selectedDate),
    componentId: selectedComponentId
  });
};

scout.Calendar.prototype._jsonViewRange = function() {
  return scout.dates.toJsonDateRange(this.viewRange);
};

scout.Calendar.prototype._updateScreen = function() {
  $.log.info('(Calendar#_updateScreen)');

  // select mode
  $('.calendar-mode', this.$commands).select(false);
  $('[data-mode="' + this.displayMode + '"]', this.$modes).select(true);

  // remove selected day
  $('.selected', this.$grid).select(false);

  // layout grid
  this.layoutLabel();
  this.layoutSize();
  this.layoutAxis();

  // if year shown and changed, redraw year
  if (this.selectedDate.getFullYear() !== this.$yearTitle.data('year') && this._showYearPanel) {
    $('.year-month', this.$yearList).remove();
    this.drawYear();
  }

  this._colorYear();
  this._updateListPanel();
};

scout.Calendar.prototype.layoutSize = function() {
  // reset animation sizes
  $('div', this.$container).removeData(['new-width', 'new-height']);

  // init vars
  var $selected = $('.selected', this.$grid),
    headerH = this.$header.height(),
    gridH = this.$grid.height(),
    gridW = this.$container.width();

  // show or hide year
  $('.calendar-toggle-year', this.$modes).select(this._showYearPanel);
  if (this._showYearPanel) {
    this.$yearContainer.data('new-width', 215);
    gridW -= 215;
  } else {
    this.$yearContainer.data('new-width', 0);
  }

  // show or hide work list
  $('.calendar-toggle-list', this.$modes).select(this._showListPanel);
  if (this._showListPanel) {
    this.$list.parent().data('new-width', 270);
    gridW -= 270;
  } else {
    this.$list.parent().data('new-width', 0);
  }

  // basic grid width
  this.$grid.data('new-width', gridW);

  // layout week
  if (this._isDay() || this._isWeek() || this._isWork()) {
    $('.calendar-week', this.$grid).data('new-height', 0);
    $selected.parent().data('new-height', gridH - headerH);
  } else {
    $('.calendar-week', this.$grid).data('new-height', parseInt((gridH - headerH) / 6, 10));
  }

  // layout days
  if (this._isDay()) {
    $('.calendar-day-name, .calendar-day', this.$grid)
      .data('new-width', 0);
    $('.calendar-day-name:nth-child(' + ($selected.index() + 1) + '), .calendar-day:nth-child(' + ($selected.index() + 1) + ')', this.$grid)
      .data('new-width', gridW - headerH);
  } else if (this._isWork()) {
    $('.calendar-day-name, .calendar-day', this.$grid)
      .data('new-width', 0);
    $('.calendar-day-name:nth-child(-n+6), .calendar-day:nth-child(-n+6)', this.$grid)
      .data('new-width', parseInt((gridW - headerH) / 5, 10));
  } else if (this._isMonth() || this._isWeek()) {
    $('.calendar-day-name, .calendar-day', this.$grid)
      .data('new-width', parseInt((gridW - headerH) / 7, 10));
  }

  // set day-name (based on width of shown column)
  var width = this.$container.width(),
    weekdays;

  if (this._isDay()) {
    width /= 1;
  } else if (this._isWork()) {
    width /= 5;
  } else if (this._isWeek()) {
    width /= 7;
  } else if (this._isMonth()) {
    width /= 7;
  }

  if (width > 100) {
    weekdays = this.session.locale.dateFormat.symbols.weekdaysOrdered;
  } else {
    weekdays = this.session.locale.dateFormat.symbols.weekdaysShortOrdered;
  }

  $('.calendar-day-name', this.$grid).each(function(index) {
    $(this).text(weekdays[index]);
  });

  // animate old to new sizes
  $('div', this.$container).each(function() {
    var $e = $(this),
      w = $e.data('new-width'),
      h = $e.data('new-height');
    if (w !== undefined && w !== $e.width()) {
      $e.animateAVCSD('width', w);
    }
    if (h !== undefined && h !== $e.height()) {
      $e.animateAVCSD('height', h);
    }
  });
};

scout.Calendar.prototype.layoutLabel = function() {
  var text, $dates,
    $selected = $('.selected', this.$grid),
    exFrom = this._exactRange.from,
    exTo = this._exactRange.to;

  // set range text
  if (this._isDay()) {
    text = this._format(exFrom, 'd. MMMM yyyy');
  } else if (this._isWork() || this._isWeek()) {
    if (exFrom.getMonth() === exTo.getMonth()) {
      text = this._format(exFrom, 'd.') + ' bis ' + this._format(exTo, 'd. MMMM yyyy');
    } else if (exFrom.getFullYear() === exTo.getFullYear()) {
      text = this._format(exFrom, 'd. MMMM') + ' bis ' + this._format(exTo, 'd. MMMM yyyy');
    } else {
      text = this._format(exFrom, 'd. MMMM yyyy') + ' bis ' + this._format(exTo, 'd. MMMM yyyy');
    }
  } else if (this._isMonth()) {
    text = this._format(exFrom, 'MMMM yyyy');
  }
  $('.calendar-select', this.$range).text(text);

  // prepare to set all day date and mark selected one
  $dates = $('.calendar-day', this.$grid);

  var w, d, cssClass,
    currentMonth = this._exactRange.from.getMonth(),
    date = new Date(this.viewRange.from.valueOf());

  // loop all days and set value and class
  for (w = 0; w < 6; w++) {
    for (d = 0; d < 7; d++) {
      cssClass = '';
      if ((date.getDay() === 6) || (date.getDay() === 0)) {
        cssClass = date.getMonth() !== currentMonth ? ' weekend-out' : ' weekend';
      }
      else {
        cssClass = date.getMonth() !== currentMonth ? ' out' : '';
      }
      if (scout.dates.isSameDay(date, new Date())) {
        cssClass += ' now';
      }
      if (scout.dates.isSameDay(date, this.selectedDate)) {
        cssClass += ' selected';
      }
      text = this._format(date, 'dd');
      $dates.eq(w * 7 + d)
        .removeClass('weekend-out weekend out selected now')
        .addClass(cssClass)
        .attr('data-day-name', text)
        .data('date', new Date(date.valueOf()));
      date.setDate(date.getDate() + 1);
    }
  }
};

scout.Calendar.prototype.layoutAxis = function() {
  var $e, $selected = $('.selected', this.$grid);

  // remove old axis
  $('.calendar-week-axis, .calendar-week-task', this.$grid).remove();

  // set weekname or day schedule
  if (this._isMonth()) {
    $('.calendar-week-name').each(function(index) {
      if (index > 0) {
        $e = $(this);
        $e.text('KW ' + scout.dates.weekInYear($e.next().data('date')));
      }
    });
  } else {
    $('.calendar-week-name').text('');
    $selected.parent().appendDiv('calendar-week-axis').attr('data-axis-name', '08:00').css('top', this._dayPosition(8) + '%');
    $selected.parent().appendDiv('calendar-week-axis').attr('data-axis-name', '12:00').css('top', this._dayPosition(12) + '%');
    $selected.parent().appendDiv('calendar-week-axis').attr('data-axis-name', '13:00').css('top', this._dayPosition(13) + '%');
    $selected.parent().appendDiv('calendar-week-axis').attr('data-axis-name', '17:00').css('top', this._dayPosition(17) + '%');
    $selected.parent().appendDiv('calendar-week-task').attr('data-axis-name', 'Tasks').css('top', this._dayPosition(-1) + '%');
  }
};

/* -- year, draw and color ---------------------------------------- */

scout.Calendar.prototype.drawYear = function() {
  var first, month, $month, d, day, $day,
    year = this.viewRange.from.getFullYear();

  // append 3 years
  this.$yearTitle
    .data('year', year)
    .empty();

  this.$yearTitle.appendDiv('year-title-item', year - 1)
    .data('year-diff', -1)
    .click(this._onYearClick.bind(this));

  this.$yearTitle.appendDiv('year-title-item selected', year);

  this.$yearTitle.appendDiv('year-title-item', year + 1)
    .data('year-diff', +1)
    .click(this._onYearClick.bind(this));

  // add months and days
  for (month = 0; month < 12; month++) {
    first = new Date(year, month, 1);
    $month = this.$yearList.appendDiv('year-month').attr('data-title', this._format(first, 'MMMM'));
    for (d = 1; d <= 31; d++) {
      day = new Date(year, month, d);

      // stop if day is already out of range
      if (day.getMonth() !== month) {
        break;
      }

      // add div per day
      $day = $month.appendDiv('year-day', d).data('date', day);

      if (day.getDay() === 0 || day.getDay() == 6) {
        $day.addClass('weekend');
      }


      // first day has margin depending on weekday
      if (d === 1) {
        $day.css('margin-left', ((day.getDay() + 6) % 7) * $day.outerWidth());
      }
    }
  }

  // bind events for days divs
  $('.year-day', this.$yearList)
    .click(this._onYearDayClick.bind(this))
    .hover(this._onYearHoverIn.bind(this), this._onYearHoverOut.bind(this));

  // selected has to be visible day

  // update scrollbar
  scout.scrollbars.update(this.$yearList);
};

scout.Calendar.prototype._scrollYear = function() {
  // TODO cru;
  this.$yearList.scrollTop(10000);
};

scout.Calendar.prototype._colorYear = function() {
  // color is only needed if visible
  if (!this._showYearPanel) {
    return;
  }

  // remove color information
  $('.year-day.year-range, .year-day.year-range-day', this.$yearList).removeClass('year-range year-range-day');

  // loop all days and colorize based on range and selected
  var that = this,
    $day, date;

  $('.year-day', this.$yearList).each(function() {
    $day = $(this);
    date = $day.data('date');

    if (!that._isDay() && date >= that._exactRange.from && date <= that._exactRange.to) {
      $day.addClass('year-range');
    }

    if (scout.dates.isSameDay(date, that.selectedDate)) {
      $day.addClass('year-range-day');
    }
  });
};

/* -- year, events ---------------------------------------- */

scout.Calendar.prototype._onYearClick = function(event) {
  var diff = $(event.target).data('year-diff'),
    year = this.selectedDate.getFullYear(),
    month = this.selectedDate.getMonth(),
    date = this.selectedDate.getDate();
  this.selectedDate = new Date(year + diff, month, date);
  this._updateModel();
};

scout.Calendar.prototype._onYearDayClick = function(event) {
  this.selectedDate = $(event.target).data('date');
  this._updateModel();
};

scout.Calendar.prototype._onYearHoverIn = function(event) {
  // init vars
  var $day = $(event.target),
    date1 = $day.data('date'),
    year = date1.getFullYear(),
    month = date1.getMonth(),
    date = date1.getDate(),
    day = (date1.getDay() + 6) % 7,
    that = this,
    startHover,
    endHover,
    $day2, date2;

  // find hover based on mode
  if (this._isDay()) {
    startHover = new Date(year, month, date);
    endHover = new Date(year, month, date);
  } else if (this._isWeek()) {
    startHover = new Date(year, month, date - day);
    endHover = new Date(year, month, date - day + 6);
  } else if (this._isMonth()) {
    startHover = new Date(year, month, 1);
    endHover = new Date(year, month + 1, 0);
  } else if (this._isWork()) {
    startHover = new Date(year, month, date - day);
    endHover = new Date(year, month, date - day + 4);
    // in case of work week: selected date has to be opart of range
    if (date1 > endHover) {
      date1 = endHover;
    }
  }

  // loop days and colorize based on hover start and hover end
  $('.year-day', this.$yearList).each(function() {
    $day2 = $(this);
    date2 = $day2.data('date');
    if (date2 >= startHover && date2 <= endHover) {
      $day2.addClass('year-hover');
    } else {
      $day2.removeClass('year-hover');
    }
    if (scout.dates.isSameDay(date1, date2)) {
      $day2.addClass('year-hover-day');
    }
  });
};

// remove all hover effects
scout.Calendar.prototype._onYearHoverOut = function(event) {
  $('.year-day.year-hover, .year-day.year-hover-day', this.$yearList).removeClass('year-hover year-hover-day');
};


scout.Calendar.prototype._updateListPanel = function() {
  if (this._showListPanel) {

    // remove old list-components
    this._listComponents.forEach(function(listComponent) {
      listComponent.remove();
    });

    this._listComponents = [];
    this._renderListPanel();
  }
};

/**
 * Renders the panel on the left, showing all components of the selected date.
 */
scout.Calendar.prototype._renderListPanel = function() {
  var listComponent, components = [];

  // set title
  this.$listTitle.text(this._format(this.selectedDate, 'd. MMMM yyyy'));

  // find components to display on the list panel
  this.components.forEach(function(component) {
    if (belongsToSelectedDate.call(this, component)) {
      components.push(component);
    }
  }.bind(this));

  // work with for-loop instead of forEach because of return statement
  function belongsToSelectedDate(component) {
    var i, date;
    for (i = 0; i < component.coveredDays.length; i++) {
      date = scout.dates.parseJsonDate(component.coveredDays[i]);
      if (scout.dates.isSameDay(this.selectedDate, date)) {
        return true;
      }
    }
    return false;
  }

  // FIXME AWE: (calendar) sort components in list-panel?
  // $components.sort(this._sortTop);

  components.forEach(function(component) {
    listComponent = new scout.CalendarListComponent(this.selectedDate, component);
    listComponent.render(this.$list);
    this._listComponents.push(listComponent);
  }.bind(this));
};

/* -- components, events-------------------------------------------- */

scout.Calendar.prototype._selectedComponentChanged = function(component, partDay) {
  this._setSelection(partDay, component);
};

scout.Calendar.prototype._onDayContextMenu = function(event) {
  this._showContextMenu(event, 'Calendar.EmptySpace');
};

scout.Calendar.prototype._showContextMenu = function(event, allowedType) {
  event.preventDefault();
  event.stopPropagation();
  var filteredMenus = scout.menus.filter(this.menus, [allowedType]),
  popup = new scout.ContextMenuPopup(this.session, filteredMenus),
    $part = $(event.currentTarget),
    x = event.pageX,
    y = event.pageY;
  popup.$anchor = $part;
  popup.render();
  popup.setLocation(new scout.Point(x, y));
};

/* -- components, arrangement------------------------------------ */

// FIXME AWE/CRU: arrange methods should work on the model, not on the DOM
scout.Calendar.prototype._arrangeComponents = function() {
  var k, $day, $children,
    $days = $('.calendar-day', this.$grid);

  for (k = 0; k < $days.length; k++) {
    $day = $days.eq(k);
    $children = $day.children('.calendar-component:not(.component-task)');

    if (this._isMonth() && $children.length > 2) {
      $day.addClass('many-items');
    } else if (!this._isMonth() && $children.length > 1) {
      // sort based on screen position
      $children.sort(this._sortTop);

      // logical placement
      this._arrangeComponentInitialX($children);
      this._arrangeComponentInitialW($children);
      this._arrangeComponentFindPlacement($children);

      // screen placement
      this._arrangeComponentSetPlacement($children);
    }
  }
};

scout.Calendar.prototype._arrangeComponentInitialX = function($children) {
  var i, j, $child, $test, stackX;
  for (i = 0; i < $children.length; i++) {
    $child = $children.eq(i);
    stackX = 0;
    for (j = 0; j < i; j++) {
      $test = $children.eq(j);
      if (this._intersect($child, $test)) {
        stackX = $test.data('stackX') + 1;
      }
    }
    $child.data('stackX', stackX);
  }
};

scout.Calendar.prototype._arrangeComponentInitialW = function($children) {
  var i, stackX, stackMaxX = 0;
  for (i = 0; i < $children.length; i++) {
    stackX = $children.eq(i).data('stackX');
    if (stackMaxX < stackX) {
      stackMaxX = stackX;
    }
  }
  $children.data('stackW', stackMaxX + 1);
};

scout.Calendar.prototype._arrangeComponentFindPlacement = function($children) {
  // FIXME CRU: placement may be improved, test cases needed
  // 1: change x if column on the left side free
  // 2: change w if place on the right side not used
  // -> then find new w (just use _arrangeComponentInitialW)
};

scout.Calendar.prototype._arrangeComponentSetPlacement = function($children) {
  var i, $child, stackX, stackW;

  // loop and place based on data
  for (i = 0; i < $children.length; i++) {
    $child = $children.eq(i);
    stackX = $child.data('stackX');
    stackW = $child.data('stackW');

    // make last element smaller
    if (stackX < stackW - 1) {
      $child
        .css('width', 'calc(' + (100 / stackW) + '% - 7px)')
        .css('left', 'calc(' + (stackX * 100 / stackW) + '% +  7px)');
    } else {
      $child
        .css('width', 'calc(' + (100 / stackW) + '% - 14px)')
        .css('left', 'calc(' + (stackX * 100 / stackW) + '% +  7px)');
    }
  }
};

/* -- helper ---------------------------------------------------- */

scout.Calendar.prototype._dayPosition = function(hour) {
  if (hour < 0) {
    return 85;
  } else if (hour < 8) {
    return parseInt(hour / 8 * 10 + 5, 10);
  } else if (hour < 12) {
    return parseInt((hour - 8) / 4 * 25 + 15, 10);
  } else if (hour < 13) {
    return parseInt((hour - 12) / 1 * 5 + 40, 10);
  } else if (hour < 17) {
    return parseInt((hour - 13) / 4 * 25 + 45, 10);
  } else if (hour <= 24) {
    return parseInt((hour - 17) / 7 * 10 + 70, 10);
  }
};

scout.Calendar.prototype._hourToNumber = function(hour) {
  var splits = hour.split(':');
  return parseFloat(splits[0]) + parseFloat(splits[1]) / 60;
};

scout.Calendar.prototype._intersect = function($e1, $e2) {
  var comp1 = $e1.data('component'),
    comp2 = $e2.data('component'),
    top1 = this._hourToNumber(this._format(scout.dates.parseJsonDate(comp1.fromDate), 'HH:mm')),
    bottom1 = this._hourToNumber(this._format(scout.dates.parseJsonDate(comp1.toDate), 'HH:mm')),
    top2 = this._hourToNumber(this._format(scout.dates.parseJsonDate(comp2.fromDate), 'HH:mm')),
    bottom2 = this._hourToNumber(this._format(scout.dates.parseJsonDate(comp2.toDate), 'HH:mm'));
  return (top1 >= top2 && top1 <= bottom2) || (bottom1 >= top2 && bottom1 <= bottom2);
};

scout.Calendar.prototype._sortTop = function(a, b) {
  return parseInt($(a).offset().top, 10) > parseInt($(b).offset().top, 10);
};

scout.Calendar.prototype._format = function(date, pattern) {
  return scout.dates.format(date, this.session.locale, pattern);
};
