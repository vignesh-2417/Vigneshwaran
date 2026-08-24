public with sharing class OrderFormLineItemTriggerHandler {
    public static Boolean skipRecalc = false;

    public static void handle(
        List<OpportunityLineItem> newLines,
        List<OpportunityLineItem> oldLines
    ) {
        if (skipRecalc) {
            return;
        }

        Set<Id> opportunityIds = new Set<Id>();
        addOpportunityIds(opportunityIds, newLines);
        addOpportunityIds(opportunityIds, oldLines);
        if (opportunityIds.isEmpty()) {
            return;
        }

        skipRecalc = true;
        try {
            OrderFormBundleService.applyStamps(opportunityIds);
        } finally {
            skipRecalc = false;
        }
    }

    static void addOpportunityIds(Set<Id> opportunityIds, List<OpportunityLineItem> lines) {
        if (lines == null) {
            return;
        }
        for (OpportunityLineItem line : lines) {
            if (line != null && line.OpportunityId != null) {
                opportunityIds.add(line.OpportunityId);
            }
        }
    }
}
