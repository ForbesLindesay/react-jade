'use strict';

var fs = require('fs');
var path = require('path');
var Parser = require('jade/lib/parser.js');
var jade = require('jade/lib/runtime.js');
var React = require('react');
var staticModule = require('static-module');
var resolve = require('resolve');
var uglify = require('uglify-js');
var Compiler = require('./lib/compiler.js');

var reactRuntimePath = require.resolve('react');

exports = (module.exports = browserifySupport);
function browserifySupport(options, extra) {
  function transform(filename) {
    function clientRequire(path) {
      return require(clientRequire.resolve(path));
    }
    clientRequire.resolve = function (path) {
      return resolve.sync(path, {
        basedir: path.dirname(filename)
      });
    };
    return staticModule({
      'react-jade': {
        compile: function (jadeSrc, localOptions) {
          localOptions = localOptions || {};
          for (var key in options) {
            if ((key in options) && !(key in localOptions))
            localOptions[key] = options[key];
          }
          localOptions.outputFile = filename;
          return compileClient(jadeSrc, localOptions);
        },
        compileFile: function (jadeFile, localOptions) {
          localOptions = localOptions || {};
          for (var key in options) {
            if ((key in options) && !(key in localOptions))
            localOptions[key] = options[key];
          }
          localOptions.outputFile = filename;
          return compileFileClient(jadeFile, localOptions);
        }
      }
    }, {
      vars: {
        __dirname: path.dirname(filename),
        __filename: path.resolve(filename),
        path: path,
        require: clientRequire
      }
    });
  }
  if (typeof options === 'string') {
    var file = options;
    options = extra || {};
    return transform(file);
  } else {
    options = options || {};
    return transform;
  }
}

function parse(str, options) {
  var options = options || {};
  var parser = new Parser(str, options.filename, options);
  var tokens;
  try {
    // Parse
    tokens = parser.parse();
  } catch (err) {
    parser = parser.context();
    jade.rethrow(err, parser.filename, parser.lexer.lineno, parser.input);
  }
  var compiler = new Compiler(tokens);

  var js = 'exports = function (locals, components) {' +
    'function getReactClass(name, args) { ' +
    'return (components && React.isValidClass(components[name])) ' +
        '? components[name].apply(components[name], args) ' +
        ': (React.DOM[name]) ? React.DOM[name].apply(React.DOM, args) : React.DOM.div.apply(React.DOM, args)' +
    '};' +
    'function jade_join_classes(val) {' +
    'return Array.isArray(val) ? val.map(jade_join_classes).filter(function (val) { return val != null && val !== ""; }).join(" ") : val;' +
    '};' +
    'var jade_mixins = {};' +
    'var jade_interp;' +
    'jade_variables(locals);' +
    compiler.compile() +
    '}';

  // Check that the compiled JavaScript code is valid thus far.
  // uglify-js throws very cryptic errors when it fails to parse code.
  try {
    Function('', js);
  } catch (ex) {
    console.log(js);
    throw ex;
  }

  var ast = uglify.parse(js, {filename: options.filename});

  ast.figure_out_scope();

  ast.figure_out_scope();
  var globals = ast.globals.map(function (node, name) {
    return name;
  }).filter(function (name) {
    return name !== 'jade_variables' && name !== 'exports' && name !== 'Array' && name !== 'React';
  });
  
  js = ast.print_to_string({
    beautify: true,
    comments: true,
    indent_level: 2
  });

  js = js.replace(/\n? *jade_variables\(locals\);?/, '\n' + globals.map(function (g) {
    return '  var ' + g + ' = ' + JSON.stringify(g) + ' in locals ? locals.' + g + ' : jade_globals_' + g + ';';
  }).join('\n'));
  
  return globals.map(function (g) {
    return 'var jade_globals_' + g + ' = typeof ' + g + ' === "undefined" ? undefined : ' + g + ';\n';
  }).join('') + js.replace(/^exports *= */, 'return ');
}

function parseFile(filename, options) {
  var str = fs.readFileSync(filename, 'utf8').toString();
  var options = options || {};
  options.filename = path.resolve(filename);
  return parse(str, options);
}

exports.compile = function(str, options){
  options = options || { filename: '' }
  return Function('React', parse(str, options))(React);
}

exports.compileFile = compileFile;
function compileFile(filename, options) {
  return Function('React', parseFile(filename, options))(React);
}

exports.compileClient = compileClient;
function compileClient(str, options){
  options = options || { filename: '' };
  var react = options.outputFile ? path.relative(path.dirname(options.outputFile), reactRuntimePath) : reactRuntimePath;
  return '(function (React) {\n  ' +
    parse(str, options) +
    '\n}(typeof React !== "undefined" ? React : require("' + react.replace(/^([^\.])/, './$1').replace(/\\/g, '/') + '")))';
}

exports.compileFileClient = compileFileClient;
function compileFileClient(filename, options) {
  var str = fs.readFileSync(filename, 'utf8').toString();
  var options = options || {};
  options.filename = path.resolve(filename);
  return compileClient(str, options);
}
