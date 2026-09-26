--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_product_profile_datasp runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_product_profile_datasp_01

DROP PROCEDURE if exists public.sync_product_profile_datasp();

CREATE OR REPLACE PROCEDURE public.sync_product_profile_datasp()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_profile_datasp';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM inventory_smart.product_profile_master;

INSERT INTO inventory_smart.product_profile_master (
    name,
    special_classification,
    is_deleted,
    created_at,
    created_by,
    updated_at,
    updated_by,
    ph_code,
    description
)
SELECT
    paf.l3_name AS name,
    'ia-recommended' AS special_classification,
    FALSE AS is_deleted,
    CURRENT_TIMESTAMP AS created_at,
    NULL AS created_by,
    NULL AS updated_at,
    NULL AS updated_by,
    phm.ph_code,
    NULL AS description
FROM
    global.product_attributes_filter paf
JOIN
    inventory_smart.ph_master phm
ON
    paf.article = phm.article
join 
    (select distinct product_code
    from inventory_smart.latest_inventory 
    where store_code not in ('90790','90796')
    and oh > 0) li
on paf.product_code = li.product_code
where paf.active
group by 1,2,8;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;