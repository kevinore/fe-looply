import type { components } from './schema';

type S = components['schemas'];

export type Card = S['CardOut'];
export type CardPrize = S['CardPrizeOut'];
export type ClaimPreview = S['ClaimPreviewOut'];
export type ClaimResult = S['ClaimResultOut'];
export type SpinBrief = S['SpinBrief'];
export type SpinResult = S['SpinResultOut'];
export type WheelSegment = S['WheelSegment'];
export type PrizeDetail = S['PrizeDetailOut'];
export type HistorySale = S['HistorySale'];
export type PublicBusiness = S['PublicBusinessOut'];

export type OperatorMe = S['OperatorMeOut'];
export type Workday = S['WorkdayOut'];
export type Product = S['ProductOut'];
export type OptionGroup = S['OptionGroupOut'];
export type SaleItemOption = S['SaleItemOptionOut'];
export type Sale = S['SaleOut'];
export type SaleCreate = S['SaleCreateIn'];
export type SaleStatus = S['SaleStatusOut'];
export type SaleStatusCustomer = S['SaleStatusCustomerOut'];
export type CustomerSearch = S['CustomerSearchOut'];
export type CustomerDetail = S['CustomerDetailOut'];
export type OperatorPrize = S['OpCustomerPrizeOut'];
export type PendingPrize = S['PendingPrizeOut'];
export type CatalogPrize = S['CatalogPrizeOut'];
export type WheelPrizeIn = S['WheelPrizeIn'];
export type WorkdayStats = S['WorkdayStatsOut'];
export type WorkdayRates = S['WorkdayRatesOut'];
export type WorkdaySale = S['WorkdaySaleOut'];
export type HistoryStats = S['HistoryStatsOut'];

export type PaymentMethod = SaleCreate['payment_method'];
export type PrizeType = 'percent_off' | 'free_item' | 'extra_item';

/** `branding` is a free-form JSON object in the API; this is the known shape. */
export type Branding = {
  display_name?: string;
  short_name?: string;
  tagline?: string;
  logo_url?: string | null;
  privacy_policy_url?: string | null;
  /** Who is responsible for the customers' data (privacy policy, Ley 1581). */
  legal?: {
    legal_name?: string;
    id_type?: string;
    id_number?: string;
    address?: string;
    city?: string;
    email?: string;
    phone?: string;
    /** YYYY-MM-DD the current policy version took effect. */
    effective_date?: string;
  };
  colors?: { primary?: string; secondary?: string; ink?: string; background?: string; bg?: string };
  /** Optional mascot illustrations; local defaults are used when missing. */
  mascots?: { hero?: string; celebrate?: string; welcome?: string };
};
