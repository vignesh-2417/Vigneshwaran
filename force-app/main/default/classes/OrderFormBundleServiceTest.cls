@IsTest
private class OrderFormBundleServiceTest {
    @TestSetup
    static void setupData() {
        Account account = new Account(Name = 'Order Form Account');
        insert account;

        Opportunity opportunity = new Opportunity(
            Name = 'Bundle Opportunity',
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30),
            AccountId = account.Id,
            Pricebook2Id = Test.getStandardPricebookId()
        );
        insert opportunity;

        Product2 bundleProduct = new Product2(Name = 'Platform Suite', IsActive = true);
        Product2 childProduct = new Product2(Name = 'Implementation Hours', IsActive = true);
        Product2 standaloneProduct = new Product2(Name = 'Training Workshop', IsActive = true);
        insert new List<Product2>{ bundleProduct, childProduct, standaloneProduct };

        Id pricebookId = Test.getStandardPricebookId();
        insert new List<PricebookEntry>{
            new PricebookEntry(
                Pricebook2Id = pricebookId,
                Product2Id = bundleProduct.Id,
                UnitPrice = 1000,
                IsActive = true
            ),
            new PricebookEntry(
                Pricebook2Id = pricebookId,
                Product2Id = childProduct.Id,
                UnitPrice = 250,
                IsActive = true
            ),
            new PricebookEntry(
                Pricebook2Id = pricebookId,
                Product2Id = standaloneProduct.Id,
                UnitPrice = 400,
                IsActive = true
            )
        };
    }

    @IsTest
    static void bundleAppearsAsSingleLineAndStandaloneRemains() {
        Opportunity opportunity = [SELECT Id FROM Opportunity LIMIT 1];
        Map<String, PricebookEntry> entries = entriesByProductName();

        OpportunityLineItem bundle = new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Platform Suite').Id,
            Quantity = 1,
            UnitPrice = 1000,
            Bundle_Name__c = 'Platform Suite Bundle',
            SortOrder = 1
        );
        insert bundle;

        OpportunityLineItem child = new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Implementation Hours').Id,
            Quantity = 2,
            UnitPrice = 250,
            Bundle_Parent__c = bundle.Id,
            SortOrder = 2
        );
        OpportunityLineItem standalone = new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Training Workshop').Id,
            Quantity = 1,
            UnitPrice = 400,
            SortOrder = 3
        );
        insert new List<OpportunityLineItem>{ child, standalone };

        Test.startTest();
        OrderFormBundleService.DocumentModel model = OrderFormBundleService.buildDocumentModel(
            opportunity.Id
        );
        Test.stopTest();

        System.assertEquals(2, model.visibleLines.size(), 'Bundle plus standalone should show');
        System.assertEquals(1, model.hiddenLines.size(), 'Child product should be hidden');
        System.assertEquals('Platform Suite Bundle', model.visibleLines[0].name);
        System.assertEquals(OrderFormBundleService.LINE_TYPE_BUNDLE, model.visibleLines[0].lineType);
        System.assertEquals(1, model.visibleLines[0].quantity);
        System.assertEquals(1500, model.visibleLines[0].price);
        System.assertEquals('Training Workshop', model.visibleLines[1].name);
        System.assertEquals(OrderFormBundleService.LINE_TYPE_PRODUCT, model.visibleLines[1].lineType);
        System.assertEquals(400, model.visibleLines[1].price);
        System.assertEquals(1900, model.documentTotal);

        Decimal visibleSum = 0;
        for (OrderFormBundleService.Line line : model.visibleLines) {
            visibleSum += line.price;
        }
        System.assertEquals(model.documentTotal, visibleSum.setScale(2));
        System.assertEquals('true', model.docgenParameters.get('hideChildProducts'));
        System.assertEquals(
            'Hide_On_Order_Form__c = false',
            model.docgenParameters.get('lineItemFilter')
        );
    }

    @IsTest
    static void productsWithoutBundleStayAsOwnLines() {
        Opportunity opportunity = [SELECT Id FROM Opportunity LIMIT 1];
        Map<String, PricebookEntry> entries = entriesByProductName();

        insert new List<OpportunityLineItem>{
            new OpportunityLineItem(
                OpportunityId = opportunity.Id,
                PricebookEntryId = entries.get('Platform Suite').Id,
                Quantity = 1,
                UnitPrice = 1000
            ),
            new OpportunityLineItem(
                OpportunityId = opportunity.Id,
                PricebookEntryId = entries.get('Training Workshop').Id,
                Quantity = 2,
                UnitPrice = 400
            )
        };

        OrderFormBundleService.DocumentModel model = OrderFormBundleService.buildDocumentModel(
            opportunity.Id
        );

        System.assertEquals(2, model.visibleLines.size());
        System.assertEquals(0, model.hiddenLines.size());
        System.assertEquals(OrderFormBundleService.LINE_TYPE_PRODUCT, model.visibleLines[0].lineType);
        System.assertEquals(OrderFormBundleService.LINE_TYPE_PRODUCT, model.visibleLines[1].lineType);
        System.assertEquals(1800, model.documentTotal);
    }

    @IsTest
    static void triggerStampsBundlePriceAndOpportunityTotal() {
        Opportunity opportunity = [SELECT Id FROM Opportunity LIMIT 1];
        Map<String, PricebookEntry> entries = entriesByProductName();

        OpportunityLineItem bundle = new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Platform Suite').Id,
            Quantity = 1,
            UnitPrice = 1000,
            Bundle_Name__c = 'Platform Suite Bundle'
        );
        insert bundle;

        insert new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Implementation Hours').Id,
            Quantity = 2,
            UnitPrice = 250,
            Bundle_Parent__c = bundle.Id
        );

        OpportunityLineItem stampedBundle = [
            SELECT Is_Bundle__c, Hide_On_Order_Form__c, Order_Form_Price__c, Order_Form_Display_Name__c
            FROM OpportunityLineItem
            WHERE Id = :bundle.Id
        ];
        OpportunityLineItem stampedChild = [
            SELECT Hide_On_Order_Form__c, Order_Form_Price__c, Order_Form_Line_Type__c
            FROM OpportunityLineItem
            WHERE Bundle_Parent__c = :bundle.Id
        ];
        Opportunity stampedOpportunity = [
            SELECT Order_Form_Total__c
            FROM Opportunity
            WHERE Id = :opportunity.Id
        ];

        System.assertEquals(true, stampedBundle.Is_Bundle__c);
        System.assertEquals(false, stampedBundle.Hide_On_Order_Form__c);
        System.assertEquals(1500, stampedBundle.Order_Form_Price__c);
        System.assertEquals('Platform Suite Bundle', stampedBundle.Order_Form_Display_Name__c);
        System.assertEquals(true, stampedChild.Hide_On_Order_Form__c);
        System.assertEquals(0, stampedChild.Order_Form_Price__c);
        System.assertEquals('Bundle Component', stampedChild.Order_Form_Line_Type__c);
        System.assertEquals(1500, stampedOpportunity.Order_Form_Total__c);
    }

    @IsTest
    static void bundlePriceRollsUpWhenParentHasZeroPrice() {
        Opportunity opportunity = [SELECT Id FROM Opportunity LIMIT 1];
        Map<String, PricebookEntry> entries = entriesByProductName();

        OpportunityLineItem bundle = new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Platform Suite').Id,
            Quantity = 1,
            UnitPrice = 0,
            Bundle_Name__c = 'Platform Suite Bundle'
        );
        insert bundle;
        insert new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Implementation Hours').Id,
            Quantity = 2,
            UnitPrice = 250,
            Bundle_Parent__c = bundle.Id
        );

        OrderFormBundleService.DocumentModel model = OrderFormBundleService.buildDocumentModel(
            opportunity.Id
        );

        System.assertEquals(1, model.visibleLines.size());
        System.assertEquals(500, model.visibleLines[0].price);
        System.assertEquals(500, model.documentTotal);
    }

    @IsTest
    static void prepareInvocableReturnsDocgenParameters() {
        Opportunity opportunity = [SELECT Id FROM Opportunity LIMIT 1];
        Map<String, PricebookEntry> entries = entriesByProductName();

        OpportunityLineItem bundle = new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Platform Suite').Id,
            Quantity = 1,
            UnitPrice = 1000
        );
        insert bundle;
        insert new OpportunityLineItem(
            OpportunityId = opportunity.Id,
            PricebookEntryId = entries.get('Implementation Hours').Id,
            Quantity = 1,
            UnitPrice = 250,
            Bundle_Parent__c = bundle.Id
        );

        OrderFormDocgenService.Request request = new OrderFormDocgenService.Request();
        request.opportunityId = opportunity.Id;

        Test.startTest();
        List<OrderFormDocgenService.Result> results = OrderFormDocgenService.prepare(
            new List<OrderFormDocgenService.Request>{ request }
        );
        Test.stopTest();

        System.assertEquals(1, results.size());
        System.assertEquals(1, results[0].visibleLineCount);
        System.assertEquals(1250, results[0].documentTotal);
        System.assert(results[0].docgenParametersJson.contains('hideChildProducts'));
        System.assert(results[0].templateGuidance.contains('SuppressTableRow'));
        System.assert(results[0].templateGuidance.contains('Hide_On_Order_Form__c'));
    }

    static Map<String, PricebookEntry> entriesByProductName() {
        Map<String, PricebookEntry> entries = new Map<String, PricebookEntry>();
        for (PricebookEntry entry : [
            SELECT Id, Product2.Name
            FROM PricebookEntry
            WHERE Product2.Name IN ('Platform Suite', 'Implementation Hours', 'Training Workshop')
        ]) {
            entries.put(entry.Product2.Name, entry);
        }
        return entries;
    }
}
