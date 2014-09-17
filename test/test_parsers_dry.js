/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var path = require('path');
  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var parse = require('../lib/parsers/dry');
  var propval = parse.propval;

  describe("dry-parser", function() {
    var parseFromContent = parse.parseFromContent;

    describe("filename", function() {
      it("requires a valid id component", function(done) {
        parseFromContent("foo$bar.dry", "\ncontent", function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: Cannot extract id or type from filename."
          );
          (result === undefined).should.be.true;
          done();
        });
      });

      it("sets the id", function(done) {
        parseFromContent("test.dry", "prop: foo", function(err, result) {
          (!!err).should.be.false;
          propval(result.id).should.equal('test');
          done();
        });
      });

      it("sets a nested id", function(done) {
        parseFromContent(
          "foo.bar.type.dry", "prop: foo", function(err, result) {
            (!!err).should.be.false;
            propval(result.id).should.equal('foo.bar');
            done();
          });
      });

      it("sets the type, if given", function(done) {
        parseFromContent("test.type.dry", "prop: foo", function(err, result) {
          (!!err).should.be.false;
          propval(result.id).should.equal('test');
          propval(result.type).should.equal('type');
          done();
        });
      });

      it("should not set the type, if not given", function(done) {
        parseFromContent("test.dry", "prop: foo", function(err, result) {
          (!!err).should.be.false;
          propval(result.id).should.equal('test');
          (result.type === undefined).should.be.true;
          done();
        });
      });

      it("copes with full paths", function(done) {
        parseFromContent(
          "/tmp/foo/test.type.dry", "prop: foo",
          function(err, result) {
            (!!err).should.be.false;
            propval(result.id).should.equal('test');
            propval(result.type).should.equal('type');
            done();
          });
      });

      it("copes with any extension", function(done) {
        parseFromContent("test.type.bar", "prop: foo", function(err, result) {
          (!!err).should.be.false;
          propval(result.id).should.equal('test');
          propval(result.type).should.equal('type');
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("properties", function() {
      var reserved = ['id', 'sections', 'options', 'content'];
      reserved.forEach(function(name) {
        it("should not allow "+name+" as a property name", function(done) {
          parseFromContent("test.dry", name+": foo", function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: test.dry line 1: Property '"+name+"' is a reserved name."
            );
            (result === undefined).should.be.true;
            done();
          });
        });
      });

      it("should not allow properties to be redefined", function(done) {
        parseFromContent(
          "test.dry", "prop: foo\nprop: bar",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: test.dry line 2: Property 'prop' is already defined."
            );
            (result === undefined).should.be.true;
            done();
          });
      });

      it("should not allow type to be redefined", function(done) {
        parseFromContent("test.type.dry", "type: foo", function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.type.dry line 1: Property 'type' is already defined."
          );
          (result === undefined).should.be.true;
          done();
        });
      });

      it("allow type to be set if not inferred", function(done) {
        parseFromContent("test.dry", "type: foo", function(err, result) {
          (!!err).should.be.false;
          propval(result.type).should.equal('foo');
          done();
        });
      });

      it("should camel case property names", function(done) {
        parseFromContent(
          "test.dry", "prop-one: foo\nprop-two:\tbar",
          function(err, result){
            (!!err).should.be.false;
            propval(result.propOne).should.equal('foo');
            propval(result.propTwo).should.equal('bar');
            done();
          });
      });

      it("allow a property to be split over two lines", function(done) {
        parseFromContent("test.dry", "prop: foo\n\tbar", function(err, result){
          (!!err).should.be.false;
          propval(result.prop).should.equal('foo bar');
          done();
        });
      });

      it("allow a property to be split over multiple lines", function(done) {
        parseFromContent(
          "test.dry", "prop: foo\n\tbar\n  sun",
          function(err, result) {
            (!!err).should.be.false;
            propval(result.prop).should.equal('foo bar sun');
            done();
          });
      });

      it("should not allow interspersed non-conforming content",
        function(done) {
          parseFromContent(
            "test.dry", "prop: A\nbar\nprop2: B",
            function(err, result) {
              (!!err).should.be.true;
              err.toString().should.equal(
                "Error: test.dry line 2: Invalid property definition."
              );
              (result === undefined).should.be.true;
              done();
            });
        });

      it("should be terminated by a blank line", function(done) {
        parseFromContent("test.dry", "prop: foo\n\nbar", function(err, result){
          (!!err).should.be.false;
          propval(result.prop).should.equal('foo');
          propval(result.content).should.equal('bar');
          done();
        });
      });

      it("can be skipped with an initial blank line", function(done) {
        parseFromContent("test.dry", "\nbar", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('bar');
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("magic", function() {
      it("parses magic in properties", function(done) {
        var content = "foo: {! return true; !}\nbar: 2";
        parseFromContent("test.dry", content, function(err, result) {
          (!!err).should.be.false;
          propval(result.foo).should.equal("{! return true; !}");
          propval(result.bar).should.equal("2");
          done();
        });
      });

      it("allows magic to span lines without indent", function(done) {
        var content = "foo: {!\nreturn true;\n!} \nbar: 2";
        parseFromContent("test.dry", content, function(err, result) {
          if (err) console.error(err);
          (!!err).should.be.false;
          propval(result.foo).should.equal("{!\nreturn true;\n!}");
          propval(result.bar).should.equal("2");
          done();
        });
      });

      it("allows multiple magic blocks in property", function(done) {
        var content = "foo: {!\nreturn true;\n!}\n  {!\na=0; !}\nbar: 2";
        parseFromContent("test.dry", content, function(err, result) {
          if (err) console.error(err);
          (!!err).should.be.false;
          propval(result.foo).should.equal("{!\nreturn true;\n!} {!\na=0; !}");
          propval(result.bar).should.equal("2");
          done();
        });
      });
    });

    // ----------------------------------------------------------------------

    describe("content", function() {
      it("allows multiple paragraphs", function(done) {
        parseFromContent("test.dry", "\nfoo\n\nbar", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('foo\n\nbar');
          done();
        });
      });

      it("interprets apparent continuation lines as text", function(done) {
        parseFromContent("test.dry", "\nfoo\n\tbar", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('foo\n\tbar');
          done();
        });
      });

      it("interprets apparent option lines as text", function(done) {
        parseFromContent("test.dry", "\nfoo\n- bar", function(err, result) {
          (!!err).should.be.false;
          result.content.should.equal('foo\n- bar');
          done();
        });
      });

      it("interprets apparent property lines as text", function(done) {
        parseFromContent("test.dry", "\nfoo\nbar: foo", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('foo\nbar: foo');
          done();
        });
      });

      it("ends when a new section id is given", function(done) {
        parseFromContent("test.dry", "\nfoo\n@bar", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('foo');
          propval(result.sections).length.should.equal(1);
          propval(propval(result.sections[0]).id).should.equal('test.bar');
          done();
        });
      });

      it("ends when an option block is given", function(done) {
        parseFromContent("test.dry", "\nfoo\n\n- @bar", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('foo');
          result.options.options.length.should.equal(1);
          propval(propval(result.options.options[0]).id).should.equal('@bar');
          done();
        });
      });

      it("ignores extra blank lines", function(done) {
        parseFromContent("test.dry", "\nfoo\n\n\nbar", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('foo\n\nbar');
          done();
        });
      });

      it("ignores trailing blank lines", function(done) {
        parseFromContent(
          "test.dry", "\nfoo\n\nbar\n\n\n",
          function(err, result) {
            (!!err).should.be.false;
            propval(result.content).should.equal('foo\n\nbar');
            done();
          });
      });

      it("should be blank if we start with options", function(done) {
        parseFromContent("test.dry", "\n- @bar", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('');
          result.options.options.length.should.equal(1);
          propval(propval(result.options.options[0]).id).should.equal('@bar');
          done();
        });
      });
    });

    // ----------------------------------------------------------------------
    var optval = function(result, i, name) {
      return propval(propval(result.options.options[i])[name]);
    };
    var secval = function(result, i, name) {
      return propval(propval(result.sections[i])[name]);
    };

    describe("options", function() {
      it("can start with either a tag or id", function(done) {
        parseFromContent("test.dry", "\n- @bar\n-#foo", function(err, result) {
          (!!err).should.be.false;
          propval(result.content).should.equal('');
          result.options.options.length.should.equal(2);
          optval(result, 0, 'id').should.equal('@bar');
          optval(result, 1, 'id').should.equal('#foo');
          done();
        });
      });

      it("must start with a tag or id", function(done) {
        parseFromContent("test.dry", "\n- $foo", function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 2: Invalid property or option definition."
          );
          (result === undefined).should.be.true;
          done();
        });
      });

      it("can have a title with an id", function(done) {
        parseFromContent(
          "test.dry", "\n- @foo\n- @bar: The title",
          function(err, result) {
            (!!err).should.be.false;
            result.options.options.length.should.equal(2);
            optval(result, 0, 'id').should.equal('@foo');
            (optval(result, 0, 'title') === undefined).should.be.true;
            optval(result, 1, 'id').should.equal('@bar');
            optval(result, 1, 'title').should.equal('The title');
            done();
          });
      });

      it("can have a qualified id", function(done) {
        parseFromContent("test.dry", "\n- @foo.bar", function(err, result) {
          (!!err).should.be.false;
          result.options.options.length.should.equal(1);
          optval(result, 0, 'id').should.equal('@foo.bar');
          done();
        });
      });

      it("can have a relative id", function(done) {
        parseFromContent("test.dry", "\n- @..foo.bar", function(err, result) {
          (!!err).should.be.false;
          result.options.options.length.should.equal(1);
          optval(result, 0, 'id').should.equal('@..foo.bar');
          done();
        });
      });

      it("cannot have a two part tag", function(done) {
        parseFromContent("test.dry", "\n- #foo.bar", function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 2: Invalid property or option definition."
          );
          (result === undefined).should.be.true;
          done();
        });
      });

      it("can have a condition defined in logic", function(done) {
        parseFromContent(
          "test.dry", "\n- @foo\n- @bar if condition",
          function(err, result) {
            (!!err).should.be.false;
            result.options.options.length.should.equal(2);
            optval(result, 0, 'id').should.equal('@foo');
            (optval(result, 0, 'title') === undefined).should.be.true;
            (optval(result, 0, 'viewIf') === undefined).should.be.true;
            optval(result, 1, 'id').should.equal('@bar');
            (optval(result, 1, 'title') === undefined).should.be.true;
            optval(result, 1, 'viewIf').should.equal('condition');
            done();
          });
      });

      it("can have a condition defined in magic", function(done) {
        parseFromContent(
          "test.dry", "\n- @foo\n- @bar if {! return true !}",
          function(err, result) {
            (!!err).should.be.false;
            result.options.options.length.should.equal(2);
            optval(result, 0, 'id').should.equal('@foo');
            (optval(result, 0, 'title') === undefined).should.be.true;
            (optval(result, 0, 'viewIf') === undefined).should.be.true;
            optval(result, 1, 'id').should.equal('@bar');
            (optval(result, 1, 'title') === undefined).should.be.true;
            optval(result, 1, 'viewIf').should.equal('{! return true !}');
            done();
          });
      });

      it("can have a colon in the magic of its condition", function(done) {
        parseFromContent(
          "test.dry", "\n- @foo\n- @bar if {! var a = {a:true}; return a.a; !}",
          function(err, result) {
            (!!err).should.be.false;
            result.options.options.length.should.equal(2);
            optval(result, 0, 'id').should.equal('@foo');
            (optval(result, 0, 'title') === undefined).should.be.true;
            (optval(result, 0, 'viewIf') === undefined).should.be.true;
            optval(result, 1, 'id').should.equal('@bar');
            (optval(result, 1, 'title') === undefined).should.be.true;
            optval(result, 1, 'viewIf').should.equal(
              '{! var a = {a:true}; return a.a; !}'
            );
            done();
          });
      });

      it("can have line breaks in the magic of its condition", function(done) {
        parseFromContent(
          "test.dry",
          "\n- @foo\n- @bar if {!\nvar a = {a:true};\nreturn a.a;\n!}: Title",
          function(err, result) {
            (!!err).should.be.false;
            result.options.options.length.should.equal(2);
            optval(result, 0, 'id').should.equal('@foo');
            (optval(result, 0, 'title') === undefined).should.be.true;
            (optval(result, 0, 'viewIf') === undefined).should.be.true;
            optval(result, 1, 'id').should.equal('@bar');
            optval(result, 1, 'title').should.equal('Title');
            optval(result, 1, 'viewIf').should.equal(
              '{!\nvar a = {a:true};\nreturn a.a;\n!}'
            );
            done();
          });
      });

      it("can have both a condition and title", function(done) {
        parseFromContent(
          "test.dry", "\n- @foo if condition: title",
          function(err, result) {
            (!!err).should.be.false;
            result.options.options.length.should.equal(1);
            optval(result, 0, 'id').should.equal('@foo');
            optval(result, 0, 'title').should.equal('title');
            optval(result, 0, 'viewIf').should.equal('condition');
            done();
          });
      });

      it("should not allow content after options", function(done) {
        parseFromContent("test.dry", "\n- @foo\n\nbar", function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 4: Found content after an options block."
          );
          (result === undefined).should.be.true;
          done();
        });
      });

      it("should not allow multiple options blocks", function(done) {
        parseFromContent(
          "test.dry", "\n- @foo\n\n- #bar",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: test.dry line 4: Found content after an options block."
            );
            (result === undefined).should.be.true;
            done();
          });
      });

      it("allow property definitions", function(done) {
        parseFromContent(
          "test.dry", "\n- foo:bar\n- #sun",
          function(err, result) {
            (!!err).should.be.false;
            result.options.options.length.should.equal(1);
            optval(result, 0, 'id').should.equal('#sun');
            propval(result.options.foo).should.equal('bar');
            done();
          });
      });

      it("allow interspersed property definitions", function(done) {
        parseFromContent(
          "test.dry", "\n- @cube\n- foo:bar\n- #sun",
          function(err, result) {
            (!!err).should.be.false;
            result.options.options.length.should.equal(2);
            optval(result, 0, 'id').should.equal('@cube');
            optval(result, 1, 'id').should.equal('#sun');
            propval(result.options.foo).should.equal('bar');
            done();
          });
      });

      it("require properties to have a preceding hyphen", function(done) {
        parseFromContent(
          "test.dry", "\n- @cube\nfoo:bar",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: test.dry line 3: Hyphens are required in an option block."
            );
            (result === undefined).should.be.true;
            done();
          });
      });

      it("interpret a tag without a hyphen as a comment", function(done) {
        parseFromContent("test.dry", "\n- @cube\n#foo", function(err, result) {
          (!!err).should.be.false;
          result.options.options.length.should.equal(1);
          optval(result, 0, 'id').should.equal('@cube');
          done();
        });
      });

      it("interpret an id without a hyphen as a new section", function(done) {
        parseFromContent("test.dry", "\n- @cube\n@foo", function(err, result) {
          (!!err).should.be.false;
          result.options.options.length.should.equal(1);
          optval(result, 0, 'id').should.equal('@cube');
          result.sections.length.should.equal(1);
          secval(result, 0, 'id').should.equal('test.foo');
          done();
        });
      });

      it("should not allow an id to be specified more than once",
        function(done) {
          parseFromContent(
            "test.dry", "\n- @foo\n-@foo",
            function(err, result) {
              (!!err).should.be.true;
              err.toString().should.equal(
                "Error: test.dry line 3: "+
                "Option with id/tag '@foo' already specified."
              );
              (result === undefined).should.be.true;
              done();
            });
        });

      it("should allow an id to be specified in other sections",
        function(done) {
          parseFromContent(
            "test.dry", "\n- @foo\n@bar\n\n-@foo",
            function(err, result) {
              (!!err).should.be.false;
              done();
            });
        });

      it("should not allow a tag to be specified more than once",
        function(done) {
          parseFromContent(
            "test.dry", "\n- #foo\n-#foo",
            function(err, result) {
              (!!err).should.be.true;
              err.toString().should.equal(
                "Error: test.dry line 3: "+
                "Option with id/tag '#foo' already specified."
              );
              (result === undefined).should.be.true;
              done();
            });
        });
    });

    // ----------------------------------------------------------------------

    describe("sections", function() {
      it("can begin at the start of the file", function(done) {
        parseFromContent("test.dry", "@foo", function(err, result) {
          (!!err).should.be.false;
          result.content.should.equal('');
          result.sections.length.should.equal(1);
          secval(result, 0, 'id').should.equal('test.foo');
          done();
        });
      });

      it("require a valid id", function(done) {
        parseFromContent(
          "test.dry", "\nContent\n@foo$bar",
          function(err, result) {
            (!!err).should.be.true;
            err.toString().should.equal(
              "Error: test.dry line 3: Malformed id 'foo$bar' "+
                "(use letters, numbers, _ and - only)."
            );
            (result === undefined).should.be.true;
            done();
          });
      });

      it("begin by interpreting following lines as properties", function(done){
        parseFromContent("test.dry", "@foo\nsun:dock", function(err, result) {
          (!!err).should.be.false;
          result.sections.length.should.equal(1);
          secval(result, 0, 'id').should.equal('test.foo');
          secval(result, 0, 'sun').should.equal('dock');
          done();
        });
      });

      it("should not allow an id to be reused more than once", function(done) {
        parseFromContent("test.dry", "@foo\n@foo", function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 2: Section with id 'foo' already defined."
          );
          (result === undefined).should.be.true;
          done();
        });
      });

      it("should not allow an id to match the top level id", function(done) {
        parseFromContent("test.dry", "@test", function(err, result) {
          (!!err).should.be.true;
          err.toString().should.equal(
            "Error: test.dry line 1: Section can't use the file id 'test'."
          );
          (result === undefined).should.be.true;
          done();
        });
      });

    });

    // ----------------------------------------------------------------------

    describe("filesystem", function() {
      it("should load and parse file", function(done) {
        var fn = path.join(__dirname, 'files', 'test_dry_parser.test.dry');
        parse.parseFromFile(fn, function(err, result) {
          (!!err).should.be.false;
          result.id.should.equal('test_dry_parser');
          result.type.should.equal('test');
          result.sections.length.should.equal(4);
          secval(result, 0, 'id').should.equal('test_dry_parser.new-id');
          secval(result, 0, 'options').options.length.should.equal(6);
          done();
        });
      });

      it("should fail if the file is not there", function(done) {
        var fn = path.join(__dirname, 'files', 'not-a-file.type.dry');
        parse.parseFromFile(fn, function(err, result) {
          (!!err).should.be.true;
          (result === undefined).should.be.true;
          done();
        });
      });
    });

  });

}());