// Helper functions ----------------------------------------------------------

function shuffle(array) {
    var counter = array.length, temp, index;
    
    // While there are elements in the array
    while (counter > 0) {
	// Pick a random index
	index = Math.floor(Math.random() * counter);
	
	// Decrease counter by 1
	counter--;
	
	// And swap the last element with it
	temp = array[counter];
	array[counter] = array[index];
	array[index] = temp;
    }
    
    return array;
}


function roundNumber(x, digits) {
    digits = typeof digis !== 'undefined' ? digits : 2;
    if (x === 0) {
	return 0;
    }
    if (x < 0.01) {
	return x.toExponential(digits);
    }
    return x.toPrecision(digits + 1);
};

function seq(n) {
    retval = []
	for (var i = 0; i < n; i++) {
	    retval.push(i);
	}
    return retval;
}

function intersect(a, b) {
    var t;
    if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
    return a.filter(function (e) {
	    if (b.indexOf(e) !== -1) return true;
	});
}

// Run the enrichment test ---------------------------------------------------
function initMhg() {
    // restrict to gene sets where we have genes
    var genesHave = dataPro[0].map(function(o) { return o.name });
    var gsFilter = {};
    var gsName = Object.keys(gs);

    for(var i = 0; i < gsName.length; i++) {
	var gst = gs[gsName[i]];
	var geneSet = intersect(gst, genesHave);    
	if(geneSet.length > 0) {
	    gsFilter[gsName[i]] = gst;
	}
    };

    gsName = Object.keys(gsFilter);    
    options = '';
    for(var i = 0; i < gsName.length; i++) {
	options += "<option value=\"" + gsName[i] + "\">" + gsName[i] + "</option>"
	    }

    document.getElementById("geneset_selection").innerHTML = options;

    drawMhg();
}

function drawMhg() {

    var geneset_selection = document.getElementById("geneset_selection").value;

    // filter to the genes we have
    var genesHave = dataPro[0].map(function(o) { return o.name });
    var geneSet = intersect(gs[geneset_selection], genesHave);    
    var N = genesHave.length;
    var K = geneSet.length;
    var L = N;
    var X = 1;
    
    /*
    var sig = [];
    dataPro[0].map(function(o) { 
	    if(o.pval > -Math.log10(0.05)) { sig.push(o.name) }
	});
    */
    var v = genesHave.map(function(name) { 
	    if(geneSet.indexOf(name) >= 0) { return 1 }
	    else { return 0 }
	})
    
    /*
    // Big example.
    var N = 5000;
    var K = 100;
    var L = N / 4;
    var X = 5;
    var v = d3.range(N).map(function(){ return 0; });
    // v[26] = 1;
    // v[28] = 1;
    // v[49] = 1;
    // v[61] = 1;
    // v[80] = 1;
    // v[88] = 1;
    // v[89] = 1;
    // v[91] = 1;
    // v[92] = 1;
    // v[103] = 1;
    // v[129] = 1;
    // v[138] = 1;
    // v[139] = 1;
    // v[146] = 1;
    // v[180] = 1;
    
    // for (var i = 0; i < 30; i++) {
    //   var j = Math.abs(d3.round(d3.random.normal(N / 32, N / 8)()));
    //   v[j] = 1;
    // }
    
    // Small example.
    var N = 25;
    var K = 10;
    var L = N / 1.5;
    var X = 2;
    var v = d3.range(N).map(function(){ return 0; });

    v[0] = 1;
    v[1] = 1;
    v[2] = 1;
    v[3] = 1;
    v[4] = 1;
    v[6] = 1;
    */

// var successes = shuffle(seq(L / 1.2)).slice(0, L / 2);
// for (var i = 0; i < successes.length; i++) {
//   v[successes[i]] = 1;
// }

var mhg = new MHG();
var res = mhg.mhg_test(v, N, K, L, X);
// res.mhg = res.mhg.map(function(x) { return -1 * Math.log10(x); });

// console.log(res.mhg);
// console.log(res.matrix);

// Table ---------------------------------------------------------------------
/*
var mhg_matrix = '<table>';

mhg_matrix += '<tr class="mhg-matrix-margin">';
for (var j = 0; j < res.matrix[0].length + 1; j++) {
  mhg_matrix += '<td>' + j + '<\/td>';
}
mhg_matrix += '<\/tr>';

for (var i = 0; i < res.matrix.length; i++) {
  mhg_matrix += '<tr>';
  mhg_matrix += '<td class="mhg-matrix-margin">' + (i + 1) + '<\/td>';
  for (var j = 0; j < res.matrix[i].length; j++) {
    mhg_matrix += '<td>' + roundNumber(res.matrix[i][j]) + '<\/td>';
  }
  mhg_matrix += '<\/tr>';
}
document.getElementById("mhg-matrix").innerHTML = mhg_matrix;
*/

// Chart ---------------------------------------------------------------------

var g = document.getElementById('gsea_panel'),
    windowWidth = g.clientWidth,
    windowHeight = g.clientHeight;
    
var margin = {top: 20, right: 40, bottom: 60, left: 40},
    width = windowWidth - margin.left - margin.right,
        height = windowHeight - margin.top - margin.bottom;

    // remove if already existing for regeneration
    d3.select("#gsea_svg").remove();

var enrichmentHeight = height * 0.8;
var presenceHeight = height * 0.2;
var plotMargin = 25;

var x = d3.scale.linear()
    .range([0, width])
    .domain(d3.extent(res.mhg, function(d, i) { return i; }));

var y = d3.scale.linear()
    .range([enrichmentHeight, 0])
    .domain(d3.extent(res.mhg, function(d) { return d; }));

var y2 = d3.scale.linear()
    .range([presenceHeight, 0])
    .domain([1, 0]);

// Create a panel.
var svg = d3.select("#mhg-chart").append("svg")
    .attr("id","gsea_svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Create the line plot of enrichment.
var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + enrichmentHeight + ")")
    .call(xAxis)
  // Add the p-value to the x axis.
  .append("text")
    .attr("x", x(res.threshold) + 10)
    .attr("y", -20)
    .style("text-anchor", "begin")
    .text("P = " + roundNumber(res.pvalue));

svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
  .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Enrichment")

var enrich = d3.svg.line()
  .x(function(d, i) { return x(i); })
  .y(function(d) { return y(d); });

svg.append("g")
    .attr("class", "enrichment")
  .append("path")
    .datum(res.mhg)
    .attr("class", "line")
    .attr("d", enrich);

// Create a line at the rank with the minimum hypergeometric p-value.
svg.append("g")
  .attr("class", "threshold")
    .selectAll("g")
  .data([{ x: res.threshold, y: d3.max(res.mhg) }])
    .enter().append("g")
    .attr("transform", function(d, i) { return "translate(" + x(d.x) + ",0)"; })
  .append("rect")
    .attr("y", function(d) { return y(d.y); })
    .attr("height", function(d) { return enrichmentHeight - y(d.y); })
    .attr("width", 1)
    .attr("fill", "red");

// Create a bar chart to indicate presence and absence.
var bars = v.map(function(d, i) {
  if (d > 0) {
    return {x: i + 1, y: 1};
  }
}).filter(function(x) {return x;})

svg.append("g")
  .attr("class", "bars")
    .attr("transform", "translate(0," +
        (enrichmentHeight + plotMargin + presenceHeight) + ")")
    .selectAll("g")
  .data(bars)
    .enter().append("g")
    .attr("transform", function(d, i) { return "translate(" + x(d.x) + ",0)"; })
  .append("rect")
    .attr("y", function(d) { return 0 - presenceHeight; })
    .attr("height", function(d) { return y2(d.y); })
    .attr("width", 0.5);

    }