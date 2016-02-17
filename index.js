"use strict";
var isArray = require('lodash.isarray');
var assign = require('lodash.assign');
var forEach = require('lodash.foreach');
var Base = require('class-extend');
var extend = Base.extend;
var ExtendCompose;
var composeWith;
composeWith = function (parent, sub, newproperties, staticProperties) {
    assign(sub, staticProperties);
    assign(sub.prototype, newproperties);
    forEach(sub.prototype, function (method, name) {
        var composed;
        if (undefined === method) {
            return; // already handled
        }
        if ("__" === name.substr(-2)) {
            sub.prototype[name] = undefined;
            name = name.slice(0, -2);
            if (isArray(method)) {
                composed = sub.prototype[name].concat(method);
            } else if ("object" === typeof method) {
                composed = assign({}, sub.prototype[name], method);
            } else {
                composed = function () {
                    var preMethod;
                    var postMethod;
                    var preValue;
                    if (parent.prototype[name]) {
                        preMethod = parent.prototype[name];
                    }
                    postMethod = method;
                    if (preMethod) {
                        preValue = preMethod.apply(this, arguments);
                    }
                    return postMethod.call(this, preValue);
                };
            }
        } else if ("__" === name.substr(0, 2)) {
            sub.prototype[name] = undefined;
            name = name.slice(2);
            if (isArray(method)) {
                composed = method.concat(sub.prototype[name]);
            } else if ("object" === typeof method) {
                composed = assign({}, method, sub.prototype[name]);
            } else {
                composed = function () {
                    var preMethod = method;
                    var methodReturnVal = preMethod.apply(this, arguments);
                    var postMethod;
                    if (parent.prototype[name]) {
                        postMethod = parent.prototype[name];
                    } else {
                        return methodReturnVal;
                    }
                    return postMethod.call(this, methodReturnVal);
                };
            }
        } else {
            return;
        }
        sub.prototype[name] = composed;
    });
};
ExtendCompose = function () {};
ExtendCompose.prototype.middleware = {
    afterPrototype: function () {} // noop
};
ExtendCompose.prototype.exportBuilder = function () {
    var self = this;
    var ecExport = assign(function (protos, statics) {
        var parent = this;
        var sub;
        if (protos instanceof Array) {
            protos = assign.apply(null, [{}].concat(protos));
        }
        sub = extend.call(parent, protos, statics);
        sub.extend = ecExport;
        sub.extendSelf = function () {
            composeWith.apply(this, [
                parent,
                sub
            ].concat(Array.prototype.slice.apply(arguments))); // mutates sub
            self.middleware.afterPrototype(
                parent.prototype,
                protos,
                sub.prototype
            );
            return sub;
        };
        sub.extendSelf(sub.prototype);
        return sub;
    }, {
        withMiddleware: this.withMiddleware.bind(this)
    });
    return ecExport;
};
ExtendCompose.prototype.withMiddleware = function (middleware) {
    var parentEc = this;
    var NewExtendCompose = assign(function () {}, {
        prototype: this
    });
    var newEc = new NewExtendCompose();
    if (middleware.afterPrototype) {
        newEc.middleware = assign({}, assign({}, parentEc.middleware, {
            afterPrototype: function (parentPrototype, childPrototypeBefore, childPrototypeAfter) {
                parentEc.middleware.afterPrototype( // may mutate childPrototypeAfter
                    parentPrototype,
                    childPrototypeBefore,
                    childPrototypeAfter
                );
                middleware.afterPrototype( // may mutate childPrototypeAfter again
                    parentPrototype,
                    childPrototypeBefore,
                    childPrototypeAfter
                );
            }
        }));
    }
    return newEc.exportBuilder();
};
module.exports = new ExtendCompose().exportBuilder();
