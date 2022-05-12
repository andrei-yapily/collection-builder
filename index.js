var fs = require('fs');
var Handler = require('./handler');
var Converter = require('openapi-to-postmanv2');

// fetch command line arguments
const arg = (argList => {
    let arg = {}, a, opt, thisOpt, curOpt;
    for (a = 0; a < argList.length; a++) {
        thisOpt = argList[a].trim();
        opt = thisOpt.replace(/^\-+/, '');
        // only process params passed in this format - {key=value}
        if(opt.includes('=')){
            var opts = opt.split('=')
            arg[opts[0]] = opts[1]
        }
    }
    return arg;
})(process.argv);

var h = new Handler();
openapiData = fs.readFileSync(arg.input, { encoding: 'UTF8' });
const OUTPUT = arg.output != undefined ? arg.output: 'output/collection.json'

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
            h.convertCollection(result, OUTPUT);
        }
    }
);