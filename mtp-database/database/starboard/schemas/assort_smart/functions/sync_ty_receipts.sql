--liquibase formatted sql
--changeset vishal.hosamani@impactanalytics.co:sync_ty_receipts liquibase:sync_ty_receipts runOnChange:true stripComments:false splitStatements:false context:MTP-41883  labels:liquibase_project_start
--comment: initial changeset for sync_ty_receipts
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.sync_ty_receipts();
CREATE OR REPLACE FUNCTION assort_smart.sync_ty_receipts()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
    INSERT INTO assort_smart.ty_receipts (
        l0_name, l1_name, l2_name, store_type, sub_channel,
        fiscal_year, fiscal_month, fiscal_week, season_code,
        target_units, target_revenue, target_cost,
        ty_rcpt_units, ty_rcpt_cost, ty_rcpt_msrp,
        rcpt_msrp, bop_units, created_at, updated_at, is_updated
    )
    SELECT
        l0_name, l1_name, l2_name, store_type, sub_channel,
        fiscal_year, fiscal_month, fiscal_week, season_code,
        target_units, target_revenue, target_cost,
        ty_rcpt_units, ty_rcpt_cost, ty_rcpt_msrp,
        rcpt_msrp, bop_units, created_at, updated_at, is_updated
    FROM assort_smart.staging_ty_receipts
    ON CONFLICT (
        l0_name, l1_name, l2_name, store_type, sub_channel,
        season_code, fiscal_year, fiscal_month, fiscal_week
    )
    DO UPDATE SET
        ty_rcpt_units   = EXCLUDED.ty_rcpt_units,
        ty_rcpt_cost    = EXCLUDED.ty_rcpt_cost,
        ty_rcpt_msrp    = EXCLUDED.ty_rcpt_msrp,
        rcpt_msrp       = EXCLUDED.rcpt_msrp,
        target_revenue  = EXCLUDED.target_revenue,
        target_cost     = EXCLUDED.target_cost,
        target_units    = EXCLUDED.target_units,
        bop_units       = EXCLUDED.bop_units,
        updated_at      = EXCLUDED.updated_at,
        is_updated      = true;
    
    RAISE NOTICE 'TY Receipts synced successfully.';
end;
$function$
;
