-- Allow a vendor to have more than one specialty (e.g. a "todero" who
-- does both plumbing and carpentry). Replaces the single `trade` column
-- with a `trades` array.

alter table public.vendors add column trades text[] not null default '{}';

update public.vendors set trades = case when trade is not null then array[trade] else '{}' end;

alter table public.vendors drop constraint if exists vendors_trade_check;
drop index if exists vendors_trade_idx;
alter table public.vendors drop column trade;

alter table public.vendors
  add constraint vendors_trades_check check (
    trades <@ array[
      'plumbing', 'electrical', 'hvac', 'gardening', 'pool', 'cleaning',
      'carpentry', 'painting', 'locksmith', 'pest_control', 'roofing',
      'appliances', 'security', 'internet', 'general'
    ]::text[]
  );

create index vendors_trades_idx on public.vendors using gin (trades);
