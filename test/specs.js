"use strict";
var assert = require('assert');
var sinon = require('sinon');
var omit = require('lodash.omit');
var assign = require('lodash.assign');
var extendCompose = require('..');
var Base = require('class-extend');
var extend = Base.extend;
describe("extendCompose", function () {
    var SubClass;
    var ParentClass;
    var subClass;
    var View;
    var sandbox;
    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        View = Base.extend({
            constructor: function () {
                this.initialize.apply(this, arguments);
            },
            initialize: function () {},
            render: function () {}
        });
        ParentClass = View.extend({
            myMethod : function () {
                return Array.prototype.slice.call(arguments, 0).join(' ');
            },
            myOtherMethod : function () {
                return  Array.prototype.slice.call(arguments).reduce(function (a, b) {
                    return a + b;
                }, 0);
            }
        }, { // this section extends static methods
            extend: extendCompose
        });
        SubClass = ParentClass.extend({
            render__ : function () { },
            myMethod__ : function (fullName) { // gets composed with ParentClass.prototype.myMethod
                return fullName;
            }
        });
        subClass = new SubClass();
    });
    afterEach(function () {
        sandbox.restore();
    });
    describe('applyMiddleware', () => {
        describe('afterPrototype', () => {
            let childPrototype;
            let parentPrototype;
            let MyConstructor;
            beforeEach(function () {
                childPrototype = {foo: true};
                parentPrototype = {bar: true};
                MyConstructor = function () {};
                MyConstructor.prototype = parentPrototype;
            });
            it('should supply the modifier with the parent prototype, child prototype before composition, and child prototype after composition', () => {
                let middlewareRan = false;
                let ExtendedConstructor;
                let exextendcompose = extendCompose.withMiddleware({
                    afterPrototype: function (
                        parentPrototype,
                        childPrototypeBefore,
                        childPrototypeAfter
                    ) {
                        middlewareRan = true;
                        assert.strictEqual(parentPrototype, parentPrototype);
                        assert.strictEqual(childPrototypeBefore, childPrototype);
                        assert.deepEqual(omit(childPrototypeAfter, 'constructor'), {foo: true, bar: true});
                    }
                });
                ExtendedConstructor = exextendcompose.call(MyConstructor, childPrototype);
                assert(middlewareRan);
            });
            it('should use the same prototype object instead of whatever afterPrototype returns', () => {
                let passedChildPrototype;
                let ExtendedView = extendCompose.withMiddleware({
                    afterPrototype: (
                        parentPrototype,
                        childPrototypeBefore,
                        childPrototypeAfter
                    ) => passedChildPrototype = childPrototypeAfter
                }).call(View.extend());
                assert.strictEqual(ExtendedView.prototype, passedChildPrototype);
            });
            it('should compose with previously applied middleware', () => {
                let extendComposeWithMiddleware = extendCompose.withMiddleware({
                    afterPrototype: (
                        parentPrototype,
                        childPrototypeBefore,
                        childPrototypeAfter
                    ) => {
                        childPrototypeAfter.fizz = 1;
                        childPrototypeAfter.buzz = true;
                    }
                }).withMiddleware({
                    afterPrototype: (
                        parentPrototype,
                        childPrototypeBefore,
                        childPrototypeAfter
                    ) => childPrototypeAfter.fizz = 2
                });
                let ExtendedView = extendComposeWithMiddleware.call(MyConstructor);
                assert.equal(ExtendedView.prototype.fizz, 2);
                assert.equal(ExtendedView.prototype.buzz, true);
            });
            it('should continue operating for subclasses', () => {
                const extendedExtendCompose = extendCompose.withMiddleware({
                    afterPrototype: (
                        parentPrototype,
                        childPrototypeBefore,
                        childPrototypeAfter
                    ) => childPrototypeAfter.fizz = true
                });
                const MySubclass = extendedExtendCompose.call(MyConstructor, {});
                const MySubSubclass = MySubclass.extend({});
                const myInstance = new MySubSubclass();
                assert.equal(myInstance.fizz, true);
            });
        });
    });
    it("should receive the return value from the parents method as an argument to the subclass method", function () {
        assert.equal(subClass.myMethod('thomas', 'hallock'), 'thomas hallock');
    });
    it("should be extended with a static method called extendSelf", function () {
        assert.equal(typeof SubClass.extendSelf, 'function');
    });
    it("should be able to use extendSelf as a property to extend its own prototype", function () {
        SubClass.extendSelf({
            myOtherMethod__ : function (x) {
                return x * x;
            }
        });
        var otherInstance = new SubClass();
        assert.equal(otherInstance.myOtherMethod(1, 2, 3, 4), Math.pow(1 + 2 + 3 + 4, 2));
    });
    it("should be abel to use extendSelf to add static properties", function () {
        SubClass.extendSelf(null, {staticProperty: 1234});
        assert.equal(SubClass.staticProperty, 1234);
    });
    it("should compose with the extended method, even when it is not a method of the direct parent", function () {
        var subClass = new SubClass();
        sandbox.stub(View.prototype, 'render');
        subClass.render();
        sinon.assert.calledOnce(View.prototype.render);
    });
    it("should call the composed init of the subclass", function () {
        var initSpy = sinon.spy();
        var NonInittedSubClass = ParentClass.extend({
            initialize__ : initSpy
        });
        assert.strictEqual(initSpy.callCount, 0);
        new NonInittedSubClass();
        sinon.assert.calledOnce(initSpy);
    });
    it("should extend using an array of prototype objects by extendComposing on each element of the array", function () {
        var foo = sinon.spy();
        var bar = sinon.spy();
        var fooToo = sinon.spy();
        var barToo = sinon.spy();
        var FB = extendCompose.call(View, [
            {
                foo : foo
            }, {
                bar : bar
            }
        ]);
        var FBToo = FB.extend([
            {
                foo__ : fooToo
            }, {
                bar__ : barToo
            }
        ]);
        var fbt = new FBToo();
        fbt.foo();
        sinon.assert.called(foo)
        sinon.assert.called(foo);
        sinon.assert.called(fooToo);
        sinon.assert.notCalled(bar);
        sinon.assert.notCalled(barToo);
        fbt.bar();
        sinon.assert.called(bar);
        sinon.assert.called(barToo);
    });
    it("should not clobber any objects passed in the array to extend", function () {
        var fooObj = {foo: 2};
        var barObj = {bar: 3};
        extendCompose.call(View, [fooObj, barObj]);
        assert.equal(fooObj.bar, undefined);
        assert.equal(fooObj.foo, 2);
        assert.equal(barObj.bar, 3);
        assert.equal(barObj.foo, undefined);
    });
    it("should pre-compose child methods prefixed with __ with the parent's method", function () {
        var calledPreInit;
        var PreInit = extendCompose.call(View, {
            __initialize: function (options) {
                calledPreInit = true;
                return assign({
                    baz: true
                }, options);
            }
        });
        new PreInit({foo: true});
        assert(calledPreInit);
    });
    it("should deep extend objects suffixed with __", function () {
        var a = {};
        a.prototype = {
            foo: {
                bar: 5
            }
        };
        var b = extendCompose.call(a, {
            foo__ : {
                fizz: 7
            }
        });
        assert.equal(b.prototype.foo.bar, 5);
        assert.equal(b.prototype.foo.fizz, 7);
        assert.equal(a.prototype.foo.bar, 5);
        assert.equal(a.prototype.foo.fizz, undefined);
    });
    it("should maintain the properties of extended objects", function () {
        var a = {};
        a.prototype = {
            foo: {
                bar: {
                    baz: 'hello'
                }
            }
        };
        var b = extendCompose.call(a, {
            foo__ : {
                bar__: {
                    baz: 'world'
                }
            }
        });
        assert.equal(b.prototype.foo.bar.baz, 'hello');
        assert.equal(b.prototype.foo.bar__.baz, 'world');
    });
    it("should deep extend __-suffixed objects on self using mixin-style __", function () {
        var a = {};
        a.prototype = {
            foo: {
                bar: 5
            }
        };
        var b = extendCompose.call(a, [{
            bar__: {
                biz: 3
            }
        }, {
            bar: {
                bat: 4
            },
            foo__ : {
                fizz: 7
            }
        }]);
        assert.equal(b.prototype.bar.bik, undefined);
        b.extendSelf({
            bar__: {
                bik: 6
            }
        });
        assert.equal(b.prototype.bar.bik, 6);
        assert.equal(b.prototype.bar.bat, 4);
        assert.equal(b.prototype.bar.biz, 3);
        assert.equal(b.prototype.foo.bar, 5);
        assert.equal(b.prototype.foo.fizz, 7);
        assert.equal(a.prototype.foo.bar, 5);
        assert.equal(a.prototype.foo.fizz, undefined);
    });
    it("should post-concatenate arrays suffixed with __", function () {
        var a = {};
        a.prototype = {
            foo: [1, 2, 3]
        };
        var b = extendCompose.call(a, {
            foo__: [4, 5, 6]
        });
        assert.deepEqual(b.prototype.foo, [1, 2, 3, 4, 5, 6]);
    });
    it("should pre-concatenate arrays suffixed with __", function () {
        var a = {};
        a.prototype = {
            foo: [1, 2, 3]
        };
        var b = extendCompose.call(a, {
            __foo: [4, 5, 6]
        });
        assert.deepEqual(b.prototype.foo, [4, 5, 6, 1, 2, 3]);
    });
});
