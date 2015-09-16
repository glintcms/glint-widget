/**********************
 * Module Dependencies.
 *********************/
var debug = require('debug')('glint-widget');
var isBrowser = require('is-browser');
var defaults = require('defaults');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var domify;
/**
 * Expose Widget element.
 */
exports = module.exports = Widget;
inherits(Widget, EventEmitter);

/**
 * Initialize a new `Widget` element.
 */
function Widget(rendr) {
  if (!(this instanceof Widget)) return new Widget(rendr);
  if (rendr && typeof rendr === 'function') this.render(rendr);
  this.init();
}


/****************
 * API Functions.
 ***************/
Widget.prototype.api = Widget.api = 'widget';

['template', 'data', 'render', 'key', 'id', 'selector', 'prepend', 'append', 'el', 'place'].forEach(function(attribute) {
  Widget.prototype[attribute] = function(value) {
    this.emit(attribute, value);
    if (typeof value !== 'undefined') {
      if (attribute == 'place' && this['_' + attribute] == 'both') return this;
      this['_' + attribute] = value;
      return this;
    }
    return this['_' + attribute];
  };
});

Widget.prototype.load = function(context, done) {
  if (typeof context === 'function') done = context, context = undefined;
  done = done || noop;
  var self = this, id = this._id;
  this.emit('pre-load', this);
  // make sure it loads either on the server or in the browser, but not both.
  if (self.skip()) return done();

  // 1. retrieve the data via adapter
  this.ensureData();
  this._data(function(err, result) {
    debug('load', err, result);
    if (err) return done(err);
    if (context) result = defaults(result, context);
    // 2. render with the given data
    self.html = result ? self._render(result) : '';
    self.insert(self.html);
    done(null, self.html, result);
    self.emit('post-load', self);
  });
  return this;
};

Widget.prototype.insert = function(html) {
  var el = this.el();
  if (!isBrowser || !el) return false;

  domify = domify || require('domify');
  if (this._prepend) {
    // prepend
    html = domify(html);
    el.insertBefore(html, el.childNodes[0]);
  } else if (this._append) {
    // append
    html = domify(html);
    el.appendChild(html);
  } else {
    // insert (replace el's html content)
    this.el().innerHTML = html;
  }
  return true;
};


/****************
 * Base Functions.
 ***************/
Widget.prototype.init = function() {
  var self = this;
  this.on('selector', function(selector) {
    // this or self, that's the question
    if (isBrowser && selector) this.el(document.querySelector(selector));
  });
};

Widget.prototype.ensureData = function() {
  if (!this._data) this._data = pass;
};

Widget.prototype.skip = function skip() {
  var p1 = this._place || process.env.GLINT_PLACE || 'server';

  // general rules
  if (p1 == 'force:both') return false;

  if (!isBrowser) {

    // server rules
    if (p1 == 'force:server') return false;
    if (p1 == 'force:browser') return true;
    if (p1 == 'browser') return true;

  } else {

    // browser rules
    if (p1 == 'force:server') return true;
    if (p1 == 'force:browser') return false;
    if (p1 == 'server') return true;

  }

  // default don't skip
  return false;
};

function noop() {
}

function pass(fn) {
  fn(null, {});
}
