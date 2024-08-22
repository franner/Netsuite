/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/format', 'xlsx'], 
    
function(search, format, XLSX) {
    var FileName = "Dynamic_Report.xlsx";
    var WorkbookName = 'Dynamic_Report';

    function onRequest(context) {
        var request = context.request;
        var response = context.response;

        try {
            // Check request method
            if (request.method === 'POST') {
                var requestBody = JSON.parse(request.body);

                // Extract parameters from the request body
                var typeName = requestBody.typeName;
                var filters = requestBody.filters || [];
                var exclusionFilters = requestBody.exclusionFilters || [];
                var columns = requestBody.columns || [];

                // Add exclusion filters to filters
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
            } else {
                response.write('This Suitelet only supports POST requests.');
            }
        } catch (e) {
            logError(response, e);
        }
    }

    function processSavedSearchData(response, XLSX, typeName, filters, columns) {
        var SearchObj = search.create({
            type: typeName,
            filters: filters,
            columns: columns.map(function(col) {
                return search.createColumn(col);
            })
        });

        var workbook = XLSX.utils.book_new();
        var worksheetData = [];

        var headers = columns.map(function(column) {
            return column.label || column.name;
        });
        worksheetData.push(headers);

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

        var worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, WorkbookName);

        var xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

        response.write({
            output: xlsxData,
            encoding: 'base64'
        });
    }

    function logError(response, error) {
        log.error({ title: 'Error in Suitelet', details: error.message });
        response.write({
            output: JSON.stringify({ status: 'error', message: error.message }),
            encoding: 'UTF-8'
        });
    }

    return {
        onRequest: onRequest
    };
});
