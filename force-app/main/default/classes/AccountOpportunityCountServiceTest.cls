@IsTest
private class AccountOpportunityCountServiceTest {
    @IsTest
    static void returnsZeroWhenAccountIdIsNull() {
        System.assertEquals(0, AccountOpportunityCountService.getOpportunityCount(null));
    }

    @IsTest
    static void countsOpportunitiesForSingleAccount() {
        Account account = new Account(Name = 'Test Account');
        insert account;

        insert new List<Opportunity>{
            buildOpportunity(account.Id, 'Opp One'),
            buildOpportunity(account.Id, 'Opp Two'),
            buildOpportunity(account.Id, 'Opp Three')
        };

        Test.startTest();
        Integer count = AccountOpportunityCountService.getOpportunityCount(account.Id);
        Integer auraCount = AccountOpportunityCountService.getOpportunityCountForAccount(account.Id);
        Test.stopTest();

        System.assertEquals(3, count);
        System.assertEquals(3, auraCount);
    }

    @IsTest
    static void countsOpportunitiesInBulk() {
        Account firstAccount = new Account(Name = 'First Account');
        Account secondAccount = new Account(Name = 'Second Account');
        insert new List<Account>{ firstAccount, secondAccount };

        insert new List<Opportunity>{
            buildOpportunity(firstAccount.Id, 'First Opp A'),
            buildOpportunity(firstAccount.Id, 'First Opp B'),
            buildOpportunity(secondAccount.Id, 'Second Opp A')
        };

        Test.startTest();
        Map<Id, Integer> countsByAccountId = AccountOpportunityCountService.getOpportunityCounts(
            new Set<Id>{ firstAccount.Id, secondAccount.Id }
        );
        Test.stopTest();

        System.assertEquals(2, countsByAccountId.get(firstAccount.Id));
        System.assertEquals(1, countsByAccountId.get(secondAccount.Id));
    }

    private static Opportunity buildOpportunity(Id accountId, String name) {
        return new Opportunity(
            Name = name,
            AccountId = accountId,
            StageName = 'Prospecting',
            CloseDate = Date.today().addDays(30)
        );
    }
}
