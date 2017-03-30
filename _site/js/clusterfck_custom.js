// convert from clusterfck to d3 json format
// courtesy of http://jsfiddle.net/nrabinowitz/vuk94/
function convert(input, rootName) {
    // top level
    if (Array.isArray(input)) {
        return {
            "canonical": rootName,
		"children": input.map(convert)
		};
    }
    // node
    else {
        ['left', 'right'].forEach(function(side) {
		if (input[side]) {
		    input.children = input.children || [];
		    input.children.push(convert(input[side]));
		    delete input[side];
		}
	    });
        return input;
    }
}
