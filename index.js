var fs = require('fs');
var Handler = require('./handler');
var Converter = require('openapi-to-postmanv2');
openapiData = fs.readFileSync('sample.json', { encoding: 'UTF8' });
const OUTPUT = 'test.json'

var h = new Handler();
if (fs.existsSync(OUTPUT))
    fs.unlinkSync(OUTPUT);

Converter.convert({ type: 'string', data: openapiData },
    {
        requestNameSource: 'fallback',
        indentCharacter: ' ',
        requestParametersResolution: 'Example',
        folderStrategy: 'tags',
        keepImplicitHeaders: true

    }, (err, conversionResult) => {
        if (!conversionResult.result) {
            console.log('Could not convert', conversionResult.reason);
        }
        else {
            result = conversionResult.output[0].data;
            h.convertCollection(result);
        }
    }
);