--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_asn_to_allocate_alert_v6 runOnChange:true stripComments:false splitStatements:false context:VS_Inv_smart labels:VS-134
--comment: Added product group
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_asn_to_allocate_alert();
CREATE OR REPLACE PROCEDURE public.sync_asn_to_allocate_alert()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_asn_to_allocate_alert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.asn_to_allocate_alert 
		where 
		  true; 

		INSERT INTO inventory_smart.asn_to_allocate_alert(
		asn_id,
    	article,
    	l6_name,
    	l0_name,
    	l2_name,	
    	l3_name,	
	    l4_name,
    	l5_name,
	    flex_style,	
	    generic,
    	sizes_mat,
	    form,	
    	user_defined_1,	
	    user_defined_2,	
    	user_defined_3,	
	    user_defined_4,	
    	user_defined_5,	
    	user_defined_6,	
    	oh,	
    	oo,	
    	it,	
		wip,
    	asn_qty,
    	sizes_count,	
    	oh_dc,	
    	forecast_over_target_wos,	
    	floorset,
    	floorset_start_date,	
    	floorset_end_date,	
    	instore_date,	
    	delivery_date,	
    	store_count_asn,	
    	store_count_choice,	
    	choice_type,
    	collection,		
		masterstyle_descr,			
		subbrand_code_desc,			
		product_lifecycle,
		product_group,
		current_assortment_group,
		current_floorset
		) 
		SELECT 
		asn_id,
    	a.article,
    	l6_name,
    	l0_name,
    	l2_name,	
    	l3_name,	
	    l4_name,
    	l5_name,
	    flex_style,	
	    generic,
    	sizes_mat,
	    form,	
    	user_defined_1,	
	    user_defined_2,	
    	user_defined_3,	
	    user_defined_4,	
    	user_defined_5,	
    	user_defined_6,	
    	oh,	
    	oo,	
    	it,	
		wip,
    	asn_qty,
    	sizes_count,	
    	oh_dc,	
    	forecast_over_target_wos,	
    	floorset,
    	floorset_start_date,	
    	floorset_end_date,	
    	instore_date,	
    	delivery_date,	
    	store_count_asn,	
    	store_count_choice,	
    	choice_type,
    	collection,		
		masterstyle_descr,			
		subbrand_code_desc,			
		product_lifecycle,
		b.product_group,
		current_assortment_group,
		current_floorset
		FROM 
		  public.asn_to_allocate_alert a
		  left join
		  (
			select distinct article,array(SELECT jsonb_array_elements_text(product_group::jsonb))::varchar[] as product_group from
			(
			select distinct article,product_groups ->> 'name' as product_group 
			from
				(
				select
					article,
					json_build_object(
					'name',
					array_agg(distinct name)) as product_groups
				from
					(
					select
						distinct a.product_code,
						paf.article,
						a.pg_code,
						b.name
					from
						global.product_groups_mapping a
					inner join (
						select
							distinct pg_code,
							name,
							is_deleted
						from
							global.product_groups) b
							using(pg_code)
					inner join global.product_attributes_filter paf 
					using(product_code)
					where b.is_deleted is false ) b
				group by
					1 
				) a ) b ) b
				on a.article=b.article
		 
		  ;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$
;