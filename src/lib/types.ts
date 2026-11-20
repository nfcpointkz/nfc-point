export type Business = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
};

export type NfcCard = {
  id: string;
  business_id: string;
  token: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
};

export type Hotspot = {
  hotspot_key: string;
  name: string;
  url: string;
  x: number; // % ширины изображения
  y: number; // % высоты изображения
  w: number;
  h: number;
  sort_order: number;
};

export type BusinessPage = {
  id: string;
  business_id: string;
  draft_image_url: string | null;
  draft_image_width: number | null;
  draft_image_height: number | null;
  published_image_url: string | null;
  published_image_width: number | null;
  published_image_height: number | null;
  published_at: string | null;
  updated_at: string;
};

export type AnalyticsEvent = {
  id: string;
  created_at: string;
  event_type: "page_view" | "button_click";
  business_id: string | null;
  card_id: string | null;
  button_key: string | null;
  button_label: string | null;
  visitor_id: string | null;
};

export type PageButton = {
  button_key: string;
  type: string;
  label: string;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bg_color: string;
  text_color: string;
  style: "solid" | "outline" | "ghost" | "glass";
  radius: number;
  show_icon: boolean;
  show_label: boolean;
  sort_order: number;
  is_enabled: boolean;
};