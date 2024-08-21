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
            value: 'attachment; filename="SavedSearchReport.xlsx"'
        });

        // Fetch and write search results to an XLSX file
        processSavedSearchData(response, XLSX);
    }

    function processSavedSearchData(response, XLSX) {
        // Load the saved search by its internal ID
        var savedSearch = search.load({ id: '1431' });

        // Initialize a new workbook
        var workbook = XLSX.utils.book_new();
        var worksheetData = [];

        // Add the headers
        var headers = savedSearch.columns.map(function(column) {
            return column.label || column.name; // Use label if available, otherwise fallback to name
        });
        worksheetData.push(headers);

        // Use search.runPaged() to handle large datasets
        var pagedData = savedSearch.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                var row = savedSearch.columns.map(function(column) {
                    return result.getText(column) || result.getValue(column);
                });
                worksheetData.push(row);
            });
        });

        // Create the worksheet and append it to the workbook
        var worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

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
