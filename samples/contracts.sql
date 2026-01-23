/* @erd-pets
[main]
contract.contract 696 272
contract.contract_type 284 402
contract.scope 32 275
contract.state_type 604 533
contract.scope_date 275 104
contract.date_type 571 -21

[grants]
contract.grant 595 -17
contract.grant_capacity 805 391
contract.grant_type 96 -47
contract.scope_grant 299 306
contract.scope 32 275

[assets]
asset.*
asset.asset 708 510
contract.manifest -67 307
contract.manifest_asset 348 202
*/

-- DO NOT EDIT - regenerate with: ./generate-create-script.cs

-- === initialise.sql ===
alter system set timezone = 'UTC';
alter database template1 set timezone = 'UTC';
select pg_reload_conf();

-- === objects/schemas ===
create schema if not exists asset;
create schema if not exists contract;

-- === objects/tables ===

-- asset

create table asset.asset
(
    id              bigint generated always as identity,
    name            text                                         not null,
    asset_type_id   integer                                      not null,
    quantity        integer                  default 100         not null,
    created_at      timestamp with time zone default now()       not null,
    created_by      integer                                      not null,
    updated_at      timestamp with time zone default now()       not null,
    updated_by      integer                                      not null,
    system_metadata jsonb                    default '{}'::jsonb not null,
    tenant_metadata jsonb                    default '{}'::jsonb not null
);

-- contract

create table contract.contract
(
    id                   integer generated always as identity,
    name                 text                                         not null,
    contract_type_id     integer                                      not null,
    signed_on            text,
    office_party_role_id  integer                                      not null,
    created_at           timestamp with time zone default now()       not null,
    created_by           integer                                      not null,
    updated_at           timestamp with time zone default now()       not null,
    updated_by           integer                                      not null,
    system_metadata      jsonb                    default '{}'::jsonb not null,
    tenant_metadata      jsonb                    default '{}'::jsonb not null
);

create table contract.contract_type
(
    id              integer generated always as identity,
    name            text                                         not null,
    created_at      timestamp with time zone default now()       not null,
    created_by      integer                                      not null,
    updated_at      timestamp with time zone default now()       not null,
    updated_by      integer                                      not null,
    system_metadata jsonb                    default '{}'::jsonb not null,
    tenant_metadata jsonb                    default '{}'::jsonb not null
);

create table contract.date_type
(
    id   integer generated always as identity,
    name text    not null,
    kind char(2) not null,
    created_at      timestamptz not null default now(),
    created_by      integer     not null,
    updated_at      timestamptz not null default now(),
    updated_by      integer     not null,
    system_metadata jsonb       not null default '{}',
    tenant_metadata jsonb       not null default '{}'
);

create table contract."grant"
(
    id                     integer generated always as identity,
    assignor_party_role_id integer             not null,
    acquirer_party_role_id integer             not null,
    grant_capacity_id      integer             not null,
    grant_type_id          integer             not null,
    quantity               integer default 0   not null,
    quantity_denominator   integer default 100 not null,
    created_at      timestamptz not null default now(),
    created_by      integer     not null,
    updated_at      timestamptz not null default now(),
    updated_by      integer     not null,
    system_metadata jsonb       not null default '{}',
    tenant_metadata jsonb       not null default '{}'
);

create table contract.grant_capacity
(
    id              integer generated always as identity,
    name            text                                         not null,
    created_at      timestamp with time zone default now()       not null,
    created_by      integer                                      not null,
    updated_at      timestamp with time zone default now()       not null,
    updated_by      integer                                      not null,
    system_metadata jsonb                    default '{}'::jsonb not null,
    tenant_metadata jsonb                    default '{}'::jsonb not null
);

create table contract.grant_type
(
    id              integer generated always as identity,
    name            text                                         not null,
    created_at      timestamp with time zone default now()       not null,
    created_by      integer                                      not null,
    updated_at      timestamp with time zone default now()       not null,
    updated_by      integer                                      not null,
    system_metadata jsonb                    default '{}'::jsonb not null,
    tenant_metadata jsonb                    default '{}'::jsonb not null
);

create table contract.manifest
(
    id              integer generated always as identity,
    name            text                                         not null,
    is_explicit     boolean                  default false       not null,
    created_at      timestamp with time zone default now()       not null,
    created_by      integer                                      not null,
    updated_at      timestamp with time zone default now()       not null,
    updated_by      integer                                      not null,
    system_metadata jsonb                    default '{}'::jsonb not null,
    tenant_metadata jsonb                    default '{}'::jsonb not null
);

create table contract.manifest_asset
(
    id              integer generated always as identity,
    manifest_id     integer                                      not null,
    asset_id        bigint                                       not null,
    created_at      timestamp with time zone default now()       not null,
    created_by      integer                                      not null,
    updated_at      timestamp with time zone default now()       not null,
    updated_by      integer                                      not null,
    system_metadata jsonb                    default '{}'::jsonb not null,
    tenant_metadata jsonb                    default '{}'::jsonb not null
);

create table contract.region
(
    id                  integer generated always as identity,
    name                text                                         not null,
    country_codes_az_uq varchar(5)[]                                 not null,
    created_at          timestamp with time zone default now()       not null,
    created_by          integer                                      not null,
    updated_at          timestamp with time zone default now()       not null,
    updated_by          integer                                      not null,
    system_metadata     jsonb                    default '{}'::jsonb not null,
    tenant_metadata     jsonb                    default '{}'::jsonb not null
);

create table contract.scope
(
    id            integer generated always as identity,
    name          text    not null,
    contract_id   integer not null,
    state_type_id integer not null,
    created_at      timestamptz not null default now(),
    created_by      integer     not null,
    updated_at      timestamptz not null default now(),
    updated_by      integer     not null,
    system_metadata jsonb       not null default '{}',
    tenant_metadata jsonb       not null default '{}'
);

create table contract.scope_date
(
    id           integer generated always as identity,
    value        timestamp with time zone not null,
    date_type_id integer                  not null,
    scope_id     integer                  not null,
    created_at      timestamptz not null default now(),
    created_by      integer     not null,
    updated_at      timestamptz not null default now(),
    updated_by      integer     not null,
    system_metadata jsonb       not null default '{}',
    tenant_metadata jsonb       not null default '{}'
);

create table contract.scope_grant
(
    id              integer generated always as identity,
    scope_id        integer                                      not null,
    grant_id        integer                                      not null,
    created_at      timestamp with time zone default now()       not null,
    created_by      integer                                      not null,
    updated_at      timestamp with time zone default now()       not null,
    updated_by      integer                                      not null,
    system_metadata jsonb                    default '{}'::jsonb not null,
    tenant_metadata jsonb                    default '{}'::jsonb not null
);

create table contract.scope_manifest
(
    id          integer generated always as identity,
    scope_id    integer not null,
    manifest_id integer not null,
    created_at      timestamptz not null default now(),
    created_by      integer     not null,
    updated_at      timestamptz not null default now(),
    updated_by      integer     not null,
    system_metadata jsonb       not null default '{}',
    tenant_metadata jsonb       not null default '{}'
);

create table contract.scope_region
(
    id              integer generated always as identity,
    scope_id        integer                                      not null,
    region_id       integer                                      not null,
    created_at      timestamp with time zone default now()       not null,
    created_by      integer                                      not null,
    updated_at      timestamp with time zone default now()       not null,
    updated_by      integer                                      not null,
    system_metadata jsonb                    default '{}'::jsonb not null,
    tenant_metadata jsonb                    default '{}'::jsonb not null
);

create table contract.state_type
(
    id   integer generated always as identity,
    name text not null,
    created_at      timestamptz not null default now(),
    created_by      integer     not null,
    updated_at      timestamptz not null default now(),
    updated_by      integer     not null,
    system_metadata jsonb       not null default '{}',
    tenant_metadata jsonb       not null default '{}'
);

-- === objects/primary-keys ===

-- asset

alter table asset.asset
    add primary key (id);

-- contract

alter table contract.contract
    add primary key (id);

alter table contract.contract_type
    add primary key (id);

alter table contract.date_type
    add primary key (id);

alter table contract."grant"
    add primary key (id);

alter table contract.grant_capacity
    add primary key (id);

alter table contract.grant_type
    add primary key (id);

alter table contract.manifest
    add primary key (id);

alter table contract.manifest_asset
    add primary key (id);

alter table contract.region
    add primary key (id);

alter table contract.scope
    add primary key (id);

alter table contract.scope_date
    add primary key (id);

alter table contract.scope_region
    add primary key (id);

alter table contract.state_type
    add primary key (id);

-- === objects/foreign-keys ===

-- contract

alter table contract.contract
    add foreign key (contract_type_id) references contract.contract_type;

alter table contract."grant"
    add foreign key (grant_capacity_id) references contract.grant_capacity;

alter table contract."grant"
    add foreign key (grant_type_id) references contract.grant_type;

alter table contract.manifest_asset
    add foreign key (manifest_id) references contract.manifest;

alter table contract.manifest_asset
    add foreign key (asset_id) references asset.asset;

alter table contract.scope
    add foreign key (contract_id) references contract.contract;

alter table contract.scope
    add foreign key (state_type_id) references contract.state_type;

alter table contract.scope_date
    add foreign key (date_type_id) references contract.date_type;

alter table contract.scope_date
    add foreign key (scope_id) references contract.scope;

alter table contract.scope_grant
    add foreign key (scope_id) references contract.scope;

alter table contract.scope_grant
    add foreign key (grant_id) references contract.grant;

alter table contract.scope_manifest
    add foreign key (scope_id) references contract.scope;

alter table contract.scope_manifest
    add foreign key (manifest_id) references contract.manifest;

alter table contract.scope_region
    add foreign key (region_id) references contract.region;

alter table contract.scope_region
    add foreign key (scope_id) references contract.scope;
