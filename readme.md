# extendcompose
`extendcompose` is a drop-in replacement for Backbone.[Model|View|Router|etc...].extend that suports automatic composing of child properties with parent properties. `extendcompose` offers an alternative to the pattern of calling the parent method directly from a method in your subclass, which can be pretty verbose, for example:

```js
<your subclass name>.__super__.<your method name>.apply(this, arguments) // pffew!
```

When you call a method (sans underscore suffix) on a class that's been created using extendCompose:

```js
subClassInstance.myMethod(sub, arguments, here)
```

this will happen behind the scenes:
```js
subClassInstance.myMethod__(subclassInstance.__super__.myMethod.apply(subClassInstance, [some, arguments, here]))
```

##installation:
```sh
npm install --save extendcompose
```

##usage:

To use it, replace the static extend method of your parent class with extendCompose.
Then, in the subclass, for each method that you would like to be automatically composed with
the parent's method of the same name (sans unerscore), add a suffix of two underscores to the method's name.

example:

```js
const extendCompose = require('extendcompose');
const ParentClass = View.extend({
   myMethod : function (firstName, lastName) {
      console.log("running ParentClass's myMethod. Arguments are: '" + arguments + "'");
      return Array.prototype.slice.call(arguments, 0).join(' ');
   }
});
const SubClass = extendCompose.call(ParentClass, {
   myMethod__ : function (fullName) { // gets composed with ParentClass.prototype.myMethod
      console.log("running SubClass's myMethod. Return value form parent was '" + fullName + "'")
   }
});
const subClass = new SubClass();
subClass.myMethod('thomas', 'hallock');
```

the above code will output:

running ParentClass's myMethod. Arguments were 'thomas' and 'hallock'
running SubClass's myMethod. Return value from Parent was 'thomas hallock'

Note: in this example, subclasses of SubClass will inherit extendCompose as well.
