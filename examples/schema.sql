-- Example schema for testing diagram file format

CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    published_at TIMESTAMP
);

CREATE TABLE public.comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES public.posts(id),
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contract.contracts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft'
);

CREATE TABLE contract.contract_items (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2)
);

CREATE TABLE contract.contract_notes (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contract.contracts(id),
    note TEXT NOT NULL
);

alter table contract.contract_items
    add foreign key (contract_id) references contract.contracts(id);
