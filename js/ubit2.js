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
	var t = m2 / m1
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

// Initial data processing
function initData() {
    var data = dataRaw;
    
    transform = document.getElementById("transform").value;

    if(transform == "log10") {
	data.map(function(d) { return d.map(function(o) {
	    o.value = Math.log10(o.value + 1);
	}) });
    }

    dataAll = data    

    // make smaller
    // visualize max 100 genes and 100 cells
    if(data.length > 100) {
	data = data.slice(0, 100)
    }
    if(data[0].length > 100) {
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
	data = data.map(function(d) { return d.slice(0,100) })
    }
    // need more rows than columns for pca
    if(data[0].length > data.length) {
	data = data.map(function(d) { return d.slice(0,data.length) })
    }

    dataPro = data
};

// Perform calculations
function initCalc() {

    // Get numeric values
    var data = dataPro.map(function(d) { return d.map(function(o) { return o.value }); });

    // K means groups
    var g = clusterfck.kmeans(data, 2);
    // Map to data
    var g1 = g[0][0].map(function(col, i) {
	return g[0].map(function(row) {
	    return row[i]
	})
    })
    var g2 = g[1][0].map(function(col, i) {
	return g[1].map(function(row) {
	    return row[i]
	})
    })

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

    // Sort by fold change, decreasing
    dataPro.map(function(d) { return d.sort(function (a, b) {
	if (a.fc > b.fc) {
	    return -1;
	}
	if (a.fc < b.fc) {
	    return 1;
	}
	// a must be equal to b
	return 0;
    }) });

}

