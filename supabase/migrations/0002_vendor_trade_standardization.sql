-- Standardize vendors.trade to a fixed set of specialties so the vendor
-- list can be filtered reliably instead of matching free-text strings.
-- If you already have vendors with a trade value outside this list,
-- update those rows to the closest match (or NULL) before this migration
-- runs, e.g.:
--   update public.vendors set trade = 'general' where trade is not null
--     and trade not in ('plumbing','electrical','hvac','gardening','pool',
--       'cleaning','carpentry','painting','locksmith','pest_control',
--       'roofing','appliances','security','internet','general');

alter table public.vendors
  add constraint vendors_trade_check check (
    trade is null or trade in (
      'plumbing', 'electrical', 'hvac', 'gardening', 'pool', 'cleaning',
      'carpentry', 'painting', 'locksmith', 'pest_control', 'roofing',
      'appliances', 'security', 'internet', 'general'
    )
  );

create index vendors_trade_idx on public.vendors (trade);
