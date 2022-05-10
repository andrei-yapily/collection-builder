var fs = require('fs');
var crypto = require('crypto');

Converter = require('openapi-to-postmanv2'),
    openapiData = fs.readFileSync('sample.json', { encoding: 'UTF8' });

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Converts untagged requests to collections
function convertRequest(category){
    console.log('Converting ' +category.name+ ' to collection')
    var requests = category;
    var name = requests.name.toLowerCase()
    name = name.replace('get ', '')
    name = name.replace('create ', '')
    name = name.replace(' ', '-')
    return {
        id: uuidv4(),
        name, name,
        item: [requests]
    }
}

function addTests(category){
    console.log('Adding tests to ' +category.name)
    var requests = category.item
    for(var i=0; i< requests.length; i++){
        var request = requests[i]
        console.log('Adding tests to ' +request.name)
        request.tests = []
    }
}

Converter.convert({ type: 'string', data: openapiData },
    {}, (err, conversionResult) => {
        if (!conversionResult.result) {
            console.log('Could not convert', conversionResult.reason);
        }
        else {
            result = conversionResult.output[0].data;
            var items = result.item
            for (var i = 0; i < items.length; i++) {
                var category = items[i]
                if (category.item != undefined) {
                    addTests(category)
                }
                else {
                    var converted = convertRequest(category)
                    addTests(converted)
                    items.push(converted)
                }
            }
            items = items.filter(i => i.item != undefined)
            result.item= items
            console.log('The collection object is: ', result);
            fs.writeFileSync('test.json', JSON.stringify(result));
        }
    }
);