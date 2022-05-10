var fs = require('fs');
var Handler = require('./handler');
var Converter = require('openapi-to-postmanv2');
openapiData = fs.readFileSync('sample.json', { encoding: 'UTF8' });


var h=  new Handler();
fs.unlinkSync('test.json');

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
                    h.addEvents(category)
                }
                else {
                    var converted = h.convertRequest(category)
                    h.addEvents(converted)
                    items.push(converted)
                }
            }
            result.items = items.filter(i => i.item != undefined)
            console.log('The collection object is: ', result);
            fs.writeFileSync('test.json', JSON.stringify(result));
        }
    }
);