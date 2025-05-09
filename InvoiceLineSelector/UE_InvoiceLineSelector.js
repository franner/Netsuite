/** 
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/url', 'N/ui/serverWidget', 'N/record'], function (url, serverWidget, record) {

    function beforeLoad(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
            var form = context.form;
            var newRecord = context.newRecord;
            var recordType = newRecord.type;

            // Determine button label dynamically
            var buttonLabel = recordType === record.Type.VENDOR_BILL ? 'Select Bill Lines' : 'Select Invoice Lines';

            // Generate Suitelet URL and pass recordType
            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript5035',
                deploymentId: 'customdeploy1'
            }) + '&recordType=' + recordType;

            form.addButton({
                id: 'custpage_select_invoice_lines',
                label: buttonLabel,
                functionName: "openInvoiceLineSelector('" + suiteletUrl + "')"
            });

            // ✅ Ensure correct Client Script is assigned
            form.clientScriptFileId = 4663703;
        }
    }

    return { beforeLoad: beforeLoad };
});
