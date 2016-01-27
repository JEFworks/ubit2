// var data = [
//   [20, 20, 80, 20, 234],
//   [200, 0, 23, 1, 234],
//   [22, 22, 90, 12, 12],
//   [250, 255, 253, 231, 234],
//   [100, 54, 100, 23, 232],
//   [0, 30, 70, 34, 2],
//   [255, 13, 8, 34, 2]
//   ];

function transpose(array) {    
    var newArray = array[0].map(function(col, i) {
	return array.map(function(row) {
	    return row[i]
	})
    });
    return newArray;
}

function logTransform(array) {
    var newArray = array
    for(var i = 0; i < array.length; i++) {
	row = array[i]
	for(var j = 0; j < row.length; j++) {
	    newArray[i][j] = Math.log10(array[i][j]+1);
	}
    }
    return newArray;
}

function clusterData(data, dist, method) {
    var clusteredData = clusterfck.hcluster(data, dist, method);
    var clusters = convert(clusteredData, "root");
    return(clusters);
}

function drawHeatmap(data, clusters) {
    var nrow = data.length;
    var ncol = data[0].length;
    var minData = d3.min(d3.min(contents));
    var maxData = d3.max(d3.max(contents));
    var midData = (minData + maxData) / 2;
    var boxSize = 10;

    // heatmap is width ncol * boxSize
    // dendrogram is width (ncol * boxSize)*0.5
    var width = ncol * boxSize + boxSize * 10,
	height = nrow * boxSize;

    // dendrogram with symmetric children
    var cluster = d3.layout.cluster()
	.size([height, width - ncol * boxSize])
	.separation(function(a, b) { return (a.parent == b.parent ? 1 : 1 ) });
    
    var diagonal = d3.svg.diagonal()
	.projection(function(d) { return [d.y, d.x]; });
    
    var dendroSvg = d3.select("#dendro").append("svg")
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
	    .attr('x', boxSize * i)
	    .attr('y', -boxSize/2)
	    .attr("stroke", "grey")
	    .attr("stroke-width", 1)
	    .style('fill', function(d) { return d.children ? "#fff" : colorScale(d.value[i]) }); 
    }
    
    d3.select(self.frameElement).style("height", height + "px");
    d3.select(self.frameElement).style("width", width + "px");

}
