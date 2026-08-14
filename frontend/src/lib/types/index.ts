export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  locale: string;
  tenant_id: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  opportunity_score: number;
  status: string;
  created_at: string;
  justification?: string | null;
}

export interface CompanyDetail extends Company {
  legal_name: string | null;
  employee_count_est: number | null;
  revenue_est: number | null;
  description: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  whatsapp: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  tech_stack: string[];
  cms: string | null;
  framework: string | null;
  hosting: string | null;
  analytics_tools: string[];
  has_ssl: boolean | null;
  has_whatsapp: boolean | null;
  has_chatbot: boolean | null;
  has_crm: boolean | null;
  has_ecommerce: boolean | null;
  seo_score: number | null;
  page_speed_mobile: number | null;
  page_speed_desktop: number | null;
  core_web_vitals: Record<string, string> | null;
  domain_authority: number | null;
  backlink_count: number | null;
  domain_age_years: number | null;
  opportunity_breakdown: Record<string, number>;
  opportunity_analysis: string | null;
  recommended_services: string[] | null;
  estimated_deal_value: number | null;
  priority: string | null;
  probability: number | null;
  urgency: string | null;
}

export interface LeadContactConfidence {
  email: "verified" | "inferred" | "unverified";
  phone: "verified" | "inferred" | "unverified";
  source: string;
}

export interface CompanyListResponse {
  items: Company[];
  total: number;
  offset: number;
  limit: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  stats: Record<string, number>;
  created_at: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  stage: string;
  probability: number;
  company_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  channel: string;
  status: string;
  summary: string | null;
  sentiment: string | null;
  next_action: string | null;
  created_at: string;
}

export interface AnalyticsOverview {
  total_companies: number;
  total_contacts: number;
  total_campaigns: number;
  total_deals: number;
  pipeline_value: number;
  companies_this_week: number;
  avg_opportunity_score: number;
}
