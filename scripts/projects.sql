-- Create projects table

DROP TABLE IF EXISTS public.projects;

CREATE TYPE status_type AS ENUM ('FUNDING', 'CANCELED', 'IN_PROGRESS', 'COMPLETED')

CREATE TABLE public.projects (
	tx_hash				VARCHAR(128)	NOT NULL	PRIMARY KEY,
	project_id			INTEGER			NOT NULL	UNIQUE,
	current_stage		INTEGER			NOT NULL	DEFAULT 0,
	total_stages		INTEGER			NOT NULL,
	current_status		status_type		NOT NULL	DEFAULT 'FUNDING',
	owner_address 		VARCHAR(128)	NOT NULL,
	reviewer_address	VARCHAR(128)	NOT NULL,
	FOREIGN KEY owner_address REFERENCES public.wallets (address) ON DELETE RESTRICT,
	FOREIGN KEY reviewer_address REFERENCES public.wallets (address) ON DELETE RESTRICT
);

DROP TABLE IF EXISTS public.stages_costs;

CREATE TABLE public.stages_cost (
	project_id			INTEGER			NOT NULL	PRIMARY KEY,
	stage				INTEGER			NOT NULL	DEFAULT 0,
	cost				NUMERIC			NOT NULL,
	FOREIGN KEY project_id REFERENCES public.projects (project_id) ON DELETE RESTRICT
)
