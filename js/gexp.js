function initGexp() {
    
    var i = 0;
    drawGexp(i);
    drawDiffGexp(i);

    var promise = engine.initialize();

    $('.typeahead').typeahead(null, {
	name: 'genes',
	displayKey: 'symbol',
	source: engine.ttAdapter(),
	templates: {
	    suggestion: formatSuggestion
	}
    });
    
    $('.typeahead').on('typeahead:selected', function (obj, datum, name) {
	console.log(datum);
	$("#savedResults").prepend(formatSavedResult(datum));
    });

    $('.typeahead').on('typeahead:selected', function (obj, datum, name) {
	console.log(datum);
	$("#savedResults").prepend(formatSavedResult(datum));
    });

}

// Draw gene expression boxplot for one gene
function drawGexp(i) {
    
    //var gexp = getCol(dataPro,1).map(function(d) { return d.value })
    var gexp = getCol(dataPro,i)

    var g = document.getElementById('gexp_panel1'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;

    var margin = {top: 10, right: 10, bottom: 30, left: 20},
	width = windowWidth - margin.left - margin.right,
	height = windowHeight - margin.top - margin.bottom;
    
    var chart1;
    chart1 = makeDistroChart({
	data: gexp,
	xName:'name',
	yName:'value',
//	axisLabels: {xAxis: 'Gene', yAxis: 'Values'},
	selector:"#gexp-chart-distro1",
	chartSize:{height:height, width:width},
	margin:margin,
	constrainExtremes:true});
    chart1.renderBoxPlot();
    
}
// Draw gene expression boxplot of two groups
function drawDiffGexp(i) {
    var gexp = getCol(dataPro,i)
    var group = dataPro.map(function(d) { return d.group })
    gexp.map(function(d, i) { d.group = group[i] })

    var g = document.getElementById('gexp_panel2'),
	windowWidth = g.clientWidth,
	windowHeight = g.clientHeight;

    var margin = {top: 10, right: 10, bottom: 30, left: 20},
	width = windowWidth - margin.left - margin.right,
	height = windowHeight - margin.top - margin.bottom;

    var chart1;
    chart1 = makeDistroChart({
	data: gexp,
	xName:'group',
	yName:'value',
//	axisLabels: {xAxis: 'Group', yAxis: 'Values'},
	selector:"#gexp-chart-distro2",
	chartSize:{height:height, width:width},
	margin:margin,
	constrainExtremes:true});
    chart1.renderBoxPlot();
}







    


// Courtesy of http://codepen.io/slowkow/pen/ByxLBE/
var numberWithCommas = function (x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

var format = function (form, datum) {
    return form.replace(/{([^}]+)}/g, function (match, key) {
	return typeof datum[key] != 'undefined' ? datum[key] : '';
    });
};

var posToRegion = function (pos) {
    if (pos.chr && pos.start && pos.end) {
	return pos.chr + ':' + numberWithCommas(pos.start) + '-' + numberWithCommas(pos.end);
    }
    return '';
};

var entrezGeneLink = function (datum) {
    var form = 'Entrez: ' +
	'<a href="http://www.ncbi.nlm.nih.gov/gene/{entrezgene}">' +
	'{entrezgene}</a>';
    if (datum.entrezgene) {
	return format(form, datum);
    }
    return '';
};

var hgncGeneLink = function (datum) {
    var form = 'HGNC: ' +
	'<a href="http://www.genenames.org/cgi-bin/gene_symbol_report' +
	'?hgnc_id=HGNC:{HGNC}">{HGNC}</a>';
    if (datum.HGNC) {
	return format(form, datum);
    }
    return '';
};

var jbrowseRegionLink = function (pos) {
    var url = 'http://www.broadinstitute.org/~slowikow/JBrowse-1.10.1/' +
	'?loc={chr}%3A{start}..{end}' +
	'&tracks=Adipose%20-%20Subcutaneous%2CWhole%20Blood' +
	'%2CArtery%20-%20Aorta%2CMuscle%20-%20Skeletal' +
	'%2CBrain%20-%20Hippocampus%2CPituitary' +
	'%2CSkin%20-%20Sun%20Exposed%20(Lower%20leg)%2CStomach' +
	'%2CPancreas%2CColon%20-%20Transverse' +
	'%2CEnsembl%20v72%20Transcripts';
    var form = 'GTEx: <a href="' + url + '">{chr}:{start}-{end}</a>';
    if (pos.chr && pos.start && pos.end) {
	return format(form, pos);
    }
    return '';
};

var ucscRegionLink = function (pos) {
    var form = 'UCSC: ' +
	'<a href="https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19' +
	'&position=chr{chr}%3A{start}-{end}">' +
	'{chr}:{start}-{end}</a>';
    if (pos.chr && pos.start && pos.end) {
	return format(form, pos);
    }
    return '';
};

var gtexRegionLink = function (pos) {
    var form = 'GTEx: ' +
	'http://epigenomegateway.wustl.edu/browser/' +
	'?genome=hg19&coordinate=chr7:26663835-28123541';
};

var formatSuggestion = function (datum) {
    var pos = datum.genomic_pos_hg19;
    var region = '';
    if (pos) {
	if (pos.length > 1) {
	    pos = pos[0];
	}
	region = ucscRegionLink(pos);
    }
    var space = '&nbsp;&nbsp;&nbsp;&nbsp;';
    var form = '<div><strong>{symbol}</strong>' +
	' <span style="font-size:80%">' + space + region + space + hgncGeneLink(datum) + '</span>' +
	'<br>{name}</div>';
    //' Entrez: <a href="http://www.ncbi.nlm.nih.gov/gene/{entrezgene}">{entrezgene}</a>' +
    return format(form, datum);
};

var formatSavedResult = function (datum) {
    var form =
	'<div id="savedResult"><strong>{symbol}</strong>' +
	'&nbsp;&nbsp;' + hgncGeneLink(datum) +
	'<br><p><em>{name}</em></p>';
    var pos = datum.genomic_pos_hg19;
    if (pos) {
	if (pos.length > 1) {
	    pos = pos[0];
	}
	form += '<p>' + ucscRegionLink(pos) +
	    '&nbsp;&nbsp;' + jbrowseRegionLink(pos) + '</p>';
    }
    form += '<p>{summary}</p></div>';
    return format(form, datum);
};

var engine = new Bloodhound({
    name: 'genes',
    limit: 15,
    remote: {
	url: 'http://mygene.info/v2/query?q=%QUERY*' +
	    '&fields=symbol,name,entrezgene,summary,genomic_pos_hg19,HGNC' +
	    '&species=human&size=15' +
	    '&email=slowikow@broadinstitute.org',
	filter: function (datum) {
	    return datum.hits;
	}
    },
    datumTokenizer: function (datum) {
	return Bloodhound.tokenizers.whitespace(datum.val);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace
});

