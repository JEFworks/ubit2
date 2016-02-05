// Globals
var rowSums;
var rowNonzeros;
var dataPro;

function initData() {    
    var rawData = getData();
    processData(rawData);
}

// Read in raw data from form
function getData() {

    var txt = $("#incsv").val();
    var lines = txt.split("\n");
    var rawData = [];
    var dlen = -1;

    var delimName = document.getElementById("delimiter").value;
    var delim;
    if(delimName == "comma") {
	delim = ','
    }
    if(delimName == "tab") {
	delim = '\t'
    }

    var colNames = lines[0].split(delim);
    for(var i = 1; i < lines.length;i++) {
	row = lines[i].split(delim);
	var dataPoint = [];
	dataPoint['name'] = row[0];
	for(var j = 1; j < row.length; j++) {
	    if(row[j].length !== 0) {
		dataPoint.push({name:colNames[j].trim(),value: parseFloat(row[j])});
	    }
	}
	rawData.push(dataPoint);
    }
    return rawData;
}


// Data processing and calculations
function processData(data) {
    
    var transform = document.getElementById("transform").value;

    if(transform == "log10") {
	data.map(function(d) { return d.map(function(o) {
	    o.value = Math.log10(o.value + 1);
	}) });
    }
    if(transform == "asinh") {
	data.map(function(d) { return d.map(function(o) {
	    o.value = Math.asinh(o.value);
	}) });
    }
    if(transform == "biomark") {
	data.map(function(d) { return d.map(function(o) {
	    var t = 28 - o.value;
	    if(t < 0) { t = 0 }
	    o.value = t;
	}) });
    }

    var dataAll = data;
    var matrix = dataAll.map(function(d) { return d.map(function(o) { return o.value }); });
    // set global
    rowSums = matrix.map( function(row){
	    return row.reduce(function(a,b){ return a + b; }, 0);
	});
    rowNonzeros = matrix.map( function(row){
	    var counter = 0;
	    for(var i=0; i < row.length; i++) {
		if( row[i] > 0) counter++;
	    }
	    return counter;
	});

    // make smaller
    // visualize max 96 genes and 96 cells
    if(data.length > 96) {
	data = data.slice(0, 96)
    }
    if(data[0].length > 96) {
	// keep only the most variable genes
	var temp = data.map(function(d) { return d.map(function(o) { return o.value }); });	               
        var gv = colVar(temp)
	data.map(function(d) { return d.map(function(o, i) {
	    o.v = gv[i];
	})});	
	// sort
	data.map(function(d) { return d.sort(function (a, b) {
	    if (a.v > b.v) {
		return -1;
	    }
	    if (a.v < b.v) {
		return 1;
	    }
	    // a must be equal to b
	    return 0;
	}) });
        // Keep top 100	
	data = data.map(function(d) {
	    var s = d.slice(0,96)
	    s['name'] = d.name
	    return s
	})
    }
    // need more rows than columns for pca
    if(data[0].length > data.length) {
	data = data.map(function(d) {
	    var s = d.slice(0, data.length)
	    s['name'] = d.name
	    return s
	})
    }

    // set global
    dataPro = data;

    // Get numeric values
    var data = dataPro.map(function(d) { return d.map(function(o) { return o.value }); });

    // K means groups
    var g = clusterfck.kmeans(data, 2);
    // Map to data
    var g1 = g[0][0].map(function(col, i) {
	return g[0].map(function(row) {
		return row[i];
	    });
	});
    var g2 = g[1][0].map(function(col, i) {
	    return g[1].map(function(row) {
		return row[i];
	    });
	});

    // Row level metrics; store in object
    var fc = diffExpFc(g1, g2);
    var pval = diffExpPval(g1, g2);
    dataPro.map(function(d) { return d.map(function(o, i) {
	o.fc = fc[i];
	o.pval = pval[i];
    })});

    // Column level metrics, store in array
    var pca = new PCA();
    matrix = pca.scale(data, true, true);
    pc = pca.pca(matrix,2);

    var groups = getGroups(data, g);
    dataPro.map(function(d, i) {
	d.group = groups[i]
    });

    dataPro.map(function(d,i){
	d.pc1 = pc[i][0];
	d.pc2 = pc[i][1];
    });

}











// Transpose 2D array
function transposeTransform(array) {
    var newArray = array[0].map(function(col, i) {
	return array.map(function(row) {
	    return row[i]
	})
    });
    return newArray;
};

// Log10 all values of numeric 2D
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


function getGroups(data, groups) {
    function isGroup0(value) {
	var b = groups[0].indexOf(value) > -1;
	return +b; // convert from boolean to numeric
    }
    return data.map(isGroup0);
}

// Differential expression P-vals by Mann Whistney U-test
function diffExpPval(g1, g2) {
    // calculate p-value
    var pval = [];
    for (i = 0; i < g1.length; i++) {
	var t = mannwhitneyu.test(g1[i], g2[i], alternative="two-sided");
	var p = -Math.log10(t['p']);
	if(isNaN(p)) { p = 1 }
	pval.push(p);
    }

    return pval;
}

// Calculate mean
function mean(numbers) {
    var sum = 0,
	i;
    for (i = 0; i < numbers.length; i += 1) {
	sum += numbers[i];
    }
    return sum / numbers.length;
}

// Calculate variance
function variance(values){
    var avg = mean(values);

    var squareDiffs = values.map(function(value){
	var diff = value - avg;
	var sqrDiff = diff * diff;
	return sqrDiff;
    });

    var variance = mean(squareDiffs);

    return variance;
}

// Calculate fold change
function diffExpFc(g1, g2) {
    // calculate fold change
    var fc = [];
    for (i = 0; i < g1.length; i++) {
	var m1 = mean(g1[i])
	var m2 = mean(g2[i])
	    var t = (m2 + 0.0000001) / (m1+0.0000001) // pseudo
	t = Math.log2(t);
	if(isNaN(t)) { t = 0 }
	fc.push(t);
    }

    return fc;
}

function colVar(array) {
    array = transposeTransform(array);
    var colVar = array.map(function(d) { return variance(d)}) 
    return colVar
}



