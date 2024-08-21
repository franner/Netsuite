/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/file', 'N/format'], 
function(search, file, format) {

    function onRequest(context) {
        // Generate and serve the CSV report
        var invoiceData = getInvoiceData();
        var csvContent = createCSVContent(invoiceData);
        serveCSVFile(context, csvContent);
    }

    /**
     * Runs a search to retrieve only the main lines of invoices.
     * @returns {Array} - An array containing main line invoice data
     */
    function getInvoiceData() {
        var invoiceLines = [];

        var invoiceSearch = search.create({
            type: 'customrecordtimetrack', // Ensure correct internal ID is used here
            columns: [
                'custrecordbadge',
                'custrecordemployee',
                'custrecordstarttime',
                'custrecordendtime',
                'custrecorddepartment',
                'custrecordhours'
            ]
        });

        // Use runPaged to handle large result sets in smaller pages (chunks) of 1000 results at a time
        var pagedData = invoiceSearch.runPaged({
            pageSize: 1000
        });

        pagedData.pageRanges.forEach(function(pageRange) {
            var page = pagedData.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                invoiceLines.push({
                    BADGE_NUMBER: result.getValue({ name: 'custrecordbadge' }),
                    EMPLOYEE: result.getText({ name: 'custrecordemployee' }),
                    START_TIME: formatDate(result.getValue({ name: 'custrecordstarttime' })),
                    END_TIME: formatDate(result.getValue({ name: 'custrecordendtime' })),
                    DEPARTMENT: result.getText({ name: 'custrecorddepartment' }),
                    HOURS: formatAmount(result.getValue({ name: 'custrecordhours' }))
                });
            });
        });

        return invoiceLines;
    }

    /**
     * Formats the date value to a readable format.
     * @param {string} dateValue - The date value as a string
     * @returns {string} - The formatted date
     */
    function formatDate(dateValue) {
        if (!dateValue) return '';
        return format.format({
            value: dateValue,
            type: format.Type.DATE
        });
    }

    /**
     * Manually formats a number into European format (comma as decimal separator).
     * @param {string} amount - The amount as a string
     * @returns {string} - The formatted amount
     */
    function formatAmount(amount) {
        if (!amount) return '0,00';

        var parts = parseFloat(amount).toFixed(2).split('.');
        var integerPart = parts[0];
        var decimalPart = parts[1];

        // Add period as thousand separator
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        // Replace decimal point with comma
        return integerPart + ',' + decimalPart;
    }

    /**
     * Converts the main line invoice data into a CSV formatted string with semicolon separators.
     * @param {Array} invoiceLines - The array containing main line invoice data
     * @returns {string} - The CSV content as a string
     */
    function createCSVContent(invoiceLines) {
        var csvRows = [['Badge Number', 'Employee', 'Start Time', 'End Time', 'Department', 'Hours']];

        invoiceLines.forEach(function(line) {
            csvRows.push([
                line.BADGE_NUMBER,
                line.EMPLOYEE,
                line.START_TIME,
                line.END_TIME,
                line.DEPARTMENT,
                line.HOURS
            ]);
        });

        // Join rows with newline, and fields with semicolon
        return csvRows.map(function(row) {
            return row.join(';'); // Use semicolon as the separator
        }).join('\n');
    }

    /**
     * Serves the CSV content as a downloadable file to the user.
     * @param {Object} context - The context object provided by the Suitelet
     * @param {string} csvContent - The CSV content to be served
     */
    function serveCSVFile(context, csvContent) {
        var csvFile = file.create({
            name: 'AM_Time_Track_report.csv',
            fileType: file.Type.CSV,
            contents: csvContent
        });

        context.response.writeFile({
            file: csvFile,
            isInline: false // Forces the browser to download the file
        });
    }

    return {
        onRequest: onRequest
    };
});
