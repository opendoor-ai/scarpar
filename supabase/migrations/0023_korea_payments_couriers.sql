-- 0023: 결제 수단·택배사를 한국 기준으로 정리 (원본의 방글라데시 전용 값 제거)
-- 결제: bkash → transfer(계좌이체), nagad → card(카드), uddoktapay·sslcommerz → card
-- 택배: steadfast → cj(CJ대한통운), pathao → hanjin(한진택배), redx → lotte(롯데택배)
-- 여러 번 실행해도 안전합니다.

-- 1) 기존 검사 규칙(제약) 지우기 — 이름이 자동으로 붙어 있어서 내용으로 찾아 지움
do $$
declare
  r record;
begin
  for r in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.orders'::regclass, 'public.payments'::regclass, 'public.deliveries'::regclass)
      and (pg_get_constraintdef(oid) ilike '%bkash%' or pg_get_constraintdef(oid) ilike '%steadfast%'
           or pg_get_constraintdef(oid) ilike '%transfer%' or pg_get_constraintdef(oid) ilike '%hanjin%')
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

-- 2) 저장된 값 바꾸기
update public.orders set payment_method = case payment_method
  when 'bkash' then 'transfer' when 'nagad' then 'card' when 'uddoktapay' then 'card' when 'sslcommerz' then 'card'
  else payment_method end
where payment_method in ('bkash', 'nagad', 'uddoktapay', 'sslcommerz');

update public.payments set method = case method
  when 'bkash' then 'transfer' when 'nagad' then 'card' when 'uddoktapay' then 'card' when 'sslcommerz' then 'card'
  else method end
where method in ('bkash', 'nagad', 'uddoktapay', 'sslcommerz');

update public.deliveries set courier = case courier
  when 'steadfast' then 'cj' when 'pathao' then 'hanjin' when 'redx' then 'lotte' else courier end
where courier in ('steadfast', 'pathao', 'redx');

update public.courier_accounts set courier = case courier
  when 'steadfast' then 'cj' when 'pathao' then 'hanjin' when 'redx' then 'lotte' else courier end
where courier in ('steadfast', 'pathao', 'redx');

-- 3) 새 검사 규칙
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('cod', 'transfer', 'card', 'bank', 'cash'));
alter table public.payments add constraint payments_method_check
  check (method in ('cod', 'transfer', 'card', 'bank', 'cash'));
alter table public.deliveries add constraint deliveries_courier_check
  check (courier in ('cj', 'hanjin', 'lotte', 'manual'));

-- 4) 설정 키 이름 바꾸기 (예전 이름으로 저장된 값이 있으면 새 이름으로 옮김)
update public.org_settings set key = 'payments.manual_transfer.enabled' where key = 'payments.manual_mfs.enabled'
  and not exists (select 1 from public.org_settings s2 where s2.org_id = org_settings.org_id and s2.key = 'payments.manual_transfer.enabled');
update public.org_settings set key = 'payments.manual_transfer.numbers' where key = 'payments.manual_mfs.numbers'
  and not exists (select 1 from public.org_settings s2 where s2.org_id = org_settings.org_id and s2.key = 'payments.manual_transfer.numbers');
update public.org_settings set key = 'tax.vat_invoice_enabled' where key = 'tax.mushak_enabled'
  and not exists (select 1 from public.org_settings s2 where s2.org_id = org_settings.org_id and s2.key = 'tax.vat_invoice_enabled');
delete from public.org_settings
where key in ('payments.uddoktapay.enabled', 'payments.uddoktapay.api_key', 'payments.uddoktapay.base_url',
              'storefront.whatsapp_number', 'payments.manual_mfs.enabled', 'payments.manual_mfs.numbers', 'tax.mushak_enabled');
update public.org_settings set value = '"disabled"'::jsonb where key = 'fraud.provider' and value = '"fraudbd"'::jsonb;
update public.org_settings set value = '"ko"'::jsonb where key = 'localization.language' and value = '"bn"'::jsonb;
update public.org_settings set value = '"a4_vat"'::jsonb where key = 'printing.invoice_template' and value = '"a4_mushak"'::jsonb;

select
  (select count(*) from public.orders) as 주문,
  (select count(*) from public.deliveries) as 배송;
