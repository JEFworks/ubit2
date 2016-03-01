function initDiffexpPca() {

    // sort
    var sort_method = document.getElementById("diffexp_sort").value;
    var sort_dir = document.getElementById("diffexp_sortdir").value;
    var i;
    if(sort_dir == "decreasing") {
	i = 1;
    }
    if(sort_dir == "increasing") {
	i = -1;
    }
    if(sort_method == "fold-change") {
	dataPro.map(function(d) { return d.sort(function (a, b) {
			if (a.fc > b.fc) {
			    return -i;
			}
			if (a.fc < b.fc) {
			    return i;
			}
			// a must be equal to b
			return 0;
		    }) });
    }
    if(sort_method == "p-value") {
	dataPro.map(function(d) { return d.sort(function (a, b) {
			if (a.pval > b.pval) {
			    return -i;
			}
			if (a.pval < b.pval) {
			    return i;
			}
			// a must be equal to b
			return 0;
		    }) });
    }

    drawVolcano(dataPro);
    drawPval(dataPro);
    drawFc(dataPro);
    drawPcScatter(dataPro);
}

// Draw volcano plot
function drawVolcano(dataPro) {

    var data = dataPro[0].map(function(o) { return { name: o.name, fc: o.fc, pval: o.pval } });

    var g = document.getElementById('volcano_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;

    var margin = {top: 15, right: 0, bottom: 50, left: 30},
        width = windowWidth - margin.left - margin.right,
        height = windowHeight - margin.top - margin.bottom;

    // remove if already existing for regeneration
    d3.select("#volcano_svg").remove();

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-1, 0])
        .html(function(d) {
	    return d.name;
	})

    var svg = d3.select("#volcano").append("svg")
	.attr("id","volcano_svg")
	.attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.call(tip);

    x.domain(d3.extent(data, function(d) { return d.fc; })).nice();
    y.domain(d3.extent(data, function(d) { return d.pval; })).nice();

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("log2(fold change)");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("-log10(p-value)")

    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 5)
        .attr("cx", function(d) { return x(d.fc); })
        .attr("cy", function(d) { return y(d.pval); })
	.style("fill", function(d) {
	    if (d.pval >= -Math.log10(0.05/data.length)) {return "red"}
	    else { return "steelblue" }
	    ;})
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    svg.append("line")
	.attr("x1", 0)
	.attr("y1", y(-Math.log10(0.05/data.length)))
	.attr("x2", width)
	.attr("y2", y(-Math.log10(0.05/data.length)))
	.style("stroke-width", 1)
	.style("stroke-dasharray", "5,5")
	.style("stroke", "red")
	.style("fill", "none");
}

// Barplot of p-values
function drawPval(dataPro) {

    var data = dataPro[0].map(function(o) { return { name: o.name, value: o.pval } });
    var threshold = -Math.log10(0.05/data.length);
    
    var g = document.getElementById('diffexp_pval_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight

    var margin = {top: 15, right: 0, bottom: 15, left: 30},
        width = windowWidth - margin.left - margin.right,
        height = windowHeight - margin.top - margin.bottom;

    // remove if already existing for regeneration
    d3.select("#diffexp_pval_svg").remove();

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(data.map(function(d) { return d.name; }));

    var y = d3.scale.linear()
        .range([height, 0])
        .domain([0, d3.max(data.map(function(d) { return d.value }))]);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5);

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-1, 0])
        .html(function(d) {
	    return d.name;
	})

    var svg = d3.select("#diffexp_pval_panel").append("svg")
        .attr("id","diffexp_pval_svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.call(tip);

    svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.name); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return height - y(d.value); })
        .style("fill", function(d) {
	    if (d.value >= threshold) {return "red"}
	    else { return "steelblue" }
	})
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);


    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)

    svg.append("line")
        .attr("y1", y(threshold))
        .attr("x1", 0)
        .attr("y2", y(threshold))
        .attr("x2", width)
        .style("stroke-width", 1)
        .style("stroke-dasharray", "5,5")
        .style("stroke", "red")
        .style("fill", "none");

}

// Barplot of fold-change
function drawFc(dataPro) {

    var data = dataPro[0].map(function(o) { return { name: o.name, value: o.fc } });

    // remove if already existing for regeneration
    d3.select("#diffexp_fc_svg").remove();

    var g = document.getElementById('diffexp_fc_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight,
        margin = {top: 15, right: 0, bottom: 15, left: 30}

    var svg = d3.select("#diffexp_fc").datum(data)
        .attr("id","diffexp_fc_svg")
	.call(columnChart()
	      .margin(margin)
	      .width(windowWidth)
	      .height(windowHeight)
	      .x(function(d, i) { return d.name; })
	      .y(function(d, i) { return d.value; }))

}

// PCA
function drawPcScatter(dataPro) {

    var data = dataPro;

    var g = document.getElementById('pca_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;

    var margin = {top: 15, right: 15, bottom: 30, left: 30},
        width = windowWidth - margin.left - margin.right,
        height = windowHeight - margin.top - margin.bottom;

    // remove if already existing for regeneration
    d3.select("#pca_svg").remove();

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = d3.scale.category10();

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-1, 0])
        .html(function(d) {
	    return d.name;
	})

    var svg = d3.select("#pca").append("svg")
	.attr("id","pca_svg")
	.attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.call(tip);

    x.domain(d3.extent(data, function(d) { return d.pc1; })).nice();
    y.domain(d3.extent(data, function(d) { return d.pc2; })).nice();

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("PC1");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("PC2")

    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 5)
        .attr("cx", function(d) { return x(d.pc1); })
        .attr("cy", function(d) { return y(d.pc2); })
        .style("fill", function(d) { return color(d.group); })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);
}
