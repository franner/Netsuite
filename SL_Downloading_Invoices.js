/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/search', 'N/file', 'N/ui/serverWidget'], 
function(search, file, serverWidget) {

    function onRequest(context) {
        if (context.request.method === 'GET') {
            renderForm(context);
        } else {
            generateReport(context);
        }
    }

    /**
     * Renders the form with start and end date fields.
     * @param {Object} context - The context object provided by the Suitelet
     */
    function renderForm(context) {
        var form = serverWidget.createForm({
            title: 'Invoice Report'
        });

        form.addField({
            id: 'custpage_startdate',
            type: serverWidget.FieldType.DATE,
            label: 'Start Date'
        });

        form.addField({
            id: 'custpage_enddate',
            type: serverWidget.FieldType.DATE,
            label: 'End Date'
        });

        form.addSubmitButton({
            label: 'Generate Report'
        });

        context.response.writePage(form);
    }

    /**
     * Generates the invoice report CSV and triggers download.
     * @param {Object} context - The context object provided by the Suitelet
     */
    function generateReport(context) {
        var startDate = context.request.parameters.custpage_startdate;
        var endDate = context.request.parameters.custpage_enddate;

        var invoiceData = getInvoiceData(startDate, endDate);
        var csvContent = createCSVContent(invoiceData);

        serveCSVFile(context, csvContent);
    }

    /**
     * Runs a search to retrieve only the main lines of invoices within the date range.
     * @param {string} startDate - The start date for the search
     * @param {string} endDate - The end date for the search
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
