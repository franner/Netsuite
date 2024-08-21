/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/file', 'N/format'], 
function(search, file, format) {

    function onRequest(context) {
        var response = context.response;
        response.setHeader({
            name: 'Content-Type',
            value: 'text/csv'
        });
        response.setHeader({
            name: 'Content-Disposition',
            value: 'attachment; filename="AM_Time_Track_report.csv"'
        });

        // Writing CSV headers
        response.write('Badge Number;Employee;Start Time;End Time;Department;Hours\n');

        // Process data in chunks
        processInvoiceData(response);
    }

    function processInvoiceData(response) {
        var pageIndex = 0;
        var pageSize = 1000;
        var hasMoreData = true;

        while (hasMoreData) {
            var invoiceSearch = search.create({
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

            var pagedData = invoiceSearch.runPaged({
                pageSize: pageSize
            });

            if (pageIndex >= pagedData.pageRanges.length) {
                hasMoreData = false;
                break;
            }

            var page = pagedData.fetch({ index: pageIndex });
            page.data.forEach(function(result) {
                var line = [
                    result.getValue({ name: 'custrecordbadge' }),
                    result.getText({ name: 'custrecordemployee' }),
                    formatDate(result.getValue({ name: 'custrecordstarttime' })),
                    formatDate(result.getValue({ name: 'custrecordendtime' })),
                    result.getText({ name: 'custrecorddepartment' }),
                    formatAmount(result.getValue({ name: 'custrecordhours' }))
                ].join(';') + '\n';
                
                response.write(line); // Write each line immediately
            });

            // Move to the next page
            pageIndex++;
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
        if (!amount) return '0,00';

        var parts = parseFloat(amount).toFixed(2).split('.');
        var integerPart = parts[0];
        var decimalPart = parts[1];

        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        return integerPart + ',' + decimalPart;
    }

    return {
        onRequest: onRequest
    };
});
