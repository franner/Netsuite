/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/format'], 
function(search, format) {

    function onRequest(context) {
        var response = context.response;
        response.setHeader({
            name: 'Content-Type',
            value: 'text/csv'
        });
        response.setHeader({
            name: 'Content-Disposition',
            value: 'attachment; filename="SavedSearchReport.csv"'
        });

        // Fetch and write search results with dynamic headers
        processSavedSearchData(response);
    }

    function processSavedSearchData(response) {
        // Load the saved search by its internal ID
        var savedSearch = search.load({
            id: '1431'
        });

        // Write the CSV headers dynamically
        var headers = savedSearch.columns.map(function(column) {
            return column.label || column.name; // Use label if available, otherwise fallback to name
        }).join(';') + '\n';
        response.write(headers);

        // Run the search and process each result
        var searchResult = savedSearch.run();
        var start = 0;
        var results = searchResult.getRange({
            start: start,
            end: start + 1000
        });

        while (results.length > 0) {
            results.forEach(function(result) {
                var line = savedSearch.columns.map(function(column, index) {
                    // Use getText for textual representation where applicable
                    return result.getText(column) || result.getValue(column);
                }).join(';') + '\n';

                response.write(line); // Write each line immediately
            });

            // Move to the next set of results
            start += 1000;
            results = searchResult.getRange({
                start: start,
                end: start + 1000
            });
        }
    }

    function formatDate(dateValue) {
        if (!dateValue) return '';
        return format.format({
            value: dateValue,
            type: format.Type.DATE
        });
    }

    function formatAmount(amount) {
        if (!amount) return '0.00';

        return parseFloat(amount).toFixed(2);
    }

    return {
        onRequest: onRequest
    };
});
