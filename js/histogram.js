function initHist() {
    drawHistLibSize();
    drawHistLibComplex();
}

function drawHistLibSize() {

    var matrix = dataPro.map(function(d) { return d.map(function(o) { return o.value }); }); 
    
    var rowSums = matrix.map( function(row){
	return row.reduce(function(a,b){ return a + b; }, 0);
    });
    var maxData = d3.max(rowSums);
    
    var g = document.getElementById('hist_panel1'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;
    
    var margin = {top: 20, right: 40, bottom: 60, left: 20},
	width = windowWidth - margin.left - margin.right,
	height = windowHeight - margin.top - margin.bottom;

    // remove if already existing for regeneration
    d3.select("#hist_svg1").remove();
    
    var x = d3.scale.linear()
        .domain([0, maxData])
        .range([0, width]);

    // Generate a histogram using twenty uniformly-spaced bins.
    var data = d3.layout.histogram()
        .bins(x.ticks(matrix.length/5))
    (rowSums);

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-1, 0])
        .html(function(d) {
	    return d.y;
	})   

    var svg = d3.select("#hist1").append("svg")
	.attr("id","hist_svg1")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
	.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.call(tip);

    var bar = svg.selectAll(".bar")
        .data(data)
	.enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(data[0].dx) - 1)
        .attr("height", function(d) { return height - y(d.y); })
        .style("fill", "steelblue")
	.on('mouseover', tip.show)
        .on('mouseout', tip.hide);
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

}

function drawHistLibComplex() {
    
    var matrix = dataPro.map(function(d) { return d.map(function(o) { return o.value }); }); 

    var rowSums = matrix.map( function(row){
	var counter = 0;
	for(var i=0; i < row.length; i++) {
	    if( row[i] > 0) counter++;
	}
	return counter;
    });
    var maxData = d3.max(rowSums);
    
    var g = document.getElementById('hist_panel2'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;
    
    var margin = {top: 20, right: 40, bottom: 60, left: 20},
	width = windowWidth - margin.left - margin.right,
	height = windowHeight - margin.top - margin.bottom;

    // remove if already existing for regeneration
    d3.select("#hist_svg2").remove();
    
    var x = d3.scale.linear()
        .domain([0, maxData])
        .range([0, width]);

    // Generate a histogram using twenty uniformly-spaced bins.
    var data = d3.layout.histogram()
        .bins(x.ticks(matrix.length/5))
    (rowSums);

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-1, 0])
        .html(function(d) {
	    return d.y;
	})   

    var svg = d3.select("#hist2").append("svg")
	.attr("id","hist_svg2")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
	.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.call(tip);

    var bar = svg.selectAll(".bar")
        .data(data)
	.enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(data[0].dx) - 1)
        .attr("height", function(d) { return height - y(d.y); })
        .style("fill", "steelblue")
	.on('mouseover', tip.show)
        .on('mouseout', tip.hide);
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

}
