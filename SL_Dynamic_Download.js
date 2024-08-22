/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NAmdConfig /SuiteScripts/ThirdParty/JsLibraryConfig.json
 */
define(['N/search', 'N/format', 'xlsx', 'N/log'], function(search, format, XLSX, log) {
    var FileName = "Dynamic_Report.xlsx";
    var WorkbookName = 'Dynamic_Report';

    function onRequest(context) {
        var request = context.request;
        var response = context.response;

        // Safely retrieve and parse parameters from the request
        var typeName = request.parameters.typeName || ''; // Default to empty string if undefined
        var filters = parseFilters(request.parameters.filters);
        var exclusionFilter = parseJSON(request.parameters.exclusionFilter, []);
        var columns = parseJSON(request.parameters.columns, []);

        // Apply exclusion filter if provided
        if (exclusionFilter.length > 0) {
            filters.push(['NOT', exclusionFilter]);
        }

        // Log the filters to check what is being applied
        log.debug({
            title: 'Parsed Filters',
            details: JSON.stringify(filters)
        });

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

    // Helper function to safely parse JSON strings
    function parseJSON(jsonString, defaultValue) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            return defaultValue; // Return default value if parsing fails
        }
    }

    // Helper function to parse and structure filters
function parseFilters(filtersString) {
    var filters = parseJSON(filtersString, []);
    
    // Log the parsed filters for debugging
    log.debug({
        title: 'Parsed Filters Raw Input',
        details: filtersString
    });
    log.debug({
        title: 'Parsed Filters After JSON',
        details: filters
    });

    return filters.map(function(filter) {
        return filter;
    });
}

    function processSavedSearchData(response, XLSX, typeName, filters, columns) {
        if (!typeName || columns.length === 0) {
            throw new Error('Invalid input: typeName and columns are required.');
        }

        // Create the custom search with dynamic type, filters, and columns
        var SearchObj = search.create({
            type: typeName,
            filters: filters,  // Filters are directly passed
            columns: columns.map(function(col) {
                return search.createColumn({
                    name: col.name,
                    label: col.label
                });
            })
        });

        // Log the search object details
        log.debug({
            title: 'Search Object',
            details: JSON.stringify(SearchObj)
        });

        // Run the search and log the number of results
        var searchResultCount = SearchObj.runPaged().count;
        log.debug({
            title: 'Search Result Count',
            details: searchResultCount
        });

        // Initialize a new workbook
        var workbook = XLSX.utils.book_new();
        var worksheetData = [];

        // Add the headers
        var headers = columns.map(function(column) {
            return column.label || column.name;
        });
        worksheetData.push(headers);

        // Use search.runPaged() to handle large datasets
        var pagedData = SearchObj.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                var row = columns.map(function(column) {
                    return result.getText(column.name) || result.getValue(column.name);
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
            encoding: 'base64'
        });
    }

    return {
        onRequest: onRequest
    };
});
