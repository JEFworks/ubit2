// var data = [
//   [20, 20, 80, 20, 234],
//   [200, 0, 23, 1, 234],
//   [22, 22, 90, 12, 12],
//   [250, 255, 253, 231, 234],
//   [100, 54, 100, 23, 232],
//   [0, 30, 70, 34, 2],
//   [255, 13, 8, 34, 2]
//   ];


function initHeatmap() {
    cluster_method = document.getElementById("cluster_method").value;
    distance_metric = document.getElementById("distance_metric").value;

    // Get numeric values
    var data = dataPro.map(function(d) { return d.map(function(o) { return o.value }); });
    data.map(function(d, i) { d.name = dataPro[i].name })
    
    var clusteredData = clusterfck.hcluster(data, distance_metric, cluster_method);
    var clusters = convert(clusteredData, "root");

    drawHeatmap(data, clusters);
}

function drawHeatmap(data, clusters) {
    var g = document.getElementById('heatmap_panel'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;
    
    var nrow = data.length;
    var ncol = data[0].length;
    var minData = d3.min(d3.min(data));
    var maxData = d3.max(d3.max(data));
    var midData = (minData + maxData) / 2;

    // remove if already existing for regeneration
    d3.select("#dendro_svg").remove();
    
    // heatmap is width ncol * boxSize
    // dendrogram is width (ncol * boxSize)*0.5
    //var width = ncol * boxSizeX + 100;
    //	height = nrow * boxSizeY;
    var margin = {top: 20, right: 40, bottom: 60, left: 20},
	width = windowWidth - margin.left - margin.right,
	height = windowHeight - margin.top - margin.bottom;

    var boxSizeX = (2*width/3)/ncol; // size of heatmap / ncols
    var boxSizeY = height/nrow;

    // dendrogram with symmetric children
    var cluster = d3.layout.cluster()
	.size([height, width/3]) // size of dendrogram
	.separation(function(a, b) { return (a.parent == b.parent ? 1 : 1 ) });
    
    var diagonal = d3.svg.diagonal()
	.projection(function(d) { return [d.y, d.x]; });

    var tip = d3.tip()
	.attr('class', 'd3-tip')
	.offset([0, 0])
	.html(function(d) {
	    return d.name;
	})    

    var svg = d3.select("#dendro").append("svg")
	.attr("id","dendro_svg")
	.attr("width", width)
	.attr("height", height)
	.append("g")
	.attr("transform", "translate(10,0)");

    svg.call(tip);
    
    var nodes = cluster.nodes(clusters),
	links = cluster.links(nodes);
    
    var link = svg.selectAll(".link")
	.data(links)
	.enter().append("path")
	.attr("class", "link")
	.attr("d", diagonal);
    
    var node = svg.selectAll(".node")
	.data(nodes)
	.enter().append("g")
	.attr("class", "node")
	.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })

    var colorScale = d3.scale.linear()
	.domain([minData, midData, maxData])
	.range(["blue","white","red"]);

    // append rectangular boxes if last node (no children)
    for(var i = 0; i < ncol; i++) {
	node.append("svg:rect")
	    .attr('width', function(d) { return d.children ? 0 : boxSizeX; })
	    .attr('height', function(d) { return d.children ? 0 : boxSizeY; })
	    .attr('x', boxSizeX * i - boxSizeX/2)
	    .attr('y', -boxSizeY/2)
	    .attr("stroke", "grey")
	    .attr("stroke-width", 1)
	    .style('fill', function(d) { return d.children ? "#fff" : colorScale(d.value[i]) })
	    .on('mouseover', tip.show)
	    .on('mouseout', tip.hide);                           
    }

    /* 
    node.append("text")
	.attr("dx", function(d) { return d.children ? 0 : 0; })
	.attr("dy", 0)
	.text(function(d) { return d.children ? "" : d.value['name'] });
    */
    
    d3.select(self.frameElement).style("height", height + "px");
    d3.select(self.frameElement).style("width", width + "px");

}
