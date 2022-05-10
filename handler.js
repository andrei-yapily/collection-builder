var crypto = require('crypto');
var fs = require('fs');
const HEAD = fs.readFileSync('test_src/head.js', { encoding: 'UTF8' });
// const HEADER2 = fs.readFileSync('test_src/new.js', { encoding: 'UTF8' });

class Handler {
    constructor(){

    }

    uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
    
    // Converts untagged requests to collections
    convertRequest(category){
        console.log('Converting ' +category.name+ ' to collection')
        var requests = category;
        var name = requests.name.toLowerCase()
        name = name.replace('get ', '')
        name = name.replace('create ', '')
        name = name.replace(' ', '-')
        return {
            id: this.uuidv4(),
            name, name,
            item: [requests]
        }
    }
    
    
    addEvents(category){
        console.log('Adding tests to ' +category.name)
        var requests = category.item
        for(var i=0; i< requests.length; i++){
            var request = requests[i]
            console.log('Adding tests to ' +request.name)
            var events = [this.generate_event(request.name, 'test')]
            request.events = events;
        }
    }
    
    // adding events based on listener - accounts for event and request scenario
    generate_event(request_name, listen){
        var script_text = HEAD+ this.get_event(request_name);
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
    
    get_event(request_name){
        return "console.log(\' Event added\');"
    }
}

module.exports = Handler