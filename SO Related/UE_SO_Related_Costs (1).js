/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define([], () => {
  function beforeLoad(context) {
    if (context.type === context.UserEventType.VIEW) {
      context.form.addButton({
        id: 'custpage_cost_tree_btn',
        label: 'View Cost Tree',
        functionName: `window.open('/app/site/hosting/scriptlet.nl?script=customscript5035&deploy=customdeploy1&salesorder=${context.newRecord.id}', '_blank')`
      });
    }
  }
  return { beforeLoad };
});
