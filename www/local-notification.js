/*
 * Apache 2.0 License
 *
 * Copyright (c) Sebastian Katzer 2017
 *
 * This file contains Original Code and/or Modifications of Original Code
 * as defined in and that are subject to the Apache License
 * Version 2.0 (the 'License'). You may not use this file except in
 * compliance with the License. Please obtain a copy of the License at
 * http://opensource.org/licenses/Apache-2.0/ and read it before using this
 * file.
 *
 * The Original Code and all software distributed under the License are
 * distributed on an 'AS IS' basis, WITHOUT WARRANTY OF ANY KIND, EITHER
 * EXPRESS OR IMPLIED, AND APPLE HEREBY DISCLAIMS ALL SUCH WARRANTIES,
 * INCLUDING WITHOUT LIMITATION, ANY WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, QUIET ENJOYMENT OR NON-INFRINGEMENT.
 * Please see the License for the specific language governing rights and
 * limitations under the License.
 */

var exec    = require('cordova/exec'),
    channel = require('cordova/channel');

// Defaults
exports._defaults = {
    actions       : [],
    attachments   : [],
    autoClear     : true,
    badge         : null,
    channel       : null,
    clock         : true,
    color         : null,
    data          : null,
    defaults      : 0,
    foreground    : null,
    group         : null,
    groupSummary  : false,
    icon          : null,
    iconType      : null,
    id            : 0,
    launch        : true,
    led           : true,
    lockscreen    : true,
    mediaSession  : null,
    number        : 0,
    priority      : 0,
    progressBar   : false,
    silent        : false,
    smallIcon     : 'res://icon',
    sound         : true,
    sticky        : false,
    summary       : null,
    text          : '',
    timeoutAfter  : false,
    title         : '',
    trigger       : { type : 'calendar' },
    vibrate       : false,
    wakeup        : true
};

// Event listener
exports._listener = {};

/**
 * Check permission to show notifications.
 *
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.hasPermission = function (callback, scope) {
    this._exec('check', null, callback, scope);
};

/**
 * Request permission to show notifications.
 *
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.requestPermission = function (callback, scope) {
    this._exec('request', null, callback, scope);
};

/**
 * Schedule notifications.
 *
 * @param [ Array ]    notifications The notifications to schedule.
 * @param [ Function ] callback      The function to be exec as the callback.
 * @param [ Object ]   scope         The callback function's scope.
 * @param [ Object ]   args          Optional flags how to schedule.
 *
 * @return [ Void ]
 */
exports.schedule = function (msgs, callback, scope, args) {
    var fn = function (granted) {
        var toasts = this._toArray(msgs);

        if (!granted && callback) {
            callback.call(scope || this, false);
            return;
        }

        for (var i = 0, len = toasts.length; i < len; i++) {
            var toast = toasts[i];
            this._mergeWithDefaults(toast);
            this._convertProperties(toast);
        }

        this._exec('schedule', toasts, callback, scope);
    };

    if (args && args.skipPermission) {
        fn.call(this, true);
    } else {
        this.requestPermission(fn, this);
    }
};

/**
 * Schedule notifications.
 *
 * @param [ Array ]    notifications The notifications to schedule.
 * @param [ Function ] callback      The function to be exec as the callback.
 * @param [ Object ]   scope         The callback function's scope.
 * @param [ Object ]   args          Optional flags how to schedule.
 *
 * @return [ Void ]
 */
exports.update = function (msgs, callback, scope, args) {
    var fn = function(granted) {
        var toasts = this._toArray(msgs);

        if (!granted && callback) {
            callback.call(scope || this, false);
            return;
        }

        for (var i = 0, len = toasts.length; i < len; i++) {
            this._convertProperties(toasts[i]);
        }

        this._exec('update', toasts, callback, scope);
    };

    if (args && args.skipPermission) {
        fn.call(this, true);
    } else {
        this.requestPermission(fn, this);
    }
};

/**
 * Clear the specified notifications by id.
 *
 * @param [ Array<Int> ] ids      The IDs of the notifications.
 * @param [ Function ]   callback The function to be exec as the callback.
 * @param [ Object ]     scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.clear = function (ids, callback, scope) {
    ids = this._toArray(ids);
    ids = this._convertIds(ids);

    this._exec('clear', ids, callback, scope);
};

/**
 * Clear all triggered notifications.
 *
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.clearAll = function (callback, scope) {
    this._exec('clearAll', null, callback, scope);
};

/**
 * Clear the specified notifications by id.
 *
 * @param [ Array<Int> ] ids      The IDs of the notifications.
 * @param [ Function ]   callback The function to be exec as the callback.
 * @param [ Object ]     scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.cancel = function (ids, callback, scope) {
    ids = this._toArray(ids);
    ids = this._convertIds(ids);

    this._exec('cancel', ids, callback, scope);
};

/**
 * Cancel all scheduled notifications.
 *
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.cancelAll = function (callback, scope) {
    this._exec('cancelAll', null, callback, scope);
};

/**
 * Check if a notification is present.
 *
 * @param [ Int ]      id       The ID of the notification.
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.isPresent = function (id, callback, scope) {
    var fn = this._createCallbackFn(callback, scope);

    this.getType(id, function (type) {
        fn(type != 'unknown');
    });
};

/**
 * Check if a notification is scheduled.
 *
 * @param [ Int ]      id       The ID of the notification.
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.isScheduled = function (id, callback, scope) {
    this.hasType(id, 'scheduled', callback, scope);
};

/**
 * Check if a notification was triggered.
 *
 * @param [ Int ]      id       The ID of the notification.
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.isTriggered = function (id, callback, scope) {
    this.hasType(id, 'triggered', callback, scope);
};

/**
 * Check if a notification has a given type.
 *
 * @param [ Int ]      id       The ID of the notification.
 * @param [ String ]   type     The type of the notification.
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.hasType = function (id, type, callback, scope) {
    var fn = this._createCallbackFn(callback, scope);

    this.getType(id, function (type2) {
        fn(type == type2);
    });
};

/**
 * Get the type (triggered, scheduled) for the notification.
 *
 * @param [ Int ]      id       The ID of the notification.
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.getType = function (id, callback, scope) {
    this._exec('type', id, callback, scope);
};

/**
 * List of all notification ids.
 *
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.getIds = function (callback, scope) {
    this._exec('ids', 0, callback, scope);
};

/**
 * List of all scheduled notification IDs.
 *
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.getScheduledIds = function (callback, scope) {
    this._exec('ids', 1, callback, scope);
};

/**
 * List of all triggered notification IDs.
 *
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.getTriggeredIds = function (callback, scope) {
    this._exec('ids', 2, callback, scope);
};

/**
 * List of local notifications specified by id.
 * If called without IDs, all notification will be returned.
 *
 * @param [ Array<Int> ] ids      The IDs of the notifications.
 * @param [ Function ]   callback The function to be exec as the callback.
 * @param [ Object ]     scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.get = function () {
    var args = Array.apply(null, arguments);

    if (typeof args[0] == 'function') {
        args.unshift([]);
    }

    var ids      = args[0],
        callback = args[1],
        scope    = args[2];

    if (!Array.isArray(ids)) {
        this._exec('notification', Number(ids), callback, scope);
        return;
    }

    ids = this._convertIds(ids);

    this._exec('notifications', [3, ids], callback, scope);
};

/**
 * List for all notifications.
 *
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.getAll = function (callback, scope) {
    this._exec('notifications', 0, callback, scope);
};

/**
 * List of all scheduled notifications.
 *
 * @param [ Function ]   callback The function to be exec as the callback.
 * @param [ Object ]     scope    The callback function's scope.
 */
exports.getScheduled = function (callback, scope) {
    this._exec('notifications', 1, callback, scope);
};

/**
 * List of all triggered notifications.
 *
 * @param [ Function ]   callback The function to be exec as the callback.
 * @param [ Object ]     scope    The callback function's scope.
 */
exports.getTriggered = function (callback, scope) {
    this._exec('notifications', 2, callback, scope);
};

/**
 * Add an group of actions by id.
 *
 * @param [ String ]   id       The Id of the group.
 * @param [ Array]     actions  The action config settings.
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.addActions = function (id, actions, callback, scope) {
    this._exec('actions', [0, id, actions], callback, scope);
};

/**
 * Remove an group of actions by id.
 *
 * @param [ String ]   id       The Id of the group.
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.removeActions = function (id, callback, scope) {
    this._exec('actions', [1, id], callback, scope);
};

/**
 * Check if a group of actions is defined.
 *
 * @param [ String ]   id       The Id of the group.
 * @param [ Function ] callback The function to be exec as the callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.hasActions = function (id, callback, scope) {
    this._exec('actions', [2, id], callback, scope);
};

/**
 * The (platform specific) default settings.
 *
 * @return [ Object ]
 */
exports.getDefaults = function () {
    var map = Object.assign({}, this._defaults);

    for (var key in map) {
        if (Array.isArray(map[key])) {
            map[key] = Array.from(map[key]);
        } else
        if (Object.prototype.isPrototypeOf(map[key])) {
            map[key] = Object.assign({}, map[key]);
        }
    }

    return map;
};

/**
 * Overwrite default settings.
 *
 * @param [ Object ] newDefaults New default values.
 *
 * @return [ Void ]
 */
exports.setDefaults = function (newDefaults) {
    Object.assign(this._defaults, newDefaults);
};

/**
 * Register callback for given event.
 *
 * @param [ String ]   event    The name of the event.
 * @param [ Function ] callback The function to be exec as callback.
 * @param [ Object ]   scope    The callback function's scope.
 *
 * @return [ Void ]
 */
exports.on = function (event, callback, scope) {
    var type = typeof callback;

    if (type !== 'function' && type !== 'string')
        return;

    if (!this._listener[event]) {
        this._listener[event] = [];
    }

    var item = [callback, scope || window];

    this._listener[event].push(item);
};

/**
 * Unregister callback for given event.
 *
 * @param [ String ]   event    The name of the event.
 * @param [ Function ] callback The function to be exec as callback.
 *
 * @return [ Void ]
 */
exports.un = function (event, callback) {
    var listener = this._listener[event];

    if (!listener)
        return;

    for (var i = 0; i < listener.length; i++) {
        var fn = listener[i][0];

        if (fn == callback) {
            listener.splice(i, 1);
            break;
        }
    }
};

/**
 * Fire the event with given arguments.
 *
 * @param [ String ] event The event's name.
 * @param [ *Array]  args  The callback's arguments.
 *
 * @return [ Void]
 */
exports.fireEvent = function (event) {
    var args     = Array.apply(null, arguments).slice(1),
        listener = this._listener[event];

    if (!listener)
        return;

    if (args[0] && typeof args[0].data === 'string') {
        args[0].data = JSON.parse(args[0].data);
    }

    for (var i = 0; i < listener.length; i++) {
        var fn    = listener[i][0],
            scope = listener[i][1];

        if (typeof fn !== 'function') {
            fn = scope[fn];
        }

        fn.apply(scope, args);
    }
};

/**
 * Fire queued events once the device is ready and all listeners are registered.
 *
 * @return [ Void ]
 */
exports.fireQueuedEvents = function() {
    exports._exec('ready');
};

/**
 * Merge custom properties with the default values.
 *
 * @param [ Object ] options Set of custom values.
 *
 * @retrun [ Object ]
 */
exports._mergeWithDefaults = function (options) {
    var values = this.getDefaults();

    if (values.hasOwnProperty('sticky')) {
        options.sticky = this._getValueFor(options, 'sticky', 'ongoing');
    }

    if (options.sticky && options.autoClear !== true) {
        options.autoClear = false;
    }

    Object.assign(values, options);

    for (var key in values) {
        if (values[key] !== null) {
            options[key] = values[key];
        } else {
            delete options[key];
        }

        if (!this._defaults.hasOwnProperty(key)) {
            console.warn('Unknown property: ' + key);
        }
    }

    options.meta = {
        plugin:  'cordova-plugin-local-notification',
        version: '0.9-beta.3'
    };

    return options;
};

/**
 * Convert the passed values to their required type.
 *
 * @param [ Object ] options Properties to convert for.
 *
 * @return [ Object ] The converted property list
 */
exports._convertProperties = function (options) {
    var parseToInt = function (prop, options) {
        if (isNaN(options[prop])) {
            console.warn(prop + ' is not a number: ' + options[prop]);
            return this._defaults[prop];
        } else {
            return Number(options[prop]);
        }
    };

    if (options.id) {
        options.id = parseToInt('id', options);
    }

    if (options.title) {
        options.title = options.title.toString();
    }

    if (options.badge) {
        options.badge = parseToInt('badge', options);
    }

    if (options.defaults) {
        options.defaults = parseToInt('defaults', options);
    }

    if (options.smallIcon && !options.smallIcon.match(/^res:/)) {
        console.warn('Property "smallIcon" must be of kind res://...');
    }

    if (typeof options.timeoutAfter === 'boolean') {
        options.timeoutAfter = options.timeoutAfter ? 3600000 : null;
    }

    if (options.timeoutAfter) {
        options.timeoutAfter = parseToInt('timeoutAfter', options);
    }

    options.data = JSON.stringify(options.data);

    this._convertPriority(options);
    this._convertTrigger(options);
    this._convertActions(options);
    this._convertProgressBar(options);

    return options;
};

/**
 * Convert the passed values for the priority to their required type.
 *
 * @param [ Map ] options Set of custom values.
 *
 * @return [ Map ] Interaction object with trigger spec.
 */
exports._convertPriority = function (options) {
    var prio = options.priority || options.prio || 0;

    if (typeof prio === 'string') {
        prio = { min: -2, low: -1, high: 1, max: 2 }[prio] || 0;
    }

    if (options.foreground === true) {
        prio = Math.max(prio, 1);
    }

    if (options.foreground === false) {
        prio = Math.min(prio, 0);
    }

    options.priority = prio;

    return options;
};

/**
 * Convert the passed values to their required type, modifying them
 * directly for Android and passing the converted list back for iOS.
 *
 * @param [ Map ] options Set of custom values.
 *
 * @return [ Map ] Interaction object with category & actions.
 */
exports._convertActions = function (options) {
    var actions = [];

    if (!options.actions || typeof options.actions === 'string')
        return options;

    for (var i = 0, len = options.actions.length; i < len; i++) {
        var action = options.actions[i];

        if (!action.id) {
            console.warn('Action with title ' + action.title + ' ' +
                         'has no id and will not be added.');
            continue;
        }

        action.id = action.id.toString();

        actions.push(action);
    }

    options.actions = actions;

    return options;
};

/**
 * Convert the passed values for the trigger to their required type.
 *
 * @param [ Map ] options Set of custom values.
 *
 * @return [ Map ] Interaction object with trigger spec.
 */
exports._convertTrigger = function (options) {
    var trigger  = options.trigger || {},
        date     = this._getValueFor(trigger, 'at', 'firstAt', 'date');

    var dateToNum = function (date) {
        var num = typeof date == 'object' ? date.getTime() : date;
        return Math.round(num);
    };

    if (!options.trigger)
        return;

    if (!trigger.type) {
        trigger.type = trigger.center ? 'location' : 'calendar';
    }

    var isCal = trigger.type == 'calendar';

    if (isCal && !date) {
        date = this._getValueFor(options, 'at', 'firstAt', 'date');
    }

    if (isCal && !trigger.every && options.every) {
        trigger.every = options.every;
    }

    if (isCal && (trigger.in || trigger.every)) {
        date = null;
    }

    if (isCal && date) {
        trigger.at = dateToNum(date);
    }

    if (isCal && trigger.firstAt) {
        trigger.firstAt = dateToNum(trigger.firstAt);
    }

    if (isCal && trigger.before) {
        trigger.before = dateToNum(trigger.before);
    }

    if (isCal && trigger.after) {
        trigger.after = dateToNum(trigger.after);
    }

    if (!trigger.count && device.platform == 'windows') {
        trigger.count = trigger.every ? 5 : 1;
    }

    if (trigger.count && device.platform == 'iOS') {
        console.warn('trigger: { count: } is not supported on iOS.');
    }

    if (!isCal) {
        trigger.notifyOnEntry = !!trigger.notifyOnEntry;
        trigger.notifyOnExit  = trigger.notifyOnExit === true;
        trigger.radius        = trigger.radius || 5;
        trigger.single        = !!trigger.single;
    }

    if (!isCal || trigger.at) {
        delete trigger.every;
    }

    delete options.every;
    delete options.at;
    delete options.firstAt;
    delete options.date;

    options.trigger = trigger;

    return options;
};