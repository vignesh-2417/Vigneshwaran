trigger OpportunityLineItemOrderForm on OpportunityLineItem (
    after insert,
    after update,
    after delete,
    after undelete
) {
    OrderFormLineItemTriggerHandler.handle(Trigger.new, Trigger.old);
}
