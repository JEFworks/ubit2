function initHist(data) {
    drawHistRowsums(data);
}

function drawHistRowsums(matrix) {    
    var rowSums = matrix.map( function(row){
	return row.reduce(function(a,b){ return a + b; }, 0);
    });
    var maxData = d3.max(rowSums);
    
    var g = document.getElementById('hist_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;
    
    var margin = {top: 20, right: 40, bottom: 60, left: 20},
	width = windowWidth - margin.left - margin.right,
	height = windowHeight - margin.top - margin.bottom;

    // remove if already existing for regeneration
    d3.select("#hist_svg").remove();
    
    var x = d3.scale.linear()
        .domain([0, maxData])
        .range([0, width]);

    // Generate a histogram using twenty uniformly-spaced bins.
    var data = d3.layout.histogram()
        .bins(x.ticks(20))
    (rowSums);

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var svg = d3.select("#hist").append("svg")
	.attr("id","hist_svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
	.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll(".bar")
        .data(data)
	.enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(data[0].dx) - 1)
        .attr("height", function(d) { return height - y(d.y); })
        .style("fill", "steelblue");
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

}
