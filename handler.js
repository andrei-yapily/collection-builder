var crypto = require('crypto');
var fs = require('fs');
const HEAD = fs.readFileSync('test_src/head.js', { encoding: 'UTF8' });

COLL_VARS_KEYS = {
    // KEY: [KEY_NAME, IGNORE - don't fill in with empty value]
    APP_ID: ["application_client_id", true],
    APP_SEC: ["application_client_secret", true],
    USER_UUID: ["user-uuid", false],
    APPLICATION_USER_UUID: ["application-user-id", false],
    INSTITUTION_ID: ["institution-id", false],
    USERS_AMOUNT: ["users-amount", false],
    CONSENT_ID: ["consent-id", false],
    TRANSACTION_ID: ["transaction-id", false],
    CONSENT_TOKEN: ["consent-token", false],
    CONSENT_AMOUNT: ["consent-amount", false],
    CONSENT_ID: ["consent-id", false],
    PAYMENT_ID: ["payment-id", false],
    // accounts
    ACCOUNT_ID_BALANCE: ["account-request-account-identifiers-for-balance-account-id", false],
    ACCOUNT_ID_TRANS: ["account-request-account-identifiers-for-transaction-account-id", false],
    // payments
    PAYMENT_IDEMPOTENCY_ID: ["payments-payment-idempotency-id", false],
    // payment amounts
    BULK_PAYMENT_AMOUNT: ['payments-amount-amount', false],
    PAYMENT_AUTH_PAYMENT_AMOUNT: ['payment-request-amount-amount', false],
    BULK_PAYMENT_AUTH_PAYMENT_AMOUNT: ['payment-request-payments-amount-amount', false],
    // payment currency
    BULK_PAYMENT_CURRENCY: ['payments-amount-currency', false],
    PAYMENT_AUTH_PAYMENT_CURRENCY: ['payment-request-amount-currency', false],
    BULK_PAYMENT_AUTH_PAYMENT_CURRENCY: ['payment-request-payments-amount-currency', false],

    // HEADER VALS
    HEADER_CONSENT: ['header-consent', true],
    HEADER_PSU: ['header-psu-id', true],
    HEADER_PSU_COPR_ID: ['header-psu-corporate-id', true],
    HEADER_PSU_IP_ADD: ['header-psu-ip-address', true],
}

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
        console.log("Initialising collection values")
        Object.keys(COLL_VARS_KEYS).forEach((var_key) => {
            var key = COLL_VARS_KEYS[var_key]
            values.push(
                new CollVariable(key[0], key[1] ? "replace-me" : "")
            )
        })
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
    camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    // converts camelCase to kebab
    kebabize = str => {
        return str.split('').map((letter, idx) => {
            return letter.toUpperCase() === letter && letter != '-'
                ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
                : letter;
        }).join('');
    }
    parametrize = str => "{{" + str + "}}"
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
            console.log("Converting [" + type + "] for [" + key + "]")
            switch (type) {
                default:
                    console.log("undefined", value)
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
        console.log('Adding tests to group [' + category.name + ']')
        var requests = category.item
        for (var i = 0; i < requests.length; i++) {
            var request = requests[i]
            this.cleanOASPathVariables(request.request)
            this.cleanOASBodyVariables(request.request)
            this.cleanOASQueryParams(request.request)
            this.cleanOASHeaderVariables(request.request)
            console.log('Adding tests to request [' + request.name + ']')
            var events = [this.generate_event(request, 'test')]
            request.events = events;
        }
        console.log('\n')
    }

    // adding events based on listener - accounts for event and request scenario
    generate_event(request, listen) {
        var mapped = request.name.toLowerCase().replaceAll(' ', '_')
        console.log("\nAdded Header test to [" + request.name + "]")
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
        console.log('Fetching tests for request [' + request.mapped + ']')
        var folder = this.FOLDERS.filter(v => request.mapped.includes(v.path))[0]
        if (folder != undefined) {
            var path = './test_src/' + folder.path + '/' + request.mapped + '.js'
            if (fs.existsSync(path)) {
                console.log("Adding test from [" + path + "] \n")
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
        console.log("Updated auth for collection.", auth_username, auth_password)
    }

    updateVariables(converted_collection) {
        var variables = converted_collection.variable
        this.COLL_VARS.forEach(v => {
            variables.push({
                type: 'string',
                key: v.name,
                value: v.default
            })
            console.log("Added collection variable: [" + v.name + "]");
        });
    }

    cleanOASQueryParams(request) {
        var variables = request.url
        console.log('Cleaning query vars for [' + request.name + ']')
        variables.query = []
    }

    cleanOASPathVariables(request) {
        var variables = request.url
        console.log('Cleaning path vars for [' + request.name + ']')
        var pathVarValue = variables.path
        if (pathVarValue != undefined) {
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
            console.log('Cleaning body for [' + request.name + ']')
            var body = request.body;
            if (body != undefined) {
                var text = JSON.parse(body.raw.replaceAll('\\n', ''))
                Object.keys(text).forEach(key => {
                    var value = this.convertValues(key, text[key])
                    if (value != '') {
                        console.log("Updated value for [" + key + "] to [" + value + "]")
                        text[key] = value
                    }
                })
                body.raw = JSON.stringify(text);
            }
        }

    }

    cleanOASHeaderVariables(request){
        var headers = request.header
        headers.map(header => {
            var key = header.key
            console.log("Converting ["+key+"] value")
            var value = this.convertValues('header-' + key, header.value)
            if (value != '') {
                console.log("Updated value for [" + key + "] to [" + value + "]")
                header.value = value
            }
        })
    }

    // main
    convertCollection(converted_collection) {
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
        // console.log('The collection object is: ', converted_collection);
        fs.writeFileSync('test.json', JSON.stringify(converted_collection));
    }
}

module.exports = Handler