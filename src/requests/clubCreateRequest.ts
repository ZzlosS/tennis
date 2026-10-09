export default interface ClubCreateRequest {
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  // ISO 4217 code, for example RSD. Defaults to RSD.
  currency?: string;
}
