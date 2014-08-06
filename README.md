# react-jade

Compile Jade to React JavaScript

[![Build Status](https://travis-ci.org/ForbesLindesay/react-jade.png?branch=master)](https://travis-ci.org/ForbesLindesay/react-jade)
[![Dependency Status](https://gemnasium.com/ForbesLindesay/react-jade.png)](https://gemnasium.com/ForbesLindesay/react-jade)
[![NPM version](https://badge.fury.io/js/react-jade.png)](http://badge.fury.io/js/react-jade)

## Installation

    npm install react-jade

## Usage

### With Browserify

If you are using browserify, just write a file that looks like the following, then use `react-jade` as a transform.  It will then inline the result of calling `jade.compileFile` automatically.

```js
var React = require('react');
var jade = require('react-jade');

var template = jade.compileFile(__dirname + '/template.jade');

React.renderComponent(template({local: 'values'}), document.getElementById('container'));
```

```
browserify index.js --transform react-jade > bundle.js
```

### Without Browserify

If you are not using browserify, you could manually compile the jade to some client file.  e.g.

```js
var fs = require('fs');
var jade = require('react-jade');

fs.writeFileSync(__dirname + '/template.js', 'var template = ' + jade.compileFileClient(__dirname + '/template.jade'));
```

Then on your html page:

```html
<div id="container"></div>
<script src="http://fb.me/react-0.10.0.js"></script>
<script src="template.js"></script>
<script>
  React.renderComponent(template({local: 'values'}), document.getElementById('container'));
</script>
```

### React Components with Jade

It is important to remember that `react-jade` returns a reference to a React instance and not a string. Tags inside jade must exist within the React namespace, if a tag doesn't exist it will error (See [list of implemented tags](http://facebook.github.io/react/docs/tags-and-attributes.html)).

You can define your own "tags" inside your jade by passing a second argument to your template function, `resolver`.

#### Example

```jade
invalid_react_dom_element
  h1 Hello
  Person(name=name)
```

```js
var react = require('react');
var components = {};

function resolver (name, args) {
  if(name in components) return components[name].apply(null, args);
  else return react.DOM.div.apply(react.DOM, args);
}

components.Person = react.createClass({
  render: function(){
    return react.DOM.div({className: 'person'}, this.props.name);
  }
});

template({name: "test"}, resolver);
```

In the above example the "invalid_react_dom_element" will automatically be converted to a `React.DOM.div` component. The "Person" tag will be converted to the React `Person` class and initialized with `this.props.name="test"`.


### Server Side

You can also use react-jade to render templates on the server side via `React.renderComponentToString`.  This is especially useful for building isomorphic applications (i.e. applications that run the same on the server side and client side).

```js
var fs = require('fs');
var React = require('react');
var jade = require('react-jade');

var template = jade.compileFile(__dirname + '/template.jade');

var html = React.renderComponentToString(template({local: 'values'}));
fs.writeFileSync(__dirname + '/template.html', html);
```

## API

```js
var jade = require('react-jade');
```

### jade(options) / jade(file)

Acts as a browseify transform to inline calls to `jade.compileFile`.  The source code looks something like:

```js
function browserify(options) {
  function transform(file) {
    return new TransformStream(); //stream to do the transform implemented here
  }
  if (typeof options === 'string') {
    var file = options;
    options = arguments[2] || {};
    return transform(file);
  } else {
    return transform;
  }
}
```

### jade.compileFile(filename, options) => fn

Compile a jade file into a function that takes locals and returns a React DOM node.

### jade.compileFileClient(filename, options)

Compile a jade file into the source code for a function that takes locals and returns a React DOM node.  The result requires either a global 'React' variable, or the ability to require 'React' as a CommonJS module.

### jade.compile(jadeString, options) => fn

Same as `jade.compileFile` except you pass an inline jade string instead of a filename. You should set `options.filename` manually.

### jade.compileClient(jadeString, options)

Same as `jade.compileFileClient` except you pass an inline jade string instead of a filename. You should set `options.filename` manually.

## Differences from jade

React Jade has a few bonus features, that are not part of Jade.

### Automatic partial application of `on` functions

In react, you add event listeners by setting attributes, e.g. `onClick`.  For example:

```jade
button(onClick=clicked) Click Me!
```
```js
var fn = jade.compileFile('template.jade');
React.renderComponent(fn({clicked: function () { alert('clicked'); }), container);
```

Often, you may want to partially apply a function, e.g.

```jade
input(value=view.text onChange=view.setProperty.bind(view, 'text'))
```
```js
function View() {
}
View.prototype.setProperty = function (name, e) {
  this[name] = e.target.value;
  render();
};
var view = new View();
function render() {
  React.renderComponent(fn({view: view}), container);
}
```

Because you so often want that `.bind` syntax, and it gets pretty long and cumbersome to write, react-jade lets you omit it:

```jade
input(value=view.text onChange=view.setProperty('text'))
```

This is then automatically re-written to do the `.bind` for you.

### Style

In keeping with React, the style attribute should be an object, not a string.  e.g.

```jade
div(style={background: 'blue'})
```

### Unsupported Features

Although a lot of jade just works, there are still some features that have yet to be implemented. Here is a list of known missing features, in order of priority for adding them. Pull requests welcome:

 - mixins
 - attribute extension/merging (via `&attributes`)
 - case/when
 - using each to iterate over keys of an object (rather than over items in an array)
 - interpolation
 - attribute interpolation
 - special handling of data-attributes
 - outputting unescaped html results in an extra wrapper div and doesn't work for attributes

## License

  MIT
