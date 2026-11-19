// Clean source artwork mapped to the Mail UI handoff. Labels and states are drawn by MailScene.
export const MAIL_ART = {
  palace:'ui/welfare_v21/backgrounds/bg_welfare_palace_hd.png',
  title:'ui/welfare_v21/headers/header_welfare_hd.png',
  panel:'ui/welfare_v21/panels/panel_main_ornate_hd.png',
  parchment:'ui/welfare_v2/templates/template_parchment_detail_panel.png',
  row:'ui/welfare_v21/tabs/tab_normal_hd.png',
  selected:'ui/welfare_v21/tabs/tab_selected_hd.png',
  strip:'inventory/panels/detail_title_plaque_blank.png',
  divider:'inventory/decor/gold_dragon_divider.png',
  copper:'ui/welfare_v21/icons/icon_dong_copper_hd.png',
  coins:'ui/welfare/items/gold_ingot.png',
  golden_key:'ui/welfare_v2/icons/icon_gold_key.png',
  jewelry_essence:'shop/icons/jewelry_essence.png',
  goldSlot:'summon/complete/portrait_frames/portrait_gold.png',
  purpleSlot:'summon/complete/portrait_frames/portrait_purple.png',
} as const;
export type MailArt = keyof typeof MAIL_ART;
export const MAIL_LABELS = { all:'Tất Cả',system:'Hệ Thống',event:'Sự Kiện',personal:'Cá Nhân' } as const;
export const MAIL_REWARD_LABELS = { copper:'Đồng',coins:'Vàng',golden_key:'Chìa Khóa Vàng',jewelry_essence:'Tinh Hoa' } as const;
