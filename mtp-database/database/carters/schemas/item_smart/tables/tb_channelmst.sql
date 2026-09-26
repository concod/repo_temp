--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_channelmst_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for tb_channelmst
CREATE TABLE IF NOT EXISTS item_smart.tb_channelmst (
	id int4 NULL,
	"name" varchar(50) NULL,
	remarks varchar(50) NULL,
	added_on varchar(50) NULL,
	is_active bool NULL
);

--changeset sonika.baheti@impactanalytics.co:tb_channelmst_2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  datatype change

ALTER TABLE item_smart.tb_channelmst ALTER COLUMN remarks TYPE varchar USING remarks::varchar;
ALTER TABLE item_smart.tb_channelmst ALTER COLUMN added_on TYPE varchar USING added_on::varchar;
