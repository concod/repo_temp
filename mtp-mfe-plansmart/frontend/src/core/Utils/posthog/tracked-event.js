import AnalyticsService from "core/posthog/analytics-service";

class TrackedEvents extends AnalyticsService {
  trackLogin(userInfo) {
    if (this.isProduction) {
      this.capture("Login", { email: userInfo });
    }
  }

  trackEventCreation(event) {
    if (this.isProduction) {
      this.capture("Event - Created", { event });
    }
  }

  trackEventEdit(event) {
    if (this.isProduction) {
      this.capture("Event - Edited", { event });
    }
  }

  trackEventsDownload(event) {
    if (this.isProduction) {
      this.capture("Event - Download");
    }
  }

  trackDownloadChangeManagement() {
    if (this.isProduction) {
      this.capture("Event / Promo - Download Audit Report");
    }
  }

  trackEventLocked(event) {
    if (this.isProduction) {
      this.capture("Event - Locked", { event });
    }
  }

  trackEventUnLocked(event) {
    if (this.isProduction) {
      this.capture("Event - Unlocked", { event });
    }
  }

  trackEventDelete(noOfEvents) {
    if (this.isProduction) {
      this.capture("Event - Deleted. In No: ", { noOfEvents });
    }
  }

  trackPromoCreation(promo) {
    if (this.isProduction) {
      this.capture("Promo - Creation Initiated", { promo });
    }
  }

  trackPromoEdit(promo) {
    if (this.isProduction) {
      this.capture("Promo - Edited", { promo });
    }
  }

  trackPromoSimulate(promo) {
    if (this.isProduction) {
      this.capture("Promo - Scenario Simulated", { promo });
    }
  }

  trackPromoApproval(promo) {
    if (this.isProduction) {
      this.capture("Promo - Scenario Approved", { promo });
    }
  }

  trackPromoCopied(promo) {
    if (this.isProduction) {
      this.capture("Promo - Copied", { promo });
    }
  }

  trackPromoFinalized(promo) {
    if (this.isProduction) {
      this.capture("Promo - Finalized", { promo });
    }
  }

  trackPromoDeleted(promo) {
    if (this.isProduction) {
      this.capture("Promo - Deleted", { promo });
    }
  }

  trackPromoDownload() {
    if (this.isProduction) {
      this.capture("Promo - Download");
    }
  }
}

export default TrackedEvents;
