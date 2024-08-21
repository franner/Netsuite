/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/file'], function(search, file) {

    function getInputData() {
        return search.create({
            type: 'customrecordtimetrack',
            columns: ['custrecordbadge', 'custrecordemployee']
        });
    }

    function map(context) {
        var searchResult = JSON.parse(context.value);
        context.write({
            key: context.key,
            value: searchResult.values
        });
    }

    function reduce(context) {
        context.values.forEach(function(value) {
            // Processing logic here
        });
    }

    function summarize(summary) {
        var csvContent = "Badge Number,Employee\n";
        summary.output.iterator().each(function(key, value) {
            csvContent += `${JSON.parse(value).custrecordbadge},${JSON.parse(value).custrecordemployee}\n`;
            return true;
        });

        var fileObj = file.create({
            name: 'test_report.csv',
            fileType: file.Type.CSV,
            contents: csvContent
        });

        fileObj.folder = 123; // Replace with your folder ID
        fileObj.save();
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
