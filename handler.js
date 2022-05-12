var crypto = require('crypto');
var fs = require('fs');
const HEAD = fs.readFileSync('test_src/head.js', { encoding: 'UTF8' });
// const HEADER2 = fs.readFileSync('test_src/new.js', { encoding: 'UTF8' });

COLL_VARS_KEYS = {
    // KEY: [KEY_NAME, IGNORE - don't fill in with empty value]
    APP_ID: ["application_client_id", true],
    APP_SEC: ["application_client_secret", true],
    USER_UUID: ["user-uuid", false],
    USERS_AMOUNT: ["users-amount", false],
    CONSENT_ID: ["consent-id", false],
    TRANSACTION_ID: ["transaction-id", false],
    ACCOUNT_ID: ["account-id", false],
    CONSENT_TOKEN: ["consent-token", false],
    CONSENT_AMOUNT: ["consent-amount", false],
    CONSENT_ID: ["consent-id", false],
    PAYMENT_ID: ["payment-id", false],
}

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
    kebabize = str => {
        return str.split('').map((letter, idx) => {
            return letter.toUpperCase() === letter
                ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
                : letter;
        }).join('');
    }
    parametrize = str => "{{" + str + "}}"


    uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    addEvents(category) {
        console.log('Adding tests to group [' + category.name + ']')
        var requests = category.item
        for (var i = 0; i < requests.length; i++) {
            var request = requests[i]
            this.cleanOASVariables(request.request)
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

    updateAuth(result) {
        console.log("Updating auth for collection.")
        var [auth_username, auth_password] = result.auth.basic
        auth_username.value = this.parametrize(COLL_VARS_KEYS.APP_ID[0])
        auth_password.value = this.parametrize(COLL_VARS_KEYS.APP_SEC[0])
        console.log("Updated auth for collection.", auth_username, auth_password)
    }

    updateVariables(result) {
        var variables = result.variable
        this.COLL_VARS.forEach(v => {
            variables.push({
                type: 'string',
                key: v.name,
                value: v.default
            })
            console.log("Added collection variable: [" + v.name + "]");
        });
    }

    cleanOASVariables(request) {
        var variables = request.url
        console.log('Cleaning path and query vars for [' + request.name + ']')
        variables.query = []
        var pathVarValue = variables.path
        if (pathVarValue != undefined) {
            var config = pathVarValue.map(path => {
                if (path.includes(":")) {
                    var keyVal = path.substring(1)
                    var kebab = this.kebabize(keyVal)
                    var collVar = this.COLL_VARS.filter(v => v.name == kebab)
                    if(collVar[0] != undefined){
                        collVar = collVar[0]
                        var variable = variables.variable.filter(va => va.key == keyVal)[0]
                        variable.value = this.parametrize(collVar.name)
                    }
                    return collVar
                }
            });
            console.log(config)
        }
    }

    convertCollection(result) {
        this.updateVariables(result)
        this.updateAuth(result)
        var items = result.item
        for (var i = 0; i < items.length; i++) {
            var category = items[i]
            if (category.item != undefined) {
                this.addEvents(category)
            }
        }
        result.items = items.filter(i => i.item != undefined)
        // console.log('The collection object is: ', result);
        fs.writeFileSync('test.json', JSON.stringify(result));
    }
}

module.exports = Handler