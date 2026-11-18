-- Inventory catalog/data foundation: no player grants, no SaveV2 or wallet changes.
create table if not exists public.inventory_item_catalog (
 id text primary key check (id ~ '^[a-z0-9_:-]{1,80}$'),
 category_id text not null check (category_id in ('dao_cu','trang_bi','trang_suc','bao_vat','chien_hon','pet','than_binh','than_thu','cam_nang','tui_da_quy','dien_vo_lenh','trang_bi_quan_su','huyen_thu')),
 name_vi text not null check (char_length(name_vi) between 2 and 100),
 description_vi text not null default '',
 rarity text not null check (rarity in ('R','SR','SSR','SSS+')),
 created_at timestamptz not null default now()
);
create table if not exists public.player_inventory_items (
 uid uuid not null references auth.users(id) on delete cascade,
 item_id text not null references public.inventory_item_catalog(id) on delete restrict,
 quantity bigint not null check (quantity > 0 and quantity <= 1000000000),
 updated_at timestamptz not null default now(),
 primary key(uid,item_id)
);
create index if not exists player_inventory_items_uid_idx on public.player_inventory_items(uid);
alter table public.inventory_item_catalog enable row level security;
alter table public.player_inventory_items enable row level security;
create policy "authenticated_can_read_item_definitions" on public.inventory_item_catalog
 for select to authenticated using (true);
create policy "players_can_read_own_inventory" on public.player_inventory_items
 for select to authenticated using ((select auth.uid()) = uid);
revoke all on public.inventory_item_catalog from anon, authenticated;
revoke all on public.player_inventory_items from anon, authenticated;
grant select on public.inventory_item_catalog, public.player_inventory_items to authenticated;
grant all on public.inventory_item_catalog, public.player_inventory_items to service_role;
-- Catalog definitions only: no item ownership granted to existing users.
insert into public.inventory_item_catalog (id,category_id,name_vi,rarity,description_vi) values
 ('quan_luong_tui','dao_cu','Túi Quân Lương','R','Vật phẩm quân nhu, chưa mở tác vụ sử dụng.'),
 ('ho_giap_du_phong','trang_bi','Hộ Giáp Dự Phòng','SR','Trang bị dự trữ. Trang bị hiện có sử dụng hệ thống Võ Tướng.'),
 ('ngoc_boi_ho_than','trang_suc','Ngọc Bội Hộ Thân','SR','Trang sức. Chưa mở hệ thống chỉ số trang sức.'),
 ('an_soai_ho_phu','bao_vat','Ấn Soái Hổ Phù','SSR','Bảo vật. Chưa có hiệu ứng chiến đấu cho vật phẩm này.'),
 ('chien_hon_ho_ve','chien_hon','Chiến Hồn Hộ Vệ','SR','Chiến Hồn. Chưa mở lắp đặt và cộng chỉ số.'),
 ('gau_truc_dong_hanh','pet','Gấu Trúc Đồng Hành','SR','Linh thú đồng hành. Chưa mở nuôi dưỡng hoặc trợ chiến.'),
 ('tinh_hoa_than_binh','than_binh','Tinh Hoa Thần Binh','SSR','Nguyên liệu tương lai. Mảnh rèn cũ vẫn quản lý tại Lò Rèn.'),
 ('than_thu_bach_ho','than_thu','Thần Thú Bạch Hổ','SSR','Thần Thú. Chưa mở tính năng trợ chiến.'),
 ('cam_nang_binh_phap','cam_nang','Cẩm Nang Binh Pháp','SR','Cẩm Nang. Chưa mở hệ thống nghiên cứu.'),
 ('tui_da_quy_so_cap','tui_da_quy','Túi Đá Quý Sơ Cấp','R','Túi vật liệu. Chưa hỗ trợ mở túi hoặc quay thưởng.'),
 ('dien_vo_lenh_dong','dien_vo_lenh','Điện Võ Lệnh Đồng','SR','Lệnh bài. Chưa liên kết chức năng đổi thưởng.'),
 ('quat_long_quan_su','trang_bi_quan_su','Quạt Lông Quân Sư','SR','Trang bị quân sư. Chưa mở hệ thống cộng chỉ số.'),
 ('huyen_thu_ho_ly','huyen_thu','Huyễn Thú Hồ Ly','SSR','Huyễn Thú. Chưa mở hệ thống nuôi dưỡng.')
on conflict (id) do nothing;

