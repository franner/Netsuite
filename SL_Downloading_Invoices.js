/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/file', 'N/format', 'N/encode'], 
function(search, file, format, encode) {

    function onRequest(context) {
        var request = context.request;
        
        // Extract start and end date from URL parameters
        var startDateParam = request.parameters.startdate;
        var endDateParam = request.parameters.enddate;

        // Validate and parse the dates from ddmmyyyy format
        var startDate = parseDate(startDateParam);
        var endDate = parseDate(endDateParam);

        if (!startDate || !endDate) {
            context.response.write("Invalid date format. Please use 'ddmmyyyy' format.");
            return;
        }

        // Generate and serve the CSV report
        var invoiceData = getInvoiceData(startDate, endDate);
        var csvContent = createCSVContent(invoiceData);
        serveCSVFile(context, csvContent);
    }

    /**
     * Parses a date string in 'ddmmyyyy' format into a Date object.
     * @param {string} dateString - The date string in 'ddmmyyyy' format
     * @returns {Date|null} - The Date object or null if invalid
     */
    function parseDate(dateString) {
        if (!dateString || dateString.length !== 8) return null;

        var day = dateString.substring(0, 2);
        var month = dateString.substring(2, 4);
        var year = dateString.substring(4, 8);

        var dateObj = new Date(year, month - 1, day);

        // Validate the date object
        if (dateObj && dateObj.getFullYear() === parseInt(year) &&
            dateObj.getMonth() === parseInt(month) - 1 &&
            dateObj.getDate() === parseInt(day)) {
            return format.format({ value: dateObj, type: format.Type.DATE });
        }

        return null;
    }

    /**
     * Runs a search to retrieve only the main lines of invoices within the date range.
     * @param {string} startDate - The start date for the search (formatted)
     * @param {string} endDate - The end date for the search (formatted)
     * @returns {Array} - An array containing main line invoice data
     */
    function getInvoiceData(startDate, endDate) {
        var invoiceLines = [];

        var invoiceSearch = search.create({
            type: search.Type.INVOICE,
            filters: [
                ['trandate', 'within', startDate, endDate],
                'AND',
                ['mainline', 'is', 'T'] // Only fetch the main line of each invoice
            ],
            columns: [
                'tranid',
                'currency',
                'fxamount'
            ]
        });

        invoiceSearch.run().each(function(result) {
            invoiceLines.push({
                invoiceNumber: result.getValue({ name: 'tranid' }),
                currency: result.getText({ name: 'currency' }),
                amount: formatAmount(result.getValue({ name: 'fxamount' }))
            });

            return true; // Continue iterating over search results
        });

        return invoiceLines;
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
        var csvRows = [['Invoice Number', 'Currency', 'Foreign Amount']];

        invoiceLines.forEach(function(line) {
            csvRows.push([
                line.invoiceNumber,
                line.currency,
                line.amount
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
            name: 'invoice_report.csv',
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
