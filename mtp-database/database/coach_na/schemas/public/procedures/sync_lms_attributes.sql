--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_lms_attributes runOnChange:true stripComments:false splitStatements:false context:sync_lms_attributes labels:first commit
--comment: sync_lms_attributes
--rollback: SELECT 1


DROP PROCEDURE if exists  public.sync_lms_attributes();

CREATE OR REPLACE PROCEDURE public.sync_lms_attributes()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_lms_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 DELETE FROM inventory_smart.lms_attributes;
 INSERT INTO inventory_smart.lms_attributes
 WITH product_info AS (
   SELECT DISTINCT
     paf.l1_name,
     SUBSTRING(paf.l2_name, 1, 3) AS dept_id,
     paf.l2_name,
     paf.article
   FROM global.product_attributes_filter paf
join inventory_smart.article_status_tag
using (article)
where article_status_tag not in ('','Old')
and paf.active 
 ),
 store_info AS (
   SELECT *
   FROM global.store_attributes_filter
   WHERE cust_type <> 'DC Door'
 ),
 base AS (
   SELECT
     p.l1_name, p.l2_name, p.dept_id, p.article,
     s.store_code,
     CASE
       WHEN p.dept_id IN ('D01','D02','D03') THEN 'MSFRP_LOCATIONS'
       WHEN p.dept_id IN ('D04','D05','D08','D10','D21') THEN 'MEN_CONCEPT_LOCATION'
       WHEN p.dept_id = 'D07' AND p.l1_name = 'Retail-Store' THEN 'SIGNATURE_C_FOCUS_LOCATION'
       WHEN p.dept_id = 'D07' AND p.l1_name = 'Outlet-Store' THEN 'FTWEAR_LOCATION'
       WHEN p.dept_id = 'D09' THEN 'WATCH_LOCATION'
       WHEN p.dept_id = 'D11' THEN 'FTWEAR_LOCATION'
       WHEN p.dept_id = 'D12' THEN 'SUNGLASS_LOCATION'
       WHEN p.dept_id = 'D13' THEN 'JEWELRY_LOCATION'
       WHEN p.dept_id IN ('D16','D19') THEN 'WEARABLES_LOCATION'
       WHEN p.dept_id = 'D18' THEN 'LY_ASSORT_FOCUS_LOCATION'
       WHEN p.dept_id = 'D20' THEN 'VARIABLE_PRC_LOCATION'
       ELSE '-'
     END AS lms_attributes,
     CASE
       WHEN p.dept_id IN ('D01','D02','D03') THEN s.msfrp_locations
       WHEN p.dept_id IN ('D04','D05','D08','D10','D21') THEN s.men_concept_location
       WHEN p.dept_id = 'D07' AND p.l1_name = 'Retail-Store' THEN s.signature_c_focus_location
       WHEN p.dept_id = 'D07' AND p.l1_name = 'Outlet-Store' THEN s.ftwear_location
       WHEN p.dept_id = 'D09' THEN s.watch_location
       WHEN p.dept_id = 'D11' THEN s.ftwear_location
       WHEN p.dept_id = 'D12' THEN s.sunglass_location
       WHEN p.dept_id = 'D13' THEN s.jewelry_location
       WHEN p.dept_id IN ('D16','D19') THEN s.wearables_location
       WHEN p.dept_id = 'D18' THEN s.ly_assort_focus_location
       WHEN p.dept_id = 'D20' THEN s.variable_prc_location
       ELSE '-'
     END AS lms_attribute_value
   FROM product_info p
   JOIN store_info s ON p.l1_name = s.channel
 )
 SELECT
   l1_name, l2_name,  article, store_code,
   lms_attributes, lms_attribute_value
 FROM base;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;