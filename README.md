## Collection builder

### What is this?
This is a sample project to generate a `Postman` collection from an `OAS` file.

### How to run?
In `package.json` the `build` script will generate the collection from a give spec located in the root foler in `spec.json`.
After the script has been ran, the collection will be created in `output/collection.json`

### Tests
In the `test-src` folder there are folders matching the request names `(i,e. account - will match all Account related requests`. Those folders contain the scripts to be written in the `Test` section of the request.
A `test_src/head.js` script is included in all tests
Configuration presented in a `var_keys.json` file is applied to the collection. Those values replace the `OAS` default by add `{{` and `}}` to mark them as Postman variables, then their value is set on a collection level.
