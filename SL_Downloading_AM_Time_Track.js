/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/file', 'N/format'], 
function(search, file, format) {

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
     * Parses a date string in 'ddmmyyyy' format into a formatted Date string in 'MM/dd/yyyy'.
     * @param {string} dateString - The date string in 'ddmmyyyy' format
     * @returns {string|null} - The formatted date string (MM/dd/yyyy) or null if invalid
     */
    function parseDate(dateString) {
        if (!dateString || dateString.length !== 8) return null;

        var day = dateString.substring(0, 2);
        var month = dateString.substring(2, 4);
        var year = dateString.substring(4, 8);

        // Validate the numeric values of day, month, and year
        if (isNaN(day) || isNaN(month) || isNaN(year) || day > 31 || month > 12 || year.length !== 4) {
            return null;
        }

        // Return the date in MM/dd/yyyy format
        return month + '/' + day + '/' + year;
    }

    /**
     * Runs a search to retrieve only the main lines of invoices within the date range.
     * @param {string} startDate - The start date for the search (MM/dd/yyyy format)
     * @param {string} endDate - The end date for the search (MM/dd/yyyy format)
     * @returns {Array} - An array containing main line invoice data
     */
    function getInvoiceData(startDate, endDate) {
        var invoiceLines = [];

        var invoiceSearch = search.create({
            type: search.Type.customrecordtimetrack,
            columns: [
                'custrecordbadge',
                'custrecordemployee',
                'custrecordstarttime',
                'custrecordendtime',
                'custrecorddepartment',
                'custrecordhours'
            ]
        });

        invoiceSearch.run().each(function(result) {
            invoiceLines.push({
                BADGE_NUMBER: result.getValue({ name: 'custrecordbadge' }),
                EMPLOYEE: result.getText({ name: 'custrecordemployee' }),
                START_TIME: formatAmount(result.getValue({ name: 'custrecordstarttime' })),
                END_TIME: formatAmount(result.getValue({ name: 'custrecordendtime' })),
                DEPARTMENT: formatAmount(result.getValue({ name: 'custrecorddepartment' })),
                HOURS: formatAmount(result.getValue({ name: 'custrecordhours' }))
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
