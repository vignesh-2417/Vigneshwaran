import { LightningElement, api, track } from 'lwc';
import prepareAndPreview from '@salesforce/apex/OrderFormDocgenService.prepareAndPreview';

export default class OrderFormBundlePreview extends LightningElement {
    @api recordId;
    @track model;
    error;
    loading = false;

    get hasLines() {
        return this.model && this.model.visibleLines && this.model.visibleLines.length > 0;
    }

    get hiddenCount() {
        return this.model && this.model.hiddenLines ? this.model.hiddenLines.length : 0;
    }

    get formattedTotal() {
        return this.model && this.model.documentTotal != null
            ? this.model.documentTotal
            : 0;
    }

    handlePrepare() {
        this.loading = true;
        this.error = undefined;
        prepareAndPreview({ opportunityId: this.recordId })
            .then((result) => {
                this.model = result;
            })
            .catch((err) => {
                this.error = err.body && err.body.message ? err.body.message : err.message;
            })
            .finally(() => {
                this.loading = false;
            });
    }
}
