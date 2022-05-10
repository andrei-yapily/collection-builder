var crypto = require('crypto');
var fs = require('fs');
const HEAD = fs.readFileSync('test_src/head.js', { encoding: 'UTF8' });
// const HEADER2 = fs.readFileSync('test_src/new.js', { encoding: 'UTF8' });

class Handler {
    constructor() {

    }

    uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    addEvents(category) {
        console.log('\nAdding tests to group [' + category.name + ']')
        var requests = category.item
        for (var i = 0; i < requests.length; i++) {
            var request = requests[i]
            console.log('Adding tests to request [' + request.name + ']')
            var events = [this.generate_event(request.name, 'test')]
            request.events = events;
        }
    }

    // adding events based on listener - accounts for event and request scenario
    generate_event(request_name, listen) {
        var mapped = request_name.toLowerCase().replaceAll(' ', '_')
        var script_text = HEAD + this.get_event(mapped);
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

    get_event(request_name) {
        var folders = ["user", "account", "consents"]
        var folder = folders.filter(v => request_name.includes(v))[0]
        var path = './test_src/' + folder + '/' + request_name + '.js'
        if (fs.existsSync(path)) {
            console.log("Adding test from " + path)
            return fs.readFileSync(path, { encoding: 'UTF8' });
        }
        return ''
    }

    convertCollection(result) {
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