/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/record', 'N/log', 'N/http'], function (record, log, http) {

    function onRequest(context) {
        if (context.request.method === http.Method.POST) {
            try {
                var requestData = JSON.parse(context.request.body);
                var recordId = requestData.recordId;
                var recordType = requestData.recordType; // Ensure client passes record type
                var linesToRemove = requestData.linesToRemove;
                var sublistId = 'item'; // Default to 'item' sublist

                if (!recordId || !recordType || !Array.isArray(linesToRemove) || linesToRemove.length === 0) {
                    context.response.write(JSON.stringify({ success: false, message: "Invalid request data." }));
                    return;
                }

                // ✅ Load the correct record type
                var transactionRecord = record.load({
                    type: recordType, // Dynamically load Invoice or Vendor Bill
                    id: recordId,
                    isDynamic: true
                });

                // ✅ Determine the correct sublist (Vendor Bill may have 'expense' sublist)
                var availableSublists = transactionRecord.getSublists();
                if (recordType === record.Type.VENDOR_BILL && availableSublists.includes('expense')) {
                    sublistId = 'expense'; // Use 'expense' if it's a bill with expenses
                }

                log.debug({ title: "Using Sublist", details: sublistId });

                // Sort lines in descending order to prevent shifting issues
                linesToRemove.sort(function (a, b) { return b - a; });

                for (var i = 0; i < linesToRemove.length; i++) {
                    try {
                        transactionRecord.removeLine({
                            sublistId: sublistId,
                            line: linesToRemove[i],
                            ignoreRecalc: true
                        });
                    } catch (lineError) {
                        log.error({
                            title: "Error Removing Line " + linesToRemove[i],
                            details: lineError
                        });
                    }
                }

                // 🚨 Do NOT save the record to allow user to review before final save
                context.response.write(JSON.stringify({
                    success: true,
                    message: "Lines removed successfully from " + recordType + "!"
                }));

            } catch (error) {
                log.error({ title: "Suitelet Error", details: error });
                context.response.write(JSON.stringify({ success: false, message: "Error: " + error.message }));
            }
        } else {
            context.response.write(JSON.stringify({ success: false, message: "Invalid request method." }));
        }
    }

    return {
        onRequest: onRequest
    };

});
