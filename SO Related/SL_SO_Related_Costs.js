/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/url', 'N/log', 'N/runtime', 'N/task', 'N/cache'],
function(ui, search, url, log, runtime, task, cache) {

    function onRequest(context) {
        try {
            var request = context.request;
            var response = context.response;
            log.debug('Suitelet Request Parameters', request.parameters);
            
            // If no action parameter is provided, display the form and start the MR script.
            if (request.method === 'GET' && !request.parameters.action) {
                var salesOrderId = request.parameters.salesorder;
                if (!salesOrderId) {
                    log.error('Suitelet', 'No Sales Order ID provided.');
                    response.write('Error: No Sales Order ID provided.');
                    return;
                }
                
                // Submit the MR task; pass salesOrderId as custscript_orderid.
                var mrTask = task.create({ taskType: task.TaskType.MAP_REDUCE });
                mrTask.scriptId = 'customscript_cost_tree_mr';
                mrTask.deploymentId = 'customdeploy1';
                mrTask.params = { custscript_orderid: salesOrderId };
                var mrTaskId = mrTask.submit();
                log.audit('Suitelet', 'Submitted MR Task, ID=' + mrTaskId);
                
                // Build a form with inline HTML that polls for results.
                var form = ui.createForm({ title: 'Sales Order Cost Breakdown' });
                var htmlField = form.addField({
                    id: 'custpage_costtree_html',
                    type: ui.FieldType.INLINEHTML,
                    label: 'Cost Breakdown'
                });
                
                // Build URL for action getTree with parameter orderId.
                var suiteletUrl = url.resolveScript({
                    scriptId: runtime.getCurrentScript().id,
                    deploymentId: runtime.getCurrentScript().deploymentId,
                    params: { action: 'getTree', orderId: salesOrderId }
                });
                log.debug('Suitelet', 'getTree URL: ' + suiteletUrl);
                
                var inlineHtml = ''
                    + '<div id="costTree">Loading cost tree, please wait...</div>'
                    + '<script>'
                    + 'function checkTaskCompletion() {'
                    + '  fetch("' + suiteletUrl + '")'
                    + '    .then(function(res){ return res.json(); })'
                    + '    .then(function(data){'
                    + '       if (data.error || !Array.isArray(data) || data.length === 0) {'
                    + '         setTimeout(checkTaskCompletion, 5000);'
                    + '       } else {'
                    + '         document.getElementById("costTree").innerHTML = buildTreeHtml(data);'
                    + '       }'
                    + '    })'
                    + '    .catch(function(err){'
                    + '       document.getElementById("costTree").innerHTML = "Error loading data.";' 
                    + '       console.error("Error loading cost tree:", err);'
                    + '    });'
                    + '}'
                    + 'checkTaskCompletion();'
                    + 'function buildTreeHtml(dataArray) {'
                    + '  if (!dataArray || dataArray.error) {'
                    + '    return "<p>Error: " + (dataArray ? dataArray.error : "No data available") + "</p>";'
                    + '  }'
                    + '  var html = "<table border=\'1\' cellspacing=\'0\' cellpadding=\'3\'>";'
                    + '  html += "<thead><tr><th>Transaction ID</th><th>Type</th><th>Posting</th><th>Currency</th><th>Item Name</th><th>Debit Amount</th><th>Debit Account</th><th>Credit Amount</th><th>Credit Account</th></tr></thead>";'
                    + '  html += "<tbody>";'
                    + '  dataArray.forEach(function(node) {'
                    + '    if (node.items && node.items.length > 0) {'
                    + '      node.items.forEach(function(item) {'
                    + '        html += "<tr>";'
                    + '        html += "<td>" + node.tranId + "</td>";'
                    + '        html += "<td>" + node.recordType + "</td>";'
                    + '        html += "<td>" + node.isPosting + "</td>";'
                    + '        html += "<td>" + (node.currency || "Unknown") + "</td>";'
                    + '        html += "<td>" + item.itemName + "</td>";'
                    + '        html += "<td>" + item.debitamount.toFixed(2) + "</td>";'
                    + '        html += "<td>" + item.debitAccount + "</td>";'
                    + '        html += "<td>" + item.creditamount.toFixed(2) + "</td>";'
                    + '        html += "<td>" + item.creditAccount + "</td>";'
                    + '        html += "</tr>";'
                    + '      });'
                    + '    } else {'
                    + '      html += "<tr>";'
                    + '      html += "<td>" + node.tranId + "</td>";'
                    + '      html += "<td>" + node.recordType + "</td>";'
                    + '      html += "<td>" + node.isPosting + "</td>";'
                    + '      html += "<td>" + (node.currency || "Unknown") + "</td>";'
                    + '      html += "<td colspan=\'5\'>No items</td>";'
                    + '      html += "</tr>";'
                    + '    }'
                    + '  });'
                    + '  html += "</tbody></table>";'
                    + '  return html;'
                    + '}'
                    + '</script>';
                
                htmlField.defaultValue = inlineHtml;
                response.writePage(form);
            } 
            // GET request with action=getTree – reassemble cached data and return it.
            else if (request.method === 'GET' && request.parameters.action === 'getTree') {
                var orderId = request.parameters.orderId;
                if (!orderId) {
                    response.write(JSON.stringify({ error: 'No orderId parameter provided.' }));
                    return;
                }
                log.audit('Suitelet', 'Fetching cost tree from cache for order ' + orderId);
                var data = getCachedCostTree(orderId);
                response.write(JSON.stringify(data));
            }
        } catch (err) {
            log.error('Suitelet Error', err);
            context.response.write(JSON.stringify({ error: err.message }));
        }
    }
    
    // Helper: Reassemble cached data from multiple chunks after verifying the completion flag.
    function getCachedCostTree(orderId) {
        var myCache = cache.getCache({ name: 'CostTreeCache', scope: cache.Scope.PROTECTED });
        // Check for a boolean flag indicating that the MR process has completed.
        var completeFlag = myCache.get({ key: 'costtree_complete_' + orderId });
        if (!completeFlag) {
            return { error: 'Still processing. Try again later.' };
        }
        
        var cacheKey = 'costtree_' + orderId;
        var rawCombined = "";
        var index = 0;
        while (true) {
            var keyToGet = index === 0 ? cacheKey : cacheKey + '_' + index;
            var chunk = myCache.get({ key: keyToGet });
            if (!chunk) {
                break;
            }
            rawCombined += chunk;
            index++;
        }
        log.debug('Suitelet', 'Reassembled cached data: ' + rawCombined);
        if (rawCombined === "") {
            return { error: 'Still processing. Try again later.' };
        }
        try {
            return JSON.parse(rawCombined);
        } catch (parseErr) {
            log.error('Suitelet', 'JSON parse error: ' + parseErr);
            return { error: 'Corrupted data in cache.' };
        }
    }
    
    return {
        onRequest: onRequest
    };
});
