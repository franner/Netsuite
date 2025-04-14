/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/runtime', 'N/log', 'N/cache'],
function(search, runtime, log, cache) {

    // getInputData retrieves the sales order ID from the parameter 'custscript_orderid',
    // clears any previous cache entries, and builds the transaction tree.
    // It traverses all child transactions (using paged search) but only adds to the final results
    // those transactions that are posting and not work orders, while still processing children of work orders.
    function getInputData() {
        var orderId = runtime.getCurrentScript().getParameter({ name: 'custscript_orderid' });
        log.audit('MR getInputData', 'Sales Order ID: ' + orderId);
        if (!orderId) {
            log.error('MR getInputData', 'No Sales Order ID provided. Returning empty array.');
            return [];
        }
        
        // Clear any previous cache entries for this sales order, including chunks and the completion flag.
        var myCache = cache.getCache({ name: 'CostTreeCache', scope: cache.Scope.PROTECTED });
        var cacheKey = 'costtree_' + orderId;
        var index = 0;
        while (true) {
            var keyToRemove = index === 0 ? cacheKey : cacheKey + '_' + index;
            var cachedValue = myCache.get({ key: keyToRemove });
            if (!cachedValue) {
                break;
            }
            myCache.remove({ key: keyToRemove });
            log.audit('MR getInputData', 'Cleared previous cache for key=' + keyToRemove);
            index++;
        }
        myCache.remove({ key: 'costtree_complete_' + orderId });
        
        // Use two sets: visited (to avoid cycles) and finalIds (to store only valid transactions)
        var visited = new Set();
        var finalIds = new Set();
        
        // Start with the initial sales order (assumed valid)
        visited.add(orderId);
        finalIds.add(orderId);
        
        var toProcess = [orderId];
        
        // Build the full tree using a BFS with paged search to avoid search limits.
        while (toProcess.length > 0) {
            var currentLevel = toProcess;
            toProcess = [];
            var childSearch = search.create({
                type: 'transaction',
                filters: [
                    ['createdfrom', 'anyof', currentLevel],
                    'AND',
                    ['type', 'noneof', 'PurchOrd']
                ],
                columns: [
                    'internalid',
                    search.createColumn({ name: 'recordtype' }),
                    search.createColumn({ name: 'posting' })
                ]
            });
            var pagedData = childSearch.runPaged({ pageSize: 1000 });
            pagedData.pageRanges.forEach(function(pageRange) {
                var page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach(function(result) {
                    var childId = result.getValue('internalid');
                    var recType = result.getValue({ name: 'recordtype' });
                    var posting = result.getValue({ name: 'posting' });
                    if (childId && !visited.has(childId)) {
                        visited.add(childId);
                        toProcess.push(childId);
                        // Only add to final results if it's not a work order and its posting flag is true.
                        if (recType !== 'WorkOrd' && (posting === true || posting === 'T')) {
                            finalIds.add(childId);
                        }
                    }
                });
            });
        }
        return Array.from(finalIds);
    }

    // map stage: processes each transaction ID retrieved.
    // It calls getTransactionDetails and writes out the transaction data only if it's posting.
    function map(context) {
        try {
            var transactionId = context.value;
            if (!transactionId) return;
            var transactionData = getTransactionDetails(transactionId);
            if (!transactionData || !transactionData.isPosting) {
                log.audit('MR map', 'Skipping non-posting transaction ID: ' + transactionId);
                return;
            }
            context.write({
                key: transactionId,
                value: JSON.stringify(transactionData)
            });
        } catch (err) {
            log.error('Error in MR map', err);
        }
    }

    // reduce stage: simply passes the data along for summarize.
    function reduce(context) {
        try {
            for (var i = 0; i < context.values.length; i++) {
                context.write({
                    key: context.key,
                    value: context.values[i]
                });
            }
        } catch (err) {
            log.error('Error in MR reduce', err);
        }
    }

    // summarize stage: retrieves the sales order ID, aggregates the map/reduce results,
    // splits the JSON into chunks (to stay below 512 KB per cache value),
    // stores each chunk in the cache, and sets a completion flag.
    function summarize(summary) {
        try {
            var orderId = runtime.getCurrentScript().getParameter({ name: 'custscript_orderid' });
            log.audit('MR summarize', 'Finalizing data for Sales Order ID=' + orderId);
            var finalResults = [];
            summary.output.iterator().each(function(key, value) {
                finalResults.push(JSON.parse(value));
                return true;
            });
            log.audit('MR summarize', 'Total transactions: ' + finalResults.length);
            
            var myCache = cache.getCache({ name: 'CostTreeCache', scope: cache.Scope.PROTECTED });
            var cacheKey = 'costtree_' + orderId;
            
            // Convert results to JSON string and split into chunks if necessary.
            var jsonData = JSON.stringify(finalResults);
            var chunkSize = 500 * 1024; // 500 KB per chunk
            var numChunks = Math.ceil(jsonData.length / chunkSize);
            for (var i = 0; i < numChunks; i++) {
                var keyToStore = i === 0 ? cacheKey : cacheKey + '_' + i;
                var chunkData = jsonData.substring(i * chunkSize, (i + 1) * chunkSize);
                myCache.put({
                    key: keyToStore,
                    value: chunkData
                });
                log.audit('MR summarize', 'Stored cache chunk with key=' + keyToStore);
            }
            
            // Set a completion flag to signal that the MR processing is complete.
            var completeKey = 'costtree_complete_' + orderId;
            myCache.put({
                key: completeKey,
                value: 'true'
            });
            log.audit('MR summarize', 'Set completion flag for key=' + completeKey);
        } catch (err) {
            log.error('Error in MR summarize', err);
        }
    }

    // Helper: Fetch transaction details for a given transactionId.
    function getTransactionDetails(transactionId) {
        var details = { items: [] };
        try {
            var s = search.create({
                type: 'transaction',
                filters: [
                    ['internalid', 'anyof', transactionId],
                    'AND',
                    ['type', 'noneof', 'PurchOrd']
                ],
                columns: [
                    search.createColumn({ name: 'tranid' }),
                    search.createColumn({ name: 'recordtype' }),
                    search.createColumn({ name: 'posting' }),
                    search.createColumn({ name: 'item' }),
                    search.createColumn({ name: 'debitamount' }),
                    search.createColumn({ name: 'creditamount' }),
                    search.createColumn({ name: 'account' })
                ]
            });
            var results = s.run().getRange({ start: 0, end: 1000 });
            if (results && results.length > 0) {
                var first = results[0];
                details.tranId = first.getValue('tranid') || 'Unknown';
                details.recordType = first.getValue('recordtype') || 'Unknown';
                details.isPosting = (first.getValue('posting') === true || first.getValue('posting') === 'T');
                results.forEach(function(res) {
                    var debit = parseFloat(res.getValue('debitamount')) || 0;
                    var credit = parseFloat(res.getValue('creditamount')) || 0;
                    if (debit === 0 && credit === 0) return;
                    details.items.push({
                        itemName: res.getText('item') || 'Unknown',
                        debitamount: debit,
                        creditamount: credit,
                        debitAccount: (debit > 0) ? (res.getText('account') || 'Unknown') : 'N/A',
                        creditAccount: (credit > 0) ? (res.getText('account') || 'Unknown') : 'N/A'
                    });
                });
            } else {
                var lookup = search.lookupFields({
                    type: 'transaction',
                    id: transactionId,
                    columns: ['tranid', 'recordtype', 'posting']
                });
                if (lookup) {
                    details.tranId = lookup.tranid || 'Unknown';
                    details.recordType = lookup.recordtype || 'Unknown';
                    details.isPosting = (lookup.posting === true);
                } else {
                    return null;
                }
            }
            return details;
        } catch (err) {
            log.error('Error in getTransactionDetails', err);
            return null;
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
