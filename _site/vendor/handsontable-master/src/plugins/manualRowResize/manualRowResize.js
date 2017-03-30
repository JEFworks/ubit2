import BasePlugin from './../_base.js';
import {addClass, hasClass, removeClass} from './../../helpers/dom/element';
import {eventManager as eventManagerObject} from './../../eventManager';
import {pageX, pageY} from './../../helpers/dom/event';
import {registerPlugin} from './../../plugins';

// Developer note! Whenever you make a change in this file, make an analogous change in manualRowResize.js

/**
 * @description
 * ManualRowResize Plugin.
 *
 * Has 2 UI components:
 * - handle - the draggable element that sets the desired height of the row.
 * - guide - the helper guide that shows the desired height as a horizontal guide.
 *
 * @plugin ManualRowResize
 */
class ManualRowResize extends BasePlugin {

  constructor(hotInstance) {
    super(hotInstance);

    this.currentTH = null;
    this.currentRow = null;
    this.currentHeight = null;
    this.newSize = null;
    this.startY = null;
    this.startHeight = null;
    this.startOffset = null;
    this.handle = document.createElement('DIV');
    this.guide = document.createElement('DIV');
    this.eventManager = eventManagerObject(this);
    this.pressed = null;
    this.dblclick = 0;
    this.autoresizeTimeout = null;
    this.manualRowHeights = [];

    addClass(this.handle, 'manualRowResizer');
    addClass(this.guide, 'manualRowResizerGuide');
  }

  /**
   * Check if the plugin is enabled in the handsontable settings.
   *
   * @returns {Boolean}
   */
  isEnabled() {
    return this.hot.getSettings().manualRowResize;
  }

  /**
   * Enable plugin for this Handsontable instance.
   */
  enablePlugin() {
    if (this.enabled) {
      return;
    }

    this.manualRowHeights = [];

    let initialRowHeights = this.hot.getSettings().manualRowResize;
    let loadedManualRowHeights = this.loadManualRowHeights();

    if (typeof loadedManualRowHeights != 'undefined') {
      this.manualRowHeights = loadedManualRowHeights;
    } else if (Array.isArray(initialRowHeights)) {
      this.manualRowHeights = initialRowHeights;
    } else {
      this.manualRowHeights = [];
    }

    this.addHook('modifyRowHeight', (height, row) => this.onModifyRowHeight(height, row));

    Handsontable.hooks.register('beforeRowResize');
    Handsontable.hooks.register('afterRowResize');

    this.bindEvents();

    super.enablePlugin();
  }

  /**
   * Update the plugin settings based on handsontable settings.
   */
  updatePlugin() {
    let initialRowHeights = this.hot.getSettings().manualRowResize;

    if (Array.isArray(initialRowHeights)) {
      this.manualRowHeights = initialRowHeights;

    } else if (!initialRowHeights) {
      this.manualRowHeights = [];
    }
  }

  /**
   * Disable plugin for this Handsontable instance.
   */
  disablePlugin() {
    super.disablePlugin();
  }

  /**
   * Save the current sizes using the persistentState plugin.
   */
  saveManualRowHeights() {
    this.hot.runHooks('persistentStateSave', 'manualRowHeights', this.manualRowHeights);
  }

  /**
   * Load the previously saved sizes using the persistentState plugin.
   *
   * @returns {Array}
   */
  loadManualRowHeights() {
    let storedState = {};

    this.hot.runHooks('persistentStateLoad', 'manualRowHeights', storedState);

    return storedState.value;
  }

  /**
   * Set the resize handle position.
   *
   * @param {HTMLCellElement} TH TH HTML element.
   */
  setupHandlePosition(TH) {
    this.currentTH = TH;
    let row = this.hot.view.wt.wtTable.getCoords(TH).row; // getCoords returns WalkontableCellCoords

    if (row >= 0) { // if not col header
      let box = this.currentTH.getBoundingClientRect();

      this.currentRow = row;
      this.startOffset = box.top - 6;
      this.startHeight = parseInt(box.height, 10);
      this.handle.style.left = box.left + 'px';
      this.handle.style.top = this.startOffset + this.startHeight + 'px';
      this.hot.rootElement.appendChild(this.handle);
    }
  }

  /**
   * Refresh the resize handle position.
   */
  refreshHandlePosition() {
    this.handle.style.top = this.startOffset + this.currentHeight + 'px';
  }

  /**
   * Set the resize guide position.
   */
  setupGuidePosition() {
    addClass(this.handle, 'active');
    addClass(this.guide, 'active');

    this.guide.style.top = this.handle.style.top;
    this.guide.style.left = this.handle.style.left;
    this.guide.style.width = this.hot.view.maximumVisibleElementWidth(0) + 'px';
    this.hot.rootElement.appendChild(this.guide);
  }

  /**
   * Refresh the resize guide position.
   */
  refreshGuidePosition() {
    this.guide.style.top = this.handle.style.top;
  }

  /**
   * Hide both the resize handle and resize guide.
   */
  hideHandleAndGuide() {
    removeClass(this.handle, 'active');
    removeClass(this.guide, 'active');
  }

  /**
   * Check if provided element is considered a row header.
   *
   * @param {HTMLElement} element HTML element.
   * @returns {Boolean}
   */
  checkIfRowHeader(element) {
    if (element != this.hot.rootElement) {
      let parent = element.parentNode;

      if (parent.tagName === 'TBODY') {
        return true;
      }

      return this.checkIfRowHeader(parent);
    }

    return false;
  }

  /**
   * Get the TH element from the provided element.
   *
   * @param {HTMLElement} element HTML element.
   * @returns {HTMLElement}
   */
  getTHFromTargetElement(element) {
    if (element.tagName != 'TABLE') {
      if (element.tagName == 'TH') {
        return element;
      } else {
        return this.getTHFromTargetElement(element.parentNode);
      }
    }

    return null;
  }

  /**
   * 'mouseover' event callback - set the handle position.
   *
   * @private
   * @param {MouseEvent} event
   */
  onMouseOver(event) {
    if (this.checkIfRowHeader(event.target)) {
      let th = this.getTHFromTargetElement(event.target);

      if (th) {
        if (!this.pressed) {
          this.setupHandlePosition(th);
        }
      }
    }
  }

  /**
   * Auto-size row after doubleclick - callback.
   *
   * @private
   */
  afterMouseDownTimeout() {
    if (this.dblclick >= 2) {
      let hookNewSize = this.hot.runHooks('beforeRowResize', this.currentRow, this.newSize, true);

      if (hookNewSize !== void 0) {
        this.newSize = hookNewSize;
      }

      this.setManualSize(this.currentRow, this.newSize); // double click sets auto row size

      this.hot.forceFullRender = true;
      this.hot.view.render(); // updates all
      this.hot.view.wt.wtOverlays.adjustElementsSize(true);

      this.hot.runHooks('afterRowResize', this.currentRow, this.newSize, true);
    }
    this.dblclick = 0;
    this.autoresizeTimeout = null;
  }

  /**
   * 'mousedown' event callback.
   *
   * @private
   * @param {MouseEvent} event
   */
  onMouseDown(event) {
    if (hasClass(event.target, 'manualRowResizer')) {
      this.setupGuidePosition();
      this.pressed = this.hot;

      if (this.autoresizeTimeout == null) {
        this.autoresizeTimeout = setTimeout(() => this.afterMouseDownTimeout(), 500);

        this.hot._registerTimeout(this.autoresizeTimeout);
      }
      this.dblclick++;

      this.startY = pageY(event);
      this.newSize = this.startHeight;
    }
  }

  /**
   * 'mousemove' event callback - refresh the handle and guide positions, cache the new row height.
   *
   * @private
   * @param {MouseEvent} event
   */
  onMouseMove(event) {
    if (this.pressed) {
      this.currentHeight = this.startHeight + (pageY(event) - this.startY);
      this.newSize = this.setManualSize(this.currentRow, this.currentHeight);
      this.refreshHandlePosition();
      this.refreshGuidePosition();
    }
  }

  /**
   * 'mouseup' event callback - apply the row resizing.
   *
   * @private
   * @param {MouseEvent} event
   */
  onMouseUp(event) {
    if (this.pressed) {
      this.hideHandleAndGuide();
      this.pressed = false;

      if (this.newSize != this.startHeight) {
        this.hot.runHooks('beforeRowResize', this.currentRow, this.newSize);

        this.hot.forceFullRender = true;
        this.hot.view.render(); // updates all
        this.hot.view.wt.wtOverlays.adjustElementsSize(true);

        this.saveManualRowHeights();

        this.hot.runHooks('afterRowResize', this.currentRow, this.newSize);
      }

      this.setupHandlePosition(this.currentTH);
    }
  }

  /**
   * Bind the mouse events.
   *
   * @private
   */
  bindEvents() {
    this.eventManager.addEventListener(this.hot.rootElement, 'mouseover', (e) => this.onMouseOver(e));
    this.eventManager.addEventListener(this.hot.rootElement, 'mousedown', (e) => this.onMouseDown(e));
    this.eventManager.addEventListener(window, 'mousemove', (e) => this.onMouseMove(e));
    this.eventManager.addEventListener(window, 'mouseup', (e) => this.onMouseUp(e));
  }

  /**
   * Cache the current row height.
   *
   * @param {Number} row Row index.
   * @param {Number} height Row height.
   * @returns {Number}
   */
  setManualSize(row, height) {
    row = this.hot.runHooks('modifyRow', row);
    this.manualRowHeights[row] = height;

    return height;
  }

  /**
   * Modify the provided row height, based on the plugin settings.
   *
   * @private
   * @param {Number} height Row height.
   * @param {Number} row Row index.
   * @returns {Number}
   */
  onModifyRowHeight(height, row) {
    if (this.enabled) {
      let autoRowSizePlugin = this.hot.getPlugin('autoRowSize');
      let autoRowHeightResult = autoRowSizePlugin ? autoRowSizePlugin.heights[row] : null;

      row = this.hot.runHooks('modifyRow', row);

      let manualRowHeight = this.manualRowHeights[row];

      if (manualRowHeight !== void 0 && (manualRowHeight === autoRowHeightResult || manualRowHeight > (height || 0))) {
        return manualRowHeight;
      }
    }

    return height;
  }

}

export {ManualRowResize};

registerPlugin('manualRowResize', ManualRowResize);
