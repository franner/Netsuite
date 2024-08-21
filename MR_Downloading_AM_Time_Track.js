/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/file'], function(search, record, file) {

    /**
     * Defines the function that is executed at the beginning of the Map/Reduce process and generates the input data.
     * @returns {Search} The search object to be processed in map/reduce
     */
    function getInputData() {
        return search.create({
            type: 'customrecordtimetrack',
            columns: [
                'custrecordbadge',
                'custrecordemployee',
                'custrecordstarttime',
                'custrecordendtime',
                'custrecorddepartment',
                'custrecordhours'
            ]
        });
    }

    /**
     * Defines the function that is executed when the Map stage is triggered.
     * @param {Object} context - The context object for the map stage
     */
    function map(context) {
        var searchResult = JSON.parse(context.value);

        var output = {
            badge: searchResult.values.custrecordbadge,
            employee: searchResult.values.custrecordemployee,
            startTime: searchResult.values.custrecordstarttime,
            endTime: searchResult.values.custrecordendtime,
            department: searchResult.values.custrecorddepartment,
            hours: searchResult.values.custrecordhours
        };

        context.write({
            key: context.key,
            value: output
        });
    }

    /**
     * Defines the function that is executed when the Reduce stage is triggered.
     * @param {Object} context - The context object for the reduce stage
     */
    function reduce(context) {
        // Processing or aggregating data
        context.values.forEach(function(value) {
            var recordData = JSON.parse(value);
            // Add processing logic here if needed
        });
    }

    /**
     * Defines the function that is executed when the Summarize stage is triggered.
     * @param {Object} summary - The summary object for the summarize stage
     */
    function summarize(summary) {
        var csvContent = "Badge Number,Employee,Start Time,End Time,Department,Hours\n";

        summary.output.iterator().each(function(key, value) {
            var recordData = JSON.parse(value);
            csvContent += `${recordData.badge},${recordData.employee},${recordData.startTime},${recordData.endTime},${recordData.department},${recordData.hours}\n`;
            return true;
        });

        var fileObj = file.create({
            name: 'large_data_report.csv',
            fileType: file.Type.CSV,
            contents: csvContent
        });

        fileObj.folder = 123; // Replace with the actual folder ID where the file will be saved
        fileObj.save();
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
