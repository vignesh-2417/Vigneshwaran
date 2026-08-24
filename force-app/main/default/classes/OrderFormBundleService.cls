public with sharing class OrderFormBundleService {
    public static final String LINE_TYPE_BUNDLE = 'Bundle';
    public static final String LINE_TYPE_PRODUCT = 'Product';
    public static final String LINE_TYPE_COMPONENT = 'Bundle Component';

    public class Line {
        @AuraEnabled public Id lineItemId;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public Decimal price;
        @AuraEnabled public String lineType;
        @AuraEnabled public Boolean visibleOnOrderForm;
    }

    public class DocumentModel {
        @AuraEnabled public Id opportunityId;
        @AuraEnabled public List<Line> visibleLines;
        @AuraEnabled public List<Line> hiddenLines;
        @AuraEnabled public Decimal documentTotal;
        @AuraEnabled public Map<String, String> docgenParameters;
    }

    public class RecalcResult {
        public List<OpportunityLineItem> lineUpdates = new List<OpportunityLineItem>();
        public List<Opportunity> opportunityUpdates = new List<Opportunity>();
        public Map<Id, Decimal> totalsByOpportunityId = new Map<Id, Decimal>();
    }

    public static DocumentModel buildDocumentModel(Id opportunityId) {
        if (opportunityId == null) {
            throw new AuraHandledException('Opportunity Id is required.');
        }

        List<OpportunityLineItem> lines = queryLines(new Set<Id>{ opportunityId });
        return toDocumentModel(opportunityId, lines);
    }

    public static RecalcResult prepareStamps(Set<Id> opportunityIds) {
        RecalcResult result = new RecalcResult();
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            return result;
        }

        List<OpportunityLineItem> lines = queryLines(opportunityIds);
        Map<Id, List<OpportunityLineItem>> linesByOpportunity = groupByOpportunity(lines);

        for (Id opportunityId : opportunityIds) {
            List<OpportunityLineItem> oppLines = linesByOpportunity.containsKey(opportunityId)
                ? linesByOpportunity.get(opportunityId)
                : new List<OpportunityLineItem>();
            DocumentModel model = toDocumentModel(opportunityId, oppLines);
            result.totalsByOpportunityId.put(opportunityId, model.documentTotal);
            result.opportunityUpdates.add(
                new Opportunity(Id = opportunityId, Order_Form_Total__c = model.documentTotal)
            );
            result.lineUpdates.addAll(stampedLines(oppLines, model));
        }

        return result;
    }

    public static void applyStamps(Set<Id> opportunityIds) {
        RecalcResult result = prepareStamps(opportunityIds);
        persistStamps(result);
    }

    public static void persistStamps(RecalcResult result) {
        if (result == null) {
            return;
        }
        if (!result.lineUpdates.isEmpty()) {
            update result.lineUpdates;
        }
        if (!result.opportunityUpdates.isEmpty()) {
            update result.opportunityUpdates;
        }
    }

    public static Map<String, String> buildDocgenParameters(DocumentModel model) {
        Map<String, String> parameters = new Map<String, String>();
        Decimal total = model == null || model.documentTotal == null ? 0 : model.documentTotal;
        parameters.put('hideChildProducts', 'true');
        parameters.put('lineItemFilter', 'Hide_On_Order_Form__c = false');
        parameters.put('suppressTableRowSelect', './Hide_On_Order_Form__c');
        parameters.put('suppressTableRowMatch', 'True');
        parameters.put('documentTotalField', 'Order_Form_Total__c');
        parameters.put('displayNameField', 'Order_Form_Display_Name__c');
        parameters.put('displayPriceField', 'Order_Form_Price__c');
        parameters.put('documentTotal', String.valueOf(total.setScale(2)));
        return parameters;
    }

    @TestVisible
    static List<OpportunityLineItem> queryLines(Set<Id> opportunityIds) {
        return [
            SELECT
                Id,
                Name,
                OpportunityId,
                Quantity,
                TotalPrice,
                Bundle_Parent__c,
                Is_Bundle__c,
                Bundle_Name__c,
                Hide_On_Order_Form__c,
                Order_Form_Display_Name__c,
                Order_Form_Line_Type__c,
                Order_Form_Price__c
            FROM OpportunityLineItem
            WHERE OpportunityId IN :opportunityIds
            ORDER BY SortOrder, CreatedDate, Id
        ];
    }

    @TestVisible
    static DocumentModel toDocumentModel(Id opportunityId, List<OpportunityLineItem> lines) {
        DocumentModel model = new DocumentModel();
        model.opportunityId = opportunityId;
        model.visibleLines = new List<Line>();
        model.hiddenLines = new List<Line>();
        model.documentTotal = 0;

        Map<Id, List<OpportunityLineItem>> childrenByParentId = new Map<Id, List<OpportunityLineItem>>();
        for (OpportunityLineItem line : safeLines(lines)) {
            if (line.Bundle_Parent__c == null) {
                continue;
            }
            if (!childrenByParentId.containsKey(line.Bundle_Parent__c)) {
                childrenByParentId.put(line.Bundle_Parent__c, new List<OpportunityLineItem>());
            }
            childrenByParentId.get(line.Bundle_Parent__c).add(line);
        }

        for (OpportunityLineItem line : safeLines(lines)) {
            Line row = toLine(line, childrenByParentId);
            if (row.visibleOnOrderForm) {
                model.visibleLines.add(row);
                model.documentTotal += nvl(row.price);
            } else {
                model.hiddenLines.add(row);
            }
        }

        model.documentTotal = model.documentTotal.setScale(2);
        model.docgenParameters = buildDocgenParameters(model);
        return model;
    }

    static List<OpportunityLineItem> stampedLines(
        List<OpportunityLineItem> sourceLines,
        DocumentModel model
    ) {
        Map<Id, Line> byId = new Map<Id, Line>();
        for (Line row : model.visibleLines) {
            byId.put(row.lineItemId, row);
        }
        for (Line row : model.hiddenLines) {
            byId.put(row.lineItemId, row);
        }

        List<OpportunityLineItem> updates = new List<OpportunityLineItem>();
        for (OpportunityLineItem source : safeLines(sourceLines)) {
            Line row = byId.get(source.Id);
            if (row == null) {
                continue;
            }
            Boolean shouldBeBundle = LINE_TYPE_BUNDLE.equals(row.lineType);
            Decimal stampedPrice = nvl(row.visibleOnOrderForm ? row.price : 0);
            if (
                source.Is_Bundle__c == shouldBeBundle &&
                source.Order_Form_Price__c == stampedPrice
            ) {
                continue;
            }
            updates.add(
                new OpportunityLineItem(
                    Id = source.Id,
                    Is_Bundle__c = shouldBeBundle,
                    Order_Form_Price__c = stampedPrice
                )
            );
        }
        return updates;
    }

    static Line toLine(
        OpportunityLineItem line,
        Map<Id, List<OpportunityLineItem>> childrenByParentId
    ) {
        Line row = new Line();
        row.lineItemId = line.Id;
        row.quantity = nvl(line.Quantity);
        Boolean isChild = line.Bundle_Parent__c != null;
        Boolean hasChildren = childrenByParentId.containsKey(line.Id);
        row.visibleOnOrderForm = !isChild;

        if (isChild) {
            row.lineType = LINE_TYPE_COMPONENT;
            row.name = displayName(line, false);
            row.price = 0;
            return row;
        }

        if (hasChildren || line.Is_Bundle__c == true) {
            row.lineType = LINE_TYPE_BUNDLE;
            row.name = displayName(line, true);
            row.price = nvl(line.TotalPrice);
            for (OpportunityLineItem child : childrenByParentId.get(line.Id) == null
                ? new List<OpportunityLineItem>()
                : childrenByParentId.get(line.Id)) {
                row.price += nvl(child.TotalPrice);
            }
            row.price = row.price.setScale(2);
            return row;
        }

        row.lineType = LINE_TYPE_PRODUCT;
        row.name = displayName(line, false);
        row.price = nvl(line.TotalPrice).setScale(2);
        return row;
    }

    static String displayName(OpportunityLineItem line, Boolean asBundle) {
        if (asBundle && String.isNotBlank(line.Bundle_Name__c)) {
            return line.Bundle_Name__c;
        }
        return line.Name;
    }

    static Map<Id, List<OpportunityLineItem>> groupByOpportunity(List<OpportunityLineItem> lines) {
        Map<Id, List<OpportunityLineItem>> grouped = new Map<Id, List<OpportunityLineItem>>();
        for (OpportunityLineItem line : safeLines(lines)) {
            if (!grouped.containsKey(line.OpportunityId)) {
                grouped.put(line.OpportunityId, new List<OpportunityLineItem>());
            }
            grouped.get(line.OpportunityId).add(line);
        }
        return grouped;
    }

    static List<OpportunityLineItem> safeLines(List<OpportunityLineItem> lines) {
        return lines == null ? new List<OpportunityLineItem>() : lines;
    }

    static Decimal nvl(Decimal value) {
        return value == null ? 0 : value;
    }
}
