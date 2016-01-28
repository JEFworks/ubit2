function initPca(dataRaw) {
    data = dataRaw;
    drawPcScatter(data);
}

function drawPcScatter(data) {
    var g = document.getElementById('pca_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;
    
    var margin = {top: 20, right: 40, bottom: 60, left: 20},
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

    var pcaSvg = d3.select("#pca").append("svg")
	.attr("id","pca_svg")
	.attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
	.append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
    var pca = new PCA();
    matrix = pca.scale(data, true, true);
    pc = pca.pca(matrix,2);

    data.map(function(d,i){
	d.pc1 = pc[i][0];
	d.pc2 = pc[i][1];
    });

    x.domain(d3.extent(data, function(d) { return d.pc1; })).nice();
    y.domain(d3.extent(data, function(d) { return d.pc2; })).nice();

    pcaSvg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("PC1");

    pcaSvg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("PC2")
    
    pcaSvg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", function(d) { return x(d.pc1); })
        .attr("cy", function(d) { return y(d.pc2); })
        .style("fill", function(d) { return color(d.species); });
         
}
