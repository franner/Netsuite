/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url', 'N/https'],
  function (currentRecord, url, https) {

    function pageInit(context) {
      const rec = currentRecord.get();
      const salesOrderId = rec.id;

      loadCostTree(salesOrderId);
    }

    function loadCostTree(salesOrderId) {
      const suiteletUrl = url.resolveScript({
        scriptId: 'customscript5035',
        deploymentId: 'customdeploy1',
        params: { action: 'getTree', orderId: salesOrderId }
      });

      https.get.promise({ url: suiteletUrl }).then(res => {
        const data = JSON.parse(res.body);
        document.getElementById('costTree').innerHTML = buildTreeHtml(data);
      }).catch(err => {
        document.getElementById('costTree').innerHTML = 'Error loading data.';
        console.error('Error loading cost tree:', err);
      });
    }

    function buildTreeHtml(node) {
      let html = '<ul>';
      html += `<li>${node.name} [Material: $${node.materialCost.toFixed(2)}, Labor: $${node.laborCost.toFixed(2)}]`;
      if (node.children.length > 0) {
        node.children.forEach(child => html += buildTreeHtml(child));
      }
      html += '</li></ul>';
      return html;
    }

    return { pageInit };
  });