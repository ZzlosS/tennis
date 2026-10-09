export default interface ChangePasswordRequest {
  currentPassword: string;
  // 8 to 72 characters.
  newPassword: string;
}
