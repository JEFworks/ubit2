
import {empty, addClass, hasClass} from './../helpers/dom/element';
import {equalsIgnoreCase} from './../helpers/string';
import {EventManager} from './../eventManager';
import {getRenderer, registerRenderer} from './../renderers';
import {KEY_CODES} from './../helpers/unicode';
import {stopPropagation, stopImmediatePropagation, isImmediatePropagationStopped} from './../helpers/dom/event';

const isListeningKeyDownEvent = new WeakMap();
const BAD_VALUE_CLASS = 'htBadValue';

/**
 * Checkbox renderer
 *
 * @private
 * @renderer CheckboxRenderer
 * @param {Object} instance Handsontable instance
 * @param {Element} TD Table cell where to render
 * @param {Number} row
 * @param {Number} col
 * @param {String|Number} prop Row object property name
 * @param value Value to render (remember to escape unsafe HTML before inserting to DOM!)
 * @param {Object} cellProperties Cell properties (shared by cell renderer and editor)
 */
function checkboxRenderer(instance, TD, row, col, prop, value, cellProperties) {
  const eventManager = new EventManager(instance);
  let input = createInput();
  const labelOptions = cellProperties.label;
  let badValue = false;

  if (typeof cellProperties.checkedTemplate === 'undefined') {
    cellProperties.checkedTemplate = true;
  }
  if (typeof cellProperties.uncheckedTemplate === 'undefined') {
    cellProperties.uncheckedTemplate = false;
  }
  empty(TD); // TODO identify under what circumstances this line can be removed

  if (value === cellProperties.checkedTemplate || equalsIgnoreCase(value, cellProperties.checkedTemplate)) {
    input.checked = true;

  } else if (value === cellProperties.uncheckedTemplate || equalsIgnoreCase(value, cellProperties.uncheckedTemplate)) {
    input.checked = false;

  } else if (value === null) { // default value
    addClass(input, 'noValue');

  } else {
    input.style.display = 'none';
    addClass(input, BAD_VALUE_CLASS);
    badValue = true;
  }
  if (!badValue && labelOptions) {
    let labelText = '';

    if (labelOptions.value) {
      labelText = typeof labelOptions.value === 'function' ? labelOptions.value.call(this, row, col, prop, value) : labelOptions.value;

    } else if (labelOptions.property) {
      labelText = instance.getDataAtRowProp(row, labelOptions.property);
    }
    const label = createLabel(labelText);

    if (labelOptions.position === 'before') {
      label.appendChild(input);
    } else {
      label.insertBefore(input, label.firstChild);
    }
    input = label;
  }
  TD.appendChild(input);

  if (badValue) {
    TD.appendChild(document.createTextNode('#bad-value#'));
  }

  if (cellProperties.readOnly) {
    eventManager.addEventListener(input, 'click', preventDefault);
  } else {
    eventManager.addEventListener(input, 'mousedown', stopPropagation);
    eventManager.addEventListener(input, 'mouseup', stopPropagation);
    eventManager.addEventListener(input, 'change', (event) => {
      instance.setDataAtRowProp(row, prop, event.target.checked ? cellProperties.checkedTemplate : cellProperties.uncheckedTemplate);
    });
  }

  if (!isListeningKeyDownEvent.has(instance)) {
    isListeningKeyDownEvent.set(instance, true);
    instance.addHook('beforeKeyDown', onBeforeKeyDown);
  }

  /**
   * On before key down DOM listener.
   *
   * @private
   * @param {Event} event
   */
  function onBeforeKeyDown(event) {
    const allowedKeys = [
      KEY_CODES.SPACE,
      KEY_CODES.ENTER,
      KEY_CODES.DELETE,
      KEY_CODES.BACKSPACE,
    ];

    if (allowedKeys.indexOf(event.keyCode) !== -1 && !isImmediatePropagationStopped(event)) {
      eachSelectedCheckboxCell(function() {
        stopImmediatePropagation(event);
        event.preventDefault();
      });
    }
    if (event.keyCode == KEY_CODES.SPACE || event.keyCode == KEY_CODES.ENTER) {
      toggleSelected();
    }
    if (event.keyCode == KEY_CODES.DELETE || event.keyCode == KEY_CODES.BACKSPACE) {
      toggleSelected(false);
    }
  }

  /**
   * Toggle checkbox checked property
   *
   * @private
   * @param {Boolean} [checked=null]
   */
  function toggleSelected(checked = null) {
    eachSelectedCheckboxCell(function(checkboxes) {
      for (let i = 0, len = checkboxes.length; i < len; i++) {
        // Block changing checked property on toggle keys (SPACE and ENTER)
        if (hasClass(checkboxes[i], BAD_VALUE_CLASS) && checked === null) {
          return;
        }
        toggleCheckbox(checkboxes[i], checked);
      }
    });
  }

  /**
   * Toggle checkbox element.
   *
   * @private
   * @param {HTMLInputElement} checkbox
   * @param {Boolean} [checked=null]
   */
  function toggleCheckbox(checkbox, checked = null) {
    if (checked === null) {
      checkbox.checked = !checkbox.checked;
    } else {
      checkbox.checked = checked;
    }
    eventManager.fireEvent(checkbox, 'change');
  }

  /**
   * Call callback for each found selected cell with checkbox type.
   *
   * @private
   * @param {Function} callback
   */
  function eachSelectedCheckboxCell(callback) {
    const selRange = instance.getSelectedRange();
    const topLeft = selRange.getTopLeftCorner();
    const bottomRight = selRange.getBottomRightCorner();

    for (let row = topLeft.row; row <= bottomRight.row; row++) {
      for (let col = topLeft.col; col <= bottomRight.col; col++) {
        let cell = instance.getCell(row, col);
        let cellProperties = instance.getCellMeta(row, col);
        let checkboxes = cell.querySelectorAll('input[type=checkbox]');

        if (checkboxes.length > 0 && !cellProperties.readOnly) {
          callback(checkboxes);
        }
      }
    }
  }
}

export {checkboxRenderer};

registerRenderer('checkbox', checkboxRenderer);

/**
 * Create input element.
 *
 * @returns {Node}
 */
function createInput() {
  let input = document.createElement('input');

  input.className = 'htCheckboxRendererInput';
  input.type = 'checkbox';
  input.setAttribute('autocomplete', 'off');

  return input.cloneNode(false);
}

/**
 * Create label element.
 *
 * @returns {Node}
 */
function createLabel(text) {
  let label = document.createElement('label');

  label.className = 'htCheckboxRendererLabel';
  label.appendChild(document.createTextNode(text));

  return label.cloneNode(true);
}

function preventDefault(event) {
  event.preventDefault();
}
