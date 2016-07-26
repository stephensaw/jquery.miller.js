var loader = function (selectedPaths) {
	if (!selectedPaths) {
		return $.getJSON('data3.json');
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

$(document).ready(function() {
	$('#miller').miller({
		'loader': loader
	});
});