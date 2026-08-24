public with sharing class OrderFormDocgenService {
    public class Request {
        @InvocableVariable(required=true label='Opportunity Id')
        public Id opportunityId;
    }

    public class Result {
        @InvocableVariable(label='Opportunity Id')
        public Id opportunityId;
        @InvocableVariable(label='Visible Line Count')
        public Integer visibleLineCount;
        @InvocableVariable(label='Document Total')
        public Decimal documentTotal;
        @InvocableVariable(label='Docgen Parameters JSON')
        public String docgenParametersJson;
        @InvocableVariable(label='Template Guidance')
        public String templateGuidance;
    }

    /**
     * Stamps Order Form prices/totals, then returns Docusign Gen additional
     * parameters used to hide bundle child products. Sales users generate the
     * document with Gen; no manual Word editing is required at runtime.
     */
    @InvocableMethod(label='Prepare Order Form for Docusign Gen' category='Order Form')
    public static List<Result> prepare(List<Request> requests) {
        List<Result> results = new List<Result>();
        if (requests == null) {
            return results;
        }

        Set<Id> opportunityIds = new Set<Id>();
        for (Request request : requests) {
            if (request != null && request.opportunityId != null) {
                opportunityIds.add(request.opportunityId);
            }
        }

        OrderFormLineItemTriggerHandler.skipRecalc = true;
        try {
            OrderFormBundleService.applyStamps(opportunityIds);
        } finally {
            OrderFormLineItemTriggerHandler.skipRecalc = false;
        }

        for (Request request : requests) {
            Result result = new Result();
            if (request == null || request.opportunityId == null) {
                results.add(result);
                continue;
            }
            OrderFormBundleService.DocumentModel model = OrderFormBundleService.buildDocumentModel(
                request.opportunityId
            );
            result.opportunityId = model.opportunityId;
            result.visibleLineCount = model.visibleLines.size();
            result.documentTotal = model.documentTotal;
            result.docgenParametersJson = JSON.serialize(model.docgenParameters);
            result.templateGuidance = suppressTableRowTag();
            results.add(result);
        }
        return results;
    }

    @AuraEnabled
    public static OrderFormBundleService.DocumentModel preview(Id opportunityId) {
        return OrderFormBundleService.buildDocumentModel(opportunityId);
    }

    @AuraEnabled
    public static OrderFormBundleService.DocumentModel prepareAndPreview(Id opportunityId) {
        Request request = new Request();
        request.opportunityId = opportunityId;
        prepare(new List<Request>{ request });
        return OrderFormBundleService.buildDocumentModel(opportunityId);
    }

    public static String suppressTableRowTag() {
        return '<# <SuppressTableRow Select="./Hide_On_Order_Form__c" Match="True" /> #>';
    }
}
