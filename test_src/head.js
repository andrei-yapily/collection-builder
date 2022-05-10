// this is a Header test
pm.test("response must be valid and have a json body", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.withBody;
    pm.response.to.be.json;
});

var data = JSON.parse(responseBody);

console.log(data);

