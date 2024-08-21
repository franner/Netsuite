/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NAmdConfig /SuiteScripts/ThirdParty/JsLibraryConfig.json
 */
define(['N/search', 'N/format', 'xlsx'], 
function(search, format, XLSX) {

    function onRequest(context) {
        var response = context.response;
        
        // Set headers for XLSX download
        response.setHeader({
            name: 'Content-Type',
            value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        response.setHeader({
            name: 'Content-Disposition',
            value: 'attachment; filename="TimeTrackReport.xlsx"'
        });

        // Fetch and write search results to an XLSX file
        processSavedSearchData(response, XLSX);
    }

    function processSavedSearchData(response, XLSX) {
        // Create the custom search
        var customrecordtimetrackSearchObj = search.create({
            type: "customrecordtimetrack",
            filters: [
                ["custrecordstarttime", "after", "startoflastmonth"]
            ],
            columns: [
                search.createColumn({ name: "custrecordbadge", label: "BADGE_NUMBER" }),
                search.createColumn({ name: "custrecordemployee", label: "EMPLOYEE" }),
                search.createColumn({ name: "custrecordstarttime", label: "START_TIME" }),
                search.createColumn({ name: "custrecordendtime", label: "END_TIME" }),
                search.createColumn({ name: "custrecorddepartment", label: "DEPARTMENT" }),
                search.createColumn({ name: "custrecordhours", label: "HOURS" })
            ]
        });

        // Initialize a new workbook
        var workbook = XLSX.utils.book_new();
        var worksheetData = [];

        // Add the headers
        var headers = customrecordtimetrackSearchObj.columns.map(function(column) {
            return column.label || column.name; // Use label if available, otherwise fallback to name
        });
        worksheetData.push(headers);

        // Use search.runPaged() to handle large datasets
        var pagedData = customrecordtimetrackSearchObj.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                var row = customrecordtimetrackSearchObj.columns.map(function(column) {
                    return result.getText(column) || result.getValue(column);
                });
                worksheetData.push(row);
            });
        });

        // Create the worksheet and append it to the workbook
        var worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'TimeTrackReport');

        // Generate the XLSX file in base64 format
        var xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

        // Write the base64 string directly to the response
        response.write({
            output: xlsxData,
            encoding: 'base64' // Use 'base64' encoding
        });
    }

    return {
        onRequest: onRequest
    };
});
