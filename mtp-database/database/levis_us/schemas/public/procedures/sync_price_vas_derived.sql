--liquibase formatted sql
--changeset raghav.kirkol:SPs set up in test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_test
--comment: initial changeset
--rollback: SELECT 1



DROP PROCEDURE IF EXISTS  public.sync_price_vas_derived();

CREATE OR REPLACE PROCEDURE public.sync_price_vas_derived()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_price_vas_derived';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        --deleting the table
        delete from 
          size_smart.price_vas_derived
        where 
          true;
        
        -- insert everything
       INSERT INTO size_smart.price_vas_derived (
 l2_code,
	display_article,
	season,
	"year",
	"Price" ,
	"VAS_FOLD_CODE",
	"VAS_RFID",
	"VAS_1",
	"VAS_2",
	"VAS_3",
	"VAS_4",
	"VAS_5",
	"VAS_6",
	"VAS_7",
	"VAS_8"
)
        SELECT 
           l2_code,
	display_article,
	season,
	"year",
	"Price" ,
	"VAS_FOLD_CODE",
	"VAS_RFID",
	"VAS_1",
	"VAS_2",
	"VAS_3",
	"VAS_4",
	"VAS_5",
	"VAS_6",
	"VAS_7",
	"VAS_8"
        FROM 
          public.price_vas_derived x;
          
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
