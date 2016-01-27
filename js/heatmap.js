// var data = [
//   [20, 20, 80, 20, 234],
//   [200, 0, 23, 1, 234],
//   [22, 22, 90, 12, 12],
//   [250, 255, 253, 231, 234],
//   [100, 54, 100, 23, 232],
//   [0, 30, 70, 34, 2],
//   [255, 13, 8, 34, 2]
//   ];

function initHeatmap(data) {    
    cluster_method = document.getElementById("cluster_method").value;
    distance_metric = document.getElementById("distance_metric").value;

    var clusters = clusterData(data, distance_metric, cluster_method);
    drawHeatmap(data, clusters);  
}

function clusterData(data, dist, method) {
    var clusteredData = clusterfck.hcluster(data, dist, method);
    var clusters = convert(clusteredData, "root");
    return(clusters);
}

function drawHeatmap(data, clusters) {
    var nrow = data.length;
    var ncol = data[0].length;
    var minData = d3.min(d3.min(data));
    var maxData = d3.max(d3.max(data));
    var midData = (minData + maxData) / 2;
    var boxSize = 10;

    // remove if already existing for regeneration
    d3.select("#dendro_svg").remove();
    
    // heatmap is width ncol * boxSize
    // dendrogram is width (ncol * boxSize)*0.5
    var width = ncol * boxSize + 100;
	height = nrow * boxSize;

    // dendrogram with symmetric children
    var cluster = d3.layout.cluster()
	.size([height, width - ncol * boxSize - boxSize/2])
	.separation(function(a, b) { return (a.parent == b.parent ? 1 : 1 ) });
    
    var diagonal = d3.svg.diagonal()
	.projection(function(d) { return [d.y, d.x]; });
    
    var dendroSvg = d3.select("#dendro").append("svg")
	.attr("id","dendro_svg")
	.attr("width", width)
	.attr("height", height)
	.append("g")
	.attr("transform", "translate(10,0)");
    
    var nodes = cluster.nodes(clusters),
	links = cluster.links(nodes);
    
    var link = dendroSvg.selectAll(".link")
	.data(links)
	.enter().append("path")
	.attr("class", "link")
	.attr("d", diagonal);
    
    var node = dendroSvg.selectAll(".node")
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
	    .attr('width', function(d) { return d.children ? 0 : boxSize; })
	    .attr('height', function(d) { return d.children ? 0 : boxSize; })
	    .attr('x', boxSize * i - boxSize/2)
	    .attr('y', -boxSize/2)
	    .attr("stroke", "grey")
	    .attr("stroke-width", 1)
	    .style('fill', function(d) { return d.children ? "#fff" : colorScale(d.value[i]) }); 
    }
    
    d3.select(self.frameElement).style("height", height + "px");
    d3.select(self.frameElement).style("width", width + "px");

}
