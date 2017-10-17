var util = require('../../../util');
var Item = require('./Item');

/**
 * @constructor ClusterItem
 * @extends Item
 * @param {Array} items             Array of Items contained in the Cluster.
 * @param {{toScreen: function, toTime: function}} conversion
 *                                  Conversion functions from time to screen and vice versa
 * @param {Object} [options]        Configuration options
 *                                  // TODO: describe options
 */
function ClusterItem(items, conversion, options) {
    this.props = {
        // TODO PG: this props concerns the display of the number of items 
        // in the cluster
        size: {
            top: 0,
            width: 0,
            height: 0
        },
        content: {
            width: 0
        }
    };
    this.overflow = false; // if contents can overflow (css styling), this flag is set to true
    this.options = options;
    // TODO PG: build data out of its items
    // Should we compute the basics here?
    var clusterData = {
        type: 'cluster',
        id: util.randomUUID(), // do we need it?
        start: 0, // compute?
        end: 0, // compute?
        content: 'I am a cluster' // compute and take the content of the majoritary range and append "..."
    };

    Item.call(this, clusterData, conversion, options);
}

ClusterItem.prototype = new Item(null, null, null);

ClusterItem.prototype.baseClassName = 'vis-item vis-cluster';

/**
 * Check whether this item is visible inside given range
 *
 * @param {vis.Range} range with a timestamp for start and end
 * @returns {boolean} True if visible
 */
ClusterItem.prototype.isVisible = function (range) {
    // determine visibility
    return (this.data.start < range.end) && (this.data.end > range.start);
};

ClusterItem.prototype._createDomElement = function () {
    if (!this.dom) {
        // create DOM
        this.dom = {};

        // background box
        this.dom.box = document.createElement('div');
        // className is updated in redraw()

        this.dom.size = document.createElement('div');
        this.dom.box.appendChild(this.dom.size)

        // frame box (to prevent the item contents from overflowing)
        this.dom.frame = document.createElement('div');
        this.dom.frame.className = 'vis-item-overflow';
        this.dom.box.appendChild(this.dom.frame);

        // visible frame box (showing the frame that is always visible)
        this.dom.visibleFrame = document.createElement('div');
        this.dom.visibleFrame.className = 'vis-item-visible-frame';
        this.dom.box.appendChild(this.dom.visibleFrame);

        // TODO PG: add a special div to display the number of items in the cluster


        // contents box
        this.dom.content = document.createElement('div');
        this.dom.content.className = 'vis-item-content';
        this.dom.frame.appendChild(this.dom.content);

        // attach this item as attribute
        this.dom.box['timeline-item'] = this;

        this.dirty = true;
    }

}

ClusterItem.prototype._appendDomElement = function () {
    if (!this.parent) {
        throw new Error('Cannot redraw item: no parent attached');
    }
    if (!this.dom.box.parentNode) {
        var foreground = this.parent.dom.foreground;
        if (!foreground) {
            throw new Error('Cannot redraw item: parent has no foreground container element');
        }
        foreground.appendChild(this.dom.box);
    }
    this.displayed = true;
}

ClusterItem.prototype._updateDirtyDomComponents = function () {
    // update dirty DOM. An item is marked dirty when:
    // - the item is not yet rendered
    // - the item's data is changed
    // - the item is selected/deselected
    if (this.dirty) {
        this._updateContents(this.dom.content);
        this._updateDataAttributes(this.dom.box);
        this._updateStyle(this.dom.box);

        var editable = (this.editable.updateTime || this.editable.updateGroup);

        // update class
        var className = (this.data.className ? (' ' + this.data.className) : '') +
            (this.selected ? ' vis-selected' : '') +
            (editable ? ' vis-editable' : ' vis-readonly');
        this.dom.box.className = this.baseClassName + className;
        this.dom.size.className = this.baseClassName + ' vis-size ' + className;

        // turn off max-width to be able to calculate the real width
        // this causes an extra browser repaint/reflow, but so be it
        this.dom.content.style.maxWidth = 'none';
    }
}

ClusterItem.prototype._getDomComponentsSizes = function () {
    // determine from css whether this box has overflow
    this.overflow = window.getComputedStyle(this.dom.frame).overflow !== 'hidden';
    return {
        size: {
            width: this.dom.size.offsetWidth,
            height: this.dom.size.offsetHeight
        },
        content: {
            width: this.dom.content.offsetWidth,
        },
        box: {
            height: this.dom.box.offsetHeight
        }
    }
}

ClusterItem.prototype._updateDomComponentsSizes = function (sizes) {
    this.props.size.width = sizes.size.width;
    this.props.size.height = sizes.size.height;
    this.props.content.width = sizes.content.width;
    this.height = sizes.box.height;
    this.dom.content.style.maxWidth = '';
    this.dirty = false;
}

ClusterItem.prototype._repaintDomAdditionals = function () {
    this._repaintOnItemUpdateTimeTooltip(this.dom.box);
    this._repaintDeleteButton(this.dom.box);
    this._repaintDragCenter();
    this._repaintDragLeft();
    this._repaintDragRight();
}

/**
 * Repaint the item
 * @param {boolean} [returnQueue=false]  return the queue
 * @return {boolean} the redraw queue if returnQueue=true
 */
ClusterItem.prototype.redraw = function (returnQueue) {
    var sizes;
    var queue = [
        // create item DOM
        this._createDomElement.bind(this),

        // append DOM to parent DOM
        this._appendDomElement.bind(this),

        // update dirty DOM 
        this._updateDirtyDomComponents.bind(this),

        (function () {
            if (this.dirty) {
                sizes = this._getDomComponentsSizes.bind(this)();
            }
        }).bind(this),

        (function () {
            if (this.dirty) {
                this._updateDomComponentsSizes.bind(this)(sizes);
            }
        }).bind(this),

        // repaint DOM additionals
        this._repaintDomAdditionals.bind(this)
    ];

    if (returnQueue) {
        return queue;
    } else {
        var result;
        queue.forEach(function (fn) {
            result = fn();
        });
        return result;
    }
};

/**
 * Show the item in the DOM (when not already visible). The items DOM will
 * be created when needed.
 */
ClusterItem.prototype.show = function () {
    if (!this.displayed) {
        this.redraw();
    }
};

/**
 * Hide the item from the DOM (when visible)
 */
ClusterItem.prototype.hide = function () {
    if (this.displayed) {
        var box = this.dom.box;

        if (box.parentNode) {
            box.parentNode.removeChild(box);
        }

        this.displayed = false;
    }
};

/**
 * Reposition the item horizontally
 * @param {boolean} [limitSize=true] If true (default), the width of the range
 *                                   item will be limited, as the browser cannot
 *                                   display very wide divs. This means though
 *                                   that the applied left and width may
 *                                   not correspond to the ranges start and end
 * @Override
 */
ClusterItem.prototype.repositionX = function (limitSize) {
    var parentWidth = this.parent.width;
    var start = this.conversion.toScreen(this.data.start);
    var end = this.conversion.toScreen(this.data.end);
    var align = this.data.align === undefined ? this.options.align : this.data.align;
    var contentStartPosition;
    var contentWidth;

    // limit the width of the range, as browsers cannot draw very wide divs
    // unless limitSize: false is explicitly set in item data
    if (this.data.limitSize !== false && (limitSize === undefined || limitSize === true)) {
        if (start < -parentWidth) {
            start = -parentWidth;
        }
        if (end > 2 * parentWidth) {
            end = 2 * parentWidth;
        }
    }

    // add 0.5 to compensate floating-point values rounding
    var boxWidth = Math.max(end - start + 0.5, 1);

    if (this.overflow) {
        if (this.options.rtl) {
            this.right = start;
        } else {
            this.left = start;
        }
        this.width = boxWidth + this.props.content.width;
        contentWidth = this.props.content.width;

        // Note: The calculation of width is an optimistic calculation, giving
        //       a width which will not change when moving the Timeline
        //       So no re-stacking needed, which is nicer for the eye;
    }
    else {
        if (this.options.rtl) {
            this.right = start;
        } else {
            this.left = start;
        }
        this.width = boxWidth;
        contentWidth = Math.min(end - start, this.props.content.width);
    }

    if (this.options.rtl) {
        this.dom.box.style.right = this.right + 'px';
    } else {
        this.dom.box.style.left = this.left + 'px';
    }
    this.dom.box.style.width = boxWidth + 'px';

    switch (align) {
        case 'left':
            if (this.options.rtl) {
                this.dom.content.style.right = '0';
            } else {
                this.dom.content.style.left = '0';
            }
            break;

        case 'right':
            if (this.options.rtl) {
                this.dom.content.style.right = Math.max((boxWidth - contentWidth), 0) + 'px';
            } else {
                this.dom.content.style.left = Math.max((boxWidth - contentWidth), 0) + 'px';
            }
            break;

        case 'center':
            if (this.options.rtl) {
                this.dom.content.style.right = Math.max((boxWidth - contentWidth) / 2, 0) + 'px';
            } else {
                this.dom.content.style.left = Math.max((boxWidth - contentWidth) / 2, 0) + 'px';
            }

            break;

        default: // 'auto'
            // when range exceeds left of the window, position the contents at the left of the visible area
            if (this.overflow) {
                if (end > 0) {
                    contentStartPosition = Math.max(-start, 0);
                }
                else {
                    contentStartPosition = -contentWidth; // ensure it's not visible anymore
                }
            }
            else {
                if (start < 0) {
                    contentStartPosition = -start;
                }
                else {
                    contentStartPosition = 0;
                }
            }
            if (this.options.rtl) {
                this.dom.content.style.right = contentStartPosition + 'px';
            } else {
                this.dom.content.style.left = contentStartPosition + 'px';
                this.dom.content.style.width = 'calc(100% - ' + contentStartPosition + 'px)';
            }
    }
};

/**
 * Reposition the item vertically
 * @Override
 */
ClusterItem.prototype.repositionY = function () {
    var orientation = this.options.orientation.item;
    var box = this.dom.box;

    if (orientation == 'top') {
        box.style.top = this.top + 'px';
    }
    else {
        box.style.top = (this.parent.height - this.top - this.height) + 'px';
    }
};

/**
 * Repaint a drag area on the left side of the range when the range is selected
 * @protected
 */
ClusterItem.prototype._repaintDragLeft = function () {
    if ((this.selected || this.options.itemsAlwaysDraggable.range) && this.options.editable.updateTime && !this.dom.dragLeft) {
        // create and show drag area
        var dragLeft = document.createElement('div');
        dragLeft.className = 'vis-drag-left';
        dragLeft.dragLeftItem = this;

        this.dom.box.appendChild(dragLeft);
        this.dom.dragLeft = dragLeft;
    }
    else if (!this.selected && !this.options.itemsAlwaysDraggable.range && this.dom.dragLeft) {
        // delete drag area
        if (this.dom.dragLeft.parentNode) {
            this.dom.dragLeft.parentNode.removeChild(this.dom.dragLeft);
        }
        this.dom.dragLeft = null;
    }
};

/**
 * Repaint a drag area on the right side of the range when the range is selected
 * @protected
 */
ClusterItem.prototype._repaintDragRight = function () {
    if ((this.selected || this.options.itemsAlwaysDraggable.range) && this.options.editable.updateTime && !this.dom.dragRight) {
        // create and show drag area
        var dragRight = document.createElement('div');
        dragRight.className = 'vis-drag-right';
        dragRight.dragRightItem = this;

        this.dom.box.appendChild(dragRight);
        this.dom.dragRight = dragRight;
    }
    else if (!this.selected && !this.options.itemsAlwaysDraggable.range && this.dom.dragRight) {
        // delete drag area
        if (this.dom.dragRight.parentNode) {
            this.dom.dragRight.parentNode.removeChild(this.dom.dragRight);
        }
        this.dom.dragRight = null;
    }
};

module.exports = ClusterItem;
