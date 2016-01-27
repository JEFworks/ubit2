
function transposeTransform(array) {
    var newArray = array[0].map(function(col, i) {
	return array.map(function(row) {
	    return row[i]
	})
    });
    return newArray;
};

function log10Transform(array) {
    var newArray = array
    for(var i = 0; i < array.length; i++) {
	row = array[i]
	for(var j = 0; j < row.length; j++) {
	    newArray[i][j] = Math.log10(array[i][j]+1);
	}
    }
    return newArray;
};    

function initData(dataRaw) {
    var data = dataRaw;

    transform = document.getElementById("transform").value;
    transpose = document.getElementById("transpose").value;
    
    if(transform == "log10") {
	data = log10Transform(data);
    }
    if(transpose == "yes") {
	data = transposeTransform(data);
    }
    
    dataPro = data;
};
