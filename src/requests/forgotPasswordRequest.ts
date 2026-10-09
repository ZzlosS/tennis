export default interface ForgotPasswordRequest {
  email: string;
  // Language of the email: "en" (default) or "sr".
  language?: "en" | "sr";
}
