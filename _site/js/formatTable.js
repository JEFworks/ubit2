// converts txt file from BrowserGenome to Javascript array format suitable for handsontable
var lines;
var newTable = [];  // global variable
function formatTable(data) {
    var r = new FileReader();
    r.onload = function(event) {
        lines = event.target.result.split('\n');
    };
    r.readAsText(data);
    r.onloadend = function(e) {
        var col = lines.map(function(x) { return x.split('\t')[1] });
        col[0] = "";
        newTable = [col];
        for (var i = 3; i < lines[0].split('\t').length; i++) {
            var col = lines.map(function(x) { return x.split('\t')[i] });
            newTable.push(col);
        }
        // for debugging the quantification download: download only happens in Chrome
        // var hiddenElement = document.createElement('a');
        ///hiddenElement.href = 'data:attachment/text,' + encodeURI(newTable);
        // hiddenElement.target = '_blank';
        // hiddenElement.download = 'myFile.txt';
        // hiddenElement.click();
    }
}
