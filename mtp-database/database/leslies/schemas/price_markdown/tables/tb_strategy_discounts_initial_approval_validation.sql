--liquibase formatted sql
--changeset liquibase:tb_strategy_discounts_initial_approval_validation stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_discounts_initial_approval_validation

CREATE TABLE price_markdown.tb_strategy_discounts_initial_approval_validation (
	strategy_id int NULL,
	product_id int NULL,
	store_id int NULL,
	conflicting_strategy_id int NULL,
	department_id int NULL,
	class_id varchar NULL,
	style_id int NULL
);
CREATE INDEX tb_strategy_discounts_initial_approval_validation_strategy_id_idx ON price_markdown.tb_strategy_discounts_initial_approval_validation (strategy_id);


--changeset liquibase:tb_strategy_discounts_initial_approval_validation-20090646 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed data type to text for style_id and department_id column
ALTER TABLE price_markdown.tb_strategy_discounts_initial_approval_validation ALTER COLUMN style_id TYPE varchar USING style_id::varchar;
ALTER TABLE price_markdown.tb_strategy_discounts_initial_approval_validation ALTER COLUMN department_id TYPE varchar USING department_id::varchar;
