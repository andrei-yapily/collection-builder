var crypto = require('crypto')
var fs = require('fs')
var chalk = require('chalk')

var COLL_VARS_KEYS = require('./test_src/var_keys.json')
const HEAD = fs.readFileSync('test_src/head.js', { encoding: 'UTF8' });

SEPARATOR = '.'

class CollVariable {

    constructor(name, def) {
        this.name = name
        this.default = def
    }
}

class Handler {

    constructor() {
        var values = []
        Object.keys(COLL_VARS_KEYS).forEach((var_key) => {
            var key = COLL_VARS_KEYS[var_key]
            values.push(
                new CollVariable(key[0], key[1] ? "replace-me" : "")
                )
            })
        console.log("Initialisied collection values :" + this.log(values.length, "blue"))
        this.COLL_VARS = values
    }

    FOLDERS = [
        { path: "user" },
        { path: "account" },
        { path: "consent" },
        { path: "identity" },
        { path: "payment" },
    ]

    // utility lambdas
    // converts camelCase
    camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    kebabize = str => {
        return str.split('').map((letter, idx) => {
            return letter.toUpperCase() === letter && letter != '-'
                ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
                : letter;
        }).join('');
    }
    // string manip
    parametrize = str => "{{" + str + "}}"
    log = (str, argument) => {
        switch (argument) {
            default: case "blue": return "[" + chalk.blueBright(str) + "]"
            case "green": return "[" + chalk.greenBright(str) + "]"
            case "red": return "[" + chalk.redBright(str) + "]"
            case "cyan": return "[" + chalk.cyanBright(str) + "]"
            case "yellow": return "[" + chalk.yellowBright(str) + "]"

        }

    }

    getType = p => {
        // TODO: Refactor to enums
        if (Array.isArray(p)) return 'array';
        else if (typeof p == 'string') return 'string';
        else if (p != null && typeof p == 'object') return 'object';
        else if (p !== undefined && p !== null && p.constructor == Number) return 'number';
        else return 'other';
    }
    parametrizeKey = key => {
        var kebab = this.kebabize(key).replaceAll(SEPARATOR, '')
        var collVar = this.COLL_VARS.filter(v => v.name == kebab)
        if (collVar[0] != undefined && collVar.length > 0) {
            collVar = collVar[0]
            return this.parametrize(collVar.name)
        }
        return ''
    }

    convertValues = (key, value) => {
        if (value != null) {
            var type = this.getType(value)
            console.log(("Converting " + this.log(type, "blue") + " for " + this.log(key, "red")))
            switch (type) {
                default:
                case "number":
                case "string":
                    value = this.parametrizeKey(key)
                    break
                case "object":
                    Object.keys(value).forEach(valueKey => {
                        var convertedVal = this.convertValues(key + SEPARATOR + valueKey, value[valueKey])
                        if (convertedVal != undefined && convertedVal != '') {
                            value[valueKey] = convertedVal
                        }
                    })
                    break
                case "array":
                    var items = value
                    value = items.map(v => this.convertValues(key, v))
                    break
            }
            return value
        }
    }

    uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    processCategory(category) {
        console.log('Adding tests to group ' + this.log(category.name, 'cyan'))
        var requests = category.item
        for (var i = 0; i < requests.length; i++) {
            var request = requests[i]
            this.cleanOASPathVariables(request.request)
            this.cleanOASBodyVariables(request.request)
            this.cleanOASQueryParams(request.request)
            this.cleanOASHeaderVariables(request.request)
            console.log('Adding tests to request ' + this.log(request.name, "green"))
            var events = [this.generate_event(request, 'test')]
            request.events = events;
        }
        console.log('\n')
    }

    // adding events based on listener - accounts for event and request scenario
    generate_event(request, listen) {
        var mapped = request.name.toLowerCase().replaceAll(' ', '_')
        console.log("\nAdded Header test to " + this.log(request.name, "green"))
        var script_text = HEAD + this.get_event({ request, mapped });
        var test = {
            "listen": listen,
            "script": {
                "exec": [
                    script_text
                ],
                "type": "text/javascript"
            }
        }
        return test;
    }

    get_event(request) {
        console.log('Fetching tests for request ' + this.log(request.mapped, "red"))
        var folder = this.FOLDERS.filter(v => request.mapped.includes(v.path))[0]
        if (folder != undefined) {
            var path = './test_src/' + folder.path + '/' + request.mapped + '.js'
            if (fs.existsSync(path)) {
                console.log("Adding test from "+ this.log(path, "cyan")+" \n")
                return fs.readFileSync(path, { encoding: 'UTF8' });
            }
        }
        return ''
    }

    updateAuth(converted_collection) {
        console.log("Updating auth for collection.")
        var [auth_username, auth_password] = converted_collection.auth.basic
        auth_username.value = this.parametrize(COLL_VARS_KEYS.APP_ID[0])
        auth_password.value = this.parametrize(COLL_VARS_KEYS.APP_SEC[0])
        console.log("Updated auth for collection.", chalk.green(auth_username, auth_password))
    }

    updateVariables(converted_collection) {
        var variables = converted_collection.variable
        this.COLL_VARS.forEach(v => {
            variables.push({
                type: 'string',
                key: v.name,
                value: v.default
            })
            console.log("Added collection variable: " + this.log(v.name, "yellow"));
        });
    }

    cleanOASQueryParams(request) {
        var variables = request.url
        console.log('Cleaning query vars for ' + this.log(request.name, "green"))
        variables.query = []
    }

    cleanOASPathVariables(request) {
        var variables = request.url
        var pathVarValue = variables.path
        if (pathVarValue != undefined) {
            console.log('Cleaning path vars for ' + this.log(request.name, "green"))
            // TODO: can be exported as config
            pathVarValue.map(path => {
                if (path.includes(":")) {
                    var keyVal = path.substring(1)
                    var kebab = this.kebabize(keyVal)
                    var collVar = this.COLL_VARS.filter(v => v.name == kebab)
                    if (collVar[0] != undefined && collVar.length > 0) {
                        collVar = collVar[0]
                        var variable = variables.variable.filter(va => va.key == keyVal)[0]
                        variable.value = this.parametrize(collVar.name)
                    }
                    return collVar
                }
            });
        }
    }

    cleanOASBodyVariables(request) {
        if (request.method == 'POST') {
            console.log("Cleaning body for " + this.log(request.name, "green"))
            var body = request.body;
            if (body != undefined) {
                var text = JSON.parse(body.raw.replaceAll('\\n', ''))
                Object.keys(text).forEach(key => {
                    var value = this.convertValues(key, text[key])
                    if (value != '') {
                        console.log("Updated value for " + this.log(key, "yellow") + " to " +  this.log(value, "yellow"))
                        text[key] = value
                    }
                })
                body.raw = JSON.stringify(text);
            }
        }

    }

    cleanOASHeaderVariables(request) {
        var headers = request.header
        headers.map(header => {
            var key = header.key
            var value = this.convertValues('header-' + key, header.value)
            if (value != '') {
                console.log("Converting " + this.log(key, "yellow") + " value")
                header.value = value
                console.log("Updated value for " + this.log(key, "yellow") + " to "+ this.log(value, "yellow"))
            }
        })
    }

    // main
    convertCollection(converted_collection, dest) {
        this.updateVariables(converted_collection)
        this.updateAuth(converted_collection)
        var items = converted_collection.item
        for (var i = 0; i < items.length; i++) {
            var category = items[i]
            if (category.item != undefined) {
                this.processCategory(category)
            }
        }
        converted_collection.items = items.filter(i => i.item != undefined)
        console.log('Writing collection to : ', this.log(dest, "blue"))
        fs.writeFileSync(dest, JSON.stringify(converted_collection));
    }
}

module.exports = Handler