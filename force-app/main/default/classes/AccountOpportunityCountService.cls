public with sharing class AccountOpportunityCountService {
    /**
     * Returns how many Opportunity records reference the given Account Id.
     */
    public static Integer getOpportunityCount(Id accountId) {
        if (accountId == null) {
            return 0;
        }

        return [
            SELECT COUNT()
            FROM Opportunity
            WHERE AccountId = :accountId
        ];
    }

    /**
     * Bulk-safe opportunity counts keyed by Account Id.
     */
    public static Map<Id, Integer> getOpportunityCounts(Set<Id> accountIds) {
        Map<Id, Integer> countsByAccountId = new Map<Id, Integer>();

        if (accountIds == null || accountIds.isEmpty()) {
            return countsByAccountId;
        }

        for (Id accountId : accountIds) {
            countsByAccountId.put(accountId, 0);
        }

        for (AggregateResult result : [
            SELECT AccountId accountId, COUNT(Id) opportunityCount
            FROM Opportunity
            WHERE AccountId IN :accountIds
            GROUP BY AccountId
        ]) {
            countsByAccountId.put(
                (Id) result.get('accountId'),
                (Integer) result.get('opportunityCount')
            );
        }

        return countsByAccountId;
    }

    /**
     * Used by Lightning record pages to display the count on an Account.
     */
    @AuraEnabled(cacheable=true)
    public static Integer getOpportunityCountForAccount(Id accountId) {
        return getOpportunityCount(accountId);
    }
}
