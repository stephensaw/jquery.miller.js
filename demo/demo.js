var loader = function (selectedPaths) {
	if (!selectedPaths) {
		return $.getJSON('data4.json');
	}

	var anchorId = '';
	var anchorIdPath = '|';
	var groupId = '';
	var termSetId = '';
	var termStoreId = '';

	termStoreId = selectedPaths[0].id;

	if (selectedPaths.length >= 2) {
		groupId = selectedPaths[1].id;
	} 

	if (selectedPaths.length >= 3) {
		termSetId = selectedPaths[2].id;
	}

	if (selectedPaths.length < 4) {
		return $.getJSON('data1.json');
	}

	anchorId = selectedPaths[selectedPaths.length - 1].id;

	var paths = [];

	for (var i = 3, total = selectedPaths.length; i < total; i++) {
		paths.push(selectedPaths[i].id);
	}

	anchorIdPath += paths.join('|');

	console.log("anchorId: " + anchorId);
	console.log("anchorIdPath: " + anchorIdPath);
	console.log("groupId: " + groupId);
	console.log("termSetId: " + termSetId);
	console.log("termStoreId: " + termStoreId);

	return $.getJSON('data2.json');
}

var creater = function (newValue) {
	var deferred = $.Deferred();

	var result = {
        "id" : "AAAbbc2-a012-455e-993d-e207a1b105a7",
        "type" : "term",
        "name": newValue,
        "isParent" : false,
        "children" : []
	};

	deferred.resolve(result);

	return deferred.promise();
}

var selector = function (selectedValues) {
	console.log(selectedValues);
}

var millerControl = $('#miller').miller({
	'loader': loader,
	'creater': creater,
	'selector': selector,
	'showBreadCrumb': true,
});