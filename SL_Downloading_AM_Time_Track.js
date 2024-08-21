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

        // Writing CSV headers
        response.write('Column1;Column2;Column3;Column4;Column5;Column6\n');

        // Fetch and write search results
        processSavedSearchData(response);
    }

    function processSavedSearchData(response) {
        // Load the saved search by its internal ID
        var savedSearch = search.load({
            id: '1431'
        });

        // Run the search and process each result
        var searchResult = savedSearch.run();
        var start = 0;
        var results = searchResult.getRange({
            start: start,
            end: start + 1000
        });

        while (results.length > 0) {
            results.forEach(function(result) {
                var line = [
                    result.getValue(savedSearch.columns[0]),
                    result.getValue(savedSearch.columns[1]),
                    formatDate(result.getValue(savedSearch.columns[2])),
                    formatDate(result.getValue(savedSearch.columns[3])),
                    result.getText(savedSearch.columns[4]),
                    formatAmount(result.getValue(savedSearch.columns[5]))
                ].join(';') + '\n';

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
