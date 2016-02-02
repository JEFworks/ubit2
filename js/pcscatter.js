function initPca(data) {
    drawPcScatter(data);
}

function initDiffexp(data) {
    //drawVolcano(data);
    drawPval(data);
}

function getGroups(data) {
    var groups = clusterfck.kmeans(data, 2);
    function isGroup0(value) {
	var b = groups[0].indexOf(value) > -1;
	return +b; // convert from boolean to numeric
    }
    return data.map(isGroup0);
}

function diffExpPval(g1, g2) {
    // calculate p-value
    var pval = [];
    for (i = 0; i < g1.length; i++) { 
	var t = mannwhitneyu.test(g1[i], g2[i], alternative="two-sided");
	pval.push(-Math.log10(t['p']));
    }

    return pval;
}

function mean(numbers) {
    var sum = 0,
	i;
    for (i = 0; i < numbers.length; i += 1) {
	sum += numbers[i];
    }
    return sum / numbers.length;
}

function diffExpFc(g1, g2) {
    // calculate fold change
    var fc = [];
    for (i = 0; i < g1.length; i++) {
	var m1 = mean(g1[i])
	var m2 = mean(g2[i])
	var t = (m2 - m1) / m1
	fc.push(Math.log2(t));
    }

    return fc;
}

function drawVolcano(data) {
    var g = clusterfck.kmeans(data, 2);

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

    var fc = diffExpFc(g1, g2);
    var pval = diffExpPval(g1, g2);

    var g = document.getElementById('diffexp_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;
    
    var margin = {top: 20, right: 40, bottom: 60, left: 40},
        width = windowWidth - margin.left - margin.right,
        height = windowHeight - margin.top - margin.bottom;
    
    // remove if already existing for regeneration
    d3.select("#diffexp_svg").remove();

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

    var svg = d3.select("#diffexp").append("svg")
	.attr("id","diffexp_svg")
	.attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
    data.map(function(d,i){
	d.fc = fc[i];
	d.pval = pval[i];
    });

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
        .attr("r", 3.5)
        .attr("cx", function(d) { return x(d.fc); })
        .attr("cy", function(d) { return y(d.pval); })
	.style("fill", function(d) {
	    if (d.pval >= -Math.log10(0.05/data.length)) {return "red"}
	    else { return "steelblue" }
	    ;})

}

// pval barplot
function drawPval(data) {
    var g = clusterfck.kmeans(data, 2);

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

    var pval = diffExpPval(g1, g2);
    data = pval;
    
    var g = document.getElementById('diffexp_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;
    
    var margin = {top: 20, right: 40, bottom: 60, left: 40},
        width = windowWidth - margin.left - margin.right,
        height = windowHeight - margin.top - margin.bottom;
    
    // remove if already existing for regeneration
    d3.select("#diffexp_svg").remove();

    var x = d3.scale.linear()
        .domain([0, data.length])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([0, d3.max(data)])
        .range([height, 0]);    

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var barWidth = width / data.length;

    var svg = d3.select("#diffexp").append("svg")
        .attr("id","diffexp_svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll("g")
        .data(data)
        .enter().append("g")
        .attr("transform", function(d, i) { return "translate(" + i * barWidth + ",0)"; });

    bar.append("rect")
        .attr("y", function(d) { return y(d); })
        .attr("height", function(d) { return height - y(d); })
        .attr("width", barWidth - 1)
	.style("fill", function(d) {
	    if (d >= -Math.log10(0.05/data.length)) {return "red"}
	    else { return "steelblue" }
	    ;})
    
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

}

function drawPcScatter(data) {
    var g = document.getElementById('pca_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;
    
    var margin = {top: 20, right: 40, bottom: 60, left: 40},
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
    
    var pca = new PCA();
    matrix = pca.scale(data, true, true);
    pc = pca.pca(matrix,2);

    data.map(function(d,i){
	d.pc1 = pc[i][0];
	d.pc2 = pc[i][1];
    });

    var g = getGroups(data);
    data.map(function(d, i) {
	d.group = g[i]
    });

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
        .attr("r", 3.5)
        .attr("cx", function(d) { return x(d.pc1); })
        .attr("cy", function(d) { return y(d.pc2); })
        .style("fill", function(d) { return color(d.group); })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);  
}
