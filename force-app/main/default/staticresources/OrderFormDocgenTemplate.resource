Docusign Gen Order Form — bundle display

Place this tag inside the Opportunity Product table row of the Word Gen template.
It hides child products of a bundle so the package prints as a single line.

<# <TableRow Select="//Opportunity//OpportunityLineItems" /> #>
<# <SuppressTableRow Select="./Hide_On_Order_Form__c" Match="True" /> #>
| Order_Form_Display_Name__c | Quantity | Order_Form_Price__c |

Bind the document total to Opportunity.Order_Form_Total__c (not a sum of every
OpportunityLineItem). Visible line prices always add up to that total.

Optional Gen additional parameters (POC):
  hideChildProducts=true
  lineItemFilter=Hide_On_Order_Form__c = false
  suppressTableRowSelect=./Hide_On_Order_Form__c
  suppressTableRowMatch=True

Table Options SOQL filter (alternative to SuppressTableRow):
  Hide_On_Order_Form__c = false
