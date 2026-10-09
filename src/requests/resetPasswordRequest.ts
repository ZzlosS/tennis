export default interface ResetPasswordRequest {
  // The token from the link in the email.
  token: string;
  // 8 to 72 characters.
  newPassword: string;
}
