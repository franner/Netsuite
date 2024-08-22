// USAGE
// 
// "exclusionFilters": [["custrecordemployee", "is", "John Doe"], ["custrecorddepartment", "is", "HR"]]
// 
// {
//     "typeName": "customrecordtimetrack",
//     "filters": [["custrecordstarttime", "after", "startoflastmonth"]],
//     "exclusionFilters": [["custrecordemployee", "is", "John Doe"], ["custrecorddepartment", "is", "HR"]],
//     "columns": [
//         { "name": "custrecordbadge", "label": "BADGE_NUMBER" },
//         { "name": "custrecordemployee", "label": "EMPLOYEE" },
//         { "name": "custrecordstarttime", "label": "START_TIME" }
//     ]
// }
// 

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NAmdConfig /SuiteScripts/ThirdParty/JsLibraryConfig.json
 */
define(['N/search', 'N/format', 'xlsx'], 
       
function(search, format, XLSX) {
        var FileName = "Dynamic_Report.xlsx";
        var WorkbookName = 'Dynamic_Report';

    function onRequest(context) {
        var request = context.request;
        var response = context.response;

        // Retrieve parameters from the request
        var typeName = request.parameters.typeName;
        var filters = JSON.parse(request.parameters.filters || '[]');
        var exclusionFilters = JSON.parse(request.parameters.exclusionFilters || '[]');
        var columns = JSON.parse(request.parameters.columns || '[]');

        // Apply exclusion filters if provided
        if (exclusionFilters.length > 0) {
            exclusionFilters.forEach(function(exclusionFilter) {
                filters.push(['NOT', exclusionFilter]);
            });
        }

        // Set headers for XLSX download
        response.setHeader({
            name: 'Content-Type',
            value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        response.setHeader({
            name: 'Content-Disposition',
            value: 'attachment; filename=' + FileName
        });

        // Fetch and write search results to an XLSX file
        processSavedSearchData(response, XLSX, typeName, filters, columns);
    }

    function processSavedSearchData(response, XLSX, typeName, filters, columns) {
        // Create the custom search with dynamic type, filters, and columns
        var SearchObj = search.create({
            type: typeName,
            filters: filters,
            columns: columns.map(function(col) {
                return search.createColumn(col);
            })
        });

        // Initialize a new workbook
        var workbook = XLSX.utils.book_new();
        var worksheetData = [];

        // Add the headers
        var headers = columns.map(function(column) {
            return column.label || column.name; // Use label if available, otherwise fallback to name
        });
        worksheetData.push(headers);

        // Use search.runPaged() to handle large datasets
        var pagedData = SearchObj.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                var row = columns.map(function(column) {
                    return result.getText(column) || result.getValue(column.name);
                });
                worksheetData.push(row);
            });
        });

        // Create the worksheet and append it to the workbook
        var worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, WorkbookName);

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
