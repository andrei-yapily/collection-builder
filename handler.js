var crypto = require('crypto');
var fs = require('fs');
const HEAD = fs.readFileSync('test_src/head.js', { encoding: 'UTF8' });
// const HEADER2 = fs.readFileSync('test_src/new.js', { encoding: 'UTF8' });

COLL_VARS_KEYS = {
    APP_ID: "application_client_id", APP_SEC: "application_client_secret", USER_UUID: "user-uuid"
}

class CollVariable {

    constructor(name, def) {
        this.name = name
        this.default = def
    }
}

class Handler {


    constructor() {

    }

    FOLDERS = [
        { path: "user" },
        { path: "account" },
        { path: "consent" },
        { path: "identity" },
        { path: "payment" },
    ]

    COLL_VARS = [
        new CollVariable(COLL_VARS_KEYS.USER_UUID, ''),
        new CollVariable(COLL_VARS_KEYS.APP_ID, 'replace-me'),
        new CollVariable(COLL_VARS_KEYS.APP_SEC, 'replace-me')
    ]

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
            console.log('Adding tests to request [' + request.name + ']')
            var events = [this.generate_event(request, 'test')]
            request.events = events;
        }
        console.log('\n')
    }

    // adding events based on listener - accounts for event and request scenario
    generate_event(request, listen) {
        var mapped = request.name.toLowerCase().replaceAll(' ', '_')
        console.log("\nAdded Header test to ["+request.name+"]")
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
        auth_username.value = "{{" + COLL_VARS_KEYS.APP_ID + "}}"
        auth_password.value = "{{" + COLL_VARS_KEYS.APP_SEC + "}}"
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
            console.log("Added collection variable: [" + v.toString() + "]");
        });
    }

    convertCollection(result) {
        this.updateAuth(result)
        this.updateVariables(result)
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