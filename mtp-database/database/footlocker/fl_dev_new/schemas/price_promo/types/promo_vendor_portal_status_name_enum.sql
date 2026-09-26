--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:promo_vendor_portal_status_name_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.promo_vendor_portal_status_name_enum

CREATE TYPE price_promo.promo_vendor_portal_status_name_enum AS ENUM (
    'Draft',
    'Ready for Submission',
    'Submitted',
    'Approved',
    'Approved with Changes',
    'Rejected',
    'Archived'
); 